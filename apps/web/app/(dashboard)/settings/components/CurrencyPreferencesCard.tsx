"use client";

import { useEffect, useState } from "react";
import { CURRENCIES, getCurrencySymbol } from "../../../utils/currency";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { updateCurrencyRateConfig } from "../../../actions/currency-rates";

export function CurrencyPreferencesCard() {
  const {
    accountCurrency,
    displayCurrency,
    isAccountCurrencyLocked,
    isLoading,
    updateCurrency,
    updateDisplayCurrency,
    refreshCurrencyPreferences,
    currencyRateAnchors,
    refreshCurrencyRates,
  } = useCurrency();
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [inrToNpr, setInrToNpr] = useState("");
  const [nprPerUsd, setNprPerUsd] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void refreshCurrencyPreferences().catch((error) => {
      console.error("Failed to refresh currency preferences:", error);
    });
  }, [refreshCurrencyPreferences]);

  useEffect(() => {
    setInrToNpr(String(currencyRateAnchors.inrToNpr));
    setNprPerUsd(String(currencyRateAnchors.nprPerUsd));
  }, [currencyRateAnchors]);

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

  async function handleRateSave(event: React.FormEvent) {
    event.preventDefault();
    const parsedInrToNpr = Number(inrToNpr);
    const parsedNprPerUsd = Number(nprPerUsd);
    if (
      !Number.isFinite(parsedInrToNpr) ||
      !Number.isFinite(parsedNprPerUsd) ||
      parsedInrToNpr <= 0 ||
      parsedNprPerUsd <= 0
    ) {
      setMessage("Exchange rates must be positive numbers.");
      return;
    }

    setIsSavingRates(true);
    setMessage(null);
    try {
      await updateCurrencyRateConfig({
        inrToNpr: parsedInrToNpr,
        nprPerUsd: parsedNprPerUsd,
      });
      await refreshCurrencyRates();
      setMessage("Your exchange rates were updated across the app.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn’t update exchange rates.");
    } finally {
      setIsSavingRates(false);
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

      <form className="mt-6 border-t border-gray-200 pt-5" onSubmit={handleRateSave}>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Exchange rates</h3>
          <p className="mt-1 text-sm text-gray-600">
            These personal rates are used for conversions in cards, charts, imports,
            exports, notifications, and account activity.
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">
              NPR for 1 INR
            </span>
            <input
              type="number"
              min="0.00000001"
              step="0.00000001"
              value={inrToNpr}
              onChange={(event) => setInrToNpr(event.target.value)}
              disabled={isSavingRates}
              className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="block text-sm font-medium text-gray-700">
              NPR for 1 USD
            </span>
            <input
              type="number"
              min="0.00000001"
              step="0.00000001"
              value={nprPerUsd}
              onChange={(event) => setNprPerUsd(event.target.value)}
              disabled={isSavingRates}
              className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={isSavingRates}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingRates ? "Saving..." : "Save exchange rates"}
          </button>
          <span className="text-xs text-gray-500">
            USD/INR is derived from these two rates.
          </span>
        </div>
      </form>

      {message ? (
        <p className="mt-4 text-sm text-gray-700" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
