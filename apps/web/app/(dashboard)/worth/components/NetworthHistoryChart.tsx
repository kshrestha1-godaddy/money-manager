"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Plus, RefreshCw } from "lucide-react";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { formatCurrency, getCurrencySymbol } from "../../../utils/currency";
import { formatDate } from "../../../utils/date";
import {
  getNetworthHistory,
  NetworthHistoryRecord,
} from "../actions/networth-history";

const periods = [
  { value: "30", label: "1M" },
  { value: "60", label: "2M" },
  { value: "90", label: "3M" },
  { value: "180", label: "6M" },
  { value: "365", label: "1Y" },
] as const;
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50";

interface NetworthHistoryChartProps {
  className?: string;
  displayCurrency?: string;
  onRecordNetworth?: () => void;
  isRecording?: boolean;
  refreshTrigger?: number;
}

export function NetworthHistoryChart({
  className = "",
  displayCurrency,
  onRecordNetworth,
  isRecording = false,
  refreshTrigger = 0,
}: NetworthHistoryChartProps) {
  const { currency: userCurrency, currencyRateAnchors } = useCurrency();
  const currency = displayCurrency ?? userCurrency;
  const gradientId = useId().replace(/:/g, "");
  const [period, setPeriod] = useState("60");
  const [records, setRecords] = useState<NetworthHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - Number(period));
        start.setHours(0, 0, 0, 0);
        const result = await getNetworthHistory(start, end, 10000);
        if (!active) return;
        if (!result.success)
          throw new Error(result.error || "Unable to load history");
        setRecords(
          (result.data || []).sort(
            (a, b) =>
              new Date(a.snapshotDate).getTime() -
              new Date(b.snapshotDate).getTime(),
          ),
        );
      } catch (err) {
        if (active)
          setError(
            err instanceof Error ? err.message : "Unable to load history",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [period, refreshTrigger, retry]);

  // Normalize each snapshot using its recorded currency and the app's configured rates.
  const data = useMemo(
    () =>
      records.map((record) => {
        const convert = (value: number) =>
          convertForDisplaySync(value, record.currency, currency);
        return {
          ...record,
          netWorth: convert(record.netWorth),
          totalAssets: convert(record.totalAssets),
          totalAccountBalance: convert(record.totalAccountBalance),
          totalInvestmentValue: convert(record.totalInvestmentValue),
          totalMoneyLent: convert(record.totalMoneyLent),
          timestamp: new Date(record.snapshotDate).getTime(),
        };
      }),
    [records, currency, currencyRateAnchors],
  );
  const first = data[0];
  const latest = data[data.length - 1];
  const change = latest && first ? latest.netWorth - first.netWorth : 0;
  const percent =
    first && first.netWorth !== 0
      ? (change / Math.abs(first.netWorth)) * 100
      : null;
  const comparable = data.length > 1;
  const trendColor = change < 0 ? "#e11d48" : "#0d9488";
  const compact = (value: number) =>
    `${getCurrencySymbol(currency)}${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
  const money = (value: number) => formatCurrency(value, currency);
  const domain = useMemo(() => {
    const values = data.map((record) => record.netWorth);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.15, Math.abs(max) * 0.02, 1);
    return [min - padding, max + padding];
  }, [data]);

  return (
    <section
      className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
      aria-label="Net worth history"
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            Your worth over time
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Recorded snapshots · {currency} · current conversion rates
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex rounded-lg bg-slate-100 p-1"
            role="group"
            aria-label="History period"
          >
            {periods.map((option) => (
              <button
                key={option.value}
                aria-pressed={period === option.value}
                onClick={() => setPeriod(option.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-teal-500 ${period === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {onRecordNetworth && (
            <button
              className={button}
              onClick={onRecordNetworth}
              disabled={isRecording}
            >
              {isRecording ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {isRecording ? "Recording…" : "Record snapshot"}
            </button>
          )}
        </div>
      </div>
      {error ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-slate-500" role="alert">
            {error}
          </p>
          <button
            className={button}
            onClick={() => setRetry((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div
          className="flex h-80 items-center justify-center gap-2 text-sm text-slate-400"
          role="status"
        >
          <RefreshCw size={16} className="animate-spin" />
          Loading snapshots…
        </div>
      ) : !latest ? (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 pb-8 text-center">
          <Activity className="mb-4 text-teal-600" size={30} />
          <h3 className="font-medium text-slate-800">
            Your progress starts with a snapshot
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            No {currency} snapshots in this period. Choose a longer range or
            record your current worth to start tracking.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 px-5 pb-5 sm:px-6">
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              {money(latest.netWorth)}
            </p>
            <p
              className={`text-xs font-medium ${change < 0 ? "text-rose-600" : "text-teal-700"}`}
            >
              {comparable
                ? `${change > 0 ? "+" : ""}${money(change)}${percent !== null ? ` (${percent > 0 ? "+" : ""}${percent.toFixed(1)}%)` : ""} over this period`
                : "First snapshot · record another to see change"}
            </p>
          </div>
          <div
            className="h-72 w-full px-2 sm:h-80 sm:px-4"
            role="img"
            aria-label={`Net worth from ${formatDate(new Date(first!.snapshotDate))} to ${formatDate(new Date(latest.snapshotDate))}. Latest ${money(latest.netWorth)}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 12, right: 16, bottom: 12, left: 8 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={trendColor}
                      stopOpacity={0.18}
                    />
                    <stop
                      offset="100%"
                      stopColor={trendColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  minTickGap={45}
                  dy={10}
                />
                <YAxis
                  domain={domain}
                  tickFormatter={compact}
                  width={76}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickCount={5}
                />
                {comparable && (
                  <ReferenceLine
                    y={first!.netWorth}
                    stroke="#cbd5e1"
                    strokeDasharray="4 4"
                  />
                )}
                <Tooltip
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload as
                      | (typeof data)[number]
                      | undefined;
                    if (!active || !point) return null;
                    return (
                      <div className="min-w-56 rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-lg">
                        <p className="mb-3 text-slate-500">
                          {formatDate(new Date(point.snapshotDate))} ·{" "}
                          {point.recordType === "MANUAL"
                            ? "Manual"
                            : "Automatic"}
                        </p>
                        {[
                          ["Net worth", point.netWorth],
                          ["Bank balance", point.totalAccountBalance],
                          ["Investments", point.totalInvestmentValue],
                          ["Money lent", point.totalMoneyLent],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="flex justify-between gap-6 py-1"
                          >
                            <span className="text-slate-500">{label}</span>
                            <span className="font-semibold text-slate-900">
                              {money(Number(value))}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Area
                  type="linear"
                  dataKey="netWorth"
                  stroke={trendColor}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={data.length === 1 ? { r: 4, fill: trendColor } : false}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 3 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 px-5 py-4 sm:grid-cols-4 sm:px-6">
            {[
              [
                "Period high",
                money(Math.max(...data.map((point) => point.netWorth))),
              ],
              [
                "Period low",
                money(Math.min(...data.map((point) => point.netWorth))),
              ],
              ["Snapshots", String(data.length)],
              ["Last recorded", formatDate(new Date(latest.snapshotDate))],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-1 break-words text-sm font-medium text-slate-700">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
