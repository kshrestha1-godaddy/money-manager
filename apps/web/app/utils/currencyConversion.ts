/**
 * Currency Conversion Utility
 * Uses static conversion rates for USD, INR, and NPR currencies
 */

interface ConversionRates {
  [currency: string]: number;
}

// Static conversion rates based on:
// 1 INR = 1.6 NPR
// 1 USD = 140 NPR
const STATIC_RATES: { [sourceCurrency: string]: ConversionRates } = {
  usd: {
    usd: 1,
    inr: 87.5,      // 1 USD = 140 NPR, 1 INR = 1.6 NPR, so 1 USD = 140/1.6 = 87.5 INR
    npr: 140        // 1 USD = 140 NPR
  },
  inr: {
    usd: 0.011428571,  // 1 INR = 1.6/140 = 0.011428571 USD
    inr: 1,
    npr: 1.6           // 1 INR = 1.6 NPR
  },
  npr: {
    usd: 0.007142857,  // 1 NPR = 1/140 = 0.007142857 USD
    inr: 0.625,        // 1 NPR = 1/1.6 = 0.625 INR
    npr: 1
  }
};

/**
 * Gets conversion rates from static rate table
 * @param sourceCurrency - The source currency code (e.g., 'usd', 'inr', 'npr')
 * @returns Promise<ConversionRates> - Object containing conversion rates
 */
async function fetchConversionRates(sourceCurrency: string): Promise<ConversionRates> {
  const source = sourceCurrency.toLowerCase();
  
  // Check if we have rates for this currency
  if (!STATIC_RATES[source]) {
    throw new Error(`Conversion rates not available for currency: ${sourceCurrency.toUpperCase()}. Supported currencies: USD, INR, NPR`);
  }
  
  return STATIC_RATES[source];
}

/**
 * Converts an amount from one currency to another
 * @param amount - The amount to convert
 * @param sourceCurrency - The source currency code (e.g., 'usd', 'eur', 'npr')
 * @param destinationCurrency - The destination currency code (e.g., 'usd', 'eur', 'npr')
 * @returns Promise<number> - The converted amount
 */
export async function convertCurrency(
  amount: number,
  sourceCurrency: string,
  destinationCurrency: string
): Promise<number> {
  // Validate inputs
  if (!amount || isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount provided for currency conversion');
  }
  
  if (!sourceCurrency || !destinationCurrency) {
    throw new Error('Source and destination currencies are required');
  }
  
  // Normalize currency codes to lowercase
  const source = sourceCurrency.toLowerCase();
  const destination = destinationCurrency.toLowerCase();
  
  // If same currency, return the original amount
  if (source === destination) {
    return amount;
  }
  
  try {
    // Fetch conversion rates from source currency
    const rates = await fetchConversionRates(source);
    
    // Get the conversion rate for the destination currency
    const rate = rates[destination];
    
    if (rate === undefined || rate === null) {
      throw new Error(`Conversion rate not found for ${destination.toUpperCase()}`);
    }
    
    // Calculate converted amount
    const convertedAmount = amount * rate;
    
    console.info(`Converted ${amount} ${source.toUpperCase()} to ${convertedAmount.toFixed(4)} ${destination.toUpperCase()}`);
    
    // Round to 4 decimal places for precision
    return Math.round(convertedAmount * 10000) / 10000;
  } catch (error) {
    console.error(`Currency conversion failed: ${amount} ${source.toUpperCase()} to ${destination.toUpperCase()}:`, error);
    throw error;
  }
}

/**
 * Converts an amount with formatting options
 * @param amount - The amount to convert
 * @param sourceCurrency - The source currency code
 * @param destinationCurrency - The destination currency code
 * @param options - Formatting options
 * @returns Promise<string> - The formatted converted amount
 */
export async function convertCurrencyFormatted(
  amount: number,
  sourceCurrency: string,
  destinationCurrency: string,
  options: {
    decimals?: number;
    includeSymbol?: boolean;
    locale?: string;
  } = {}
): Promise<string> {
  const {
    decimals = 2,
    includeSymbol = true,
    locale = 'en-US'
  } = options;
  
  try {
    const convertedAmount = await convertCurrency(amount, sourceCurrency, destinationCurrency);
    
    if (includeSymbol) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: destinationCurrency.toUpperCase(),
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(convertedAmount);
    } else {
      return convertedAmount.toFixed(decimals);
    }
  } catch (error) {
    console.error('Failed to format converted currency:', error);
    throw error;
  }
}

/**
 * Gets all available currencies from static rates
 * @param baseCurrency - The base currency (not used for static rates but kept for compatibility)
 * @returns Promise<string[]> - Array of available currency codes
 */
export async function getAvailableCurrencies(baseCurrency: string = 'usd'): Promise<string[]> {
  return Object.keys(STATIC_RATES).map(currency => currency.toUpperCase()).sort();
}

/**
 * Clears the currency rate cache (no-op for static rates)
 * Kept for compatibility with existing code
 */
export function clearCurrencyCache(): void {
  console.info('Using static currency rates - no cache to clear');
}

/**
 * Gets the current cache status (returns static rate info)
 * @returns Object containing static rate information
 */
export function getCacheStatus(): { size: number; entries: string[] } {
  return {
    size: Object.keys(STATIC_RATES).length,
    entries: Object.keys(STATIC_RATES).map(currency => currency.toUpperCase())
  };
} 