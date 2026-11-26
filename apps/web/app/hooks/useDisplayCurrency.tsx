"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { useCurrency } from "../providers/CurrencyProvider";
import { formatCurrency } from "../utils/currency";
import { convertForDisplaySync } from "../utils/currencyDisplay";

export interface DisplayCurrency {
  currency: string;
  accountCurrency: string;
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => Promise<void>;
  toDisplayAmount: (amount: number, sourceCurrency: string) => number;
  formatDisplayAmount: (amount: number, sourceCurrency: string) => string;
  /** @deprecated Prefer toDisplayAmount with an explicit source currency. */
  convertAmount: (amount: number, fromCurrency?: string) => number;
  toAccountAmount: (amount: number) => number;
  /** @deprecated Prefer formatDisplayAmount with an explicit source currency. */
  formatAmount: (amount: number, fromCurrency?: string) => string;
}

/** Compatibility wrapper. Currency state now lives entirely in CurrencyProvider. */
export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useDisplayCurrency(): DisplayCurrency {
  const {
    accountCurrency,
    displayCurrency,
    updateDisplayCurrency,
  } = useCurrency();

  const toDisplayAmount = useCallback(
    (amount: number, sourceCurrency: string) =>
      convertForDisplaySync(amount, sourceCurrency, displayCurrency),
    [displayCurrency]
  );
  const formatDisplayAmount = useCallback(
    (amount: number, sourceCurrency: string) =>
      formatCurrency(toDisplayAmount(amount, sourceCurrency), displayCurrency),
    [displayCurrency, toDisplayAmount]
  );
  const convertAmount = useCallback(
    (amount: number, fromCurrency: string = accountCurrency) =>
      toDisplayAmount(amount, fromCurrency),
    [accountCurrency, toDisplayAmount]
  );
  const toAccountAmount = useCallback(
    (amount: number) =>
      convertForDisplaySync(amount, displayCurrency, accountCurrency),
    [accountCurrency, displayCurrency]
  );
  const formatAmount = useCallback(
    (amount: number, fromCurrency: string = accountCurrency) =>
      formatDisplayAmount(amount, fromCurrency),
    [accountCurrency, formatDisplayAmount]
  );

  return useMemo(
    () => ({
      currency: displayCurrency,
      accountCurrency,
      displayCurrency,
      setDisplayCurrency: updateDisplayCurrency,
      toDisplayAmount,
      formatDisplayAmount,
      convertAmount,
      toAccountAmount,
      formatAmount,
    }),
    [
      accountCurrency,
      convertAmount,
      displayCurrency,
      formatAmount,
      formatDisplayAmount,
      toAccountAmount,
      toDisplayAmount,
      updateDisplayCurrency,
    ]
  );
}

export function useResolvedDisplayCurrency(_currencyProp?: string): string {
  const { displayCurrency } = useDisplayCurrency();
  return displayCurrency;
}
