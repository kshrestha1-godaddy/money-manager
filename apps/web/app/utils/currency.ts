import { INR_TO_NPR_RATE, NPR_TO_INR_RATE } from "./currencyRates";
import { getEffectiveInrToNprRate } from "./currencyConversion";

export { INR_TO_NPR_RATE, NPR_TO_INR_RATE };

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$ " },
  { code: "INR", name: "Indian Rupee", symbol: "₹ " },
  {code : "NPR", name: "Nepalese Rupee", symbol: "₨ "}
];

export function getCurrencySymbol(currencyCode: string): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || "$";
}

export function formatCurrency(amount: number, currencyCode: string): string {
  // Handle edge cases
  if (!isFinite(amount) || isNaN(amount)) {
    const sym = getCurrencySymbol(currencyCode).trimEnd();
    return `${sym}\u00A00.00`;
  }

  const symbol = getCurrencySymbol(currencyCode).trimEnd();

  // Use proper currency formatting with locale-specific options
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    // Non-breaking space keeps symbol and amount on one line
    return `${symbol}\u00A0${formatted}`;
  } catch (error) {
    // Fallback to basic formatting if Intl fails
    return `${symbol}\u00A0${amount.toFixed(2)}`;
  }
} 

// Supported currencies for income/expense forms
export const SUPPORTED_CURRENCIES = ['INR', 'NPR', 'USD'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// INR/NPR Conversion Utilities (legacy support)
export const DUAL_CURRENCIES = ['INR', 'NPR'] as const;
export type DualCurrency = typeof DUAL_CURRENCIES[number];

/**
 * Convert amount from one dual currency to another
 */
export function convertDualCurrency(
    amount: number,
    fromCurrency: DualCurrency,
    toCurrency: DualCurrency
): number {
    if (fromCurrency === toCurrency) {
        return amount;
    }

    const inrToNpr =
        typeof window !== "undefined"
            ? getEffectiveInrToNprRate()
            : INR_TO_NPR_RATE;
    const nprToInr = 1 / inrToNpr;

    if (fromCurrency === "INR" && toCurrency === "NPR") {
        return amount * inrToNpr;
    }

    if (fromCurrency === "NPR" && toCurrency === "INR") {
        return amount * nprToInr;
    }

    return amount;
}

/**
 * Convert amount to user's account currency (for database storage)
 */
export function convertToAccountCurrency(
    amount: number,
    inputCurrency: DualCurrency,
    accountCurrency: string
): number {
    // If input currency matches account currency, no conversion needed
    if (inputCurrency === accountCurrency) {
        return amount;
    }
    
    // If account currency is not INR or NPR, default to INR
    const targetCurrency = DUAL_CURRENCIES.includes(accountCurrency as DualCurrency) 
        ? accountCurrency as DualCurrency 
        : 'INR';
    
    return convertDualCurrency(amount, inputCurrency, targetCurrency);
}

/**
 * Get both currency values for display
 */
export function getDualCurrencyDisplay(
    amount: number,
    storedCurrency: string
): { inr: number; npr: number } {
    const currency = DUAL_CURRENCIES.includes(storedCurrency as DualCurrency) 
        ? storedCurrency as DualCurrency 
        : 'INR';
    
    if (currency === 'INR') {
        return {
            inr: amount,
            npr: convertDualCurrency(amount, 'INR', 'NPR')
        };
    } else {
        return {
            inr: convertDualCurrency(amount, 'NPR', 'INR'),
            npr: amount
        };
    }
}

/**
 * Format currency with proper symbol for dual currencies
 */
export function formatDualCurrency(amount: number, currency: DualCurrency): string {
    const symbol = currency === 'INR' ? '₹ ' : 'Rs. ';
    return `${symbol}${amount.toLocaleString('en-IN', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    })}`;
}

/**
 * Convert user currency to DualCurrency type safely
 */
export function getUserDualCurrency(userCurrency: string): DualCurrency {
    return DUAL_CURRENCIES.includes(userCurrency as DualCurrency) 
        ? userCurrency as DualCurrency 
        : 'INR';
}

/**
 * Convert user currency to SupportedCurrency type safely
 */
export function getUserSupportedCurrency(userCurrency: string): SupportedCurrency {
    return SUPPORTED_CURRENCIES.includes(userCurrency as SupportedCurrency) 
        ? userCurrency as SupportedCurrency 
        : 'INR';
} 