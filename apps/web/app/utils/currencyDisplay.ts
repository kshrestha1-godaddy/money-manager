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
 * Sync version of currency conversion using static rates
 * Supports USD, INR, and NPR conversions
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

    // Static conversion rates based on:
    // 1 INR = 1.6 NPR
    // 1 USD = 140 NPR
    const CONVERSION_RATES: { [key: string]: { [key: string]: number } } = {
        usd: {
            usd: 1,
            inr: 87.5,           // 1 USD = 140 NPR, 1 INR = 1.6 NPR, so 1 USD = 140/1.6 = 87.5 INR
            npr: 140             // 1 USD = 140 NPR
        },
        inr: {
            usd: 0.011428571,    // 1 INR = 1.6/140 = 0.011428571 USD
            inr: 1,
            npr: 1.6             // 1 INR = 1.6 NPR
        },
        npr: {
            usd: 0.007142857,    // 1 NPR = 1/140 = 0.007142857 USD
            inr: 0.625,          // 1 NPR = 1/1.6 = 0.625 INR
            npr: 1
        }
    };

    const sourceCurrency = storedCurrency.toLowerCase();
    const targetCurrency = userCurrency.toLowerCase();

    // Check if we have conversion rates for both currencies
    if (CONVERSION_RATES[sourceCurrency] && CONVERSION_RATES[sourceCurrency][targetCurrency] !== undefined) {
        const rate = CONVERSION_RATES[sourceCurrency][targetCurrency];
        return amount * rate;
    }

    // If conversion not supported, log warning and return original amount
    console.warn(`Sync conversion not available for ${storedCurrency} to ${userCurrency}, supported currencies: USD, INR, NPR`);
    return amount;
}
