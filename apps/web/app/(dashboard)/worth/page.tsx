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
import { LOADING_COLORS } from "../../config/colorConfig";
import { useCurrency } from "../../providers/CurrencyProvider";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { useDisplayCurrency } from "../../hooks/useDisplayCurrency";
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
  const { displayCurrency } = useDisplayCurrency();
  const [expandedSections, setExpandedSections] = useState<
    Record<SectionKey, boolean>
  >({ accounts: false, investments: false, debts: false });
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    refreshInclusions,
  } = useOptimizedWorth();
  const getItemKey = (entityType: string, entityId: number) =>
    `${entityType}-${entityId}`;

  const eligibleDebts = allDebts.filter(
    ({ status }) => status === "ACTIVE" || status === "PARTIALLY_PAID",
  );
  const hasItems = allAccounts.length > 0 || allInvestments.length > 0 || eligibleDebts.length > 0;

  function notifyInclusionError(error: unknown) {
    console.error("Error updating net worth inclusions:", error);
    setNotification({
      title: "Inclusion update failed",
      message: "Couldn’t update which assets count toward net worth. Please try again.",
      type: "error",
    });
  }

  async function handleToggleInclusion(
    entityType: "ACCOUNT" | "INVESTMENT" | "DEBT",
    entityId: number,
    currentlyIncluded: boolean,
  ) {
    const itemKey = getItemKey(entityType, entityId);
    setUpdatingItems((previous) => new Set(previous).add(itemKey));

    try {
      const result = await toggleNetWorthInclusion(entityType, entityId, !currentlyIncluded);
      if (!result.success) throw new Error(result.error);
      await refreshInclusions();
    } catch (error) {
      notifyInclusionError(error);
    } finally {
      setUpdatingItems((previous) => {
        const next = new Set(previous);
        next.delete(itemKey);
        return next;
      });
    }
  }

  async function handleBulkInclusion(includeInNetWorth: boolean) {
    const updates = [
      ...allAccounts.map(({ id }) => ({ entityType: "ACCOUNT" as const, entityId: id })),
      ...allInvestments.map(({ id }) => ({ entityType: "INVESTMENT" as const, entityId: id })),
      ...eligibleDebts.map(({ id }) => ({ entityType: "DEBT" as const, entityId: id })),
    ].map((item) => ({ ...item, includeInNetWorth }));

    if (!updates.length) return;
    setIsBulkUpdating(true);
    try {
      const result = await bulkUpdateNetWorthInclusions(updates);
      if (!result.success) throw new Error(result.error);
      await refreshInclusions();
    } catch (error) {
      notifyInclusionError(error);
    } finally {
      setIsBulkUpdating(false);
    }
  }

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
      setIsRecording(false);
    }
  }, []);

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
  const colors = ["#10b981", "#3b82f6", "#ef4444"];
  async function refresh() {
    setIsRefreshing(true);
    setChartRefreshTrigger((value) => value + 1);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  }

  if (loading)
    return (
      <div className={LOADING_COLORS.container} role="status">
        <div className={LOADING_COLORS.spinner} aria-hidden="true" />
        <p className={LOADING_COLORS.text}>Loading net worth data...</p>
      </div>
    );
  if (error)
    return (
      <div className={`${panel} m-4 p-6 text-center sm:m-6 sm:p-8`} role="alert">
        <h1 className="text-lg font-semibold">Unable to load net worth</h1>
        <p className="my-3 text-sm text-slate-500">Try refreshing your financial data.</p>
        <button className={button} onClick={refresh} disabled={isRefreshing}>
          {isRefreshing ? "Retrying…" : "Try again"}
        </button>
      </div>
    );

  return (
    <div className="w-full min-w-0 space-y-6 p-4 text-slate-900 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="sr-only">Net worth</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
                    <button onClick={refresh} className={button} disabled={isRefreshing}>
            <RefreshCw size={15} aria-hidden="true" className={isRefreshing ? "animate-spin" : undefined} />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button style={{ display: "none" }} onClick={handleExportCSV} className={button}>
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
            <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <ArrowUpRight size={19} />
            </span>
            <p className="text-xs text-slate-500">This month’s net cash flow</p>
            <p
              className={`mt-2 break-words text-xl font-semibold ${stats.thisMonthNetIncome < 0 ? "text-red-600" : "text-green-600"}`}
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
                  className={`font-medium tabular-nums ${stats.thisMonthNetIncome < 0 ? "text-red-600" : "text-green-600"}`}
                >
                  {stats.thisMonthIncome > 0
                    ? `${((stats.thisMonthNetIncome / stats.thisMonthIncome) * 100).toFixed(1)}%`
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="min-w-0 pt-6 sm:pl-5 sm:pt-0">
            <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp size={19} />
            </span>
            <p className="text-xs text-slate-500">Investment return</p>
            <p
              className={`mt-2 break-words text-xl font-semibold ${stats.totalInvestmentGain < 0 ? "text-red-600" : "text-blue-600"}`}
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
                <dd className="font-medium tabular-nums text-blue-600">
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
        <div className="mb-6 min-w-0">
          <div
            className="h-64 min-w-0 sm:h-96"
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
                margin={{ top: 32, right: 8, bottom: 8, left: 0 }}
                barCategoryGap="8%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: "#6b7280", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  interval={0}
                  tickFormatter={(name: string) => name === "Bank Balance" ? "Banks" : name === "Money Lent" ? "Lent" : name}
                  dy={8}
                />
                <YAxis
                  axisLine={{ stroke: "#6b7280", strokeWidth: 1 }}
                  tickLine={false}
                  width={64}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("en", {
                      style: "currency",
                      currency: displayCurrency,
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(Number(value))
                  }
                />
                <ReferenceLine y={0} stroke="#d1d5db" />
                <Tooltip
                  cursor={{ fill: "#f9fafb" }}
                  content={({ active, payload }) => {
                    const item = payload?.[0]?.payload;
                    if (!active || !item) return null;
                    return (
                      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-lg">
                        <p className="text-gray-500">{item.name}</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {formatCurrency(item.value, displayCurrency)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.percentage}% of included assets
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={480}
                  isAnimationActive={false}
                >
                  {chartData.map((item, index) => (
                    <Cell key={item.name} fill={colors[index]} />
                  ))}
                  <LabelList
                    content={({ index, viewBox }) => {
                      const item = index === undefined ? undefined : chartData[index];
                      if (!item || !viewBox || !("width" in viewBox)) return null;

                      const { x, y, width, height } = viewBox;
                      if (x == null || y == null || !width || height == null) return null;

                      const inside = Math.abs(height) >= 56;
                      const centerX = x + width / 2;
                      const centerY = inside ? y + height / 2 : Math.min(y, y + height) - 32;
                      const amount = money(item.value);
                      const availableWidth = Math.max(1, width - 8);

                      return (
                        <text
                          x={centerX}
                          y={centerY}
                          textAnchor="middle"
                          fill={inside ? "#fff" : "#374151"}
                          fontSize={12}
                          fontWeight={600}
                          pointerEvents="none"
                        >
                          <tspan x={centerX} dy={-12}>{item.percentage}%</tspan>
                          <tspan
                            x={centerX}
                            dy={28}
                            textLength={amount.length * 8 > availableWidth ? availableWidth : undefined}
                            lengthAdjust="spacingAndGlyphs"
                          >
                            {amount}
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
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
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              disabled={!hasItems || isBulkUpdating || updatingItems.size > 0}
              onClick={() => handleBulkInclusion(true)}
            >
              Include all
            </button>
            <button
              className={button}
              disabled={!hasItems || isBulkUpdating || updatingItems.size > 0}
              onClick={() => handleBulkInclusion(false)}
            >
              Exclude all
            </button>
          </div>
        </div>
        {sections.map((section) => {
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
                : eligibleDebts;
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
                <span aria-hidden className="shrink-0 text-slate-500">
                  {key === "accounts" ? (
                    <Landmark size={16} />
                  ) : key === "investments" ? (
                    <TrendingUp size={16} />
                  ) : (
                    <ArrowUpRight size={16} />
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
                            disabled={updatingItems.size > 0 || isBulkUpdating}
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
