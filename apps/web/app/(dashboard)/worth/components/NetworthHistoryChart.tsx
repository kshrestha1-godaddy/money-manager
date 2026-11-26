"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Plus, RefreshCw } from "lucide-react";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { useResolvedDisplayCurrency } from "../../../components/PageDisplayCurrencySelect";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { formatCurrency, getCurrencySymbol } from "../../../utils/currency";
import { formatDate } from "../../../utils/date";
import {
  ForecastToggleButton,
  forecastSeriesKey,
  overlayColumns,
  overlayForecasts,
  useChartForecast,
} from "../../../components/forecasting";
import type { Frequency } from "../../../utils/forecasting";
import {
  getNetworthHistory,
  NetworthHistoryRecord,
} from "../actions/networth-history";

const periods = [
  { value: "mtd", label: "MTD" },
  { value: "30", label: "1M" },
  { value: "60", label: "2M" },
  { value: "90", label: "3M" },
  { value: "180", label: "6M" },
  { value: "365", label: "1Y" },
] as const;

function periodRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  if (period === "mtd") start.setDate(1);
  else start.setDate(start.getDate() - Number(period));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}
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
  const { currencyRateAnchors } = useCurrency();
  const currency = useResolvedDisplayCurrency(displayCurrency);
  const gradientId = useId().replace(/:/g, "");
  const [period, setPeriod] = useState("mtd");
  const [range, setRange] = useState(() => periodRange("mtd"));
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
        const { start, end } = periodRange(period);
        setRange({ start, end });
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

  const forecastFrequency = useMemo<Frequency>(() => {
    if (data.length < 2) return "daily";
    const gap = data[1]!.timestamp - data[0]!.timestamp;
    if (gap > 20 * 86_400_000) return "monthly";
    if (gap > 3 * 86_400_000) return "weekly";
    return "daily";
  }, [data]);

  const seriesPoints = useMemo(
    () =>
      data.map((point) => ({
        date: new Date(point.timestamp),
        value: point.netWorth,
      })),
    [data],
  );

  const { isForecastVisible, toggleForecast, plottedRuns } = useChartForecast({
    chartId: "networth-history",
    points: seriesPoints,
    frequency: forecastFrequency,
    gapFill: "interpolate",
  });

  const dailySeries = useMemo(
    () => fillDailySnapshots(data, range.start, range.end),
    [data, range.start, range.end],
  );

  const plotData = useMemo(() => {
    if (plottedRuns.length === 0) return dailySeries;
    const overlay = overlayForecasts(
      dailySeries.map((row) => ({
        month: String(row.timestamp),
        formattedMonth: formatDate(new Date(row.snapshotDate)),
        value: row.netWorth,
      })),
      plottedRuns,
      "day",
    );
    const byTimestamp = new Map(dailySeries.map((row) => [row.timestamp, row]));
    const lastHistoryTs = dailySeries[dailySeries.length - 1]?.timestamp ?? 0;
    return overlay
      .map((row) => {
        const timestamp = overlayTimestamp(row.month, row.isForecast);
        const observed = byTimestamp.get(timestamp);
        const columns = overlayColumns(row, plottedRuns);
        if (observed && !row.isForecast) return { ...observed, ...columns };
        return {
          timestamp,
          snapshotDate: new Date(timestamp).toISOString(),
          netWorth: null as number | null,
          isForecast: true,
          ...columns,
        };
      })
      .filter(
        (row) =>
          !("isForecast" in row && row.isForecast) || row.timestamp > lastHistoryTs,
      )
      .sort((left, right) => left.timestamp - right.timestamp);
  }, [dailySeries, plottedRuns]);

  const first = data[0];
  const latest = data[data.length - 1];
  const change = latest && first ? latest.netWorth - first.netWorth : 0;
  const percent =
    first && first.netWorth !== 0
      ? (change / Math.abs(first.netWorth)) * 100
      : null;
  const comparable = data.length > 1;
  const trendColor = change < 0 ? "#ef4444" : "#10b981";
  const compact = (value: number) =>
    `${getCurrencySymbol(currency)}${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
  const money = (value: number) => formatCurrency(value, currency);
  const domain = useMemo(() => {
    const values: number[] = [];
    for (const row of plotData) {
      if (typeof row.netWorth === "number") values.push(row.netWorth);
      for (const [key, value] of Object.entries(row)) {
        if (key.startsWith("fc_") && typeof value === "number") values.push(value);
      }
    }
    if (values.length === 0) return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.15, Math.abs(max) * 0.02, 1);
    return [min - padding, max + padding];
  }, [plotData]);

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
          <ForecastToggleButton isOn={isForecastVisible} onToggle={toggleForecast} />
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
              className={`text-xs font-medium ${change < 0 ? "text-red-600" : "text-green-600"}`}
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
              <ComposedChart
                data={plotData}
                margin={{ top: 56, right: 24, bottom: 12, left: 8 }}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={[range.start.getTime(), range.end.getTime()]}
                  scale="time"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  axisLine={{ stroke: "#6b7280", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  minTickGap={45}
                  dy={10}
                />
                <YAxis
                  domain={domain}
                  tickFormatter={compact}
                  width={76}
                  axisLine={{ stroke: "#6b7280", strokeWidth: 1 }}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
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
                      | (typeof plotData)[number]
                      | undefined;
                    if (!active || !point) return null;
                    if ("isForecast" in point && point.isForecast) {
                      const forecastEntries = plottedRuns
                        .map((run) => ({
                          run,
                          value: point[forecastSeriesKey(run.modelId)],
                        }))
                        .filter((entry) => typeof entry.value === "number");
                      return (
                        <div className="min-w-56 rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-lg">
                          <p className="mb-2 text-slate-500">
                            {formatDate(new Date(point.timestamp))} · Forecast
                          </p>
                          {forecastEntries.map(({ run, value }) => (
                            <div
                              key={run.modelId}
                              className="flex justify-between gap-6 py-1"
                            >
                              <span className="flex items-center gap-2 text-slate-500">
                                <span
                                  aria-hidden="true"
                                  className="inline-block h-0.5 w-4 rounded-full"
                                  style={{ backgroundColor: run.colour }}
                                />
                                {run.label}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {money(Number(value))}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    const history = point as (typeof data)[number];
                    const parts = [
                      {
                        label: "Banks",
                        value: history.totalAccountBalance,
                        color: "#10b981",
                      },
                      {
                        label: "Investments",
                        value: history.totalInvestmentValue,
                        color: "#3b82f6",
                      },
                      {
                        label: "Money lent",
                        value: history.totalMoneyLent,
                        color: "#ef4444",
                      },
                    ];
                    const netWorth = history.netWorth;
                    return (
                      <div className="min-w-64 rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-lg">
                        <p className="mb-3 text-slate-500">
                          {formatDate(new Date(history.snapshotDate))} ·{" "}
                          {history.recordType === "MANUAL"
                            ? "Manual"
                            : "Automatic"}
                        </p>
                        {parts.map((part) => {
                          const share =
                            netWorth > 0 ? (part.value / netWorth) * 100 : 0;
                          return (
                            <div
                              key={part.label}
                              className="flex items-center justify-between gap-6 py-1"
                            >
                              <span className="flex items-center gap-2 text-slate-500">
                                <span
                                  className="h-2 w-2 rounded-sm"
                                  style={{ backgroundColor: part.color }}
                                />
                                {part.label}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {money(part.value)}
                                <span className="ml-2 font-normal text-slate-500">
                                  {share.toFixed(1)}%
                                </span>
                              </span>
                            </div>
                          );
                        })}
                        <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
                          <span className="text-slate-500">Net worth</span>
                          <span className="font-semibold text-slate-900">
                            {money(netWorth)}
                          </span>
                        </div>
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
                  connectNulls={false}
                  dot={{
                    r: 3,
                    fill: trendColor,
                    stroke: "#fff",
                    strokeWidth: 1.5,
                  }}
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 3 }}
                  isAnimationActive={false}
                />
                {plottedRuns.map((run, index) => (
                  <Line
                    key={run.modelId}
                    type="linear"
                    dataKey={forecastSeriesKey(run.modelId)}
                    stroke={run.colour}
                    strokeWidth={1.5}
                    strokeDasharray={index % 2 === 0 ? "5 3" : "2 4"}
                    dot={{ r: 3, fill: run.colour }}
                    connectNulls
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                    legendType="none"
                  />
                ))}
                <ReferenceDot
                  x={latest.timestamp}
                  y={latest.netWorth}
                  r={5}
                  fill={trendColor}
                  stroke="#fff"
                  strokeWidth={2}
                  isFront
                  label={{
                    content: ({ viewBox }) => {
                      const point = viewBox as { x?: number; y?: number };
                      if (point.x === undefined || point.y === undefined)
                        return <g />;
                      return (
                        <g>
                          <text
                            x={point.x - 10}
                            y={point.y - 30}
                            textAnchor="end"
                            fill="#64748b"
                            fontSize={10}
                          >
                            Latest · {formatDate(new Date(latest.snapshotDate))}
                          </text>
                          <text
                            x={point.x - 10}
                            y={point.y - 14}
                            textAnchor="end"
                            fill={trendColor}
                            fontSize={12}
                            fontWeight={600}
                          >
                            {money(latest.netWorth)}
                          </text>
                        </g>
                      );
                    },
                  }}
                />
              </ComposedChart>
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

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function fillDailySnapshots<T extends { timestamp: number; snapshotDate: Date | string }>(
  snapshots: readonly T[],
  from: Date,
  to: Date,
): T[] {
  if (snapshots.length === 0) return [];
  const ordered = [...snapshots].sort((left, right) => left.timestamp - right.timestamp);
  const first = ordered[0];
  if (first === undefined) return [];

  const byDay = new Map<number, T[]>();
  for (const snapshot of ordered) {
    const day = startOfDay(new Date(snapshot.timestamp)).getTime();
    const group = byDay.get(day) ?? [];
    group.push(snapshot);
    byDay.set(day, group);
  }

  const rows: T[] = [];
  let previous = first;
  const firstDay = startOfDay(new Date(first.timestamp));
  const cursor = new Date(Math.max(startOfDay(from).getTime(), firstDay.getTime()));
  const lastDay = startOfDay(to);

  while (cursor.getTime() <= lastDay.getTime()) {
    const recordings = byDay.get(cursor.getTime());
    if (recordings && recordings.length > 0) {
      previous = recordings[recordings.length - 1] ?? previous;
      rows.push(...recordings);
    } else {
      rows.push({
        ...previous,
        timestamp: cursor.getTime(),
        snapshotDate: new Date(cursor.getTime()).toISOString(),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
}

function overlayTimestamp(key: string, isForecast: boolean): number {
  if (!isForecast) return Number(key);
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).getTime();
}
