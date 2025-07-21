"use server";

import prisma from "@repo/db/client";
import { DebtInterface } from "../types/debts";
import { revalidatePath } from "next/cache";
import { 
    getUserIdFromSession, 
    getAuthenticatedSession, 
    createErrorResponse,
    decimalToNumber,
    validateNumber 
} from "../utils/auth";
import { parseDebtsCSV, ParsedDebtData, parseRepaymentsCSV, ParsedRepaymentData } from "../utils/csvImportDebts";
import { ImportResult } from "../types/bulkImport";
import { calculateRemainingWithInterest, determineDebtStatus } from "../utils/interestCalculation";

export async function getUserDebts(): Promise<{ data?: DebtInterface[], error?: string }> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        // First verify user exists
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            // If user doesn't exist, create them (for OAuth users)
            if (session.user.email && session.user.name) {
                console.info(`Creating new OAuth user for debts: ${session.user.email}`);
                const newUser = await prisma.user.create({
                    data: {
                        id: userId,
                        email: session.user.email,
                        name: session.user.name,
                        number: `oauth_${userId}`, // Temporary number for OAuth users
                        password: "oauth_user", // Placeholder password for OAuth users
                    },
                });
                
                // Return empty debts array for new user
                return { data: [] };
            } else {
                console.error(`User not found and insufficient OAuth data for debts user ID: ${userId}`);
                return { error: "User not found in database and insufficient data to create user" };
            }
        }
        
        // Get debts for the verified user
        const debts = await prisma.debt.findMany({
            where: {
                userId: userId,
            },
            include: {
                repayments: true,
            },
            orderBy: {
                lentDate: 'desc',
            },
        });
        
        // Convert Decimal amounts to number to prevent serialization issues with validation
        const transformedDebts = debts.map(debt => {
            try {
                const amount = decimalToNumber(debt.amount, 'debt amount');
                const interestRate = decimalToNumber(debt.interestRate, 'interest rate');
                
                return {
                    ...debt,
                    amount,
                    interestRate,
                    lentDate: new Date(debt.lentDate),
                    dueDate: debt.dueDate ? new Date(debt.dueDate) : undefined,
                    createdAt: new Date(debt.createdAt),
                    updatedAt: new Date(debt.updatedAt),
                    repayments: debt.repayments?.map(repayment => {
                        const repaymentAmount = decimalToNumber(repayment.amount, 'repayment amount');
                        return {
                            ...repayment,
                            amount: repaymentAmount,
                            repaymentDate: new Date(repayment.repaymentDate),
                            createdAt: new Date(repayment.createdAt),
                            updatedAt: new Date(repayment.updatedAt),
                        };
                    }),
                };
            } catch (transformError) {
                console.error(`Data transformation failed for debt ID ${debt.id}:`, transformError);
                throw new Error(`Data transformation failed for debt ID ${debt.id}`);
            }
        }) as DebtInterface[];

        // Trigger notification checks after fetching debts to ensure due date notifications are up-to-date
        try {
            const { generateNotificationsForUser } = await import('./notifications');
            await generateNotificationsForUser(userId);
        } catch (error) {
            console.error("Failed to check notifications after fetching debts:", error);
            // Don't throw here to avoid breaking the main operation
        }

        return { data: transformedDebts };
    } catch (error) {
        console.error("Failed to fetch user debts:", error);
        return { error: "Failed to fetch debts" };
    }
}

