"use server";

import { revalidatePath } from "next/cache";
import { Income } from "../types/financial";
import prisma from "@repo/db/client";

export async function getIncomes() {
    try {
        const incomes = await prisma.income.findMany({
            include: {
                category: true,
                account: true,
                user: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        // Transform Prisma result to match our Income type
        return incomes.map(income => ({
            ...income,
            amount: parseFloat(income.amount.toString()),
            date: new Date(income.date),
            createdAt: new Date(income.createdAt),
            updatedAt: new Date(income.updatedAt),
            // Convert account balance from Decimal to number
            account: income.account ? {
                ...income.account,
                balance: parseFloat(income.account.balance.toString()),
                accountOpeningDate: new Date(income.account.accountOpeningDate),
                createdAt: new Date(income.account.createdAt),
                updatedAt: new Date(income.account.updatedAt)
            } : null
        })) as Income[];
    } catch (error) {
        console.error("Error fetching incomes:", error);
        throw new Error("Failed to fetch incomes");
    }
}

export async function createIncome(data: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
        const income = await prisma.income.create({
            data: {
                title: data.title,
                description: data.description,
                amount: data.amount,
                date: data.date,
                categoryId: data.categoryId,
                accountId: data.accountId,
                userId: data.userId,
                tags: data.tags,
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

        revalidatePath("/incomes");

        // Transform Prisma result to match our Income type
        return {
            ...income,
            amount: parseFloat(income.amount.toString()),
            date: new Date(income.date),
            createdAt: new Date(income.createdAt),
            updatedAt: new Date(income.updatedAt),
            // Convert account balance from Decimal to number
            account: income.account ? {
                ...income.account,
                balance: parseFloat(income.account.balance.toString()),
                accountOpeningDate: new Date(income.account.accountOpeningDate),
                createdAt: new Date(income.account.createdAt),
                updatedAt: new Date(income.account.updatedAt)
            } : null
        } as Income;
    } catch (error) {
        console.error("Error creating income:", error);
        throw new Error("Failed to create income");
    }
}

export async function updateIncome(id: number, data: Partial<Omit<Income, 'id' | 'createdAt' | 'updatedAt'>>) {
    try {
        const updateData: any = {};
        
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.amount !== undefined) updateData.amount = data.amount;
        if (data.date !== undefined) updateData.date = data.date;
        if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
        if (data.accountId !== undefined) updateData.accountId = data.accountId;
        if (data.userId !== undefined) updateData.userId = data.userId;
        if (data.tags !== undefined) updateData.tags = data.tags;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
        if (data.recurringFrequency !== undefined) updateData.recurringFrequency = data.recurringFrequency;

        const income = await prisma.income.update({
            where: { id },
            data: updateData,
            include: {
                category: true,
                account: true,
                user: true
            }
        });

        revalidatePath("/incomes");

        return {
            ...income,
            amount: parseFloat(income.amount.toString()),
            date: new Date(income.date),
            createdAt: new Date(income.createdAt),
            updatedAt: new Date(income.updatedAt),
            // Convert account balance from Decimal to number
            account: income.account ? {
                ...income.account,
                balance: parseFloat(income.account.balance.toString()),
                accountOpeningDate: new Date(income.account.accountOpeningDate),
                createdAt: new Date(income.account.createdAt),
                updatedAt: new Date(income.account.updatedAt)
            } : null
        } as Income;
    } catch (error) {
        console.error("Error updating income:", error);
        throw new Error("Failed to update income");
    }
}

export async function deleteIncome(id: number) {
    try {
        await prisma.income.delete({
            where: { id }
        });

        revalidatePath("/incomes");
        return { success: true };
    } catch (error) {
        console.error("Error deleting income:", error);
        throw new Error("Failed to delete income");
    }
}

export async function getIncomesByCategory(categoryId: number) {
    try {
        const incomes = await prisma.income.findMany({
            where: { categoryId },
            include: {
                category: true,
                account: true,
                user: true
            },
            orderBy: {
                date: 'desc'
            }
        });

        return incomes.map(income => ({
            ...income,
            amount: parseFloat(income.amount.toString()),
            date: new Date(income.date),
            createdAt: new Date(income.createdAt),
            updatedAt: new Date(income.updatedAt),
            // Convert account balance from Decimal to number
            account: income.account ? {
                ...income.account,
                balance: parseFloat(income.account.balance.toString()),
                accountOpeningDate: new Date(income.account.accountOpeningDate),
                createdAt: new Date(income.account.createdAt),
                updatedAt: new Date(income.account.updatedAt)
            } : null
        })) as Income[];
    } catch (error) {
        console.error("Error fetching incomes by category:", error);
        throw new Error("Failed to fetch incomes by category");
    }
}

export async function getIncomesByDateRange(startDate: Date, endDate: Date) {
    try {
        const incomes = await prisma.income.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
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

        return incomes.map(income => ({
            ...income,
            amount: parseFloat(income.amount.toString()),
            date: new Date(income.date),
            createdAt: new Date(income.createdAt),
            updatedAt: new Date(income.updatedAt),
            // Convert account balance from Decimal to number
            account: income.account ? {
                ...income.account,
                balance: parseFloat(income.account.balance.toString()),
                accountOpeningDate: new Date(income.account.accountOpeningDate),
                createdAt: new Date(income.account.createdAt),
                updatedAt: new Date(income.account.updatedAt)
            } : null
        })) as Income[];
    } catch (error) {
        console.error("Error fetching incomes by date range:", error);
        throw new Error("Failed to fetch incomes by date range");
    }
} 