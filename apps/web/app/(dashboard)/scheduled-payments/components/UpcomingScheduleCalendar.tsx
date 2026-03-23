"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { CONTAINER_COLORS, TEXT_COLORS } from "../../../config/colorConfig";
import {
  dateKeyInTimeZone,
  daysInMonth,
  getWeekdayLabels,
} from "./upcoming-calendar-utils";

const card = `${CONTAINER_COLORS.whiteWithPadding} text-left`;
const chartTitle = TEXT_COLORS.chartTitle;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type PaymentBucket = "upcoming" | "awaiting" | "completed";

interface UpcomingScheduleCalendarProps {
  items: ScheduledPaymentItem[];
  userCurrency: string;
  userTimezone: string;
  now: Date;
}

function getBucket(p: ScheduledPaymentItem, now: Date): PaymentBucket {
  if (p.resolution) return "completed";
  if (p.scheduledAt > now) return "upcoming";
  return "awaiting";
}

function paymentRowClass(bucket: PaymentBucket): string {
  const base = "rounded-md border px-1.5 py-1 shadow-sm";
  if (bucket === "upcoming") {
    return `${base} border-blue-200 bg-blue-50/95 text-blue-950`;
  }
  if (bucket === "awaiting") {
    return `${base} border-amber-200 bg-amber-50/95 text-amber-950`;
  }
  return `${base} border-emerald-200 bg-emerald-50/95 text-emerald-950`;
}

function sortPaymentsForDay(list: ScheduledPaymentItem[], now: Date): ScheduledPaymentItem[] {
  const order: Record<PaymentBucket, number> = {
    upcoming: 0,
    awaiting: 1,
    completed: 2,
  };
  return [...list].sort((a, b) => {
    const ba = getBucket(a, now);
    const bb = getBucket(b, now);
    if (ba !== bb) return order[ba] - order[bb];
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });
}

const cellClass = "border-gray-100 bg-white";

export function UpcomingScheduleCalendar({
  items,
  userCurrency,
  userTimezone,
  now,
}: UpcomingScheduleCalendarProps) {
  const [view, setView] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));

  const byDateKey = useMemo(() => {
    const map = new Map<string, ScheduledPaymentItem[]>();
    for (const p of items) {
      const key = dateKeyInTimeZone(new Date(p.scheduledAt), userTimezone);
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return map;
  }, [items, userTimezone]);

  const { year, month } = view;
  const lastDay = daysInMonth(year, month);
  const firstWeekday = new Date(year, month, 1).getDay();
  const weekdays = getWeekdayLabels();

  const cells: { day: number | null; dateKey: string | null; inMonth: boolean }[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: null, dateKey: null, inMonth: false });
  }
  for (let d = 1; d <= lastDay; d++) {
    const m = month + 1;
    const dateKey = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateKey, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, dateKey: null, inMonth: false });
  }

  function shiftMonth(delta: number) {
    setView((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      while (m < 0) {
        m += 12;
        y -= 1;
      }
      while (m > 11) {
        m -= 12;
        y += 1;
      }
      return { year: y, month: m };
    });
  }

  const todayKey = dateKeyInTimeZone(now, userTimezone);

  return (
    <div className={card}>
      <h3 className={chartTitle}>Scheduled payments calendar</h3>
      <p className="text-sm text-gray-600 mb-3">
        Each payment appears on its <span className="font-medium text-gray-800">due date</span> in{" "}
        <span className="font-medium text-gray-800">{userTimezone}</span>. Row colors match status in the legend.
      </p>
      <div className="flex flex-wrap gap-2 mb-4 text-[11px] text-gray-600">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-900">
          <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
          Upcoming
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
          <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
          Awaiting action
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          Completed
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3">
          <span className="text-base font-semibold text-gray-900">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => {
              const t = new Date();
              setView({ year: t.getFullYear(), month: t.getMonth() });
            }}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          aria-label="Next month"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-1">
        {weekdays.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell.inMonth || !cell.dateKey || cell.day === null) {
            return (
              <div
                key={`pad-${idx}`}
                className="min-h-[72px] rounded-lg border border-transparent bg-gray-50/50"
              />
            );
          }
          const rawList = byDateKey.get(cell.dateKey) ?? [];
          const list = sortPaymentsForDay(rawList, now);
          const hasAny = list.length > 0;
          const isToday = cell.dateKey === todayKey;

          return (
            <div
              key={cell.dateKey}
              className={`rounded-lg border p-1 text-left flex flex-col min-h-[72px] ${cellClass}`}
            >
              <span
                className={`text-xs font-semibold shrink-0 mb-1 ${
                  isToday
                    ? "inline-flex h-6 min-w-7 items-center justify-center rounded-full border-2 border-blue-500 px-1 text-blue-700 tabular-nums"
                    : "text-gray-800"
                }`}
              >
                {cell.day}
              </span>
              {hasAny ? (
                <div className="flex flex-col gap-1 min-h-0 flex-1 max-h-[220px] overflow-y-auto overflow-x-hidden pr-0.5">
                  {list.map((p) => {
                    const bucket = getBucket(p, now);
                    const converted = convertForDisplaySync(
                      p.amount,
                      p.currency,
                      userCurrency
                    );
                    return (
                      <div
                        key={p.id}
                        className={paymentRowClass(bucket)}
                        title={`${p.title} — ${formatCurrency(converted, userCurrency)}`}
                      >
                        <div className="flex items-start justify-between gap-1.5 min-w-0">
                          <p className="text-[10px] font-medium leading-snug line-clamp-2 min-w-0 flex-1">
                            {p.title}
                          </p>
                          <div className="shrink-0 text-right leading-tight">
                            <p className="text-[10px] font-semibold tabular-nums whitespace-nowrap">
                              {formatCurrency(converted, userCurrency)}
                            </p>
                            {p.currency !== userCurrency ? (
                              <p className="text-[8px] font-normal text-gray-500">
                                {p.currency}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-500 mt-4 text-center py-6 border border-dashed border-gray-200 rounded-lg">
          No scheduled payments in the current filter.
        </p>
      )}
    </div>
  );
}
