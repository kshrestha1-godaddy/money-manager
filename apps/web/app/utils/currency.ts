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
    return `${getCurrencySymbol(currencyCode)}0.00`;
  }

  const symbol = getCurrencySymbol(currencyCode);
  
  // Use proper currency formatting with locale-specific options
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    return `${symbol}${formatted}`;
  } catch (error) {
    // Fallback to basic formatting if Intl fails
    return `${symbol}${amount.toFixed(2)}`;
  }
} 

// INR/NPR Conversion Utilities
export const DUAL_CURRENCIES = ['INR', 'NPR'] as const;
export type DualCurrency = typeof DUAL_CURRENCIES[number];

// Exchange rate: 1 INR = 1.6 NPR (approximate)
// This should ideally be fetched from an API, but for now using a fixed rate
export const INR_TO_NPR_RATE = 1.6;
export const NPR_TO_INR_RATE = 1 / INR_TO_NPR_RATE;

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
    
    if (fromCurrency === 'INR' && toCurrency === 'NPR') {
        return amount * INR_TO_NPR_RATE;
    }
    
    if (fromCurrency === 'NPR' && toCurrency === 'INR') {
        return amount * NPR_TO_INR_RATE;
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