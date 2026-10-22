"use client";

import { StockPurchaseList } from "./StockPurchaseList";
import {
  filterStockPurchases,
  stockDateRange,
  STOCK_PERIODS,
  type StockPeriod,
} from "./purchaseFilters";
import { useState } from "react";
import { CURRENCIES } from "../../utils/currency";
import { convertCurrencySync } from "../../utils/currencyConversion";
import { buildStaticConversionRates } from "../../utils/currencyRates";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useOptimizedInvestments } from "../investments/hooks/useOptimizedInvestments";
import { StocksSection } from "../investments/components/StocksSection";
import { CONTAINER_COLORS, TEXT_COLORS } from "../../config/colorConfig";

export default function ExpensePortfolioPage({
  portfolioType,
}: {
  portfolioType: "STOCKS" | "SIP";
}) {
  const label = portfolioType === "SIP" ? "SIP" : "Stocks";
  const {
    currency: accountCurrency,
    currencyRateAnchors,
    isRatesLoading,
  } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<StockPeriod>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const range = stockDateRange(period, startDate, endDate);
  const invalidRange = !!(range.start && range.end && range.start > range.end);
  const hasFilters = !!search.trim() || period !== "ALL";
  const currency = selectedCurrency || accountCurrency;
  const matrix = buildStaticConversionRates(
    currencyRateAnchors.inrToNpr,
    currencyRateAnchors.nprPerUsd,
  );
  const convert = (amount: number, source: string) =>
    convertCurrencySync(amount, source, currency, matrix);
  const {
    investments,
    stockPurchases,
    stocksLoading,
    stocksError,
    sipPurchases,
    sipLoading,
    sipError,
    loading,
    error,
  } = useOptimizedInvestments();
  const purchases = portfolioType === "SIP" ? sipPurchases : stockPurchases;
  const purchasesLoading = portfolioType === "SIP" ? sipLoading : stocksLoading;
  const purchasesError = portfolioType === "SIP" ? sipError : stocksError;
  const displayPurchases = purchases.map((p) => ({
    ...p,
    amount: convert(p.originalAmount, p.currency),
  }));
  const filteredPurchases = filterStockPurchases(
    displayPurchases,
    search,
    range,
  );
  const positions = investments.filter((i) => i.type === portfolioType);
  const updatedAt = positions
    .filter((i) => i.id > 0)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0]?.updatedAt;

  return (
    <div className={CONTAINER_COLORS.page}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1
          id={`${portfolioType.toLowerCase()}-heading`}
          className={TEXT_COLORS.title}
        >
          {label}
        </h1>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
          Display currency
          <select
            value={currency}
            disabled={isRatesLoading}
            onChange={(event) => setSelectedCurrency(event.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500"
          >
            {CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} · {option.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className={TEXT_COLORS.subtitle}>
        Track purchases, update your portfolio value, and see how your {label}{" "}
        investments grow month by month.
      </p>
      <StocksSection
        key={currency}
        portfolioType={portfolioType}
        purchases={displayPurchases}
        chartPurchases={filteredPurchases}
        chartDateRange={range}
        hasFilters={hasFilters}
        currentValue={convert(
          positions.reduce((sum, i) => sum + i.quantity * i.currentPrice, 0),
          accountCurrency,
        )}
        hasValuation={positions.some((i) => i.id > 0)}
        updatedAt={updatedAt}
        currency={currency}
        valuationCurrency={accountCurrency}
        loading={loading || purchasesLoading || isRatesLoading}
        error={purchasesError || (error ? new Error(error) : null)}
      />
      <div className="mt-4 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div
          className="flex items-center gap-2 overflow-x-auto"
          role="group"
          aria-label="Purchase filters"
        >
          <input
            type="search"
            aria-label={`Search ${label} purchases`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 w-44 shrink-0 rounded-md border border-gray-200 px-2 text-sm focus:ring-2 focus:ring-indigo-500"
          />
          {STOCK_PERIODS.filter((value) => value !== "CUSTOM").map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
              className={`h-8 shrink-0 rounded-md px-2.5 text-xs font-medium ${period === value ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {value === "ALL" ? "All" : value}
            </button>
          ))}
          <>
            <input
              type="date"
              aria-label="Purchase start date"
              value={range.start}
              max={range.end || undefined}
              onChange={(e) => {
                setStartDate(e.target.value);
                setEndDate(range.end);
                setPeriod("CUSTOM");
              }}
              className="h-8 shrink-0 rounded-md border border-gray-200 px-2 text-xs"
            />
            <span className="text-xs text-gray-400" aria-hidden>
              –
            </span>
            <input
              type="date"
              aria-label="Purchase end date"
              value={range.end}
              min={range.start || undefined}
              onChange={(e) => {
                setEndDate(e.target.value);
                setStartDate(range.start);
                setPeriod("CUSTOM");
              }}
              className="h-8 shrink-0 rounded-md border border-gray-200 px-2 text-xs"
            />
          </>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPeriod("ALL");
                setStartDate("");
                setEndDate("");
              }}
              className="h-8 shrink-0 px-2 text-xs font-medium text-indigo-700 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        {invalidRange && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            End date must follow start date.
          </p>
        )}
      </div>
      {!purchasesLoading && !purchasesError && (
        <StockPurchaseList
          key={`${search}:${period}:${startDate}:${endDate}`}
          purchases={filteredPurchases}
          currency={currency}
          hasFilters={hasFilters}
          label={label}
        />
      )}
    </div>
  );
}
