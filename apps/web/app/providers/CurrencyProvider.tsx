"use client";

import React, { createContext, useCallback, useContext, useState, useEffect, useMemo, useRef, ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
  getCurrencyPreferences,
  updateDisplayCurrency as persistDisplayCurrency,
  updateUserCurrency,
} from "../actions/currency";
import { getCurrencyRateConfig } from "../actions/currency-rates";
import { setClientCurrencyConversionMatrix } from "../utils/currencyConversion";
import {
  DEFAULT_CURRENCY_ANCHORS,
  type CurrencyRateAnchors,
} from "../utils/currencyRates";
import {
  normalizeSupportedCurrency,
  type CurrencyCode,
} from "../utils/currency";

interface CurrencyContextType {
  /** Compatibility alias for accountCurrency. */
  currency: CurrencyCode;
  accountCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  updateCurrency: (newCurrency: string) => Promise<void>;
  updateDisplayCurrency: (newCurrency: string) => Promise<void>;
  refreshCurrencyPreferences: () => Promise<void>;
  isAccountCurrencyLocked: boolean;
  isLoading: boolean;
  currencyRateAnchors: CurrencyRateAnchors;
  currencyRateVersion: number;
  isRatesLoading: boolean;
  refreshCurrencyRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const { status } = useSession();
  const [accountCurrency, setAccountCurrency] = useState<CurrencyCode>("USD");
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("USD");
  const [isAccountCurrencyLocked, setIsAccountCurrencyLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currencyRateAnchors, setCurrencyRateAnchors] = useState<CurrencyRateAnchors>({
    ...DEFAULT_CURRENCY_ANCHORS,
  });
  const [currencyRateVersion, setCurrencyRateVersion] = useState(0);
  const [isRatesLoading, setIsRatesLoading] = useState(true);
  const displayUpdateQueueRef = useRef<Promise<void>>(Promise.resolve());

  const applyRateAnchors = useCallback((anchors: CurrencyRateAnchors) => {
    setCurrencyRateAnchors(anchors);
    setClientCurrencyConversionMatrix(anchors.inrToNpr, anchors.nprPerUsd);
    setCurrencyRateVersion((version) => version + 1);
  }, []);

  const refreshCurrencyRates = useCallback(async () => {
    setIsRatesLoading(true);
    try {
      const rates = await getCurrencyRateConfig();
      applyRateAnchors(rates);
    } catch (error) {
      applyRateAnchors(DEFAULT_CURRENCY_ANCHORS);
      throw error;
    } finally {
      setIsRatesLoading(false);
    }
  }, [applyRateAnchors]);

  const refreshCurrencyPreferences = useCallback(async () => {
    const preferences = await getCurrencyPreferences();
    setAccountCurrency(preferences.accountCurrency);
    setDisplayCurrency(preferences.displayCurrency);
    setIsAccountCurrencyLocked(preferences.isAccountCurrencyLocked);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (status === "loading") {
      setIsLoading(true);
      setIsRatesLoading(true);
      return () => {
        isCancelled = true;
      };
    }

    if (status === "authenticated") {
      setIsLoading(true);
      setIsRatesLoading(true);
      Promise.allSettled([getCurrencyPreferences(), getCurrencyRateConfig()])
        .then(([preferencesResult, ratesResult]) => {
          if (isCancelled) return;

          if (preferencesResult.status === "fulfilled") {
            setAccountCurrency(preferencesResult.value.accountCurrency);
            setDisplayCurrency(preferencesResult.value.displayCurrency);
            setIsAccountCurrencyLocked(
              preferencesResult.value.isAccountCurrencyLocked
            );
          } else {
            console.error(
              "Failed to load currency preferences:",
              preferencesResult.reason
            );
          }

          if (ratesResult.status === "fulfilled") {
            applyRateAnchors(ratesResult.value);
          } else {
            console.error("Failed to load currency rates:", ratesResult.reason);
            applyRateAnchors(DEFAULT_CURRENCY_ANCHORS);
          }
        })
        .finally(() => {
          if (isCancelled) return;
          setIsLoading(false);
          setIsRatesLoading(false);
        });
    } else {
      setAccountCurrency("USD");
      setDisplayCurrency("USD");
      setIsAccountCurrencyLocked(false);
      setIsLoading(false);
      setIsRatesLoading(false);
      applyRateAnchors(DEFAULT_CURRENCY_ANCHORS);
    }

    return () => {
      isCancelled = true;
    };
  }, [applyRateAnchors, status]);

  const updateCurrency = useCallback(async (newCurrency: string) => {
    try {
      await updateUserCurrency(newCurrency);
      setAccountCurrency(normalizeSupportedCurrency(newCurrency));
    } catch (error) {
      console.error("Error updating currency:", error);
      throw error;
    }
  }, []);

  const updateDisplayCurrency = useCallback(async (newCurrency: string) => {
    const normalized = normalizeSupportedCurrency(newCurrency);
    const persistence = displayUpdateQueueRef.current.then(async () => {
      await persistDisplayCurrency(normalized);
      setDisplayCurrency(normalized);
    });
    displayUpdateQueueRef.current = persistence.catch(() => undefined);
    await persistence;
  }, []);

  // Memoized so a NextAuth session refetch does not cascade a new context
  // value into every consumer and remount the dashboard charts.
  const contextValue = useMemo<CurrencyContextType>(
    () => ({
      currency: accountCurrency,
      accountCurrency,
      displayCurrency,
      updateCurrency,
      updateDisplayCurrency,
      refreshCurrencyPreferences,
      isAccountCurrencyLocked,
      isLoading,
      currencyRateAnchors,
      currencyRateVersion,
      isRatesLoading,
      refreshCurrencyRates,
    }),
    [
      accountCurrency,
      displayCurrency,
      updateCurrency,
      updateDisplayCurrency,
      refreshCurrencyPreferences,
      isAccountCurrencyLocked,
      isLoading,
      currencyRateAnchors,
      currencyRateVersion,
      isRatesLoading,
      refreshCurrencyRates,
    ],
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}