export async function createDebt(debt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        let user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            // If user doesn't exist, create them (for OAuth users)
            if (session.user.email && session.user.name) {
                console.info(`Creating new OAuth user for debt creation: ${session.user.email}`);
                user = await prisma.user.create({
                    data: {
                        id: userId,
                        email: session.user.email,
                        name: session.user.name,
                        number: `oauth_${userId}`, // Temporary number for OAuth users
                        password: "oauth_user", // Placeholder password for OAuth users
                    },
                });
            } else {
                console.error(`User not found and insufficient OAuth data for debt creation user ID: ${userId}`);
                throw new Error("User not found in database and insufficient data to create user");
            }
        }

        // Validate debt amount
        validateNumber(debt.amount, 'debt amount');
        validateNumber(debt.interestRate, 'interest rate');

        // Use a transaction to ensure both debt creation and account balance are updated atomically
        const result = await prisma.$transaction(async (tx) => {
            // Validate account balance if accountId is provided
            if (debt.accountId) {
                const account = await tx.account.findUnique({
                    where: { id: debt.accountId },
                    select: { balance: true, bankName: true }
                });

                if (!account) {
                    throw new Error("Selected account not found");
                }

                const currentBalance = decimalToNumber(account.balance, 'account balance');
                if (currentBalance < debt.amount) {
                    throw new Error(`Insufficient balance in ${account.bankName}. Available: ${currentBalance}, Required: ${debt.amount}`);
                }
            }

            // Create the debt
            const newDebt = await tx.debt.create({
                data: {
                    ...debt,
                    userId: user.id,
                },
                include: {
                    repayments: true,
                },
            });

            // Update the account balance (decrease by debt amount) if accountId is provided
            if (debt.accountId) {
                await tx.account.update({
                    where: { id: debt.accountId },
                    data: {
                        balance: {
                            decrement: debt.amount
                        }
                    }
                });
            }

            return newDebt;
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/debts");
        revalidatePath("/(dashboard)/accounts");
        
        console.info(`Debt created successfully: ${debt.borrowerName} - $${debt.amount} for user ${userId}`);

        // Trigger notification checks
        try {
            const { generateNotificationsForUser } = await import('./notifications');
            
            // Use the comprehensive check to ensure all notification types are evaluated
            await generateNotificationsForUser(userId);
        } catch (error) {
            console.error("Failed to check notifications after debt creation:", error);
        }
        
        // Convert Decimal amounts to number to prevent serialization issues
        return {
            ...result,
            amount: decimalToNumber(result.amount, 'debt amount'),
            interestRate: decimalToNumber(result.interestRate, 'interest rate'),
            lentDate: new Date(result.lentDate),
            dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            repayments: result.repayments?.map(repayment => ({
                ...repayment,
                amount: decimalToNumber(repayment.amount, 'repayment amount'),
                repaymentDate: new Date(repayment.repaymentDate),
                createdAt: new Date(repayment.createdAt),
                updatedAt: new Date(repayment.updatedAt),
            })),
        } as DebtInterface;
    } catch (error) {
        console.error(`Failed to create debt for ${debt.borrowerName}:`, error);
        throw error;
    }
}

