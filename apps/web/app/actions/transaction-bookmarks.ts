"use server";

import { TransactionBookmark, TransactionBookmarkFormData, TransactionBookmarkUpdateData, BookmarkedTransaction } from "../types/transaction-bookmarks";
import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";

export async function getTransactionBookmarks(): Promise<TransactionBookmark[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        const bookmarks = await prisma.transactionBookmark.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return bookmarks.map(bookmark => ({
            ...bookmark,
            userId: bookmark.userId
        }));
    } catch (error) {
        console.error("Error fetching transaction bookmarks:", error);
        throw new Error("Failed to fetch transaction bookmarks");
    }
}

export async function getBookmarkedTransactions(): Promise<BookmarkedTransaction[]> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        const bookmarks = await prisma.transactionBookmark.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const bookmarkedTransactions: BookmarkedTransaction[] = [];

        for (const bookmark of bookmarks) {
            let transaction = null;
            
            if (bookmark.transactionType === 'INCOME') {
                transaction = await prisma.income.findUnique({
                    where: { id: bookmark.transactionId },
                    include: {
                        category: true,
                        account: true
                    }
                });
            } else if (bookmark.transactionType === 'EXPENSE') {
                transaction = await prisma.expense.findUnique({
                    where: { id: bookmark.transactionId },
                    include: {
                        category: true,
                        account: true
                    }
                });
            }

            if (transaction) {
                bookmarkedTransactions.push({
                    bookmark: {
                        ...bookmark,
                        userId: bookmark.userId
                    },
                    transaction: {
                        id: transaction.id,
                        title: transaction.title,
                        amount: Number(transaction.amount),
                        date: transaction.date,
                        category: transaction.category,
                        account: transaction.account
                    }
                });
            }
        }

        return bookmarkedTransactions;
    } catch (error) {
        console.error("Error fetching bookmarked transactions:", error);
        throw new Error("Failed to fetch bookmarked transactions");
    }
}

export async function createTransactionBookmark(data: TransactionBookmarkFormData): Promise<TransactionBookmark> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        // Check if bookmark already exists
        const existingBookmark = await prisma.transactionBookmark.findUnique({
            where: {
                transactionType_transactionId_userId: {
                    transactionType: data.transactionType,
                    transactionId: data.transactionId,
                    userId: userId
                }
            }
        });

        if (existingBookmark) {
            throw new Error("Transaction is already bookmarked");
        }

        const bookmark = await prisma.transactionBookmark.create({
            data: {
                transactionType: data.transactionType,
                transactionId: data.transactionId,
                title: data.title,
                description: data.description || null,
                notes: data.notes || null,
                tags: data.tags || [],
                userId: userId
            }
        });

        return {
            ...bookmark,
            userId: bookmark.userId
        };
    } catch (error) {
        console.error("Error creating transaction bookmark:", error);
        throw new Error("Failed to create transaction bookmark");
    }
}

export async function updateTransactionBookmark(data: TransactionBookmarkUpdateData): Promise<TransactionBookmark> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        // Verify the bookmark belongs to the user
        const existingBookmark = await prisma.transactionBookmark.findFirst({
            where: {
                id: data.id,
                userId: userId
            }
        });

        if (!existingBookmark) {
            throw new Error("Transaction bookmark not found or unauthorized");
        }

        const updateData: any = {
            updatedAt: new Date()
        };

        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.tags !== undefined) updateData.tags = data.tags;

        const updatedBookmark = await prisma.transactionBookmark.update({
            where: {
                id: data.id
            },
            data: updateData
        });

        return {
            ...updatedBookmark,
            userId: updatedBookmark.userId
        };
    } catch (error) {
        console.error("Error updating transaction bookmark:", error);
        throw new Error("Failed to update transaction bookmark");
    }
}

export async function deleteTransactionBookmark(id: number): Promise<void> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        // Verify the bookmark belongs to the user
        const existingBookmark = await prisma.transactionBookmark.findFirst({
            where: {
                id: id,
                userId: userId
            }
        });

        if (!existingBookmark) {
            throw new Error("Transaction bookmark not found or unauthorized");
        }

        await prisma.transactionBookmark.delete({
            where: {
                id: id
            }
        });
    } catch (error) {
        console.error("Error deleting transaction bookmark:", error);
        throw new Error("Failed to delete transaction bookmark");
    }
}

export async function deleteTransactionBookmarkByTransaction(
    transactionType: 'INCOME' | 'EXPENSE',
    transactionId: number
): Promise<void> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        await prisma.transactionBookmark.deleteMany({
            where: {
                transactionType,
                transactionId,
                userId: userId
            }
        });
    } catch (error) {
        console.error("Error deleting transaction bookmark:", error);
        throw new Error("Failed to delete transaction bookmark");
    }
}

export async function isTransactionBookmarked(
    transactionType: 'INCOME' | 'EXPENSE',
    transactionId: number
): Promise<boolean> {
    try {
        const session = await getAuthenticatedSession();
        const userId = getUserIdFromSession(session.user.id);
        
        const bookmark = await prisma.transactionBookmark.findUnique({
            where: {
                transactionType_transactionId_userId: {
                    transactionType,
                    transactionId,
                    userId: userId
                }
            }
        });

        return !!bookmark;
    } catch (error) {
        console.error("Error checking if transaction is bookmarked:", error);
        return false;
    }
} 