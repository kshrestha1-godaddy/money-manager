import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  currencyStateAtom,
  usdRatesAtom,
  inrRatesAtom,
  nprRatesAtom,
  currencyLoadingAtom,
  currencyErrorAtom,
  convertCurrencyAtom,
  updateCurrencyDataAtom,
  refreshAllCurrenciesAtom,
  initializeCurrencyDataAtom,
  allCurrenciesLoadedAtom,
  lastUpdateTimeAtom,
  type CurrencyData,
} from "../atoms/currencyAtom";
import { useCallback, useEffect } from "react";

// Hook for currency conversion functionality
export const useCurrency = () => {
  const currencyState = useAtomValue(currencyStateAtom);
  const isLoading = useAtomValue(currencyLoadingAtom);
  const error = useAtomValue(currencyErrorAtom);
  const allLoaded = useAtomValue(allCurrenciesLoadedAtom);
  const lastUpdateTime = useAtomValue(lastUpdateTimeAtom);
  
  const updateCurrency = useSetAtom(updateCurrencyDataAtom);
  const refreshAll = useSetAtom(refreshAllCurrenciesAtom);
  const initialize = useSetAtom(initializeCurrencyDataAtom);
  const [, convertCurrency] = useAtom(convertCurrencyAtom);

  // Initialize currency data on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Conversion function with error handling
  const convert = useCallback(
    (amount: number, from: string, to: string): number | null => {
      try {
        return convertCurrency({ amount, from, to });
      } catch (error) {
        console.error('Currency conversion error:', error);
        return null;
      }
    },
    [convertCurrency]
  );

  // Formatted conversion with currency symbols
  const convertFormatted = useCallback(
    (
      amount: number,
      from: string,
      to: string,
      locale: string = 'en-US'
    ): string | null => {
      const converted = convert(amount, from, to);
      if (converted === null) return null;

      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: to.toUpperCase(),
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        }).format(converted);
      } catch (error) {
        // Fallback if currency formatting fails
        return `${converted.toFixed(4)} ${to.toUpperCase()}`;
      }
    },
    [convert]
  );

  // Update specific currency
  const updateSpecificCurrency = useCallback(
    (currency: 'usd' | 'inr' | 'npr', force: boolean = false) => {
      updateCurrency({ currency, force });
    },
    [updateCurrency]
  );

  // Refresh all currencies
  const refreshAllCurrencies = useCallback(() => {
    refreshAll();
  }, [refreshAll]);

  return {
    // State
    usd: currencyState.usd,
    inr: currencyState.inr,
    npr: currencyState.npr,
    isLoading,
    error,
    allLoaded,
    lastUpdateTime,
    
    // Actions
    convert,
    convertFormatted,
    updateCurrency: updateSpecificCurrency,
    refreshAll: refreshAllCurrencies,
    
    // Utilities
    isDataFresh: (currency: 'usd' | 'inr' | 'npr') => {
      const data = currencyState[currency];
      if (!data) return false;
      const hourAgo = Date.now() - (1000 * 60 * 60);
      return data.lastUpdated > hourAgo;
    },
    
    getLastUpdateTime: (currency: 'usd' | 'inr' | 'npr') => {
      const data = currencyState[currency];
      return data?.lastUpdated || null;
    },
  };
};

// Hook for specific currency rates
export const useUsdRates = () => {
  return useAtomValue(usdRatesAtom);
};

export const useInrRates = () => {
  return useAtomValue(inrRatesAtom);
};

export const useNprRates = () => {
  return useAtomValue(nprRatesAtom);
};

// Hook for currency conversion only
export const useCurrencyConverter = () => {
  const [, convertCurrency] = useAtom(convertCurrencyAtom);
  const isLoading = useAtomValue(currencyLoadingAtom);
  const error = useAtomValue(currencyErrorAtom);

  const convert = useCallback(
    (amount: number, from: string, to: string): number | null => {
      try {
        return convertCurrency({ amount, from, to });
      } catch (error) {
        console.error('Currency conversion error:', error);
        return null;
      }
    },
    [convertCurrency]
  );

  const convertFormatted = useCallback(
    (
      amount: number,
      from: string,
      to: string,
      locale: string = 'en-US'
    ): string | null => {
      const converted = convert(amount, from, to);
      if (converted === null) return null;

      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: to.toUpperCase(),
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        }).format(converted);
      } catch (error) {
        return `${converted.toFixed(4)} ${to.toUpperCase()}`;
      }
    },
    [convert]
  );

  return {
    convert,
    convertFormatted,
    isLoading,
    error,
  };
};

// Hook for managing currency data updates
export const useCurrencyUpdater = () => {
  const updateCurrency = useSetAtom(updateCurrencyDataAtom);
  const refreshAll = useSetAtom(refreshAllCurrenciesAtom);
  const initialize = useSetAtom(initializeCurrencyDataAtom);
  const isLoading = useAtomValue(currencyLoadingAtom);
  const error = useAtomValue(currencyErrorAtom);

  const updateSpecificCurrency = useCallback(
    (currency: 'usd' | 'inr' | 'npr', force: boolean = false) => {
      updateCurrency({ currency, force });
    },
    [updateCurrency]
  );

  const refreshAllCurrencies = useCallback(() => {
    refreshAll();
  }, [refreshAll]);

  const initializeCurrencies = useCallback(() => {
    initialize();
  }, [initialize]);

  return {
    updateCurrency: updateSpecificCurrency,
    refreshAll: refreshAllCurrencies,
    initialize: initializeCurrencies,
    isLoading,
    error,
  };
}; 