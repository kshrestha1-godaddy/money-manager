"use server";

import { createTransactionBookmark, deleteTransactionBookmarkByTransaction, isTransactionBookmarked } from "../(dashboard)/transactions/actions/transaction-bookmarks";
import { DEFAULT_HIGH_VALUE_THRESHOLDS, isHighValueTransaction } from "./thresholdUtils";
import { getUserThresholds } from "../actions/notifications";

/**
 * Automatically creates a bookmark for high-value transactions
 */
export async function autoBookmarkHighValueTransaction(
    transactionId: number,
    transactionType: 'INCOME' | 'EXPENSE',
    title: string,
    amount: number
): Promise<void> {
    try {
        // Get user's threshold settings
        const userSettings = await getUserThresholds();
        
        // Check if auto-bookmarking is enabled for this user
        if (!userSettings.autoBookmarkEnabled) {
            return;
        }

        const type = transactionType.toLowerCase() as 'income' | 'expense';
        const thresholds = {
            income: userSettings.incomeThreshold,
            expense: userSettings.expenseThreshold
        };
        
        // Check if this is a high-value transaction based on user's thresholds
        if (!isHighValueTransaction(amount, type, thresholds)) {
            return;
        }

        // Check if already bookmarked to avoid duplicates
        const alreadyBookmarked = await isTransactionBookmarked(transactionType, transactionId);
        if (alreadyBookmarked) {
            return;
        }

        // Create auto-bookmark with descriptive title
        const bookmarkData = {
            transactionType,
            transactionId,
            title: `🔥 High-Value ${type === 'income' ? 'Income' : 'Expense'}: ${title}`,
            description: `Automatically bookmarked - Amount exceeds ${type} threshold of $${thresholds[type].toLocaleString()}`,
            notes: `Auto-generated bookmark for high-value ${type} transaction`,
            tags: ['auto-bookmark', 'high-value', type]
        };

        await createTransactionBookmark(bookmarkData);
        console.log(`Auto-bookmarked high-value ${type}: ${title} - $${amount}`);
    } catch (error) {
        console.error(`Failed to auto-bookmark high-value ${transactionType.toLowerCase()}:`, error);
        // Don't throw error to prevent transaction creation from failing
    }
}

/**
 * Handles bookmark updates when transaction amounts change
 */
export async function handleBookmarkOnAmountChange(
    transactionId: number,
    transactionType: 'INCOME' | 'EXPENSE',
    title: string,
    oldAmount: number,
    newAmount: number
): Promise<void> {
    try {
        // Get user's threshold settings
        const userSettings = await getUserThresholds();
        
        // Check if auto-bookmarking is enabled for this user
        if (!userSettings.autoBookmarkEnabled) {
            return;
        }

        const type = transactionType.toLowerCase() as 'income' | 'expense';
        const thresholds = {
            income: userSettings.incomeThreshold,
            expense: userSettings.expenseThreshold
        };
        
        const wasHighValue = isHighValueTransaction(oldAmount, type, thresholds);
        const isHighValue = isHighValueTransaction(newAmount, type, thresholds);

        // If it was high-value but no longer is, remove auto-bookmark
        if (wasHighValue && !isHighValue) {
            await deleteTransactionBookmarkByTransaction(transactionType, transactionId);
            console.log(`Removed auto-bookmark for ${type} (no longer high-value): ${title}`);
        }
        // If it wasn't high-value but now is, create auto-bookmark
        else if (!wasHighValue && isHighValue) {
            await autoBookmarkHighValueTransaction(transactionId, transactionType, title, newAmount);
        }
        // If both are high-value or both are not high-value, no change needed
    } catch (error) {
        console.error(`Failed to handle bookmark update for ${transactionType.toLowerCase()}:`, error);
        // Don't throw error to prevent transaction update from failing
    }
}
