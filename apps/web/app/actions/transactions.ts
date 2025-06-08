"use server";

import prisma from "@repo/db/client";
import { Transaction } from "../types/financial";
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

export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

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
            amount: parseFloat(expense.amount.toString()),
            date: new Date(expense.date),
            category: expense.category.name,
            account: expense.account?.bankName || 'Unknown Account'
        }));

        // Transform incomes to Transaction format
        const incomeTransactions: Transaction[] = incomes.map(income => ({
            id: `income-${income.id}`,
            type: 'INCOME' as const,
            title: income.title,
            amount: parseFloat(income.amount.toString()),
            date: new Date(income.date),
            category: income.category.name,
            account: income.account?.bankName || 'Unknown Account'
        }));

        // Combine and sort all transactions by date (newest first)
        const allTransactions = [...expenseTransactions, ...incomeTransactions]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, limit);

        return allTransactions;
    } catch (error) {
        console.error("Error fetching recent transactions:", error);
        throw new Error("Failed to fetch recent transactions");
    }
}

export async function getAllTransactions(): Promise<Transaction[]> {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            throw new Error("Unauthorized");
        }

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
            amount: parseFloat(expense.amount.toString()),
            date: new Date(expense.date),
            category: expense.category.name,
            account: expense.account?.bankName || 'Unknown Account'
        }));

        // Transform incomes to Transaction format
        const incomeTransactions: Transaction[] = incomes.map(income => ({
            id: `income-${income.id}`,
            type: 'INCOME' as const,
            title: income.title,
            amount: parseFloat(income.amount.toString()),
            date: new Date(income.date),
            category: income.category.name,
            account: income.account?.bankName || 'Unknown Account'
        }));

        // Combine and sort all transactions by date (newest first)
        const allTransactions = [...expenseTransactions, ...incomeTransactions]
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        return allTransactions;
    } catch (error) {
        console.error("Error fetching all transactions:", error);
        throw new Error("Failed to fetch all transactions");
    }
} 