"use client";

import React, { createContext, useCallback, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { getUserCurrency, updateUserCurrency } from "../actions/currency";
import { getCurrencyRateConfig } from "../actions/currency-rates";
import { setClientCurrencyConversionMatrix } from "../utils/currencyConversion";
import {
  DEFAULT_CURRENCY_ANCHORS,
  type CurrencyRateAnchors,
} from "../utils/currencyRates";

interface CurrencyContextType {
  currency: string;
  updateCurrency: (newCurrency: string) => Promise<void>;
  isLoading: boolean;
  currencyRateAnchors: CurrencyRateAnchors;
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
  const [currency, setCurrency] = useState("USD");
  const [isLoading, setIsLoading] = useState(true);
  const [currencyRateAnchors, setCurrencyRateAnchors] = useState<CurrencyRateAnchors>({
    ...DEFAULT_CURRENCY_ANCHORS,
  });
  const [isRatesLoading, setIsRatesLoading] = useState(true);

  const applyRateAnchors = useCallback((anchors: CurrencyRateAnchors) => {
    setCurrencyRateAnchors(anchors);
    setClientCurrencyConversionMatrix(anchors.inrToNpr, anchors.nprPerUsd);
  }, []);

  const refreshCurrencyRates = useCallback(async () => {
    const rates = await getCurrencyRateConfig();
    applyRateAnchors(rates);
  }, [applyRateAnchors]);

  useEffect(() => {
    if (status === "authenticated") {
      setIsLoading(true);
      setIsRatesLoading(true);
      Promise.all([getUserCurrency(), getCurrencyRateConfig()])
        .then(([userCurrency, rates]) => {
          setCurrency(userCurrency);
          applyRateAnchors(rates);
        })
        .catch((error) => {
          console.error("Failed to load currency preferences:", error);
          applyRateAnchors(DEFAULT_CURRENCY_ANCHORS);
        })
        .finally(() => {
          setIsLoading(false);
          setIsRatesLoading(false);
        });
    } else {
      setIsLoading(false);
      setIsRatesLoading(false);
      applyRateAnchors(DEFAULT_CURRENCY_ANCHORS);
    }
  }, [status]);

  const updateCurrency = useCallback(async (newCurrency: string) => {
    try {
      await updateUserCurrency(newCurrency);
      setCurrency(newCurrency);
    } catch (error) {
      console.error("Error updating currency:", error);
      throw error;
    }
  }, []);

  // Memoized so a NextAuth session refetch does not cascade a new context
  // value into every consumer and remount the dashboard charts.
  const contextValue = useMemo<CurrencyContextType>(
    () => ({
      currency,
      updateCurrency,
      isLoading,
      currencyRateAnchors,
      isRatesLoading,
      refreshCurrencyRates,
    }),
    [
      currency,
      updateCurrency,
      isLoading,
      currencyRateAnchors,
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
