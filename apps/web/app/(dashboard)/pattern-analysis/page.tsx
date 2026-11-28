"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from "date-fns";
import {
  CartesianGrid, Customized, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { financialItemsQuery } from "../../hooks/financial-items-query";
import { useDisplayCurrency } from "../../hooks/useDisplayCurrency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";
import { convertTransactionForDisplaySync } from "../../utils/currencyDisplay";
import { getExpenses } from "../expenses/actions/expenses";
import { getIncomes } from "../incomes/actions/incomes";

const fieldClass = "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";
const buttonClass = "rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50";

type Entry = { key: string; title: string; day: string; amount: number };
type Period = { time: number; entries: Entry[]; total: number | null };

const GROUPINGS = {
  day: { label: "Daily", format: "MMM d, yyyy" },
  week: { label: "Weekly", format: "'Week of' MMM d, yyyy" },
  month: { label: "Monthly", format: "MMM yyyy" },
  quarter: { label: "Quarterly", format: "'Q'Q yyyy" },
  year: { label: "Yearly", format: "yyyy" },
} as const;

type Grouping = keyof typeof GROUPINGS;

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, "0"),
  label: format(new Date(2000, index, 1), "MMMM"),
}));

function TimeMultiSelect({ label, options, selected, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      const dropdown = details.current;
      if (dropdown && event.target instanceof Node && !dropdown.contains(event.target)) {
        dropdown.open = false;
      }
    }

    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const selection = options.filter(({ value }) => selected.includes(value)).map(({ label }) => label).join(", ");

  return (
    <div className="min-w-0 space-y-1 text-sm font-medium text-gray-700">
      <p>{label}</p>
      <details ref={details} className="relative" onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}>
        <summary className={`${fieldClass} cursor-pointer truncate`} title={selection || undefined}>
          <span className="sr-only">{label}, </span>
          {selection || `All ${label.toLowerCase()}`}
        </summary>
        <fieldset className="absolute z-20 mt-1 max-h-64 w-full min-w-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <legend className="sr-only">{label}</legend>
          <button type="button" className="w-full rounded px-2 py-1 text-left hover:bg-gray-100"
            onClick={() => onChange([])}>
            All {label.toLowerCase()}
          </button>
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-100">
              <input type="checkbox" checked={selected.includes(option.value)} onChange={(event) => {
                onChange(event.target.checked
                  ? [...selected, option.value]
                  : selected.filter((value) => value !== option.value));
              }} />
              {option.label}
            </label>
          ))}
        </fieldset>
      </details>
    </div>
  );
}

