"use server";

import prisma from "@repo/db/client";
import { Transaction } from "../types/financial";

export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    try {
        // Fetch recent expenses
        const expenses = await prisma.expense.findMany({
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

        // Fetch recent incomes
        const incomes = await prisma.income.findMany({
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