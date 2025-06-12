"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { DebtInterface } from "../types/debts";
import { revalidatePath } from "next/cache";

// Helper function to get user ID from session
function getUserIdFromSession(sessionUserId: string): number {
    // If it's a very large number (OAuth provider), take last 5 digits
    if (sessionUserId.length > 5) {
        return parseInt(sessionUserId.slice(-5));
    }
    // Otherwise parse normally
    return parseInt(sessionUserId);
}


export async function getUserDebts(): Promise<{ data?: DebtInterface[], error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return { error: "Unauthorized" };
        }

        const userId = getUserIdFromSession(session.user.id);
        // console.log("Original session ID:", session.user.id);
        // console.log("Converted userId:", userId);
        
        // Validate that userId is a valid number
        if (isNaN(userId)) {
            console.error("Invalid userId:", userId);
            return { error: "Invalid user ID" };
        }
        
        // First verify user exists
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
        });

        console.log("User:", user);

        if (!user) {
            // If user doesn't exist, create them (for OAuth users)
            if (session.user.email && session.user.name) {
                console.log("Creating new user for OAuth login");
                const newUser = await prisma.user.create({
                    data: {
                        id: userId,
                        email: session.user.email,
                        name: session.user.name,
                        number: `oauth_${userId}`, // Temporary number for OAuth users
                        password: "oauth_user", // Placeholder password for OAuth users
                    },
                });
                console.log("Created new user:", newUser);
                
                // Return empty debts array for new user
                return { data: [] };
            } else {
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
        
        // Ensure debts is an array
        if (!Array.isArray(debts)) {
            console.error("Debts query did not return an array:", debts);
            return { error: "Invalid debts data" };
        }
        
        // Convert Decimal amounts to number to prevent serialization issues
        const transformedDebts = debts.map(debt => {
            try {
                const amount = parseFloat(debt.amount.toString());
                const interestRate = parseFloat(debt.interestRate.toString());
                
                // Validate converted numbers
                if (!isFinite(amount) || isNaN(amount)) {
                    throw new Error(`Invalid debt amount: ${debt.amount}`);
                }
                if (!isFinite(interestRate) || isNaN(interestRate)) {
                    throw new Error(`Invalid interest rate: ${debt.interestRate}`);
                }
                
                return {
                    ...debt,
                    amount,
                    interestRate,
                    lentDate: new Date(debt.lentDate),
                    dueDate: debt.dueDate ? new Date(debt.dueDate) : undefined,
                    createdAt: new Date(debt.createdAt),
                    updatedAt: new Date(debt.updatedAt),
                    repayments: debt.repayments?.map(repayment => {
                        const repaymentAmount = parseFloat(repayment.amount.toString());
                        if (!isFinite(repaymentAmount) || isNaN(repaymentAmount)) {
                            throw new Error(`Invalid repayment amount: ${repayment.amount}`);
                        }
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
                console.error("Error transforming debt data:", transformError);
                throw new Error(`Data transformation failed for debt ID ${debt.id}`);
            }
        }) as DebtInterface[];

        return { data: transformedDebts };
    } catch (error) {
        console.error("Error fetching user debts:", error);
        return { error: "Failed to fetch debts" };
    }
}

export async function createDebt(debt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);
    let user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user) {
        // If user doesn't exist, create them (for OAuth users)
        if (session.user.email && session.user.name) {
            console.log("Creating new user for OAuth login");
            user = await prisma.user.create({
                data: {
                    id: userId,
                    email: session.user.email,
                    name: session.user.name,
                    number: `oauth_${userId}`, // Temporary number for OAuth users
                    password: "oauth_user", // Placeholder password for OAuth users
                },
            });
            console.log("Created new user:", user);
        } else {
            throw new Error("User not found in database and insufficient data to create user");
        }
    }

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

            const currentBalance = parseFloat(account.balance.toString());
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
    
    // Convert Decimal amounts to number to prevent serialization issues
    return {
        ...result,
        amount: parseFloat(result.amount.toString()),
        interestRate: parseFloat(result.interestRate.toString()),
        lentDate: new Date(result.lentDate),
        dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
        repayments: result.repayments?.map(repayment => ({
            ...repayment,
            amount: parseFloat(repayment.amount.toString()),
            repaymentDate: new Date(repayment.repaymentDate),
            createdAt: new Date(repayment.createdAt),
            updatedAt: new Date(repayment.updatedAt),
        })),
    } as DebtInterface;
}

export async function updateDebt(id: number, debt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the debt belongs to the user
    const existingDebt = await prisma.debt.findFirst({
        where: {
            id,
            userId: userId,
        },
    });

    if (!existingDebt) {
        throw new Error("Debt not found or unauthorized");
    }

    // Use a transaction to handle debt update and account balance changes
    const result = await prisma.$transaction(async (tx) => {
        // Handle account balance changes
        const oldAmount = parseFloat(existingDebt.amount.toString());
        const newAmount = debt.amount !== undefined ? debt.amount : oldAmount;
        const oldAccountId = (existingDebt as any).accountId; // Cast for now until schema is updated
        const newAccountId = debt.accountId !== undefined ? debt.accountId : oldAccountId;

        // Validate account balance for changes
        if (newAccountId) {
            const account = await tx.account.findUnique({
                where: { id: newAccountId },
                select: { balance: true, bankName: true }
            });

            if (!account) {
                throw new Error("Selected account not found");
            }

            const currentBalance = parseFloat(account.balance.toString());
            
            // If changing to a different account, check if new account has sufficient balance for full amount
            if (oldAccountId !== newAccountId) {
                if (currentBalance < newAmount) {
                    throw new Error(`Insufficient balance in ${account.bankName}. Available: ${currentBalance}, Required: ${newAmount}`);
                }
            }
            // If increasing amount on same account, check if there's sufficient balance for the increase
            else if (newAmount > oldAmount) {
                const amountIncrease = newAmount - oldAmount;
                if (currentBalance < amountIncrease) {
                    throw new Error(`Insufficient balance to increase debt by ${amountIncrease} in ${account.bankName}. Available: ${currentBalance}`);
                }
            }
        }

        // Update the debt
        const updatedDebt = await tx.debt.update({
            where: { id },
            data: debt,
            include: {
                repayments: true,
            },
        });

        // If amount changed and same account
        if (debt.amount !== undefined && oldAccountId === newAccountId && oldAccountId) {
            const amountDifference = newAmount - oldAmount;
            // For debts: if amount increased, decrease balance more; if decreased, increase balance
            await tx.account.update({
                where: { id: oldAccountId },
                data: {
                    balance: {
                        decrement: amountDifference
                    }
                }
            });
        }
        // If account changed
        else if (debt.accountId !== undefined && oldAccountId !== newAccountId) {
            // Add back to old account (debt no longer from that account)
            if (oldAccountId) {
                await tx.account.update({
                    where: { id: oldAccountId },
                    data: {
                        balance: {
                            increment: oldAmount
                        }
                    }
                });
            }
            // Subtract from new account
            if (newAccountId) {
                await tx.account.update({
                    where: { id: newAccountId },
                    data: {
                        balance: {
                            decrement: newAmount
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
    
    // Convert Decimal amounts to number to prevent serialization issues
    return {
        ...result,
        amount: parseFloat(result.amount.toString()),
        interestRate: parseFloat(result.interestRate.toString()),
        lentDate: new Date(result.lentDate),
        dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
        repayments: result.repayments?.map(repayment => ({
            ...repayment,
            amount: parseFloat(repayment.amount.toString()),
            repaymentDate: new Date(repayment.repaymentDate),
            createdAt: new Date(repayment.createdAt),
            updatedAt: new Date(repayment.updatedAt),
        })),
    } as DebtInterface;
}

export async function deleteDebt(id: number) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the debt belongs to the user
    const existingDebt = await prisma.debt.findFirst({
        where: {
            id,
            userId: userId,
        },
    });

    if (!existingDebt) {
        throw new Error("Debt not found or unauthorized");
    }

    // Use a transaction to ensure both debt deletion and account balance update
    await prisma.$transaction(async (tx) => {
        // Delete the debt
        await tx.debt.delete({
            where: { id }
        });

        // Update the account balance (increase by debt amount since debt is removed)
        const accountId = (existingDebt as any).accountId; // Cast for now until schema is updated
        if (accountId) {
            await tx.account.update({
                where: { id: accountId },
                data: {
                    balance: {
                        increment: parseFloat(existingDebt.amount.toString())
                    }
                }
            });
        }
    });

    // Revalidate related pages
    revalidatePath("/(dashboard)/debts");
    revalidatePath("/(dashboard)/accounts");
    
    return { success: true };
}

export async function addRepayment(debtId: number, amount: number, notes?: string, accountId?: number) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify the debt belongs to the user
    const existingDebt = await prisma.debt.findFirst({
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

    // Calculate total repayments
    const totalRepayments = existingDebt.repayments.reduce((sum, repayment) => {
        return sum + parseFloat(repayment.amount.toString());
    }, 0);

    const newTotalRepayments = totalRepayments + amount;
    const originalAmount = parseFloat(existingDebt.amount.toString());

    // Use a transaction to ensure both repayment creation and account balance are updated atomically
    const result = await prisma.$transaction(async (tx) => {
        // Create the repayment
        const repayment = await tx.debtRepayment.create({
            data: {
                amount,
                notes,
                debtId,
                accountId,
            },
        });

        // Update debt status based on repayments
        let newStatus = existingDebt.status;
        if (newTotalRepayments >= originalAmount) {
            newStatus = 'FULLY_PAID';
        } else if (newTotalRepayments > 0) {
            newStatus = 'PARTIALLY_PAID';
        }

        // Update the debt status
        await tx.debt.update({
            where: { id: debtId },
            data: { status: newStatus },
        });

        // Update the account balance (increase by repayment amount)
        // Priority: use the selected accountId for repayment, otherwise use the debt's original account
        const targetAccountId = accountId || (existingDebt as any).accountId;
        if (targetAccountId) {
            await tx.account.update({
                where: { id: targetAccountId },
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

    return {
        ...result,
        amount: parseFloat(result.amount.toString()),
        repaymentDate: new Date(result.repaymentDate),
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
    };
} 