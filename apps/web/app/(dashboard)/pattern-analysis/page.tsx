"use client";

import { useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, startOfMonth, startOfQuarter, startOfYear, subMonths } from "date-fns";
import {
  CartesianGrid, Customized, Line, LineChart, ReferenceLine, ResponsiveContainer, Text, Tooltip, XAxis, YAxis,
} from "recharts";
import { financialItemsQuery } from "../../hooks/financial-items-query";
import { useDisplayCurrency } from "../../hooks/useDisplayCurrency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";
import { convertTransactionForDisplaySync } from "../../utils/currencyDisplay";
import { getExpenses } from "../expenses/actions/expenses";
import { getIncomes } from "../incomes/actions/incomes";

import { CategoryManager } from "./CategoryManager";
import { getPatternAnalysisCategories } from "./categories";

const categoryQueryKey = ["pattern-analysis-categories"] as const;

const buttonClass = "rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50";

type TransactionType = "EXPENSE" | "INCOME";
const TRANSACTION_TYPES = [
  { value: "EXPENSE", label: "Expenses" },
  { value: "INCOME", label: "Income" },
] as const;

type Entry = {
  key: string;
  title: string;
  day: string;
  date: Date;
  category: string;
  categoryKey: string;
  color: string;
  amount: number;
};

type PeriodGroup = { key: string; name: string; color: string; entries: Entry[]; total: number | null };
type Period = { time: number; groups: PeriodGroup[]; entries: Entry[]; totals: Record<string, number | null> };

const MAX_HORIZONTAL_PADDING = 88;
const Y_AXIS_WIDTH = 76;
const KDE_Y_AXIS_WIDTH = 148;
const KDE_PADDING = { left: 12, right: 20, top: 12, bottom: 12 };
const CHART_MARGIN = { top: 24, right: 132, bottom: 8, left: 4 };

const pointButtonClass = "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100";


const GROUPINGS = {
  day: { label: "Daily", format: "MMM d, yyyy" },
  week: { label: "Weekly", format: "'Week of' MMM d, yyyy" },
  month: { label: "Monthly", format: "MMM yyyy" },
  quarter: { label: "Quarterly", format: "'Q'Q yyyy" },
  year: { label: "Yearly", format: "yyyy" },
} as const;

type Grouping = keyof typeof GROUPINGS;
const GROUPING_OPTIONS = (Object.keys(GROUPINGS) as Grouping[]).map((value) => ({
  value,
  label: GROUPINGS[value].label,
}));

const CHART_VIEWS = [
  { value: "trend", label: "Line" },
  { value: "kde", label: "KDE" },
] as const;
type ChartView = (typeof CHART_VIEWS)[number]["value"];

const DATE_PRESETS = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
] as const;
const presetClass = `${buttonClass} aria-pressed:border-indigo-600 aria-pressed:bg-indigo-50 aria-pressed:text-indigo-700`;

