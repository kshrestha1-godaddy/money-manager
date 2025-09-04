/**
 * React Hook for Currency Conversion
 * Handles converting amounts from stored currency to user's preferred currency
 */

import { useState, useEffect, useCallback } from 'react';
import { convertForDisplay, convertAndFormatForDisplay } from '../utils/currencyDisplay';
import { formatCurrency } from '../utils/currency';

interface ConversionResult {
    convertedAmount: number;
    formattedAmount: string;
    isLoading: boolean;
    error?: string;
}

/**
 * Hook to convert a single amount from stored currency to user's preferred currency
 */
export function useCurrencyConversion(
    amount: number,
    storedCurrency: string,
    userCurrency: string
): ConversionResult {
    const [result, setResult] = useState<ConversionResult>({
        convertedAmount: amount,
        formattedAmount: formatCurrency(amount, storedCurrency),
        isLoading: false
    });

    useEffect(() => {
        // If currencies are the same, no conversion needed
        if (storedCurrency.toLowerCase() === userCurrency.toLowerCase()) {
            setResult({
                convertedAmount: amount,
                formattedAmount: formatCurrency(amount, userCurrency),
                isLoading: false
            });
            return;
        }

        // Start conversion
        setResult(prev => ({ ...prev, isLoading: true, error: undefined }));

        convertAndFormatForDisplay(amount, storedCurrency, userCurrency)
            .then((formattedAmount) => {
                return convertForDisplay(amount, storedCurrency, userCurrency)
                    .then((convertedAmount) => {
                        setResult({
                            convertedAmount,
                            formattedAmount,
                            isLoading: false
                        });
                    });
            })
            .catch((error) => {
                console.warn('Currency conversion failed:', error);
                setResult({
                    convertedAmount: amount,
                    formattedAmount: formatCurrency(amount, storedCurrency),
                    isLoading: false,
                    error: error.message
                });
            });
    }, [amount, storedCurrency, userCurrency]);

    return result;
}

/**
 * Hook to convert multiple amounts efficiently
 */
export function useMultipleCurrencyConversion<T extends { amount: number; currency: string }>(
    items: T[],
    userCurrency: string
): Array<T & { convertedAmount: number; formattedAmount: string; isLoading: boolean }> {
    const [results, setResults] = useState<Array<T & { convertedAmount: number; formattedAmount: string; isLoading: boolean }>>(
        items.map(item => ({
            ...item,
            convertedAmount: item.amount,
            formattedAmount: formatCurrency(item.amount, item.currency),
            isLoading: false
        }))
    );

    useEffect(() => {
        // Mark all as loading
        setResults(prev => prev.map(item => ({ ...item, isLoading: true })));

        // Convert all items
        Promise.allSettled(
            items.map(async (item) => {
                try {
                    if (item.currency.toLowerCase() === userCurrency.toLowerCase()) {
                        return {
                            ...item,
                            convertedAmount: item.amount,
                            formattedAmount: formatCurrency(item.amount, userCurrency),
                            isLoading: false
                        };
                    }

                    const [convertedAmount, formattedAmount] = await Promise.all([
                        convertForDisplay(item.amount, item.currency, userCurrency),
                        convertAndFormatForDisplay(item.amount, item.currency, userCurrency)
                    ]);

                    return {
                        ...item,
                        convertedAmount,
                        formattedAmount,
                        isLoading: false
                    };
                } catch (error) {
                    console.warn(`Failed to convert ${item.amount} ${item.currency}:`, error);
                    return {
                        ...item,
                        convertedAmount: item.amount,
                        formattedAmount: formatCurrency(item.amount, item.currency),
                        isLoading: false
                    };
                }
            })
        ).then((results) => {
            const successfulResults = results.map((result, index) => {
                const originalItem = items[index];
                if (!originalItem) {
                    throw new Error(`Item at index ${index} is undefined`);
                }

                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    return {
                        ...originalItem,
                        convertedAmount: originalItem.amount,
                        formattedAmount: formatCurrency(originalItem.amount, originalItem.currency),
                        isLoading: false
                    };
                }
            });
            setResults(successfulResults as Array<T & { convertedAmount: number; formattedAmount: string; isLoading: boolean }>);
        });
    }, [items, userCurrency]);

    return results;
}

/**
 * Simple hook for quick currency formatting with conversion
 */
export function useFormattedCurrency(
    amount: number,
    storedCurrency: string,
    userCurrency: string
): string {
    const { formattedAmount } = useCurrencyConversion(amount, storedCurrency, userCurrency);
    return formattedAmount;
}
