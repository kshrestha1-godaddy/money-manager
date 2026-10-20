"use client";

import React, { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCurrency } from "../../providers/CurrencyProvider";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { SUPPORTED_CURRENCIES } from "../../utils/currencyConversion";
import { downloadCSV } from "../../utils/csvUtils";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { calculateRemainingWithInterest } from "../../utils/interestCalculation";
import { useOptimizedWorth } from "../../hooks/useOptimizedWorth";
import {
  toggleNetWorthInclusion,
  bulkUpdateNetWorthInclusions,
} from "../../actions/net-worth-inclusions";
import { recordCurrentNetworthManually } from "./actions/networth-history";
import {
  DisappearingNotification,
  NotificationData,
} from "../../components/DisappearingNotification";
import { NetworthHistoryChart } from "./components/NetworthHistoryChart";
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Landmark,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

type SectionKey = "accounts" | "investments" | "debts";
const panel = "rounded-2xl border border-slate-200 bg-white shadow-sm";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50";

export default function NetWorthPage() {
  const { currency } = useCurrency();
  const [currencyOverride, setCurrencyOverride] = useState<string | null>(null);
  const displayCurrency = currencyOverride ?? currency;
  const [expandedSections, setExpandedSections] = useState<
    Record<SectionKey, boolean>
  >({ accounts: true, investments: false, debts: false });
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [notification, setNotification] = useState<NotificationData | null>(
    null,
  );
  const [chartRefreshTrigger, setChartRefreshTrigger] = useState(0);
  const {
    netWorthStats: stats,
    chartData,
    sections,
    allAccounts,
    allInvestments,
    allDebts,
    inclusionMaps,
    loading,
    error,
    exportData,
    refreshData,
  } = useOptimizedWorth();
  // Helper to create unique key for tracking updates
  const getItemKey = (entityType: string, entityId: number) =>
    `${entityType}-${entityId}`;

  // Handler for toggling net worth inclusion
  const handleToggleInclusion = useCallback(
    async (
      entityType: "ACCOUNT" | "INVESTMENT" | "DEBT",
      entityId: number,
      currentlyIncluded: boolean,
    ) => {
      const itemKey = getItemKey(entityType, entityId);

      // Mark this item as updating
      setUpdatingItems((prev) => new Set(prev).add(itemKey));

      try {
        await toggleNetWorthInclusion(entityType, entityId, !currentlyIncluded);
        // Refresh data to update the UI
        refreshData();
      } catch (error) {
        console.error("Error toggling net worth inclusion:", error);
        alert("Failed to update item inclusion. Please try again.");
      } finally {
        // Remove from updating set after a short delay to ensure UI has updated
        setTimeout(() => {
          setUpdatingItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemKey);
            return newSet;
          });
        }, 500);
      }
    },
    [refreshData],
  );

  // Bulk operations: Show All
  const handleShowAll = useCallback(async () => {
    setIsBulkUpdating(true);
    try {
      // Collect all items that need to be included
      const updates: Array<{
        entityType: "ACCOUNT" | "INVESTMENT" | "DEBT";
        entityId: number;
        includeInNetWorth: boolean;
      }> = [];

      // Add all accounts
      allAccounts?.forEach((account) => {
        updates.push({
          entityType: "ACCOUNT",
          entityId: account.id,
          includeInNetWorth: true,
        });
      });

      // Add all investments
      allInvestments?.forEach((investment) => {
        updates.push({
          entityType: "INVESTMENT",
          entityId: investment.id,
          includeInNetWorth: true,
        });
      });

      // Add all debts (only active and partially paid)
      allDebts
        ?.filter(
          (debt) =>
            debt.status === "ACTIVE" || debt.status === "PARTIALLY_PAID",
        )
        .forEach((debt) => {
          updates.push({
            entityType: "DEBT",
            entityId: debt.id,
            includeInNetWorth: true,
          });
        });

      if (updates.length > 0) {
        await bulkUpdateNetWorthInclusions(updates);
        refreshData();
      }
    } catch (error) {
      console.error("Error showing all items:", error);
      alert("Failed to show all items. Please try again.");
    } finally {
      setTimeout(() => setIsBulkUpdating(false), 500);
    }
  }, [allAccounts, allInvestments, allDebts, refreshData]);

  // Bulk operations: Hide All
  const handleHideAll = useCallback(async () => {
    setIsBulkUpdating(true);
    try {
      // Collect all items that need to be excluded
      const updates: Array<{
        entityType: "ACCOUNT" | "INVESTMENT" | "DEBT";
        entityId: number;
        includeInNetWorth: boolean;
      }> = [];

      // Add all accounts
      allAccounts?.forEach((account) => {
        updates.push({
          entityType: "ACCOUNT",
          entityId: account.id,
          includeInNetWorth: false,
        });
      });

      // Add all investments
      allInvestments?.forEach((investment) => {
        updates.push({
          entityType: "INVESTMENT",
          entityId: investment.id,
          includeInNetWorth: false,
        });
      });

      // Add all debts (only active and partially paid)
      allDebts
        ?.filter(
          (debt) =>
            debt.status === "ACTIVE" || debt.status === "PARTIALLY_PAID",
        )
        .forEach((debt) => {
          updates.push({
            entityType: "DEBT",
            entityId: debt.id,
            includeInNetWorth: false,
          });
        });

      if (updates.length > 0) {
        await bulkUpdateNetWorthInclusions(updates);
        refreshData();
      }
    } catch (error) {
      console.error("Error hiding all items:", error);
      alert("Failed to hide all items. Please try again.");
    } finally {
      setTimeout(() => setIsBulkUpdating(false), 500);
    }
  }, [allAccounts, allInvestments, allDebts, refreshData]);

  // Handler for manually recording net worth
  const handleRecordNetworth = useCallback(async () => {
    setIsRecording(true);
    try {
      const result = await recordCurrentNetworthManually();

      if (result.success) {
        setNotification({
          title: "Net worth recorded",
          message: "Net worth snapshot recorded successfully.",
          type: "success",
        });
        // Optionally refresh data to show the latest state
        refreshData();
        setChartRefreshTrigger((prev) => prev + 1);
      } else {
        console.error("Error recording net worth:", result.error);
        setNotification({
          title: "Recording failed",
          message: result.error || "Failed to record net worth.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error recording net worth:", error);
      setNotification({
        title: "Recording failed",
        message: "Failed to record net worth. Please try again.",
        type: "error",
      });
    } finally {
      setTimeout(() => setIsRecording(false), 500);
    }
  }, [refreshData]);

  const money = (value: number) =>
    formatCurrency(
      convertForDisplaySync(value, currency, displayCurrency),
      displayCurrency,
    );
  const handleExportCSV = () => {
    const rows = exportData.map((row, index) => {
      if (index === 0)
        return ["Metric", `Value (${displayCurrency})`, "Percentage"];
      const [metric, value, percentage] = row;
      return [
        metric ?? "",
        value && !value.includes("%")
          ? convertForDisplaySync(
              Number(value),
              currency,
              displayCurrency,
            ).toFixed(2)
          : (value ?? ""),
        percentage ?? "",
      ];
    });
    downloadCSV(
      rows,
      `net_worth_${displayCurrency}_${new Date().toISOString().slice(0, 10)}`,
    );
  };
  const colors = ["#0d9488", "#6366f1", "#d97706"];
  const refresh = () => {
    refreshData();
    setChartRefreshTrigger((value) => value + 1);
  };

  if (loading)
    return (
      <div className="space-y-6 p-4 sm:p-8" role="status">
        <p className="text-sm text-slate-500">
          Loading your financial overview…
        </p>
        <div className="h-44 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  if (error)
    return (
      <div className={`${panel} m-6 p-8 text-center`}>
        <h1 className="text-lg font-semibold">Unable to load net worth</h1>
        <p className="my-3 text-sm text-slate-500">{String(error)}</p>
        <button className={button} onClick={refresh}>
          Try again
        </button>
      </div>
    );

  return (
    <div className="w-full min-w-0 space-y-6 p-4 text-slate-900 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Your financial picture
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Net worth</h1>
          <p className="mt-1 text-sm text-slate-500">
            See where you stand. Understand what makes it up.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="worth-display-currency"
            className="text-xs text-slate-500"
          >
            Display in
          </label>
          <select
            id="worth-display-currency"
            value={displayCurrency}
            onChange={(event) => setCurrencyOverride(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <button onClick={refresh} className={button}>
            <RefreshCw size={15} />
            Refresh
          </button>
          <button onClick={handleExportCSV} className={button}>
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[40px] border-teal-400/10" />
          <p className="flex items-center gap-2 text-sm text-white/90">
            <Wallet size={17} />
            Current net worth
          </p>
          <p className="relative mt-4 break-words text-3xl font-semibold tracking-tight sm:text-4xl xl:text-5xl">
            {money(stats.netWorth)}
          </p>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-white/80">
            Included bank balances + investments + money lent. This overview
            tracks assets; liabilities are not recorded here.
          </p>
        </div>
        <div
          className={`${panel} grid grid-cols-1 gap-6 divide-y divide-slate-100 p-5 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-y-0 sm:p-7`}
        >
          <div className="min-w-0 sm:pr-5">
            <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <ArrowUpRight size={19} />
            </span>
            <p className="text-xs text-slate-500">This month’s net cash flow</p>
            <p
              className={`mt-2 break-words text-xl font-semibold ${stats.thisMonthNetIncome < 0 ? "text-rose-600" : "text-teal-700"}`}
            >
              {money(stats.thisMonthNetIncome)}
            </p>
            <p className="mt-2 text-xs text-slate-400">Income less expenses</p>
            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-xs">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-500">Income</dt>
                <dd className="font-medium tabular-nums text-slate-700">
                  {money(stats.thisMonthIncome)}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-500">Expenses</dt>
                <dd className="font-medium tabular-nums text-slate-700">
                  {money(stats.thisMonthExpenses)}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-500">Income saved</dt>
                <dd
                  className={`font-medium tabular-nums ${stats.thisMonthNetIncome < 0 ? "text-rose-600" : "text-teal-700"}`}
                >
                  {stats.thisMonthIncome > 0
                    ? `${((stats.thisMonthNetIncome / stats.thisMonthIncome) * 100).toFixed(1)}%`
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="min-w-0 pt-6 sm:pl-5 sm:pt-0">
            <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp size={19} />
            </span>
            <p className="text-xs text-slate-500">Investment return</p>
            <p
              className={`mt-2 break-words text-xl font-semibold ${stats.totalInvestmentGain < 0 ? "text-rose-600" : "text-teal-700"}`}
            >
              {money(stats.totalInvestmentGain)}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {stats.totalInvestmentGainPercentage.toFixed(1)}% on included
              investments
            </p>
            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-xs">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-500">Purchase cost</dt>
                <dd className="font-medium tabular-nums text-slate-700">
                  {money(
                    stats.totalInvestmentValue - stats.totalInvestmentGain,
                  )}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-500">Current value</dt>
                <dd className="font-medium tabular-nums text-slate-700">
                  {money(stats.totalInvestmentValue)}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-slate-500">Share of assets</dt>
                <dd className="font-medium tabular-nums text-indigo-600">
                  {stats.investmentAllocation.toFixed(1)}%
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className={`${panel} p-5 sm:p-6`} aria-label="Asset allocation">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Where your worth lives
          </h2>
          <p className="text-xs text-slate-500">Share of included assets</p>
        </div>
        <div className="mb-6 overflow-x-auto">
          <div
            className="h-80 min-w-[480px] sm:h-96"
            role="img"
            aria-label={chartData
              .map(
                (item) =>
                  `${item.name}: ${money(item.value)}, ${item.percentage}% of assets`,
              )
              .join("; ")}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.map((item, index) => ({
                  ...item,
                  value: convertForDisplaySync(
                    item.value,
                    currency,
                    displayCurrency,
                  ),
                  color: colors[index],
                }))}
                margin={{ top: 30, right: 24, bottom: 12, left: 12 }}
                barCategoryGap="8%"
              >
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={80}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("en", {
                      style: "currency",
                      currency: displayCurrency,
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(Number(value))
                  }
                />
                <ReferenceLine y={0} stroke="#cbd5e1" />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  content={({ active, payload }) => {
                    const item = payload?.[0]?.payload;
                    if (!active || !item) return null;
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-lg">
                        <p className="text-slate-500">{item.name}</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatCurrency(item.value, displayCurrency)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.percentage}% of included assets
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={480}
                  isAnimationActive={false}
                >
                  {chartData.map((item, index) => (
                    <Cell key={item.name} fill={colors[index]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(value: number) =>
                      formatCurrency(value, displayCurrency)
                    }
                    style={{ fill: "#334155", fontSize: 12, fontWeight: 600 }}
                  />
                  <LabelList
                    dataKey="percentage"
                    position="center"
                    formatter={(value: string) => `${value}%`}
                    style={{ fill: "#fff", fontSize: 12, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {chartData.map((item, index) => (
            <button
              key={item.name}
              onClick={() => {
                const key = sections[index]?.key as SectionKey;
                setExpandedSections((previous) => ({
                  ...previous,
                  [key]: true,
                }));
                document
                  .getElementById(`worth-${key}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="rounded-xl bg-slate-50 p-4 text-left transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: colors[index] }}
                  />
                  {item.name}
                </span>
                <span>{item.percentage}%</span>
              </div>
              <p className="mt-2 break-words text-xl font-semibold tracking-tight">
                {money(item.value)}
              </p>
              <p className="mt-2 text-xs text-slate-400">View details ↗</p>
            </button>
          ))}
        </div>
      </section>

      <NetworthHistoryChart
        displayCurrency={displayCurrency}
        onRecordNetworth={handleRecordNetworth}
        isRecording={isRecording}
        refreshTrigger={chartRefreshTrigger}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 py-1">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Behind the balance
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Choose which assets count toward your net worth.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className={button}
              disabled={isBulkUpdating || updatingItems.size > 0}
              onClick={handleShowAll}
            >
              Include all
            </button>
            <button
              className={button}
              disabled={isBulkUpdating || updatingItems.size > 0}
              onClick={handleHideAll}
            >
              Exclude all
            </button>
          </div>
        </div>
        {sections.map((section, index) => {
          const key = section.key as SectionKey;
          const entityType =
            key === "accounts"
              ? "ACCOUNT"
              : key === "investments"
                ? "INVESTMENT"
                : "DEBT";
          const items: any[] =
            key === "accounts"
              ? allAccounts
              : key === "investments"
                ? allInvestments
                : allDebts.filter(
                    (item) =>
                      item.status === "ACTIVE" ||
                      item.status === "PARTIALLY_PAID",
                  );
          const map = inclusionMaps[key];
          const included = items.filter(
            (item) => map.get(item.id) ?? true,
          ).length;
          return (
            <div
              id={`worth-${key}`}
              key={key}
              className={`${panel} scroll-mt-6 overflow-hidden`}
            >
              <button
                aria-expanded={expandedSections[key]}
                aria-controls={`worth-items-${key}`}
                onClick={() =>
                  setExpandedSections((previous) => ({
                    ...previous,
                    [key]: !previous[key],
                  }))
                }
                className="flex w-full items-center gap-3 p-5 text-left transition hover:bg-slate-50 sm:p-6"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50"
                  style={{ color: colors[index] }}
                >
                  {key === "accounts" ? (
                    <Landmark size={20} />
                  ) : key === "investments" ? (
                    <TrendingUp size={20} />
                  ) : (
                    <ArrowUpRight size={20} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold">
                    {key === "accounts"
                      ? "Bank accounts"
                      : key === "investments"
                        ? "Investments"
                        : "Money lent"}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {included} of {items.length} included
                  </p>
                </div>
                <div className="text-right">
                  <p className="break-all text-sm font-semibold sm:text-base">
                    {money(section.value)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {section.percentage.toFixed(1)}% of assets
                  </p>
                </div>
                <ChevronDown
                  size={17}
                  className={`shrink-0 text-slate-400 transition-transform ${expandedSections[key] ? "rotate-180" : ""}`}
                />
              </button>
              {expandedSections[key] && (
                <div
                  id={`worth-items-${key}`}
                  className="border-t border-slate-100"
                >
                  {items.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500">
                      No assets in this category yet.
                    </p>
                  ) : (
                    items.map((item) => {
                      const isIncluded = map.get(item.id) ?? true;
                      const isUpdating = updatingItems.has(
                        getItemKey(entityType, item.id),
                      );
                      const value =
                        key === "investments"
                          ? item.quantity * item.currentPrice
                          : key === "debts"
                            ? Math.max(
                                0,
                                calculateRemainingWithInterest(
                                  item.amount,
                                  item.interestRate,
                                  item.lentDate,
                                  item.dueDate,
                                  item.repayments || [],
                                  new Date(),
                                  item.status,
                                ).remainingAmount,
                              )
                            : item.balance || 0;
                      const name =
                        item.holderName ||
                        item.name ||
                        item.borrowerName ||
                        "Unnamed asset";
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0 sm:px-6 ${!isIncluded ? "bg-slate-50 text-slate-400" : ""}`}
                        >
                          <button
                            aria-label={`${isIncluded ? "Exclude" : "Include"} ${name} ${isIncluded ? "from" : "in"} net worth`}
                            aria-pressed={isIncluded}
                            disabled={isUpdating || isBulkUpdating}
                            onClick={() =>
                              handleToggleInclusion(
                                entityType,
                                item.id,
                                isIncluded,
                              )
                            }
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-40"
                          >
                            {isUpdating ? (
                              <RefreshCw size={17} className="animate-spin" />
                            ) : isIncluded ? (
                              <Eye size={17} className="text-teal-600" />
                            ) : (
                              <EyeOff size={17} />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium">
                              {name}
                            </p>
                            <p className="mt-1 break-words text-xs text-slate-400">
                              {item.bankName ||
                                item.symbol ||
                                item.purpose ||
                                "No description"}
                              {!isIncluded && " · Excluded"}
                            </p>
                            {key === "debts" && item.dueDate && (
                              <p className="mt-1 text-xs text-slate-500">
                                Due {formatDate(new Date(item.dueDate))}
                              </p>
                            )}
                          </div>
                          <div className="max-w-[45%] text-right">
                            <p className="break-words text-sm font-semibold tabular-nums">
                              {money(value)}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {isIncluded && section.value !== 0
                                ? `${((value / section.value) * 100).toFixed(1)}% of category`
                                : isIncluded
                                  ? "Included"
                                  : "Excluded"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
      {notification && (
        <DisappearingNotification
          notification={notification}
          onHide={() => setNotification(null)}
        />
      )}
    </div>
  );
}