export async function updateDebt(id: number, debt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Validate numbers if provided
        if (debt.amount !== undefined) {
            validateNumber(debt.amount, 'debt amount');
        }
        if (debt.interestRate !== undefined) {
            validateNumber(debt.interestRate, 'interest rate');
        }

        // Use a transaction to handle debt update and account balance changes
        const result = await prisma.$transaction(async (tx) => {
            // Verify the debt belongs to the user
            const existingDebt = await tx.debt.findFirst({
                where: {
                    id,
                    userId: userId,
                },
            });

            if (!existingDebt) {
                throw new Error("Debt not found or unauthorized");
            }

            // Update the debt
            const updatedDebt = await tx.debt.update({
                where: { id },
                data: debt,
                include: {
                    repayments: true,
                },
            });

            // Handle account balance changes if amount changed
            if (debt.amount !== undefined && debt.amount !== parseFloat(existingDebt.amount.toString())) {
                const oldAmount = decimalToNumber(existingDebt.amount, 'old debt amount');
                const newAmount = debt.amount;
                const amountDifference = newAmount - oldAmount;

                if (existingDebt.accountId) {
                    // For debts: if amount increased, decrease balance more; if decreased, increase balance
                    await tx.account.update({
                        where: { id: existingDebt.accountId },
                        data: {
                            balance: {
                                decrement: amountDifference
                            }
                        }
                    });
                }
            }

            return updatedDebt;
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/debts");
        revalidatePath("/(dashboard)/accounts");

        console.info(`Debt updated successfully: ${id} for user ${userId}`);
        
        // Convert Decimal amounts to number to prevent serialization issues
        return {
            ...result,
            amount: decimalToNumber(result.amount, 'debt amount'),
            interestRate: decimalToNumber(result.interestRate, 'interest rate'),
            lentDate: new Date(result.lentDate),
            dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            repayments: result.repayments?.map(repayment => ({
                ...repayment,
                amount: decimalToNumber(repayment.amount, 'repayment amount'),
                repaymentDate: new Date(repayment.repaymentDate),
                createdAt: new Date(repayment.createdAt),
                updatedAt: new Date(repayment.updatedAt),
            })),
        } as DebtInterface;
    } catch (error) {
        console.error(`Failed to update debt ${id}:`, error);
        throw error;
    }
}

export async function deleteDebt(id: number) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Use a transaction to handle debt deletion and account balance restoration
        const result = await prisma.$transaction(async (tx) => {
            // Verify the debt belongs to the user and get its details
            const existingDebt = await tx.debt.findFirst({
                where: {
                    id,
                    userId: userId,
                },
            });

            if (!existingDebt) {
                throw new Error("Debt not found or unauthorized");
            }

            // Delete the debt (this will cascade delete repayments)
            await tx.debt.delete({
                where: { id },
            });

            // Restore the account balance if accountId is provided
            if (existingDebt.accountId) {
                await tx.account.update({
                    where: { id: existingDebt.accountId },
                    data: {
                        balance: {
                            increment: decimalToNumber(existingDebt.amount, 'debt amount')
                        }
                    }
                });
            }

            return existingDebt;
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/debts");
        revalidatePath("/(dashboard)/accounts");

        console.info(`Debt deleted successfully: ${id} for user ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete debt ${id}:`, error);
        throw error;
    }
}

export async function addRepayment(debtId: number, amount: number, notes?: string, accountId?: number) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        // Validate repayment amount
        validateNumber(amount, 'repayment amount');

        // Use a transaction to ensure debt, repayment, and account balance are updated atomically
        const result = await prisma.$transaction(async (tx) => {
            // Verify the debt belongs to the user
            const existingDebt = await tx.debt.findFirst({
                where: {
                    id: debtId,
                    userId: userId,
                },
                include: {
                    repayments: true,
                },
            });

            if (!existingDebt) {
                throw new Error("Debt not found or unauthorized");
            }

            // Calculate remaining debt including interest
            const debtAmount = decimalToNumber(existingDebt.amount, 'debt amount');
            const interestRate = decimalToNumber(existingDebt.interestRate, 'interest rate');
            
            const remainingWithInterest = calculateRemainingWithInterest(
                debtAmount,
                interestRate,
                existingDebt.lentDate,
                existingDebt.dueDate || undefined,
                existingDebt.repayments.map(r => ({ amount: decimalToNumber(r.amount, 'repayment amount') })),
                new Date(),
                existingDebt.status
            );

            // Round both amounts to 2 decimal places for proper comparison
            const roundedAmount = Math.round(amount * 100) / 100;
            const roundedRemaining = Math.round(remainingWithInterest.remainingAmount * 100) / 100;
            
            if (roundedAmount > roundedRemaining) {
                throw new Error(`Repayment amount ($${roundedAmount}) exceeds remaining debt ($${roundedRemaining.toFixed(2)})`);
            }

            // Validate account exists if accountId is provided
            if (accountId) {
                const account = await tx.account.findUnique({
                    where: { id: accountId },
                    select: { id: true, bankName: true }
                });

                if (!account) {
                    throw new Error("Selected account not found");
                }
            }

            // Create the repayment
            const repayment = await tx.debtRepayment.create({
                data: {
                    debtId: debtId,
                    amount: amount,
                    repaymentDate: new Date(),
                    notes: notes,
                    accountId: accountId,
                },
            });

            // Calculate new total repayments including the new repayment
            const currentTotalRepayments = existingDebt.repayments.reduce((sum, repayment) => {
                return sum + decimalToNumber(repayment.amount, 'repayment amount');
            }, 0);
            
            // Update debt status based on total repayments compared to total amount with interest
            const updatedRemainingWithInterest = calculateRemainingWithInterest(
                debtAmount,
                interestRate,
                existingDebt.lentDate,
                existingDebt.dueDate || undefined,
                existingDebt.repayments.map(r => ({ amount: decimalToNumber(r.amount, 'repayment amount') })),
                new Date(),
                existingDebt.status
            );
            
            const newTotalRepayments = currentTotalRepayments + amount;
            const newStatus = determineDebtStatus(newTotalRepayments, updatedRemainingWithInterest.totalWithInterest, existingDebt.status);

            // Update debt status if it changed
            if (newStatus !== existingDebt.status) {
                await tx.debt.update({
                    where: { id: debtId },
                    data: { status: newStatus as any }
                });
            }

            // Update the account balance (increase by repayment amount) if accountId is provided
            if (accountId) {
                await tx.account.update({
                    where: { id: accountId },
                    data: {
                        balance: {
                            increment: amount
                        }
                    }
                });
            }

            return repayment;
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/debts");
        revalidatePath("/(dashboard)/accounts");

        console.info(`Repayment added successfully: $${amount} for debt ${debtId} by user ${userId}`);
        
        // Convert Decimal amount to number to prevent serialization issues
        return {
            ...result,
            amount: decimalToNumber(result.amount, 'repayment amount'),
            repaymentDate: new Date(result.repaymentDate),
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
        };
    } catch (error) {
        console.error(`Failed to add repayment for debt ${debtId}:`, error);
        throw error;
    }
}

export async function deleteRepayment(repaymentId: number, debtId: number) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Use a transaction to ensure repayment deletion and account balance update are atomic
        const result = await prisma.$transaction(async (tx) => {
            // Verify the debt belongs to the user and get the repayment details
            const existingDebt = await tx.debt.findFirst({
                where: {
                    id: debtId,
                    userId: userId,
                },
                include: {
                    repayments: {
                        where: {
                            id: repaymentId
                        }
                    }
                },
            });

            if (!existingDebt) {
                throw new Error("Debt not found or unauthorized");
            }

            const repaymentToDelete = existingDebt.repayments[0];
            if (!repaymentToDelete) {
                throw new Error("Repayment not found or unauthorized");
            }

            // Delete the repayment
            await tx.debtRepayment.delete({
                where: { id: repaymentId },
            });

            // Get all remaining repayments for this debt
            const remainingRepayments = await tx.debtRepayment.findMany({
                where: { debtId: debtId }
            });

            // Calculate total remaining repayments
            const totalRemainingRepayments = remainingRepayments.reduce((sum, repayment) => {
                return sum + decimalToNumber(repayment.amount, 'repayment amount');
            }, 0);

            // Update debt status based on remaining repayments (including interest)
            const debtAmount = decimalToNumber(existingDebt.amount, 'debt amount');
            const interestRate = decimalToNumber(existingDebt.interestRate, 'interest rate');
            
            const remainingWithInterest = calculateRemainingWithInterest(
                debtAmount,
                interestRate,
                existingDebt.lentDate,
                existingDebt.dueDate || undefined,
                remainingRepayments.map(r => ({ amount: decimalToNumber(r.amount, 'repayment amount') })),
                new Date(),
                existingDebt.status
            );
            
            const newStatus = determineDebtStatus(totalRemainingRepayments, remainingWithInterest.totalWithInterest, existingDebt.status);

            // Update debt status if it changed
            if (newStatus !== existingDebt.status) {
                await tx.debt.update({
                    where: { id: debtId },
                    data: { status: newStatus as any }
                });
            }

            // Restore the account balance (subtract repayment amount) if accountId is provided
            if (repaymentToDelete.accountId) {
                await tx.account.update({
                    where: { id: repaymentToDelete.accountId },
                    data: {
                        balance: {
                            decrement: decimalToNumber(repaymentToDelete.amount, 'repayment amount')
                        }
                    }
                });
            }

            return repaymentToDelete;
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/debts");
        revalidatePath("/(dashboard)/accounts");

        console.info(`Repayment deleted successfully: ${repaymentId} for debt ${debtId} by user ${userId}`);
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete repayment ${repaymentId}:`, error);
        throw error;
    }
}

/**
 * Bulk import debts from CSV
 */
export async function bulkImportDebts(csvContent: string): Promise<ImportResult> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Get user accounts for validation
        const accounts = await prisma.account.findMany({
            where: { userId: userId }
        });

        // Parse CSV
        const parseResult = parseDebtsCSV(csvContent, accounts) as ImportResult & { data?: ParsedDebtData[] };
        
        if (!parseResult.success || !parseResult.data) {
            return {
                success: parseResult.success,
                importedCount: 0,
                errors: parseResult.errors,
                skippedCount: parseResult.skippedCount
            };
        }

        const validDebts = parseResult.data;
        const result: ImportResult = {
            success: false,
            importedCount: 0,
            errors: [...parseResult.errors],
            skippedCount: parseResult.skippedCount
        };

        // Store mapping of original debt IDs to new debt IDs for repayment import
        const debtIdMapping: Record<number, number> = {};

        // Process each debt individually to avoid transaction failures affecting other debts
        for (const debtData of validDebts) {
            try {
                // Use a separate transaction for each debt
                const newDebt = await prisma.$transaction(async (tx) => {
                    // Create the debt (remove originalId and accountId to avoid foreign key issues)
                    const { originalId, accountId, ...debtDataClean } = debtData;
                    
                    const debt = await tx.debt.create({
                        data: {
                            ...debtDataClean,
                            userId: userId,
                            // Don't include accountId in bulk imports to avoid foreign key constraint errors
                        },
                    });
                    
                    return debt;
                });

                // Store the mapping of original ID to new ID if original ID exists
                if (debtData.originalId) {
                    debtIdMapping[debtData.originalId] = newDebt.id;
                }

                result.importedCount++;
            } catch (error) {
                result.errors.push({
                    row: 0,
                    error: `Failed to import debt for ${debtData.borrowerName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    data: debtData
                });
            }
        }

        result.success = result.importedCount > 0;
        
        // Store the debt ID mapping in a global variable or return it with the result
        // This can be used later when importing repayments
        (result as any).debtIdMapping = debtIdMapping;

        revalidatePath("/(dashboard)/debts");
        revalidatePath("/(dashboard)/accounts");

        return result;

    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to import debts");
    }
}

