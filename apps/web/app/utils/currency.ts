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