"use server";

import prisma from "@repo/db/client";
import { Transaction } from "../types/financial";
import { 
    getUserIdFromSession, 
    getAuthenticatedSession,
    decimalToNumber 
} from "../utils/auth";

export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Fetch recent expenses for the current user only
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
            },
            take: limit
        });

        // Fetch recent incomes for the current user only
        const incomes = await prisma.income.findMany({
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
            },
            take: limit
        });

        // Transform expenses to Transaction format
        const expenseTransactions: Transaction[] = expenses.map(expense => ({
            id: `expense-${expense.id}`,
            type: 'EXPENSE' as const,
            title: expense.title,
            amount: decimalToNumber(expense.amount, 'expense amount'),
            date: new Date(expense.date),
            category: expense.category.name,
            account: expense.account?.bankName || 'Cash',
            description: expense.description,
            notes: expense.notes,
            tags: expense.tags
        }));

        // Transform incomes to Transaction format
        const incomeTransactions: Transaction[] = incomes.map(income => ({
            id: `income-${income.id}`,
            type: 'INCOME' as const,
            title: income.title,
            amount: decimalToNumber(income.amount, 'income amount'),
            date: new Date(income.date),
            category: income.category.name,
            account: income.account?.bankName || 'Cash',
            description: income.description,
            notes: income.notes,
            tags: income.tags
        }));

        // Combine and sort all transactions by date (newest first)
        const allTransactions = [...expenseTransactions, ...incomeTransactions]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, limit);

        return allTransactions;
    } catch (error) {
        console.error(`Failed to fetch recent transactions (limit: ${limit}):`, error);
        throw new Error("Failed to fetch recent transactions");
    }
}

export async function getAllTransactions(): Promise<Transaction[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Fetch all expenses for the current user
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

        // Fetch all incomes for the current user
        const incomes = await prisma.income.findMany({
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

        // Transform expenses to Transaction format
        const expenseTransactions: Transaction[] = expenses.map(expense => ({
            id: `expense-${expense.id}`,
            type: 'EXPENSE' as const,
            title: expense.title,
            amount: decimalToNumber(expense.amount, 'expense amount'),
            date: new Date(expense.date),
            category: expense.category.name,
            account: expense.account?.bankName || 'Cash',
            description: expense.description,
            notes: expense.notes,
            tags: expense.tags
        }));

        // Transform incomes to Transaction format
        const incomeTransactions: Transaction[] = incomes.map(income => ({
            id: `income-${income.id}`,
            type: 'INCOME' as const,
            title: income.title,
            amount: decimalToNumber(income.amount, 'income amount'),
            date: new Date(income.date),
            category: income.category.name,
            account: income.account?.bankName || 'Cash',
            description: income.description,
            notes: income.notes,
            tags: income.tags
        }));

        // Combine and sort all transactions by date (newest first)
        const allTransactions = [...expenseTransactions, ...incomeTransactions]
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        return allTransactions;
    } catch (error) {
        console.error("Failed to fetch all transactions:", error);
        throw new Error("Failed to fetch all transactions");
    }
} 