function periodStart(date: Date, grouping: Grouping) {
  switch (grouping) {
    case "week": return startOfWeek(date, { weekStartsOn: 1 });
    case "month": return startOfMonth(date);
    case "quarter": return startOfQuarter(date);
    case "year": return startOfYear(date);
    case "day": return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}

function DistributionBackground({
  mean, deviation, offset, yAxisMap,
}: {
  mean: number;
  deviation: number;
  offset?: { top: number; left: number; width: number; height: number };
  yAxisMap?: Record<string, { scale: { invert: (pixel: number) => number } }>;
}) {
  const scale = yAxisMap?.[0]?.scale;
  if (!offset || !scale || deviation <= 0) return null;

  const right = offset.left + offset.width;
  const bottom = offset.top + offset.height;
  const points = Array.from({ length: 101 }, (_, index) => {
    const y = offset.top + offset.height * index / 100;
    const z = (scale.invert(y) - mean) / deviation;
    const x = right - offset.width * 0.24 * Math.exp(-0.5 * z ** 2);
    return `${x},${y}`;
  });
  return (
    <polygon
      points={[`${right},${offset.top}`, ...points, `${right},${bottom}`].join(" ")}
      fill="#6366f1"
      fillOpacity={0.13}
      pointerEvents="none"
    />
  );
}

export default function PatternAnalysisPage() {
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [categorySelection, setCategorySelection] = useState<string | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [years, setYears] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [grouping, setGrouping] = useState<Grouping>("month");
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());

  const expenses = useQuery({ ...financialItemsQuery("EXPENSE", getExpenses), enabled: type === "EXPENSE" });
  const incomes = useQuery({ ...financialItemsQuery("INCOME", getIncomes), enabled: type === "INCOME" });
  const query = type === "EXPENSE" ? expenses : incomes;
  const { displayCurrency, currencyRateVersion } = useDisplayCurrency();
  const { isRatesLoading } = useCurrency();
  const currency = displayCurrency || "USD";
  const money = (amount: number) => formatCurrency(amount, currency);
  const transactions = query.data;
  const categories = useMemo(() => {
    const names = new Map<string, string>();
    for (const transaction of transactions ?? []) {
      names.set(String(transaction.category?.id ?? ""), transaction.category?.name ?? "Uncategorized");
    }
    return [...names].sort((a, b) => a[1].localeCompare(b[1]));
  }, [transactions]);
  const category = categorySelection !== null && categories.some(([id]) => id === categorySelection)
    ? categorySelection
    : categories[0]?.[0] ?? "";

  const yearOptions = useMemo(() => {
    const values = new Set((transactions ?? []).map(({ date }) => format(new Date(date), "yyyy")));
    return [...values].sort().reverse().map((year) => ({ value: year, label: year }));
  }, [transactions]);

  const periods = useMemo(() => {
    const buckets = new Map<number, Entry[]>();
    for (const transaction of transactions ?? []) {
      if (String(transaction.category?.id ?? "") !== category) continue;
      const date = new Date(transaction.date);
      const day = format(date, "yyyy-MM-dd");
      if ((start && day < start) || (end && day > end)) continue;
      if (years.length && !years.includes(day.slice(0, 4))) continue;
      if (months.length && !months.includes(day.slice(5, 7))) continue;
      const time = periodStart(date, grouping).getTime();
      const entry = {
        key: `${type}:${transaction.id}`,
        title: transaction.title,
        day,
        amount: convertTransactionForDisplaySync(transaction, currency),
      };
      const entries = buckets.get(time);
      if (entries) entries.push(entry);
      else buckets.set(time, [entry]);
    }
    return [...buckets].sort(([a], [b]) => a - b).map(([time, entries]): Period => {
      const visible = entries.filter((entry) => !excluded.has(entry.key));
      return {
        time,
        entries,
        total: visible.length ? visible.reduce((sum, entry) => sum + entry.amount, 0) : null,
      };
    });
    // Conversion reads the shared rate cache, which can change without a currency change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, category, start, end, years, months, grouping, type, currency, currencyRateVersion, excluded]);

  const totals = periods.flatMap(({ total }) => total === null ? [] : [total]);
  const mean = totals.length ? totals.reduce((sum, value) => sum + value, 0) / totals.length : 0;
  const deviation = totals.length
    ? Math.sqrt(totals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / totals.length)
    : 0;
  const excludedCount = periods.reduce(
    (count, period) => count + period.entries.filter((entry) => excluded.has(entry.key)).length, 0,
  );
  const selected = periods.find((period) => period.time === selectedTime);
  const invalidRange = Boolean(start && end && start > end);
  const periodLabel = (time: number) => format(time, GROUPINGS[grouping].format);

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
      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <label className="space-y-1 text-sm font-medium text-gray-700">
          Transaction type
          <select className={fieldClass} value={type} onChange={(event) => {
            setType(event.target.value === "INCOME" ? "INCOME" : "EXPENSE");
            setCategorySelection(null);
            setYears([]);
            setSelectedTime(null);
          }}>
            <option value="EXPENSE">Expenses</option>
            <option value="INCOME">Income</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-gray-700">
          Category
          <select className={fieldClass} value={category} disabled={!categories.length} onChange={(event) => {
            setCategorySelection(event.target.value);
            setSelectedTime(null);
          }}>
            {!categories.length && <option value="">No categories</option>}
            {categories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <TimeMultiSelect label="Years" options={yearOptions} selected={years} onChange={setYears} />
        <TimeMultiSelect label="Months" options={MONTHS} selected={months} onChange={setMonths} />
        <label className="space-y-1 text-sm font-medium text-gray-700">
          From
          <input className={fieldClass} type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="space-y-1 text-sm font-medium text-gray-700">
          To
          <input className={fieldClass} type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
        </label>
        <label className="space-y-1 text-sm font-medium text-gray-700">
          Group by
          <select className={fieldClass} value={grouping} onChange={(event) => {
            setGrouping(event.target.value as Grouping);
            setSelectedTime(null);
          }}>
            {Object.entries(GROUPINGS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button type="button" className={`${buttonClass} self-end justify-self-start`} onClick={() => {
          setStart("");
          setEnd("");
          setYears([]);
          setMonths([]);
        }}>Clear time filters</button>
      </div>

      <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {type === "EXPENSE" ? "Expense trend" : "Income trend"} · {currency}
          </h2>
          {excludedCount > 0 && (
            <button type="button" className={buttonClass} onClick={() => setEntriesExcluded(periods.flatMap(({ entries }) => entries), false)}>
              Restore {excludedCount} excluded {excludedCount === 1 ? "entry" : "entries"}
            </button>
          )}
        </div>
        {invalidRange ? (
          <p className="mt-4 text-sm text-red-700" role="alert">Choose an end date on or after the start date.</p>
        ) : query.isPending || isRatesLoading ? (
          <p className="mt-4 text-sm text-gray-600" role="status">Loading transactions…</p>
        ) : query.isError && !transactions ? (
          <div className="mt-4" role="alert">
            <p className="mb-2 text-sm text-gray-700">Transactions couldn’t load.</p>
            <button type="button" className={buttonClass} onClick={() => void query.refetch()}>Try again</button>
          </div>
        ) : !totals.length ? (
          <p className="mt-4 text-sm text-gray-600">
            {periods.length ? "All entries in this view are excluded." : "No transactions match these filters."}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Select a point to inspect its entries. The shaded Gaussian curve on the right shows the distribution of visible {GROUPINGS[grouping].label.toLowerCase()} totals.
              {deviation === 0 && " The curve appears when visible totals vary."}
            </p>
            <div className="mt-4 h-[420px] sm:h-[520px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={periods} margin={{ top: 12, right: 18, bottom: 8, left: 4 }}
                  onClick={(state) => {
                    if (typeof state?.activeLabel === "number") setSelectedTime(state.activeLabel);
                  }}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]}
                    tickFormatter={periodLabel} minTickGap={36} padding={{ left: 12, right: 12 }} />
                  <YAxis width={96} tickFormatter={money} />
                  <Customized component={<DistributionBackground mean={mean} deviation={deviation} />} />
                  <Tooltip labelFormatter={(value) => periodLabel(Number(value))} formatter={(value) => [money(Number(value)), "Total"]} />
                  <Line dataKey="total" stroke={type === "EXPENSE" ? "#dc2626" : "#059669"} strokeWidth={2.5}
                    dot={totals.length <= 36} activeDot={{ r: 6, cursor: "pointer" }}
                    connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {periods.length > 0 && !invalidRange && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm font-medium text-gray-700">
              Inspect a period
              <select className={fieldClass} value={selected?.time ?? ""} onChange={(event) => {
                setSelectedTime(event.target.value ? Number(event.target.value) : null);
              }}>
                <option value="">Choose a period</option>
                {periods.map(({ time, total }) => (
                  <option key={time} value={time}>{periodLabel(time)}{total === null ? " (excluded)" : ""}</option>
                ))}
              </select>
            </label>
            {selected && (
              <button type="button" className={buttonClass}
                onClick={() => setEntriesExcluded(selected.entries, selected.total !== null)}>
                {selected.total === null ? "Restore period" : "Exclude period"}
              </button>
            )}
          </div>
          {selected && (
            <ul className="mt-4 divide-y divide-gray-100">
              {selected.entries.map((entry) => {
                const hidden = excluded.has(entry.key);
                return (
                  <li key={entry.key} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{entry.title}</p>
                      <p className="text-gray-600">{entry.day} · {money(entry.amount)}{hidden ? " · Excluded" : ""}</p>
                    </div>
                    <button type="button" className={buttonClass}
                      aria-label={`${hidden ? "Restore" : "Exclude"} ${entry.title} on ${entry.day}`}
                      onClick={() => setEntriesExcluded([entry], !hidden)}>
                      {hidden ? "Restore" : "Exclude"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
