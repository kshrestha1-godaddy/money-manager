"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { getUserCurrency, updateUserCurrency } from "../actions/currency";

interface CurrencyContextType {
  currency: string;
  updateCurrency: (newCurrency: string) => Promise<void>;
  isLoading: boolean;
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
  const { data: session, status } = useSession();
  const [currency, setCurrency] = useState("USD");
  const [isLoading, setIsLoading] = useState(true);

  // Load user's currency preference on mount or when session changes
  useEffect(() => {
    if (status === "authenticated") {
      getUserCurrency()
        .then(setCurrency)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [status]);

  const updateCurrency = async (newCurrency: string) => {
    try {
      await updateUserCurrency(newCurrency);
      setCurrency(newCurrency);
    } catch (error) {
      console.error("Error updating currency:", error);
      throw error;
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, updateCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}