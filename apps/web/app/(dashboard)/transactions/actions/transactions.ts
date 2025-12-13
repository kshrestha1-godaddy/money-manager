"use server";

import prisma from "@repo/db/client";
import { Transaction } from "../../../types/financial";
import { 
    getUserIdFromSession, 
    getAuthenticatedSession,
    decimalToNumber 
} from "../../../utils/auth";

// Helper function to check if transactions are bookmarked
async function checkTransactionBookmarks(
    expenses: any[], 
    incomes: any[], 
    userId: number
): Promise<Map<string, boolean>> {
    const bookmarks = new Map<string, boolean>();
    
    // Get all bookmarks for this user
    const transactionBookmarks = await prisma.transactionBookmark.findMany({
        where: {
            userId: userId
        }
    });
    
    // Create lookup map
    transactionBookmarks.forEach(bookmark => {
        const key = `${bookmark.transactionType.toLowerCase()}-${bookmark.transactionId}`;
        bookmarks.set(key, true);
    });
    
    return bookmarks;
}

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

        // Check which transactions are bookmarked
        const bookmarkMap = await checkTransactionBookmarks(expenses, incomes, userId);

        // Transform expenses to Transaction format
        const expenseTransactions: Transaction[] = expenses.map(expense => ({
            id: `expense-${expense.id}`,
            type: 'EXPENSE' as const,
            title: expense.title,
            amount: decimalToNumber(expense.amount, 'expense amount'),
            currency: expense.currency,
            date: new Date(expense.date),
            category: expense.category.name,
            account: expense.account?.bankName || 'Cash',
            description: expense.description || undefined,
            notes: expense.notes || undefined,
            tags: expense.tags,
            isBookmarked: bookmarkMap.get(`expense-${expense.id}`) || false
        }));

        // Transform incomes to Transaction format
        const incomeTransactions: Transaction[] = incomes.map(income => ({
            id: `income-${income.id}`,
            type: 'INCOME' as const,
            title: income.title,
            amount: decimalToNumber(income.amount, 'income amount'),
            currency: income.currency,
            date: new Date(income.date),
            category: income.category.name,
            account: income.account?.bankName || 'Cash',
            description: income.description || undefined,
            notes: income.notes || undefined,
            tags: income.tags,
            isBookmarked: bookmarkMap.get(`income-${income.id}`) || false
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

export async function getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);

        // Fetch expenses within date range for the current user
        const expenses = await prisma.expense.findMany({
            where: {
                userId: userId,
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

        // Fetch incomes within date range for the current user
        const incomes = await prisma.income.findMany({
            where: {
                userId: userId,
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

        // Check which transactions are bookmarked
        const bookmarkMap = await checkTransactionBookmarks(expenses, incomes, userId);

        // Transform expenses to Transaction format
        const expenseTransactions: Transaction[] = expenses.map(expense => ({
            id: `expense-${expense.id}`,
            type: 'EXPENSE' as const,
            title: expense.title,
            amount: decimalToNumber(expense.amount, 'expense amount'),
            currency: expense.currency,
            date: new Date(expense.date),
            category: expense.category.name,
            account: expense.account?.bankName || 'Cash',
            description: expense.description || undefined,
            notes: expense.notes || undefined,
            tags: expense.tags,
            isBookmarked: bookmarkMap.get(`expense-${expense.id}`) || false
        }));

        // Transform incomes to Transaction format
        const incomeTransactions: Transaction[] = incomes.map(income => ({
            id: `income-${income.id}`,
            type: 'INCOME' as const,
            title: income.title,
            amount: decimalToNumber(income.amount, 'income amount'),
            currency: income.currency,
            date: new Date(income.date),
            category: income.category.name,
            account: income.account?.bankName || 'Cash',
            description: income.description || undefined,
            notes: income.notes || undefined,
            tags: income.tags,
            isBookmarked: bookmarkMap.get(`income-${income.id}`) || false
        }));

        // Combine and sort all transactions by date (newest first)
        const allTransactions = [...expenseTransactions, ...incomeTransactions]
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        return allTransactions;
    } catch (error) {
        console.error(`Failed to fetch transactions by date range (${startDate.toISOString()} - ${endDate.toISOString()}):`, error);
        throw new Error("Failed to fetch transactions by date range");
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

        // Check which transactions are bookmarked
        const bookmarkMap = await checkTransactionBookmarks(expenses, incomes, userId);

        // Transform expenses to Transaction format
        const expenseTransactions: Transaction[] = expenses.map(expense => ({
            id: `expense-${expense.id}`,
            type: 'EXPENSE' as const,
            title: expense.title,
            amount: decimalToNumber(expense.amount, 'expense amount'),
            currency: expense.currency,
            date: new Date(expense.date),
            category: expense.category.name,
            account: expense.account?.bankName || 'Cash',
            description: expense.description || undefined,
            notes: expense.notes || undefined,
            tags: expense.tags,
            isBookmarked: bookmarkMap.get(`expense-${expense.id}`) || false
        }));

        // Transform incomes to Transaction format
        const incomeTransactions: Transaction[] = incomes.map(income => ({
            id: `income-${income.id}`,
            type: 'INCOME' as const,
            title: income.title,
            amount: decimalToNumber(income.amount, 'income amount'),
            currency: income.currency,
            date: new Date(income.date),
            category: income.category.name,
            account: income.account?.bankName || 'Cash',
            description: income.description || undefined,
            notes: income.notes || undefined,
            tags: income.tags,
            isBookmarked: bookmarkMap.get(`income-${income.id}`) || false
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