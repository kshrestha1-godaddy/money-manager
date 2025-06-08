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

        const expense = await prisma.expense.create({
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

        revalidatePath("/(dashboard)/expenses");

        // Transform Prisma result to match our Expense type
        return {
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

        const expense = await prisma.expense.update({
            where: { id },
            data: updateData,
            include: {
                category: true,
                account: true,
                user: true
            }
        });

        revalidatePath("/(dashboard)/expenses");

        return {
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

        await prisma.expense.delete({
            where: { id }
        });

        revalidatePath("/(dashboard)/expenses");
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