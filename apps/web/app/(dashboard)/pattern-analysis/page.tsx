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
  mean: number;
  deviation: number;
};

function PeriodDistribution({ categories, minAmount, maxAmount, currency, offset }: {
  categories: CategoryDistribution[];
  minAmount: number;
  maxAmount: number;
  currency: string;
  offset?: { left: number; top: number; width: number; height: number };
}) {
  if (!offset || offset.width <= 0 || offset.height <= 40 || !categories.length) return null;

  const { left, top, width, height } = offset;
  const right = left + width;
  const bottom = top + height - 24;
  const curveHeight = (height - 24) * 0.25;
  const xFor = (amount: number) => left + width * (amount - minAmount) / (maxAmount - minAmount);
  const labelEdges: number[] = [];
  const labels = [...categories].sort((a, b) => a.mean - b.mean).map((category) => {
    const stats = `μ ${formatCurrency(category.mean, currency)} · σ ${formatCurrency(category.deviation, currency)}`;
    const halfWidth = Math.min(width / 2, Math.max(64, stats.length * 3.4));
    const x = Math.max(left + halfWidth, Math.min(right - halfWidth, xFor(category.mean)));
    const openRow = labelEdges.findIndex((edge) => edge + 8 <= x - halfWidth);
    const row = openRow === -1 ? labelEdges.length : openRow;
    labelEdges[row] = x + halfWidth;
    return { ...category, stats, x, y: bottom - curveHeight - 22 - row * 28, width: halfWidth * 2 };
  });

  return (
    <g pointerEvents="none" role="img"
      aria-label="Gaussian fits of visible category totals. Mu is the mean and sigma is the standard deviation.">
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#cbd5e1" />
      {categories.map(({ key, color, mean, deviation }) => {
        const center = xFor(mean);
        if (deviation === 0) {
          return <line key={key} x1={center} x2={center} y1={bottom - curveHeight} y2={bottom}
            stroke={color} strokeOpacity={0.5} strokeDasharray="3 4" />;
        }

        const yFor = (amount: number) => {
          const z = (amount - mean) / deviation;
          return bottom - curveHeight * Math.exp(-0.5 * z ** 2);
        };
        const curvePoints = (from: number, to: number) => Array.from({ length: 101 }, (_, index) => {
          const amount = from + (to - from) * index / 100;
          return `${xFor(amount)},${yFor(amount)}`;
        });
        const bandPoints = (from: number, to: number) =>
          [`${xFor(from)},${bottom}`, ...curvePoints(from, to), `${xFor(to)},${bottom}`].join(" ");

        const curveMin = Math.max(minAmount, mean - 4 * deviation);
        const curveMax = Math.min(maxAmount, mean + 4 * deviation);
        return (
          <g key={key}>
            <polygon points={bandPoints(curveMin, curveMax)} fill={color} fillOpacity={0.05} />
            {[2, 1].map((deviations) => (
              <polygon key={deviations} fill={color} fillOpacity={0.11}
                points={bandPoints(mean - deviations * deviation, mean + deviations * deviation)} />
            ))}
            <polyline points={curvePoints(curveMin, curveMax).join(" ")}
              fill="none" stroke={color} strokeOpacity={0.55} />
            {[-2, -1, 0, 1, 2].map((step) => {
              const amount = mean + step * deviation;
              const x = xFor(amount);
              return (
                <line key={step} x1={x} x2={x} y1={yFor(amount)} y2={bottom}
                  stroke={color} strokeOpacity={step === 0 ? 0.65 : 0.35} strokeDasharray="3 4" />
              );
            })}
          </g>
        );
      })}
      {width >= 360 && (
        <>
          <text x={left + 3} y={bottom + 15} fill="#475569" fontSize={11}>
            {formatCurrency(minAmount, currency)}
          </text>
          <text x={right - 3} y={bottom + 15} textAnchor="end" fill="#475569" fontSize={11}>
            {formatCurrency(maxAmount, currency)}
          </text>
        </>
      )}
      {labels.map(({ key, name, color, stats, x, y, width }) => (
        <g key={key} stroke="white" strokeWidth={3} paintOrder="stroke">
          <Text x={x} y={y} width={width} maxLines={1} textAnchor="middle"
            fill={color} fontSize={11} fontWeight={700}>{name}</Text>
          <Text x={x} y={y + 12} width={width} maxLines={1} textAnchor="middle"
            fill={color} fontSize={10}>{stats}</Text>
        </g>
      ))}
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

function TrendView({ type, grouping, entries, currency, excluded, setEntriesExcluded }: {
  type: TransactionType;
  grouping: Grouping;
  entries: Entry[];
  currency: string;
  excluded: ReadonlySet<string>;
  setEntriesExcluded: (entries: Entry[], hide: boolean) => void;
}) {
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
        return { key, ...category, points, mean, deviation: Math.sqrt(variance) };
      }),
      totals,
    };
  }, [entries, grouping, excluded]);

  const activePeriod = periods.find(({ time }) => time === activeTime);
  const minAmount = totals.reduce((min, value) => Math.min(min, value), totals[0] ?? 0);
  const maxAmount = totals.reduce((max, value) => Math.max(max, value), totals[0] ?? 0);
  const axisPadding = (maxAmount - minAmount) * 0.01 || Math.max(Math.abs(minAmount) * 0.05, 1);
  const distributions = series.filter(({ points }) => points > 0);
  const distributionMin = distributions.reduce(
    (min, { mean, deviation }) => Math.min(min, mean - 3 * deviation), minAmount - axisPadding,
  );
  const distributionMax = distributions.reduce(
    (max, { mean, deviation }) => Math.max(max, mean + 3 * deviation), maxAmount + axisPadding,
  );
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
            {GROUPINGS[grouping].label} {type === "EXPENSE" ? "expense" : "income"} trend · {currency}
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
          <div className="mt-4 h-[1050px] [container-type:inline-size] sm:h-[1400px]" onMouseLeave={() => setActiveTime(null)}>
            <ResponsiveContainer width="100%" height="100%" onResize={(width) => {
              const plotWidth = width - Y_AXIS_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
              setHorizontalPadding(Math.min(MAX_HORIZONTAL_PADDING, Math.max(0, Math.floor(plotWidth / 4))));
            }}>
              <LineChart data={periods} margin={CHART_MARGIN}
                onClick={({ activeLabel }) => {
                  const time = typeof activeLabel === "number" ? activeLabel : null;
                  setActiveTime((current) => current === time ? null : time);
                }}>
                <Customized component={<PeriodDistribution categories={distributions}
                  minAmount={distributionMin} maxAmount={distributionMax} currency={currency} />} />
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                {series.map(({ key, points, mean, color }) => points > 0 && (
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
                  tickFormatter={periodLabel} minTickGap={36} padding={{ left: horizontalPadding, right: horizontalPadding }} />
                <YAxis domain={[minAmount - axisPadding, maxAmount + axisPadding]} tickCount={16}
                  width={Y_AXIS_WIDTH} padding={{ top: 80, bottom: 80 }} tickMargin={8} tick={{ fontSize: 12 }}
                  tickFormatter={(amount) => axisAmount.format(amount)} />
                <Tooltip trigger="click" active={Boolean(activePeriod)} filterNull={false} isAnimationActive={false}
                  wrapperStyle={{ pointerEvents: "auto" }}
                  content={<PeriodTooltip key={activePeriod?.time} period={activePeriod}
                    grouping={grouping} currency={currency} multipleCategories={series.length > 1}
                    excluded={excluded} setEntriesExcluded={setEntriesExcluded} />} />
                {series.map(({ key, name, color, points, lastIndex }) => (
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
      </div>

      {!entriesByType.length || !activeGroupings.length ? (
        <p className="text-sm text-gray-600">Select at least one transaction type and grouping.</p>
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
            currency={currency} excluded={excluded} setEntriesExcluded={setEntriesExcluded} />
        )))
      )}
    </section>
  );
}
