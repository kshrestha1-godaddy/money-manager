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
import { SUPPORTED_CURRENCIES } from "../utils/currencyConversion";
import { formatCurrency } from "../utils/currency";
import { convertForDisplaySync } from "../utils/currencyDisplay";
import { useCurrency } from "../providers/CurrencyProvider";

const STORAGE_KEY = "dashboard-display-currency";

interface DisplayCurrencyContextValue {
  accountCurrency: string;
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
  convertAmount: (amount: number, fromCurrency?: string) => number;
  formatAmount: (amount: number, fromCurrency?: string) => string;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(
  null
);

function isSupportedCurrency(code: string): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const { currency: accountCurrency } = useCurrency();
  const [displayCurrency, setDisplayCurrencyState] = useState(accountCurrency);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored && isSupportedCurrency(stored)) {
        setDisplayCurrencyState(stored);
        return;
      }
    } catch {
      // sessionStorage unavailable
    }
    setDisplayCurrencyState(accountCurrency);
  }, [accountCurrency]);

  const setDisplayCurrency = useCallback(
    (currency: string) => {
      const next = isSupportedCurrency(currency) ? currency : accountCurrency;
      setDisplayCurrencyState(next);
      try {
        sessionStorage.setItem(STORAGE_KEY, next);
      } catch {
        // sessionStorage unavailable
      }
    },
    [accountCurrency]
  );

  const convertAmount = useCallback(
    (amount: number, fromCurrency = accountCurrency) =>
      convertForDisplaySync(amount, fromCurrency, displayCurrency),
    [accountCurrency, displayCurrency]
  );

  const formatAmount = useCallback(
    (amount: number, fromCurrency = accountCurrency) =>
      formatCurrency(convertAmount(amount, fromCurrency), displayCurrency),
    [accountCurrency, convertAmount, displayCurrency]
  );

  const value = useMemo(
    () => ({
      accountCurrency,
      displayCurrency,
      setDisplayCurrency,
      convertAmount,
      formatAmount,
    }),
    [
      accountCurrency,
      displayCurrency,
      setDisplayCurrency,
      convertAmount,
      formatAmount,
    ]
  );

  return (
    <DisplayCurrencyContext.Provider value={value}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): DisplayCurrencyContextValue {
  const ctx = useContext(DisplayCurrencyContext);
  const { currency: accountCurrency } = useCurrency();
  if (ctx) return ctx;
  return {
    accountCurrency,
    displayCurrency: accountCurrency,
    setDisplayCurrency: () => {},
    convertAmount: (amount, fromCurrency = accountCurrency) =>
      convertForDisplaySync(amount, fromCurrency, accountCurrency),
    formatAmount: (amount, fromCurrency = accountCurrency) =>
      formatCurrency(
        convertForDisplaySync(amount, fromCurrency, accountCurrency),
        accountCurrency
      ),
  };
}

/** Always the dashboard Display in currency so a stale prop cannot override it. */
export function useResolvedDisplayCurrency(_currencyProp?: string): string {
  const { displayCurrency } = useDisplayCurrency();
  return displayCurrency;
}

interface PageDisplayCurrencySelectProps {
  value?: string;
  onChange?: (currency: string) => void;
  id?: string;
}

export function usePageDisplayCurrency(userCurrency: string) {
  const ctx = useContext(DisplayCurrencyContext);
  const [displayCurrency, setDisplayCurrency] = useState(userCurrency);

  useEffect(() => {
    if (!ctx) setDisplayCurrency(userCurrency);
  }, [ctx, userCurrency]);

  if (ctx) {
    return {
      displayCurrency: ctx.displayCurrency,
      setDisplayCurrency: ctx.setDisplayCurrency,
    };
  }

  return { displayCurrency, setDisplayCurrency };
}

export function PageDisplayCurrencySelect({
  value,
  onChange,
  id = "page-display-currency",
}: PageDisplayCurrencySelectProps) {
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const selected = value ?? displayCurrency;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs font-medium text-gray-500">
        Display in
      </label>
      <select
        id={id}
        value={selected}
        onChange={(event) => {
          const next = event.target.value;
          setDisplayCurrency(next);
          onChange?.(next);
        }}
        aria-label="Display currency for this page"
        className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        {SUPPORTED_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </div>
  );
}