/**
 * Bulk import repayments from CSV
 */
export async function bulkImportRepayments(csvContent: string, debtIdMapping?: Record<number, number>): Promise<ImportResult> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Get user accounts for validation
        const accounts = await prisma.account.findMany({
            where: { userId: userId }
        });

        // Get user debts for validation
        const userDebts = await prisma.debt.findMany({
            where: { userId: userId },
            select: { id: true }
        });
        
        const userDebtIds = new Set(userDebts.map(debt => debt.id));

        // Parse CSV
        const parseResult = parseRepaymentsCSV(csvContent, accounts) as ImportResult & { data?: ParsedRepaymentData[] };
        
        if (!parseResult.success || !parseResult.data) {
            return {
                success: parseResult.success,
                importedCount: 0,
                errors: parseResult.errors,
                skippedCount: parseResult.skippedCount
            };
        }

        const validRepayments = parseResult.data;
        const result: ImportResult = {
            success: false,
            importedCount: 0,
            errors: [...parseResult.errors],
            skippedCount: parseResult.skippedCount
        };

        // Process each repayment individually to avoid transaction failures affecting other repayments
        for (const repaymentData of validRepayments) {
            try {
                // Map the debt ID if a mapping exists
                const actualDebtId = debtIdMapping && debtIdMapping[repaymentData.debtId] 
                    ? debtIdMapping[repaymentData.debtId] 
                    : repaymentData.debtId;
                    
                // Skip if debt ID is undefined
                if (typeof actualDebtId !== 'number') {
                    result.errors.push({
                        row: 0,
                        error: `Invalid debt ID for repayment`,
                        data: repaymentData
                    });
                    continue;
                }

                // Verify the debt exists and belongs to the user
                if (!userDebtIds.has(actualDebtId)) {
                    result.errors.push({
                        row: 0,
                        error: `Debt ID ${actualDebtId} not found or does not belong to current user`,
                        data: repaymentData
                    });
                    continue;
                }
                
                // Use a separate transaction for each repayment to prevent cascading failures
                await prisma.$transaction(async (tx) => {
                    // Get debt details to update status after repayment
                    const debt = await tx.debt.findUnique({
                        where: { id: actualDebtId },
                        include: { repayments: true }
                    });

                    if (!debt) {
                        throw new Error(`Debt ID ${actualDebtId} not found`);
                    }

                    // Create the repayment (remove originalId and accountId to avoid foreign key issues)
                    const { originalId: repaymentOriginalId, accountId, ...repaymentDataClean } = repaymentData;
                    await tx.debtRepayment.create({
                        data: {
                            amount: repaymentDataClean.amount,
                            repaymentDate: repaymentDataClean.repaymentDate,
                            notes: repaymentDataClean.notes || undefined,
                            // Don't include accountId in bulk imports to avoid foreign key constraint errors
                            debtId: actualDebtId
                        },
                    });

                    // Calculate total repaid amount including this new repayment
                    const totalRepaid = debt.repayments.reduce(
                        (sum, r) => sum + parseFloat(r.amount.toString()), 0
                    ) + repaymentData.amount;

                    // Calculate total due amount including interest
                    const debtAmount = parseFloat(debt.amount.toString());
                    const interestRate = parseFloat(debt.interestRate.toString());
                    
                    const remainingWithInterest = calculateRemainingWithInterest(
                        debtAmount,
                        interestRate,
                        debt.lentDate,
                        debt.dueDate || undefined,
                        debt.repayments.map(r => ({ amount: parseFloat(r.amount.toString()) })),
                        new Date(),
                        debt.status
                    );

                    // Update debt status based on repayment
                    const newStatus = determineDebtStatus(totalRepaid, remainingWithInterest.totalWithInterest, debt.status);

                    // Update debt status if changed
                    if (newStatus !== debt.status) {
                        await tx.debt.update({
                            where: { id: actualDebtId },
                            data: { status: newStatus as any }
                        });
                    }
                });

                result.importedCount++;
            } catch (error) {
                result.errors.push({
                    row: 0,
                    error: `Failed to import repayment: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    data: repaymentData
                });
            }
        }

        result.success = result.importedCount > 0;

        revalidatePath("/(dashboard)/debts");
        revalidatePath("/(dashboard)/accounts");

        return result;

    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to import repayments");
    }
}

/**
 * Bulk delete debts
 */
export async function bulkDeleteDebts(debtIds: number[]) {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Verify all debts belong to the user and get debt details for account balance restoration
        const existingDebts = await prisma.debt.findMany({
            where: {
                id: { in: debtIds },
                userId: userId,
            },
            include: {
                repayments: true,
            }
        });

        if (existingDebts.length !== debtIds.length) {
            throw new Error("Some debts not found or unauthorized");
        }

        // Use a transaction to handle debt deletion and account balance restoration
        await prisma.$transaction(async (tx) => {
            // Delete the debts (this will cascade delete repayments)
            await tx.debt.deleteMany({
                where: { 
                    id: { in: debtIds },
                    userId: userId
                }
            });

            // Restore account balances (increase by debt amounts since debts are removed)
            const accountUpdates = new Map<number, number>();
            
            existingDebts.forEach(debt => {
                if (debt.accountId) {
                    const debtAmount = decimalToNumber(debt.amount, 'debt amount');
                    const currentTotal = accountUpdates.get(debt.accountId) || 0;
                    accountUpdates.set(debt.accountId, currentTotal + debtAmount);
                }
            });

            // Apply account balance updates
            for (const [accountId, totalAmount] of accountUpdates) {
                await tx.account.update({
                    where: { id: accountId },
                    data: {
                        balance: {
                            increment: totalAmount
                        }
                    }
                });
            }
        });

        // Revalidate related pages
        revalidatePath("/(dashboard)/debts");
        revalidatePath("/(dashboard)/accounts");
        
        console.info(`Bulk debt deletion successful: ${debtIds.length} debts for user ${userId}`);
        return { 
            success: true, 
            deletedCount: existingDebts.length 
        };
    } catch (error) {
        console.error(`Failed to bulk delete debts:`, error);
        throw error;
    }
} 