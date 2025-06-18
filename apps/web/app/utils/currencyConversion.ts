/**
 * Currency Conversion Utility
 * Uses the fawazahmed0 currency API to convert between different currencies
 */

interface CurrencyApiResponse {
  date: string;
  [key: string]: any;
}

interface ConversionRates {
  [currency: string]: number;
}

// Cache for API responses to avoid repeated requests
const rateCache = new Map<string, { rates: ConversionRates; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds

/**
 * Fetches conversion rates from the currency API
 * @param sourceCurrency - The source currency code (e.g., 'usd', 'eur', 'npr')
 * @returns Promise<ConversionRates> - Object containing conversion rates
 */
async function fetchConversionRates(sourceCurrency: string): Promise<ConversionRates> {
  const cacheKey = sourceCurrency.toLowerCase();
  const cached = rateCache.get(cacheKey);
  
  // Check if we have cached data that's still fresh
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rates;
  }

  try {
    const apiUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${sourceCurrency.toLowerCase()}.json`;
    
    console.info(`Fetching currency rates for ${sourceCurrency.toUpperCase()}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch currency rates: ${response.status} ${response.statusText}`);
    }
    
    const data: CurrencyApiResponse = await response.json();
    
    // Extract the rates object (the key will be the source currency)
    const rates = data[sourceCurrency.toLowerCase()];
    
    if (!rates) {
      throw new Error(`No conversion rates found for currency: ${sourceCurrency}`);
    }
    
    // Cache the rates
    rateCache.set(cacheKey, {
      rates,
      timestamp: Date.now()
    });
    
    return rates;
  } catch (error) {
    console.error(`Failed to fetch currency rates for ${sourceCurrency}:`, error);
    throw new Error(`Unable to fetch currency conversion rates for ${sourceCurrency}`);
  }
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
 * Gets all available currencies from the API
 * @param baseCurrency - The base currency to fetch rates for (default: 'usd')
 * @returns Promise<string[]> - Array of available currency codes
 */
export async function getAvailableCurrencies(baseCurrency: string = 'usd'): Promise<string[]> {
  try {
    const rates = await fetchConversionRates(baseCurrency);
    return Object.keys(rates).sort();
  } catch (error) {
    console.error('Failed to fetch available currencies:', error);
    throw new Error('Unable to fetch available currencies');
  }
}

/**
 * Clears the currency rate cache
 * Useful for forcing fresh data fetch
 */
export function clearCurrencyCache(): void {
  rateCache.clear();
  console.info('Currency rate cache cleared');
}

/**
 * Gets the current cache status
 * @returns Object containing cache information
 */
export function getCacheStatus(): { size: number; entries: string[] } {
  return {
    size: rateCache.size,
    entries: Array.from(rateCache.keys())
  };
} 