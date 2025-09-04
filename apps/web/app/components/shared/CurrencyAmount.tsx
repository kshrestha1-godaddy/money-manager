/**
 * CurrencyAmount Component
 * Displays monetary amounts with automatic currency conversion
 */

import React from 'react';
import { useFormattedCurrency } from '../../hooks/useCurrencyConversion';
import { formatCurrency } from '../../utils/currency';

interface CurrencyAmountProps {
    amount: number;
    storedCurrency: string;
    userCurrency: string;
    className?: string;
    showOriginal?: boolean;
    prefix?: string;
    suffix?: string;
}

export function CurrencyAmount({
    amount,
    storedCurrency,
    userCurrency,
    className = '',
    showOriginal = false,
    prefix = '',
    suffix = ''
}: CurrencyAmountProps) {
    const formattedAmount = useFormattedCurrency(amount, storedCurrency, userCurrency);
    
    // If currencies are the same, just show the amount
    if (storedCurrency.toLowerCase() === userCurrency.toLowerCase()) {
        return (
            <span className={className}>
                {prefix}{formattedAmount}{suffix}
            </span>
        );
    }

    // Show converted amount with optional original amount
    return (
        <span className={className}>
            {prefix}{formattedAmount}{suffix}
            {showOriginal && (
                <span className="text-xs text-gray-500 ml-1">
                    (orig: {formatCurrency(amount, storedCurrency)})
                </span>
            )}
        </span>
    );
}

interface SimpleCurrencyAmountProps {
    amount: number;
    currency: string;
    className?: string;
    prefix?: string;
    suffix?: string;
}

/**
 * Simple currency amount display without conversion
 */
export function SimpleCurrencyAmount({
    amount,
    currency,
    className = '',
    prefix = '',
    suffix = ''
}: SimpleCurrencyAmountProps) {
    return (
        <span className={className}>
            {prefix}{formatCurrency(amount, currency)}{suffix}
        </span>
    );
}
