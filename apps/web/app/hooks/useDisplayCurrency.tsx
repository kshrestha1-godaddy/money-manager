"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useCurrency } from "../providers/CurrencyProvider";
import { SUPPORTED_CURRENCIES } from "../utils/currencyConversion";
import { formatCurrency } from "../utils/currency";
import { convertForDisplaySync } from "../utils/currencyDisplay";

const STORAGE_KEY = "dashboard-display-currency";

export interface DisplayCurrency {
  currency: string;
  accountCurrency: string;
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
  convertAmount: (amount: number, fromCurrency?: string) => number;
  toAccountAmount: (amount: number) => number;
  formatAmount: (amount: number, fromCurrency?: string) => string;
}

const DisplayCurrencyContext = createContext<DisplayCurrency | null>(null);

function isSupportedCurrency(code: string): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const { currency: accountCurrency } = useCurrency();
  const [displayCurrency, setDisplayCurrencyState] = useState(accountCurrency);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isSupportedCurrency(stored)) {
        setDisplayCurrencyState(stored);
        return;
      }
    } catch {
      // localStorage unavailable
    }
    setDisplayCurrencyState(accountCurrency);
  }, [accountCurrency]);

  const setDisplayCurrency = useCallback(
    (currency: string) => {
      const next = isSupportedCurrency(currency) ? currency : accountCurrency;
      setDisplayCurrencyState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage unavailable
      }
    },
    [accountCurrency]
  );

  const convertAmount = useCallback(
    (amount: number, fromCurrency = accountCurrency) =>
      convertForDisplaySync(amount, fromCurrency, displayCurrency),
    [accountCurrency, displayCurrency]
  );

  const toAccountAmount = useCallback(
    (amount: number) =>
      convertForDisplaySync(amount, displayCurrency, accountCurrency),
    [accountCurrency, displayCurrency]
  );

  const formatAmount = useCallback(
    (amount: number, fromCurrency = accountCurrency) =>
      formatCurrency(convertAmount(amount, fromCurrency), displayCurrency),
    [accountCurrency, convertAmount, displayCurrency]
  );

  const value = useMemo(
    () => ({
      currency: displayCurrency,
      accountCurrency,
      displayCurrency,
      setDisplayCurrency,
      convertAmount,
      toAccountAmount,
      formatAmount,
    }),
    [
      accountCurrency,
      convertAmount,
      displayCurrency,
      formatAmount,
      setDisplayCurrency,
      toAccountAmount,
    ]
  );

  return (
    <DisplayCurrencyContext.Provider value={value}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

/** Convert and format using the avatar Display currency; amounts default from account currency. */
export function useDisplayCurrency(): DisplayCurrency {
  const ctx = useContext(DisplayCurrencyContext);
  const { currency: accountCurrency } = useCurrency();
  if (ctx) return ctx;
  return {
    currency: accountCurrency,
    accountCurrency,
    displayCurrency: accountCurrency,
    setDisplayCurrency: () => {},
    convertAmount: (amount, fromCurrency = accountCurrency) =>
      convertForDisplaySync(amount, fromCurrency, accountCurrency),
    toAccountAmount: (amount) => amount,
    formatAmount: (amount, fromCurrency = accountCurrency) =>
      formatCurrency(
        convertForDisplaySync(amount, fromCurrency, accountCurrency),
        accountCurrency
      ),
  };
}

export function useResolvedDisplayCurrency(_currencyProp?: string): string {
  const { displayCurrency } = useDisplayCurrency();
  return displayCurrency;
}
