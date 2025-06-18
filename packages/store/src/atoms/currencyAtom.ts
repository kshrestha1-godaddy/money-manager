import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

// Types for currency conversion
export interface ConversionRates {
  [currency: string]: number;
}

export interface CurrencyData {
  rates: ConversionRates;
  lastUpdated: number;
  baseCurrency: string;
}

export interface CurrencyState {
  usd: CurrencyData | null;
  inr: CurrencyData | null;
  npr: CurrencyData | null;
  isLoading: boolean;
  error: string | null;
}

// Cache duration: 24 hour
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

// Base atom for currency state with localStorage persistence
export const currencyStateAtom = atomWithStorage<CurrencyState>('currency-conversion-rates', {
  usd: null,
  inr: null,
  npr: null,
  isLoading: false,
  error: null,
});

// Atom for tracking which currencies are being fetched
export const fetchingCurrenciesAtom = atom<Set<string>>(new Set<string>());

// Utility function to check if data is stale
const isDataStale = (lastUpdated: number): boolean => {
  return Date.now() - lastUpdated > CACHE_DURATION;
};

// Fetch currency rates from API
const fetchCurrencyRates = async (baseCurrency: string): Promise<ConversionRates> => {
  const apiUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseCurrency.toLowerCase()}.json`;
  
  try {
    console.info(`Fetching currency rates for ${baseCurrency.toUpperCase()}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch currency rates: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const rates = data[baseCurrency.toLowerCase()];
    
    if (!rates) {
      throw new Error(`No conversion rates found for currency: ${baseCurrency}`);
    }
    
    return rates;
  } catch (error) {
    console.error(`Failed to fetch currency rates for ${baseCurrency}:`, error);
    throw new Error(`Unable to fetch currency conversion rates for ${baseCurrency}`);
  }
};

// Write-only atom for updating currency data
export const updateCurrencyDataAtom = atom(
  null,
  async (get, set, { currency, force = false }: { currency: 'usd' | 'inr' | 'npr'; force?: boolean }) => {
    const currentState = get(currencyStateAtom);
    const fetchingCurrencies = get(fetchingCurrenciesAtom);
    
    // Check if already fetching this currency
    if (fetchingCurrencies.has(currency)) {
      return;
    }
    
    // Check if we have fresh data and force is not set
    const existingData = currentState[currency];
    if (!force && existingData && !isDataStale(existingData.lastUpdated)) {
      return;
    }
    
    // Mark as fetching
    set(fetchingCurrenciesAtom, new Set([...fetchingCurrencies, currency]));
    
    // Set loading state
    set(currencyStateAtom, {
      ...currentState,
      isLoading: true,
      error: null,
    });
    
    try {
      const rates = await fetchCurrencyRates(currency);
      
      const newCurrencyData: CurrencyData = {
        rates,
        lastUpdated: Date.now(),
        baseCurrency: currency,
      };
      
      // Update the state with new data
      set(currencyStateAtom, {
        ...currentState,
        [currency]: newCurrencyData,
        isLoading: false,
        error: null,
      });
      
      console.info(`Successfully updated ${currency.toUpperCase()} conversion rates`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`Failed to update ${currency.toUpperCase()} rates:`, error);
      
      set(currencyStateAtom, {
        ...currentState,
        isLoading: false,
        error: errorMessage,
      });
    } finally {
      // Remove from fetching set
      const updatedFetching = new Set(fetchingCurrencies);
      updatedFetching.delete(currency);
      set(fetchingCurrenciesAtom, updatedFetching);
    }
  }
);

// Atom for getting USD rates
export const usdRatesAtom = atom((get) => {
  const state = get(currencyStateAtom);
  return state.usd;
});

// Atom for getting INR rates
export const inrRatesAtom = atom((get) => {
  const state = get(currencyStateAtom);
  return state.inr;
});

// Atom for getting NPR rates
export const nprRatesAtom = atom((get) => {
  const state = get(currencyStateAtom);
  return state.npr;
});

// Atom for getting loading state
export const currencyLoadingAtom = atom((get) => {
  const state = get(currencyStateAtom);
  return state.isLoading;
});

// Atom for getting error state
export const currencyErrorAtom = atom((get) => {
  const state = get(currencyStateAtom);
  return state.error;
});

// Derived atom for currency conversion between any two currencies
export const convertCurrencyAtom = atom(
  null,
  (get, _set, { amount, from, to }: { amount: number; from: string; to: string }) => {
    const state = get(currencyStateAtom);
    
    // Normalize currency codes
    const fromCurrency = from.toLowerCase() as 'usd' | 'inr' | 'npr';
    const toCurrency = to.toLowerCase();
    
    // If same currency, return original amount
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    // Get the source currency data
    const sourceCurrencyData = state[fromCurrency];
    
    if (!sourceCurrencyData) {
      throw new Error(`No conversion data available for ${from.toUpperCase()}`);
    }
    
    // Check if data is stale
    if (isDataStale(sourceCurrencyData.lastUpdated)) {
      throw new Error(`Conversion data for ${from.toUpperCase()} is stale`);
    }
    
    // Get conversion rate
    const rate = sourceCurrencyData.rates[toCurrency];
    
    if (rate === undefined || rate === null) {
      throw new Error(`Conversion rate not found for ${to.toUpperCase()}`);
    }
    
    // Calculate and return converted amount
    const convertedAmount = amount * rate;
    return Math.round(convertedAmount * 10000) / 10000; // Round to 4 decimal places
  }
);

// Atom for checking if all main currencies are loaded and fresh
export const allCurrenciesLoadedAtom = atom((get) => {
  const state = get(currencyStateAtom);
  const currentTime = Date.now();
  
  const currencies: ('usd' | 'inr' | 'npr')[] = ['usd', 'inr', 'npr'];
  
  return currencies.every(currency => {
    const data = state[currency];
    return data && !isDataStale(data.lastUpdated);
  });
});

// Atom for getting the last update time of any currency
export const lastUpdateTimeAtom = atom((get) => {
  const state = get(currencyStateAtom);
  const times = [state.usd?.lastUpdated, state.inr?.lastUpdated, state.npr?.lastUpdated]
    .filter(Boolean) as number[];
  
  return times.length > 0 ? Math.max(...times) : null;
});

// Write-only atom for refreshing all currency data
export const refreshAllCurrenciesAtom = atom(
  null,
  async (get, set) => {
    const currencies: ('usd' | 'inr' | 'npr')[] = ['usd', 'inr', 'npr'];
    
    // Refresh all currencies in parallel
    await Promise.all(
      currencies.map(currency => 
        set(updateCurrencyDataAtom, { currency, force: true })
      )
    );
  }
);

// Write-only atom for initializing currency data on app start
export const initializeCurrencyDataAtom = atom(
  null,
  async (get, set) => {
    const state = get(currencyStateAtom);
    const currencies: ('usd' | 'inr' | 'npr')[] = ['usd', 'inr', 'npr'];
    
    // Check which currencies need to be loaded
    const currenciesToLoad = currencies.filter(currency => {
      const data = state[currency];
      return !data || isDataStale(data.lastUpdated);
    });
    
    if (currenciesToLoad.length > 0) {
      console.info(`Initializing currency data for: ${currenciesToLoad.join(', ').toUpperCase()}`);
      
      // Load currencies in parallel
      await Promise.all(
        currenciesToLoad.map(currency => 
          set(updateCurrencyDataAtom, { currency })
        )
      );
    }
  }
); 