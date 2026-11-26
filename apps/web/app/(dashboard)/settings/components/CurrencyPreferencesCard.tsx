"use client";

import { useState } from "react";
import { CURRENCIES, getCurrencySymbol } from "../../../utils/currency";
import { useCurrency } from "../../../providers/CurrencyProvider";

export function CurrencyPreferencesCard() {
  const {
    accountCurrency,
    displayCurrency,
    isAccountCurrencyLocked,
    isLoading,
    updateCurrency,
    updateDisplayCurrency,
  } = useCurrency();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDisplayCurrencyChange(value: string) {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateDisplayCurrency(value);
      setMessage("Display currency updated.");
    } catch {
      setMessage("Couldn’t update display currency.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAccountCurrencyChange(value: string) {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateCurrency(value);
      setMessage("Ledger currency updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Couldn’t update ledger currency."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">
          Currency preferences
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Display currency changes how values appear. Ledger currency determines
          how currency-less balances and financial records are stored.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-sm font-medium text-gray-700">
            Display currency
          </span>
          <select
            value={displayCurrency}
            onChange={(event) =>
              void handleDisplayCurrencyChange(event.target.value)
            }
            disabled={isLoading || isSaving}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {getCurrencySymbol(currency.code).trim()} {currency.code} —{" "}
                {currency.name}
              </option>
            ))}
          </select>
          <span className="block text-xs text-gray-500">
            Used by every card, table, chart, tooltip, and display-only total.
          </span>
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-medium text-gray-700">
            Ledger currency
          </span>
          <select
            value={accountCurrency}
            onChange={(event) =>
              void handleAccountCurrencyChange(event.target.value)
            }
            disabled={isLoading || isSaving || isAccountCurrencyLocked}
            className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {getCurrencySymbol(currency.code).trim()} {currency.code} —{" "}
                {currency.name}
              </option>
            ))}
          </select>
          <span className="block text-xs text-gray-500">
            {isAccountCurrencyLocked
              ? "Locked because monetary data already exists. This prevents existing values from being silently re-denominated."
              : "This becomes permanent after the first monetary record is created."}
          </span>
        </label>
      </div>

      {message ? (
        <p className="mt-4 text-sm text-gray-700" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
