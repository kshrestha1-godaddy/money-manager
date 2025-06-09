"use server";

import { revalidatePath } from "next/cache";
import { Expense } from "../types/financial";
import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";

// Helper function to get user ID from session
function getUserIdFromSession(sessionUserId: string): number {
    // If it's a very large number (OAuth provider), take last 5 digits
    if (sessionUserId.length > 5) {
        return parseInt(sessionUserId.slice(-5));
    }
    // Otherwise parse normally
    return parseInt(sessionUserId);
}

export async function getExpenses() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const expenses = await prisma.expense.findMany({
            where: {
                userId: userId
            },
            include: {
                category: true,
                account: true,
                user: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        // Transform Prisma result to match our Expense type
        return expenses.map(expense => ({
            ...expense,
            amount: parseFloat(expense.amount.toString()),
            date: new Date(expense.date),
            createdAt: new Date(expense.createdAt),
            updatedAt: new Date(expense.updatedAt),
            // Convert account balance from Decimal to number
            account: expense.account ? {
                ...expense.account,
                balance: parseFloat(expense.account.balance.toString()),
                accountOpeningDate: new Date(expense.account.accountOpeningDate),
                createdAt: new Date(expense.account.createdAt),
                updatedAt: new Date(expense.account.updatedAt)
            } : null
        })) as Expense[];
    } catch (error) {
        console.error("Error fetching expenses:", error);
        throw new Error("Failed to fetch expenses");
    }
}

export async function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Use a transaction to ensure both expense and account balance are updated atomically
        const result = await prisma.$transaction(async (tx) => {
            // Create the expense
            const expense = await tx.expense.create({
                data: {
                    title: data.title,
                    description: data.description,
                    amount: data.amount,
                    date: data.date,
                    categoryId: data.categoryId,
                    accountId: data.accountId,
                    userId: userId,
                    tags: data.tags,
                    receipt: data.receipt,
                    notes: data.notes,
                    isRecurring: data.isRecurring,
                    recurringFrequency: data.recurringFrequency
                },
                include: {
                    category: true,
                    account: true,
                    user: true
                }
            });

            // Update the account balance (decrease by expense amount)
            if (data.accountId) {
                await tx.account.update({
                    where: { id: data.accountId },
                    data: {
                        balance: {
                            decrement: data.amount
                        }
                    }
                });
            }

            return expense;
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/accounts");

        // Transform Prisma result to match our Expense type
        return {
            ...result,
            amount: parseFloat(result.amount.toString()),
            date: new Date(result.date),
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            // Convert account balance from Decimal to number
            account: result.account ? {
                ...result.account,
                balance: parseFloat((result.account.balance.toNumber() - data.amount).toString()),
                accountOpeningDate: new Date(result.account.accountOpeningDate),
                createdAt: new Date(result.account.createdAt),
                updatedAt: new Date(result.account.updatedAt)
            } : null
        } as Expense;
    } catch (error) {
        console.error("Error creating expense:", error);
        throw new Error("Failed to create expense");
    }
}

export async function updateExpense(id: number, data: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify the expense belongs to the user
        const existingExpense = await prisma.expense.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingExpense) {
            throw new Error("Expense not found or unauthorized");
        }

        const updateData: any = {};
        
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.date !== undefined) updateData.date = data.date;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
        if (data.accountId !== undefined) updateData.accountId = data.accountId;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.receipt !== undefined) updateData.receipt = data.receipt;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
        if (data.recurringFrequency !== undefined) updateData.recurringFrequency = data.recurringFrequency;

        // Use a transaction to handle expense update and account balance changes
        const result = await prisma.$transaction(async (tx) => {
            // Update the expense
            const expense = await tx.expense.update({
                where: { id },
                data: updateData,
                include: {
                    category: true,
                    account: true,
                    user: true
                }
            });

            // Handle account balance changes
            const oldAmount = parseFloat(existingExpense.amount.toString());
            const newAmount = data.amount !== undefined ? data.amount : oldAmount;
            const oldAccountId = existingExpense.accountId;
            const newAccountId = data.accountId !== undefined ? data.accountId : oldAccountId;

            // If amount changed and same account
            if (data.amount !== undefined && oldAccountId === newAccountId && oldAccountId) {
                const amountDifference = newAmount - oldAmount;
                // For expenses: if amount increased, decrease balance more; if decreased, increase balance
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
            else if (data.accountId !== undefined && oldAccountId !== newAccountId) {
                // Add back to old account (expense no longer from that account)
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

            return expense;
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/accounts");

        return {
            ...result,
            amount: parseFloat(result.amount.toString()),
            date: new Date(result.date),
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            // Convert account balance from Decimal to number
            account: result.account ? {
                ...result.account,
                balance: parseFloat(result.account.balance.toString()),
                accountOpeningDate: new Date(result.account.accountOpeningDate),
                createdAt: new Date(result.account.createdAt),
                updatedAt: new Date(result.account.updatedAt)
            } : null
        } as Expense;
    } catch (error) {
        console.error("Error updating expense:", error);
        throw new Error("Failed to update expense");
    }
}

export async function deleteExpense(id: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        // Verify the expense belongs to the user
        const existingExpense = await prisma.expense.findFirst({
            where: {
                id,
                userId: userId,
            },
        });

        if (!existingExpense) {
            throw new Error("Expense not found or unauthorized");
        }

        // Use a transaction to ensure both expense deletion and account balance update
        await prisma.$transaction(async (tx) => {
            // Delete the expense
            await tx.expense.delete({
                where: { id }
            });

            // Update the account balance (increase by expense amount since expense is removed)
            if (existingExpense.accountId) {
                await tx.account.update({
                    where: { id: existingExpense.accountId },
                    data: {
                        balance: {
                            increment: parseFloat(existingExpense.amount.toString())
                        }
                    }
                });
            }
        });

        revalidatePath("/(dashboard)/expenses");
        revalidatePath("/(dashboard)/accounts");
        return { success: true };
    } catch (error) {
        console.error("Error deleting expense:", error);
        throw new Error("Failed to delete expense");
    }
}

export async function getExpensesByCategory(categoryId: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const expenses = await prisma.expense.findMany({
            where: { 
                categoryId,
                userId: userId
            },
            include: {
                category: true,
                account: true,
                user: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        return expenses.map(expense => ({
            ...expense,
            amount: parseFloat(expense.amount.toString()),
            date: new Date(expense.date),
            createdAt: new Date(expense.createdAt),
            updatedAt: new Date(expense.updatedAt),
            // Convert account balance from Decimal to number
            account: expense.account ? {
                ...expense.account,
                balance: parseFloat(expense.account.balance.toString()),
                accountOpeningDate: new Date(expense.account.accountOpeningDate),
                createdAt: new Date(expense.account.createdAt),
                updatedAt: new Date(expense.account.updatedAt)
            } : null
        })) as Expense[];
    } catch (error) {
        console.error("Error fetching expenses by category:", error);
        throw new Error("Failed to fetch expenses by category");
    }
}

export async function getExpensesByDateRange(startDate: Date, endDate: Date) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

        const userId = getUserIdFromSession(session.user.id);

        const expenses = await prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                userId: userId
            },
            include: {
                category: true,
                account: true,
                user: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        return expenses.map(expense => ({
            ...expense,
            amount: parseFloat(expense.amount.toString()),
            date: new Date(expense.date),
            createdAt: new Date(expense.createdAt),
            updatedAt: new Date(expense.updatedAt),
            // Convert account balance from Decimal to number
            account: expense.account ? {
                ...expense.account,
                balance: parseFloat(expense.account.balance.toString()),
                accountOpeningDate: new Date(expense.account.accountOpeningDate),
                createdAt: new Date(expense.account.createdAt),
                updatedAt: new Date(expense.account.updatedAt)
            } : null
        })) as Expense[];
    } catch (error) {
        console.error("Error fetching expenses by date range:", error);
        throw new Error("Failed to fetch expenses by date range");
    }
} 