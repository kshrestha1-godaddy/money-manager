"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ComposedChart,
  Line,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Pencil } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import {
  monthlyStockPurchases,
  type StockPurchase,
} from "../utils/stockPurchases";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { convertCurrencySync } from "../../../utils/currencyConversion";
import { buildStaticConversionRates } from "../../../utils/currencyRates";
import { saveStocksCurrentValue } from "../actions/stocks";

export function StocksSection({
  purchases,
  chartPurchases = purchases,
  chartDateRange,
  hasFilters = false,
  currentValue,
  hasValuation,
  updatedAt,
  currency,
  valuationCurrency = currency,
  loading,
  error,
}: {
  purchases: StockPurchase[];
  chartPurchases?: StockPurchase[];
  chartDateRange?: { start: string; end: string };
  hasFilters?: boolean;
  currentValue: number;
  hasValuation: boolean;
  updatedAt?: Date;
  currency: string;
  valuationCurrency?: string;
  loading: boolean;
  error: Error | null;
}) {
  const queryClient = useQueryClient();
  const { currencyRateAnchors } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [validation, setValidation] = useState("");
  const [saved, setSaved] = useState(false);
  const months = useMemo(
    () =>
      monthlyStockPurchases(
        chartPurchases,
        chartDateRange?.end ? chartDateRange.end.slice(0, 7) : undefined,
      ).filter(
        (m) =>
          (!chartDateRange?.start ||
            m.month >= chartDateRange.start.slice(0, 7)) &&
          (!chartDateRange?.end || m.month <= chartDateRange.end.slice(0, 7)),
      ),
    [chartPurchases, chartDateRange?.start, chartDateRange?.end],
  );
  const invested = purchases.reduce((sum, p) => sum + p.amount, 0);
  const gain = currentValue - invested;
  const mutation = useMutation({
    mutationFn: (value: number) =>
      saveStocksCurrentValue(
        convertCurrencySync(
          value,
          currency,
          valuationCurrency,
          buildStaticConversionRates(
            currencyRateAnchors.inrToNpr,
            currencyRateAnchors.nprPerUsd,
          ),
        ),
        valuationCurrency,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["investments"] }),
        queryClient.invalidateQueries({
          queryKey: ["investment-target-progress"],
        }),
        queryClient.invalidateQueries({ queryKey: ["withheld-amounts"] }),
      ]);
      setEditing(false);
      setSaved(true);
    },
  });
  function save(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(draft);
    if (!draft.trim() || !Number.isFinite(value) || value < 0) {
      setValidation("Enter a current value of zero or more.");
      return;
    }
    setValidation("");
    mutation.mutate(value);
  }
  const money = (value: number) => formatCurrency(value, currency);
  return (
    <section
      aria-labelledby="stocks-heading"
      className="mt-6 overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm"
    >
      {loading ? (
        <p className="p-6 text-gray-500">Loading stock purchases…</p>
      ) : error ? (
        <div className="p-6 text-red-600" role="alert">
          Could not load stock purchases.{" "}
          <button
            className="underline"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["investments"] })
            }
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 p-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Purchase cost · all time</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">
                {money(invested)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {purchases.length} expense{" "}
                {purchases.length === 1 ? "entry" : "entries"} · {currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current portfolio value</p>
              {editing ? (
                <form onSubmit={save} className="mt-2">
                  <label className="sr-only" htmlFor="stocks-current-value">
                    Current Stocks portfolio value in {currency}
                  </label>
                  <input
                    autoFocus
                    id="stocks-current-value"
                    type="number"
                    min="0"
                    step="any"
                    value={draft}
                    disabled={mutation.isPending}
                    onChange={(e) => setDraft(e.target.value)}
                    className="w-full rounded-md border border-indigo-300 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="mt-2 flex gap-3">
                    <button
                      disabled={mutation.isPending}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      {mutation.isPending ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      disabled={mutation.isPending}
                      onClick={() => setEditing(false)}
                      className="text-sm text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                  {(validation || mutation.error) && (
                    <p role="alert" className="mt-2 text-sm text-red-600">
                      {validation || mutation.error?.message}
                    </p>
                  )}
                </form>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setDraft(hasValuation ? String(currentValue) : "");
                      setValidation("");
                      mutation.reset();
                      setSaved(false);
                      setEditing(true);
                    }}
                    className="mt-2 inline-flex items-center gap-2 text-left text-2xl font-semibold tabular-nums text-indigo-700 hover:text-indigo-900"
                    aria-label="Edit current Stocks portfolio value"
                  >
                    {hasValuation ? money(currentValue) : "Set current value"}
                    <Pencil className="h-4 w-4" />
                  </button>
                  <p className="mt-1 text-xs text-gray-500">
                    Total value of all stocks · editable inline
                  </p>
                  {updatedAt && (
                    <p className="mt-1 text-xs text-gray-400">
                      Updated {new Date(updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </>
              )}
              {saved && (
                <p role="status" className="mt-2 text-xs text-green-700">
                  Current value saved.
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Unrealized gain / loss</p>
              <p
                className={`mt-2 text-2xl font-semibold tabular-nums ${!hasValuation ? "text-gray-400" : gain >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {hasValuation ? money(gain) : "—"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {hasValuation && invested > 0
                  ? `${gain >= 0 ? "+" : ""}${((gain / invested) * 100).toFixed(2)}% return`
                  : "Set a current value to track returns"}
              </p>
            </div>
          </div>
          <div className="border-t border-gray-100 p-6">
            {!months.length ? (
              <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/30 px-6 py-10 text-center">
                <p className="font-medium text-gray-900">
                  {hasFilters
                    ? "No purchases match your filters"
                    : "Your stock journey starts with a purchase"}
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  {hasFilters
                    ? "Try a different search or date range."
                    : "Add an expense with the Stocks category. Its amount becomes your purchase cost and appears here automatically."}
                </p>
                <Link
                  href="/expenses"
                  className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline"
                >
                  Go to expenses →
                </Link>
              </div>
            ) : (
              <>
                <div
                  className="h-64 w-full"
                  role="img"
                  aria-label="Monthly stock purchases with a line connecting the top of each bar. Hover over a month for its purchase cost."
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={months}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e5e7eb"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(m) =>
                          new Date(`${m}-01T00:00:00Z`).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              year: "2-digit",
                              timeZone: "UTC",
                            },
                          )
                        }
                      />
                      <YAxis
                        width={70}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          Intl.NumberFormat(undefined, {
                            notation: "compact",
                          }).format(v)
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          money(value),
                          "Purchases",
                        ]}
                      />
                      <Bar
                        dataKey="amount"
                        fill="#6366f1"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={48}
                      />
                      <Line
                        type="linear"
                        dataKey="amount"
                        stroke="#312e81"
                        strokeWidth={2}
                        dot={{
                          r: 4,
                          fill: "#312e81",
                          stroke: "#ffffff",
                          strokeWidth: 2,
                        }}
                        activeDot={{ r: 6 }}
                        tooltipType="none"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
