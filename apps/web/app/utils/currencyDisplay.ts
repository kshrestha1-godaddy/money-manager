/**
 * Currency Display Utilities
 * Handles currency conversion for UI display purposes
 */

import { convertCurrency } from './currencyConversion';
import { formatCurrency, SupportedCurrency } from './currency';

/**
 * Convert an amount from stored currency to user's preferred currency for display
 * @param amount - The stored amount
 * @param storedCurrency - The currency the amount is stored in
 * @param userCurrency - The user's preferred currency for display
 * @returns Promise<number> - The converted amount
 */
export async function convertForDisplay(
    amount: number,
    storedCurrency: string,
    userCurrency: string
): Promise<number> {
    // If currencies are the same, no conversion needed
    if (storedCurrency.toLowerCase() === userCurrency.toLowerCase()) {
        return amount;
    }

    try {
        return await convertCurrency(amount, storedCurrency, userCurrency);
    } catch (error) {
        console.warn(`Failed to convert ${amount} from ${storedCurrency} to ${userCurrency}:`, error);
        // Return original amount as fallback
        return amount;
    }
}

/**
 * Convert and format an amount for display in user's preferred currency
 * @param amount - The stored amount
 * @param storedCurrency - The currency the amount is stored in
 * @param userCurrency - The user's preferred currency for display
 * @returns Promise<string> - The formatted converted amount
 */
export async function convertAndFormatForDisplay(
    amount: number,
    storedCurrency: string,
    userCurrency: string
): Promise<string> {
    try {
        const convertedAmount = await convertForDisplay(amount, storedCurrency, userCurrency);
        return formatCurrency(convertedAmount, userCurrency);
    } catch (error) {
        console.warn(`Failed to convert and format ${amount} from ${storedCurrency} to ${userCurrency}:`, error);
        // Return formatted original amount as fallback
        return formatCurrency(amount, storedCurrency);
    }
}

/**
 * Convert multiple amounts for display (useful for tables)
 * @param items - Array of items with amount and currency
 * @param userCurrency - The user's preferred currency for display
 * @returns Promise<Array> - Array of items with converted amounts
 */
export async function convertMultipleForDisplay<T extends { amount: number; currency: string }>(
    items: T[],
    userCurrency: string
): Promise<Array<T & { convertedAmount: number; displayCurrency: string }>> {
    const conversions = await Promise.allSettled(
        items.map(async (item) => {
            const convertedAmount = await convertForDisplay(item.amount, item.currency, userCurrency);
            return {
                ...item,
                convertedAmount,
                displayCurrency: userCurrency
            };
        })
    );

    return conversions.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            // Fallback: use original amount if conversion fails
            console.warn(`Failed to convert item ${index}:`, result.reason);
            const item = items[index];
            if (!item) {
                throw new Error(`Item at index ${index} is undefined`);
            }
            return {
                ...item,
                convertedAmount: item.amount,
                displayCurrency: item.currency
            };
        }
    });
}

/**
 * Sync version of currency conversion for simple INR/NPR conversions
 * Falls back to async conversion for USD
 */
export function convertForDisplaySync(
    amount: number,
    storedCurrency: string,
    userCurrency: string
): number {
    // If currencies are the same, no conversion needed
    if (storedCurrency.toLowerCase() === userCurrency.toLowerCase()) {
        return amount;
    }

    // Handle simple INR/NPR conversions synchronously
    if ((storedCurrency === 'INR' && userCurrency === 'NPR') || 
        (storedCurrency === 'NPR' && userCurrency === 'INR')) {
        const INR_TO_NPR_RATE = 1.6;
        if (storedCurrency === 'INR' && userCurrency === 'NPR') {
            return amount * INR_TO_NPR_RATE;
        } else {
            return amount / INR_TO_NPR_RATE;
        }
    }

    // For USD conversions or other currencies, return original amount
    // The async version should be used instead
    console.warn(`Sync conversion not available for ${storedCurrency} to ${userCurrency}, use convertForDisplay instead`);
    return amount;
}
