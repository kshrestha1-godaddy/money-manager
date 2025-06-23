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
import { parseDebtsCSV, ParsedDebtData } from "../utils/csvImportDebts";
import { ImportResult } from "../types/bulkImport";

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

            // Calculate total repayments so far
            const totalRepayments = existingDebt.repayments.reduce((sum, repayment) => {
                return sum + decimalToNumber(repayment.amount, 'repayment amount');
            }, 0);

            const debtAmount = decimalToNumber(existingDebt.amount, 'debt amount');
            const remainingDebt = debtAmount - totalRepayments;

            // Check if repayment amount is valid
            if (amount > remainingDebt) {
                throw new Error(`Repayment amount ($${amount}) exceeds remaining debt ($${remainingDebt.toFixed(2)})`);
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
            const newTotalRepayments = totalRepayments + amount;
            
            // Update debt status based on total repayments
            let newStatus = existingDebt.status;
            if (newTotalRepayments >= debtAmount) {
                newStatus = 'FULLY_PAID';
            } else if (newTotalRepayments > 0) {
                newStatus = 'PARTIALLY_PAID';
            }

            // Update debt status if it changed
            if (newStatus !== existingDebt.status) {
                await tx.debt.update({
                    where: { id: debtId },
                    data: { status: newStatus }
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

            // Update debt status based on remaining repayments
            const debtAmount = decimalToNumber(existingDebt.amount, 'debt amount');
            let newStatus = existingDebt.status;
            if (totalRemainingRepayments >= debtAmount) {
                newStatus = 'FULLY_PAID';
            } else if (totalRemainingRepayments > 0) {
                newStatus = 'PARTIALLY_PAID';
            } else {
                newStatus = 'ACTIVE'; // Only change to ACTIVE if no repayments remain
            }

            // Update debt status if it changed
            if (newStatus !== existingDebt.status) {
                await tx.debt.update({
                    where: { id: debtId },
                    data: { status: newStatus }
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

        // Process debts in batches to avoid timeout
        const BATCH_SIZE = 10;
        const batches = [];
        for (let i = 0; i < validDebts.length; i += BATCH_SIZE) {
            batches.push(validDebts.slice(i, i + BATCH_SIZE));
        }

        for (const batch of batches) {
            try {
                await prisma.$transaction(async (tx) => {
                    for (const debtData of batch) {
                        try {
                            // Validate account balance if accountId is provided
                            if (debtData.accountId) {
                                const account = await tx.account.findUnique({
                                    where: { id: debtData.accountId },
                                    select: { balance: true, bankName: true }
                                });

                                if (!account) {
                                    result.errors.push({
                                        row: 0,
                                        error: `Account not found for debt: ${debtData.borrowerName}`,
                                        data: debtData
                                    });
                                    continue;
                                }

                                const currentBalance = parseFloat(account.balance.toString());
                                if (currentBalance < debtData.amount) {
                                    result.errors.push({
                                        row: 0,
                                        error: `Insufficient balance in ${account.bankName} for debt to ${debtData.borrowerName}. Available: ${currentBalance}, Required: ${debtData.amount}`,
                                        data: debtData
                                    });
                                    continue;
                                }
                            }

                            // Create the debt
                            await tx.debt.create({
                                data: {
                                    ...debtData,
                                    userId: userId,
                                },
                            });

                            // Update account balance if accountId is provided
                            if (debtData.accountId) {
                                await tx.account.update({
                                    where: { id: debtData.accountId },
                                    data: {
                                        balance: {
                                            decrement: debtData.amount
                                        }
                                    }
                                });
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
                }, {
                    timeout: 30000, // 30 second timeout per batch
                });
            } catch (error) {
                // If a batch fails, add errors for all items in that batch
                batch.forEach(debtData => {
                    result.errors.push({
                        row: 0,
                        error: `Batch import failed for debt to ${debtData.borrowerName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        data: debtData
                    });
                });
            }
        }

        result.success = result.importedCount > 0;

        revalidatePath("/(dashboard)/debts");
        revalidatePath("/(dashboard)/accounts");

        return result;

    } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to import debts");
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