function periodStart(date: Date, grouping: Grouping) {
  switch (grouping) {
    case "week": return startOfWeek(date, { weekStartsOn: 1 });
    case "month": return startOfMonth(date);
    case "quarter": return startOfQuarter(date);
    case "year": return startOfYear(date);
    case "day": return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}

type CategoryDistribution = {
  key: string;
  name: string;
  color: string;
  points: number;
  values: number[];
  mean: number;
  deviation: number;
};

function quantile(sorted: number[], probability: number) {
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function kdeBandwidth(values: number[], deviation: number) {
  if (values.length < 2 || deviation === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const spread = Math.min(deviation, iqr > 0 ? iqr / 1.34 : deviation) || deviation;
  return 1.06 * spread * values.length ** -0.2;
}

function kdeDensity(values: number[], bandwidth: number, amount: number) {
  let sum = 0;
  for (const value of values) {
    const z = (amount - value) / bandwidth;
    sum += Math.exp(-0.5 * z * z);
  }
  return sum / (values.length * bandwidth * Math.SQRT2 * Math.sqrt(Math.PI));
}

function PeriodDistribution({ categories, minAmount, maxAmount, fillRatio = 0.25, offset, yAxisMap }: {
  categories: CategoryDistribution[];
  minAmount: number;
  maxAmount: number;
  fillRatio?: number;
  offset?: { left: number; top: number; width: number; height: number };
  yAxisMap?: Record<string, { scale?: (value: number) => number }>;
}) {
  if (!offset || offset.width <= 0 || offset.height <= 40 || !categories.length) return null;

  const { left: plotLeft, top: plotTop, width: plotWidth, height: plotHeight } = offset;
  const left = plotLeft + KDE_PADDING.left;
  const right = plotLeft + plotWidth - KDE_PADDING.right;
  const top = plotTop + KDE_PADDING.top;
  const bottom = plotTop + plotHeight - KDE_PADDING.bottom;
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  if (width <= 24 || height <= 40) return null;

  const span = maxAmount - minAmount || 1;
  const yAxis = yAxisMap && Object.values(yAxisMap)[0];
  const yForAmount = (amount: number) => {
    if (yAxis?.scale) return yAxis.scale(amount);
    return bottom - height * (amount - minAmount) / span;
  };
  const curveWidth = Math.max(24, width * fillRatio);

  return (
    <g pointerEvents="none" role="img"
      aria-label="Empirical density of visible category totals on the amount axis.">
      <line x1={left} y1={yForAmount(maxAmount)} x2={left} y2={yForAmount(minAmount)} stroke="#cbd5e1" />
      {categories.map(({ key, color, mean, deviation, values }) => {
        const midY = yForAmount(mean);
        const bandwidth = kdeBandwidth(values, deviation);
        if (bandwidth === 0) {
          return <line key={key} x1={left} x2={left + curveWidth} y1={midY} y2={midY}
            stroke={color} strokeOpacity={0.5} strokeDasharray="3 4" />;
        }

        const samples = Array.from({ length: 121 }, (_, index) => {
          const amount = minAmount + span * index / 120;
          return { amount, density: kdeDensity(values, bandwidth, amount) };
        });
        const peak = Math.max(...samples.map(({ density }) => density), Number.EPSILON);
        const xForDensity = (density: number) => left + curveWidth * density / peak;
        const pointAt = (amount: number) => {
          const density = kdeDensity(values, bandwidth, amount);
          return `${xForDensity(density)},${yForAmount(amount)}`;
        };
        const curvePoints = samples.map(({ amount, density }) =>
          `${xForDensity(density)},${yForAmount(amount)}`);
        const bandPoints = (from: number, to: number) => {
          const slice = samples.filter(({ amount }) => amount >= from && amount <= to)
            .map(({ amount, density }) => `${xForDensity(density)},${yForAmount(amount)}`);
          if (!slice.length) return "";
          return [
            `${left},${yForAmount(from)}`,
            pointAt(from),
            ...slice,
            pointAt(to),
            `${left},${yForAmount(to)}`,
          ].join(" ");
        };

        const sorted = [...values].sort((a, b) => a - b);
        const q1 = quantile(sorted, 0.25);
        const q3 = quantile(sorted, 0.75);
        const iqrBand = q3 > q1 ? bandPoints(q1, q3) : "";
        const markers = [
          { id: "q1", amount: q1, opacity: 0.25 },
          { id: "mean-2sd", amount: mean - 2 * deviation, opacity: 0.3 },
          { id: "mean-sd", amount: mean - deviation, opacity: 0.4 },
          { id: "mean", amount: mean, opacity: 0.65 },
          { id: "mean+sd", amount: mean + deviation, opacity: 0.4 },
          { id: "mean+2sd", amount: mean + 2 * deviation, opacity: 0.3 },
          { id: "q3", amount: q3, opacity: 0.25 },
        ].filter(({ amount }) => amount >= minAmount && amount <= maxAmount);

        return (
          <g key={key}>
            <polygon
              points={[
                `${left},${yForAmount(minAmount)}`,
                ...curvePoints,
                `${left},${yForAmount(maxAmount)}`,
              ].join(" ")}
              fill={color} fillOpacity={0.05} />
            {iqrBand && <polygon points={iqrBand} fill={color} fillOpacity={0.14} />}
            <polyline points={curvePoints.join(" ")} fill="none" stroke={color} strokeOpacity={0.55} />
            {markers.map(({ id, amount, opacity }) => {
              const density = kdeDensity(values, bandwidth, amount);
              const y = yForAmount(amount);
              return (
                <line key={id} x1={left} x2={xForDensity(density)} y1={y} y2={y}
                  stroke={color} strokeOpacity={opacity} strokeDasharray="3 4" />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

function PeriodTooltip({ active, period, grouping, currency, multipleCategories, excluded, setEntriesExcluded }: {
  active?: boolean;
  period?: Period;
  grouping: Grouping;
  currency: string;
  multipleCategories: boolean;
  excluded: ReadonlySet<string>;
  setEntriesExcluded: (entries: Entry[], hide: boolean) => void;
}) {
  if (!active || !period) return null;

  const periodExcluded = period.groups.every(({ total }) => total === null);
  const action = multipleCategories ? "period" : "point";
  const periodButtonLabel = `${periodExcluded ? "Restore" : "Exclude"} ${action}`;
  const dateLabel = format(period.time, GROUPINGS[grouping].format);

  return (
    <div className="w-[28rem] max-w-[min(calc(100vw-3rem),calc(100cqw-1rem))] overflow-hidden rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-base font-semibold">{dateLabel}</p>
        <button type="button" className={pointButtonClass} aria-label={periodButtonLabel} title={periodButtonLabel}
          onClick={(event) => {
            event.stopPropagation();
            setEntriesExcluded(period.entries, !periodExcluded);
          }}>
          {periodExcluded ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
        </button>
      </div>
      <div className="max-h-64 divide-y divide-gray-200 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] sm:max-h-80">
        {period.groups.map((group) => {
          const hidden = group.total === null;
          const label = `${hidden ? "Restore" : "Exclude"} ${group.name} point`;
          return (
            <div key={group.key} className="px-4 py-2">
              <div className="flex items-center justify-between gap-3 py-1">
                <div className="min-w-0">
                  {multipleCategories && (
                    <p className="flex items-center gap-2 break-words font-semibold">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} aria-hidden="true" />
                      {group.name}
                    </p>
                  )}
                  <p className="font-medium tabular-nums text-gray-600">
                    {group.total === null ? "Point excluded" : formatCurrency(group.total, currency)}
                  </p>
                </div>
                {multipleCategories && (
                  <button type="button" className={pointButtonClass} aria-label={label} title={label}
                    onClick={(event) => {
                      event.stopPropagation();
                      setEntriesExcluded(group.entries, !hidden);
                    }}>
                    {hidden ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <ul className="divide-y divide-gray-100 px-4">
          {period.entries.map((entry) => {
            const excludedEntry = excluded.has(entry.key);
            return (
              <li key={entry.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
                <div className={excludedEntry ? "opacity-50" : undefined}>
                  <p className="break-words font-medium">{entry.title}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs tabular-nums text-gray-600">
                    <span>{entry.day}</span>
                    {multipleCategories && <span>{entry.category}</span>}
                    <span>{formatCurrency(entry.amount, currency)}</span>
                    {excludedEntry && <span>Excluded</span>}
                  </p>
                </div>
                <input type="checkbox" checked={!excludedEntry}
                  className="size-4 cursor-pointer accent-indigo-600"
                  aria-label={`Include ${entry.title} on ${entry.day}`}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setEntriesExcluded([entry], !event.target.checked)} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function TrendView({ type, grouping, entries, currency, charts, excluded, setEntriesExcluded }: {
  type: TransactionType;
  grouping: Grouping;
  entries: Entry[];
  currency: string;
  charts: readonly ChartView[];
  excluded: ReadonlySet<string>;
  setEntriesExcluded: (entries: Entry[], hide: boolean) => void;
}) {
  const showTrend = charts.includes("trend");
  const showKde = charts.includes("kde");
  const [activeTime, setActiveTime] = useState<number | null>(null);
  const restoreButton = useRef<HTMLButtonElement>(null);
  const [horizontalPadding, setHorizontalPadding] = useState(MAX_HORIZONTAL_PADDING);
  const axisAmount = useMemo(() => new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 2,
  }), []);
  const { periods, series, totals } = useMemo(() => {
    const categories = new Map<string, { name: string; values: number[]; color: string; lastIndex: number }>();
    const buckets = new Map<number, Map<string, Entry[]>>();
    for (const entry of entries) {
      if (!categories.has(entry.categoryKey)) {
        categories.set(entry.categoryKey, {
          name: entry.category,
          values: [],
          color: entry.color,
          lastIndex: -1,
        });
      }

      const time = periodStart(entry.date, grouping).getTime();
      let bucket = buckets.get(time);
      if (!bucket) {
        bucket = new Map();
        buckets.set(time, bucket);
      }
      const categoryEntries = bucket.get(entry.categoryKey);
      if (categoryEntries) categoryEntries.push(entry);
      else bucket.set(entry.categoryKey, [entry]);
    }

    const totals: number[] = [];
    const periods: Period[] = [...buckets].sort(([a], [b]) => a - b).map(([time, bucket], index) => {
      const groups = [...bucket].map(([key, entries]) => {
        const visible = entries.filter((entry) => !excluded.has(entry.key));
        const total = visible.length ? visible.reduce((sum, entry) => sum + entry.amount, 0) : null;
        const category = categories.get(key)!;
        if (total !== null) {
          totals.push(total);
          category.values.push(total);
          category.lastIndex = index;
        }
        return {
          key,
          name: category.name,
          color: category.color,
          entries,
          total,
        };
      }).sort((a, b) => (b.total ?? -Infinity) - (a.total ?? -Infinity) || a.name.localeCompare(b.name));
      return {
        time,
        groups,
        entries: groups.flatMap(({ entries }) => entries).sort((a, b) => b.amount - a.amount),
        totals: Object.fromEntries(groups.map(({ key, total }) => [key, total])),
      };
    });

    return {
      periods,
      series: [...categories].map(([key, { values, ...category }]) => {
        const points = values.length;
        const mean = points ? values.reduce((sum, value) => sum + value, 0) / points : 0;
        const variance = points ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / points : 0;
        return { key, ...category, points, values, mean, deviation: Math.sqrt(variance) };
      }),
      totals,
    };
  }, [entries, grouping, excluded]);

  const activePeriod = periods.find(({ time }) => time === activeTime);
  const minAmount = totals.reduce((min, value) => Math.min(min, value), totals[0] ?? 0);
  const maxAmount = totals.reduce((max, value) => Math.max(max, value), totals[0] ?? 0);
  const axisPadding = (maxAmount - minAmount) * 0.01 || Math.max(Math.abs(minAmount) * 0.05, 1);
  const distributions = series.filter(({ points }) => points > 0);
  const distributionMin = distributions.reduce((min, { values, deviation }) => {
    const pad = Math.max(3 * kdeBandwidth(values, deviation), axisPadding);
    return Math.min(min, Math.min(...values) - pad);
  }, minAmount - axisPadding);
  const distributionMax = distributions.reduce((max, { values, deviation }) => {
    const pad = Math.max(3 * kdeBandwidth(values, deviation), axisPadding);
    return Math.max(max, Math.max(...values) + pad);
  }, maxAmount + axisPadding);
  const sigmaPadMin = distributions.reduce(
    (min, { mean, deviation }) => Math.min(min, mean - 2 * deviation), minAmount - axisPadding,
  );
  const sigmaPadMax = distributions.reduce(
    (max, { mean, deviation }) => Math.max(max, mean + 2 * deviation), maxAmount + axisPadding,
  );
  const yMin = showKde ? Math.min(showTrend ? minAmount - axisPadding : distributionMin, sigmaPadMin) : minAmount - axisPadding;
  const yMax = showKde ? Math.max(showTrend ? maxAmount + axisPadding : distributionMax, sigmaPadMax) : maxAmount + axisPadding;
  const excludedPeriods = periods.flatMap(({ time, entries }) => {
    const hidden = entries.filter(({ key }) => excluded.has(key));
    return hidden.length ? [{ time, entries: hidden }] : [];
  }).reverse();
  const excludedCount = excludedPeriods.reduce((count, period) => count + period.entries.length, 0);
  const periodLabel = (time: number) => format(time, GROUPINGS[grouping].format);

  return (
    <div className="space-y-3">
      <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {[
              `${GROUPINGS[grouping].label} ${type === "EXPENSE" ? "expense" : "income"}`,
              showTrend && "Line",
              showKde && "KDE",
              currency,
            ].filter(Boolean).join(" · ")}
          </h2>
          <div className="ml-auto flex min-w-0 flex-col items-end gap-2">
            {excludedCount > 0 && (
              <div className="group relative">
                <button ref={restoreButton} type="button" className="text-sm font-medium text-indigo-700 hover:underline"
                  onClick={() => setEntriesExcluded(excludedPeriods.flatMap(({ entries }) => entries), false)}>
                  Restore {excludedCount} excluded {excludedCount === 1 ? "entry" : "entries"}
                </button>
                <div className="invisible absolute right-0 top-full z-20 w-96 max-w-[calc(100vw-3rem)] pt-2 group-focus-within:visible group-hover:visible">
                  <div className="rounded-lg border border-gray-200 bg-white text-sm text-gray-900 shadow-lg">
                    <p className="border-b border-gray-200 px-4 py-2 font-semibold">Excluded transactions</p>
                    <div tabIndex={0} aria-label="Excluded transactions by period"
                      className="max-h-72 divide-y divide-gray-200 overflow-y-auto overscroll-contain">
                      {excludedPeriods.map((period) => (
                        <section key={period.time} className="px-4 py-2">
                          <h3 className="font-semibold">{periodLabel(period.time)}</h3>
                          <ul className="mt-1 divide-y divide-gray-100">
                            {period.entries.map((entry) => (
                              <li key={entry.key} className="flex items-start justify-between gap-3 py-1.5">
                                <div className="min-w-0">
                                  <p className="break-words">{entry.title}</p>
                                  <p className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <span className="size-2 shrink-0 rounded-full"
                                      style={{ backgroundColor: entry.color }} aria-hidden="true" />
                                    {entry.category}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="text-xs tabular-nums text-gray-700">
                                    {formatCurrency(entry.amount, currency)}
                                  </span>
                                  <input type="checkbox" checked={false}
                                    className="size-4 cursor-pointer accent-indigo-600"
                                    aria-label={`Restore ${entry.title} on ${entry.day}`}
                                    onChange={(event) => {
                                      if (event.target.checked) {
                                        restoreButton.current?.focus();
                                        setEntriesExcluded([entry], false);
                                      }
                                    }} />
                                </div>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {!totals.length ? (
          <p className="mt-4 text-sm text-gray-600">
            {periods.length ? "All entries in this view are excluded." : "No transactions match these filters."}
          </p>
        ) : (
          <div
            className={`mt-4 [container-type:inline-size] ${showTrend || showKde ? "h-[1050px] sm:h-[1400px]" : "h-[420px] sm:h-[520px]"}`}
            onMouseLeave={() => setActiveTime(null)}>
            <ResponsiveContainer width="100%" height="100%" onResize={(width) => {
              const axisWidth = showKde ? KDE_Y_AXIS_WIDTH : Y_AXIS_WIDTH;
              const plotWidth = width - axisWidth - CHART_MARGIN.left - CHART_MARGIN.right;
              setHorizontalPadding(Math.min(MAX_HORIZONTAL_PADDING, Math.max(0, Math.floor(plotWidth / 4))));
            }}>
              <LineChart data={periods} margin={CHART_MARGIN}
                onClick={showTrend ? ({ activeLabel }) => {
                  const time = typeof activeLabel === "number" ? activeLabel : null;
                  setActiveTime((current) => current === time ? null : time);
                } : undefined}>
                {showKde && (
                  <Customized component={<PeriodDistribution categories={distributions}
                    minAmount={yMin} maxAmount={yMax}
                    fillRatio={showTrend ? 0.22 : 0.55} />} />
                )}
                {(showTrend || showKde) && (
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal vertical={showTrend} />
                )}
                {showKde && distributions.flatMap(({ key, color, mean, deviation }) => (
                  [
                    {
                      id: `${key}-mu`,
                      amount: mean,
                      text: `μ : ${formatCurrency(mean, currency)}`,
                      weight: 700,
                      opacity: 0.7,
                    },
                    {
                      id: `${key}-sd1-hi`,
                      amount: mean + deviation,
                      text: `σ : ${formatCurrency(mean + deviation, currency)}`,
                      weight: 600,
                      opacity: 0.5,
                    },
                    {
                      id: `${key}-sd1-lo`,
                      amount: mean - deviation,
                      text: null as string | null,
                      weight: 600,
                      opacity: 0.4,
                    },
                    {
                      id: `${key}-sd2-hi`,
                      amount: mean + 2 * deviation,
                      text: `2σ : ${formatCurrency(mean + 2 * deviation, currency)}`,
                      weight: 600,
                      opacity: 0.4,
                    },
                    {
                      id: `${key}-sd2-lo`,
                      amount: mean - 2 * deviation,
                      text: null as string | null,
                      weight: 600,
                      opacity: 0.3,
                    },
                  ].filter(({ amount }) => amount >= yMin && amount <= yMax).map(({ id, amount, text, weight, opacity }) => (
                    <ReferenceLine key={id} y={amount} stroke={color} strokeWidth={text?.startsWith("μ") ? 2 : 1.5}
                      strokeDasharray="2 5" strokeLinecap="round" strokeOpacity={opacity}
                      label={text ? ({ viewBox }: { viewBox?: { x: number; y: number } }) => viewBox ? (
                        <text x={viewBox.x - 10} y={viewBox.y} textAnchor="end" dominantBaseline="middle"
                          fill={color} stroke="white" strokeWidth={3} paintOrder="stroke"
                          fontSize={10} fontWeight={weight} pointerEvents="none">
                          {text}
                        </text>
                      ) : <g /> : undefined} />
                  ))
                ))}
                {showTrend && !showKde && series.map(({ key, points, mean, color }) => points > 0 && (
                  <ReferenceLine key={key} y={mean} stroke={color} strokeWidth={2}
                    strokeDasharray="2 5" strokeLinecap="round"
                    label={({ viewBox }: { viewBox?: { x: number; y: number } }) => viewBox ? (
                      <text x={viewBox.x + 8} y={viewBox.y - 5} fill={color}
                        stroke="white" strokeWidth={3} paintOrder="stroke"
                        fontSize={12} fontWeight={600} pointerEvents="none">
                        {formatCurrency(mean, currency)}
                      </text>
                    ) : <g />} />
                ))}
                <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]}
                  hide={!showTrend} ticks={periods.map(({ time }) => time)} interval={0}
                  tickFormatter={periodLabel} tick={{ fontSize: 11 }} tickMargin={8}
                  padding={{ left: horizontalPadding, right: horizontalPadding }} />
                <YAxis domain={[yMin, yMax]} tickCount={16}
                  hide={!(showTrend || showKde)} width={showKde ? KDE_Y_AXIS_WIDTH : Y_AXIS_WIDTH}
                  padding={{ top: horizontalPadding, bottom: horizontalPadding }}
                  interval={0} tickMargin={8} tick={{ fontSize: 12 }}
                  tickFormatter={(amount) => axisAmount.format(amount)} />
                {showTrend && (
                  <Tooltip trigger="click" active={Boolean(activePeriod)} filterNull={false} isAnimationActive={false}
                    wrapperStyle={{ pointerEvents: "auto" }}
                    content={<PeriodTooltip key={activePeriod?.time} period={activePeriod}
                      grouping={grouping} currency={currency} multipleCategories={series.length > 1}
                      excluded={excluded} setEntriesExcluded={setEntriesExcluded} />} />
                )}
                {showTrend && series.map(({ key, name, color, points, lastIndex }) => (
                  <Line key={key} name={name} dataKey={`totals.${key}`} stroke={color} strokeWidth={2.5}
                    dot={{ r: points > 36 ? 2 : 3 }} activeDot={Boolean(activePeriod) && { r: 6, cursor: "pointer" }}
                    connectNulls isAnimationActive={false}
                    label={({ index, value, viewBox }: {
                      index?: number;
                      value?: number | null;
                      viewBox?: { x?: number; y?: number };
                    }) => {
                      const x = viewBox?.x;
                      const y = viewBox?.y;
                      if (typeof value !== "number" || typeof x !== "number" || typeof y !== "number") return <g />;

                      return (
                        <g pointerEvents="none" fill={color} stroke="white" strokeWidth={3} paintOrder="stroke">
                          <text x={x} y={y - 8} textAnchor="middle" fontSize={11} fontWeight={600}>
                            {formatCurrency(value, currency)}
                          </text>
                          {index === lastIndex && (
                            <Text x={x + 8} y={y} width={116} maxLines={1} verticalAnchor="middle"
                              fontSize={12} fontWeight={700} fill={color} aria-label={name}>
                              {name}
                            </Text>
                          )}
                        </g>
                      );
                    }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatternAnalysisPage() {
  const [types, setTypes] = useState<TransactionType[]>(["EXPENSE"]);
  const [categorySelection, setCategorySelection] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const categoryQuery = useQuery({ queryKey: categoryQueryKey, queryFn: getPatternAnalysisCategories });
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [years, setYears] = useState<string[] | null>(() => [format(new Date(), "yyyy")]);
  const [groupings, setGroupings] = useState<Grouping[]>(["month"]);
  const [charts, setCharts] = useState<ChartView[]>(["trend", "kde"]);
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());

  const showExpenses = types.includes("EXPENSE");
  const showIncomes = types.includes("INCOME");
  const expenses = useQuery({ ...financialItemsQuery("EXPENSE", getExpenses), enabled: showExpenses });
  const incomes = useQuery({ ...financialItemsQuery("INCOME", getIncomes), enabled: showIncomes });
  const { displayCurrency, currencyRateVersion } = useDisplayCurrency();
  const { isRatesLoading } = useCurrency();
  const currency = displayCurrency || "USD";

  const sources = useMemo(() => [
    { type: "EXPENSE" as const, transactions: expenses.data, enabled: showExpenses },
    { type: "INCOME" as const, transactions: incomes.data, enabled: showIncomes },
  ], [expenses.data, incomes.data, showExpenses, showIncomes]);

  const { categoryOptions, yearOptions } = useMemo(() => {
    const counts = new Map<number, number>();
    const availableYears = new Set([format(new Date(), "yyyy")]);
    for (const { transactions, enabled } of sources) {
      if (!enabled) continue;
      for (const { categoryId, date } of transactions ?? []) {
        counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
        availableYears.add(format(new Date(date), "yyyy"));
      }
    }

    const categoryOptions = (categoryQuery.data ?? [])
      .filter(({ managed, type }) => managed && (type === "EXPENSE" ? showExpenses : showIncomes))
      .map(({ id, name, type, color }) => ({
        id,
        label: showExpenses && showIncomes ? `${name} · ${type === "EXPENSE" ? "Expense" : "Income"}` : name,
        count: counts.get(id) ?? 0,
        name,
        color: color || "#6366f1",
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return {
      categoryOptions,
      yearOptions: [...availableYears].sort().reverse().map((year) => ({ value: year, label: year })),
    };
  }, [sources, showExpenses, showIncomes, categoryQuery.data]);

  const categories = useMemo(() => new Map(categoryOptions
    .filter(({ id }) => categorySelection.includes(id)).map((category) => [category.id, category])), [categoryOptions, categorySelection]);

  const entriesByType = useMemo(() => {
    return sources.filter(({ enabled }) => enabled).map(({ type, transactions }) => {
      const entries: Entry[] = [];
      for (const transaction of transactions ?? []) {
        const category = categories.get(transaction.categoryId);
        if (!category) continue;
        const categoryKey = `${type}:${transaction.categoryId}`;
        const date = new Date(transaction.date);
        const day = format(date, "yyyy-MM-dd");
        if ((start && day < start) || (end && day > end)) continue;
        if (years !== null && !years.includes(day.slice(0, 4))) continue;
        entries.push({
          key: `${type}:${transaction.id}`,
          title: transaction.title,
          category: category.name,
          color: category.color,
          categoryKey,
          date,
          day,
          amount: convertTransactionForDisplaySync(transaction, currency),
        });
      }
      return { type, entries };
    });
    // Conversion reads the shared rate cache, which can change without a currency change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, categories, start, end, years, currency, currencyRateVersion]);

  const activeGroupings = GROUPING_OPTIONS.filter(({ value }) => groupings.includes(value));
  const today = new Date();
  const todayLabel = format(today, "yyyy-MM-dd");
  const allDates = !start && !end && years === null;
  const expensesFailed = showExpenses && expenses.isError && !expenses.data;
  const incomesFailed = showIncomes && incomes.isError && !incomes.data;
  const isLoading = (showExpenses && expenses.isPending) || (showIncomes && incomes.isPending) || isRatesLoading;

  function setEntriesExcluded(entries: Entry[], hide: boolean) {
    setExcluded((previous) => {
      const next = new Set(previous);
      for (const { key } of entries) {
        if (hide) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  return (
    <section className="w-full min-w-0 space-y-5">
      <h1 className="text-2xl font-semibold text-gray-900">Pattern Analysis</h1>
      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <fieldset className="min-w-0 rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-semibold text-gray-900">Transaction Type</legend>
          <div className="flex flex-wrap gap-2">
            {TRANSACTION_TYPES.map(({ value, label }) => (
              <button key={value} type="button" className={presetClass} aria-pressed={types.includes(value)}
                onClick={() => setTypes((current) => current.includes(value)
                  ? current.filter((type) => type !== value)
                  : [...current, value])}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="min-w-0 rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-semibold text-gray-900">Category</legend>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {categoryQuery.isPending ? (
                <p className="text-sm text-gray-600" role="status">Loading categories…</p>
              ) : categoryQuery.isError && !categoryQuery.data ? (
                <div className="flex flex-wrap items-center gap-2" role="alert">
                  <p className="text-sm text-gray-700">Couldn’t load categories.</p>
                  <button type="button" className={buttonClass} onClick={() => void categoryQuery.refetch()}>Try again</button>
                </div>
              ) : categoryOptions.length ? (
                <>
                  {categoryOptions.map(({ id, label, count, color }) => (
                    <button key={id} type="button" className={`${buttonClass} inline-flex items-center gap-2 aria-pressed:font-semibold`}
                      aria-pressed={categories.has(id)}
                      style={{
                        borderColor: color,
                        backgroundColor: categories.has(id) ? `color-mix(in srgb, ${color} 20%, white)` : undefined,
                      }}
                      onClick={() => setCategorySelection((current) => current.includes(id)
                        ? current.filter((categoryId) => categoryId !== id)
                        : [...current, id])}>
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                      {label} ({count})
                    </button>
                  ))}
                </>
              ) : (
                <p className="text-sm text-gray-600">Use Manage Categories to add filter options.</p>
              )}
            </div>
            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3">
              {categories.size > 0 && (
                <button type="button" className="text-sm font-medium text-red-700 hover:underline"
                  onClick={() => setCategorySelection([])}>
                  Unselect all
                </button>
              )}
              <CategoryManager categories={categoryQuery.data}
                buttonClass="shrink-0 text-sm font-medium text-orange-700 hover:underline disabled:opacity-50"
                onSaved={(ids) => {
                  const managed = new Set(ids);
                  queryClient.setQueryData<typeof categoryQuery.data>(categoryQueryKey, (current) =>
                    current?.map((category) => ({ ...category, managed: managed.has(category.id) })));
                  setCategorySelection((current) => current.filter((id) => managed.has(id)));
                  void queryClient.invalidateQueries({ queryKey: categoryQueryKey });
                }} />
            </div>
          </div>
        </fieldset>
        <fieldset className="min-w-0 rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-semibold text-gray-900">Time</legend>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Time filters">
            <button type="button" className={presetClass} aria-pressed={allDates} onClick={() => {
              setStart("");
              setEnd("");
              setYears(null);
            }}>All</button>
            {DATE_PRESETS.map((preset) => {
              const presetStart = format(subMonths(today, preset.months), "yyyy-MM-dd");
              const active = start === presetStart && end === todayLabel && years === null;
              return (
                <button key={preset.label} type="button" className={presetClass} aria-pressed={active}
                  onClick={() => {
                    setStart(presetStart);
                    setEnd(todayLabel);
                    setYears(null);
                  }}>
                  {preset.label}
                </button>
              );
            })}
            <span aria-hidden="true" className="px-1 text-gray-400">|</span>
            {yearOptions.map(({ value, label }) => (
              <button key={value} type="button" className={presetClass}
                aria-pressed={Boolean(years?.includes(value) && !start && !end)}
                onClick={() => {
                  setStart("");
                  setEnd("");
                  setYears((current) => {
                    if (start || end) return [value];
                    if (!current?.includes(value)) return [...(current ?? []), value];
                    const remaining = current.filter((year) => year !== value);
                    return remaining.length ? remaining : null;
                  });
                }}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="min-w-0 rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-semibold text-gray-900">Time Periods</legend>
          <div className="flex flex-wrap gap-2">
            {GROUPING_OPTIONS.map(({ value, label }) => (
              <button key={value} type="button" className={presetClass} aria-pressed={groupings.includes(value)}
                onClick={() => setGroupings((current) => current.includes(value)
                  ? current.filter((grouping) => grouping !== value)
                  : [...current, value])}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="min-w-0 rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-semibold text-gray-900">Chart</legend>
          <div className="flex flex-wrap gap-2">
            {CHART_VIEWS.map(({ value, label }) => (
              <button key={value} type="button" className={presetClass} aria-pressed={charts.includes(value)}
                onClick={() => setCharts((current) => current.includes(value)
                  ? current.filter((chart) => chart !== value)
                  : [...current, value])}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {!entriesByType.length || !activeGroupings.length ? (
        <p className="text-sm text-gray-600">Select at least one transaction type and grouping.</p>
      ) : !charts.length ? (
        <p className="text-sm text-gray-600">Select at least one chart.</p>
      ) : expensesFailed || incomesFailed ? (
        <div role="alert">
          <p className="mb-2 text-sm text-gray-700">Transactions couldn’t load.</p>
          <button type="button" className={buttonClass} onClick={() => {
            if (expensesFailed) void expenses.refetch();
            if (incomesFailed) void incomes.refetch();
          }}>Try again</button>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-gray-600" role="status">Loading transactions…</p>
      ) : categories.size === 0 ? (
        <p className="text-sm text-gray-600">Select a category to see its trend.</p>
      ) : (
        entriesByType.map(({ type, entries }) => activeGroupings.map(({ value: grouping }) => (
          <TrendView key={`${type}:${grouping}`} type={type} grouping={grouping} entries={entries}
            currency={currency} charts={charts} excluded={excluded} setEntriesExcluded={setEntriesExcluded} />
        )))
      )}
    </section>
  );
}
