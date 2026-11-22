"use client";

import { useMemo, useState } from "react";
import { addMonths, format, getDaysInMonth, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { getWeekdayLabels } from "../../scheduled-payments/components/upcoming-calendar-utils";

interface MobileScheduledPaymentsCalendarProps {
  items: ScheduledPaymentItem[];
  onSchedule: () => void;
  formatAmount: (item: ScheduledPaymentItem) => string;
  statusLabel: (item: ScheduledPaymentItem) => string;
  onItemClick: (item: ScheduledPaymentItem) => void;
}

const navigationClass = "flex h-11 w-11 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100";

export function MobileScheduledPaymentsCalendar({
  items,
  onSchedule,
  formatAmount,
  statusLabel,
  onItemClick,
}: MobileScheduledPaymentsCalendarProps) {
  const today = new Date();
  const todayKey = format(today, "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const month = startOfMonth(selectedDate);
  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const byDate = useMemo(() => {
    const grouped = new Map<string, ScheduledPaymentItem[]>();
    const chronological = [...items].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    for (const item of chronological) {
      const key = format(new Date(item.scheduledAt), "yyyy-MM-dd");
      const dayItems = grouped.get(key);
      if (dayItems) dayItems.push(item);
      else grouped.set(key, [item]);
    }
    return grouped;
  }, [items]);
  const selectedItems = byDate.get(selectedKey) ?? [];

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="min-h-[40px] rounded-md border border-gray-200 bg-white px-3 text-[11px] font-medium text-brand-600 hover:bg-gray-50"
          onClick={() => setSelectedDate(today)}
        >
          Today
        </button>
        <button
          type="button"
          onClick={onSchedule}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-brand-700 active:bg-brand-800"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden />
          Schedule payment
        </button>
      </div>
      <section aria-label="Scheduled payment calendar" className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <div className="flex items-center justify-between">
          <button type="button" className={navigationClass} aria-label="Previous month" onClick={() => setSelectedDate(addMonths(month, -1))}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <h3 className="text-[12px] font-semibold text-gray-900" aria-live="polite">
            {format(month, "MMMM yyyy")}
          </h3>
          <button type="button" className={navigationClass} aria-label="Next month" onClick={() => setSelectedDate(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {getWeekdayLabels().map((day) => (
            <span key={day} className="py-1 text-[10px] font-medium text-gray-600">{day}</span>
          ))}
          {Array.from({ length: month.getDay() }, (_, index) => (
            <span key={"blank-" + index} aria-hidden />
          ))}
          {Array.from({ length: getDaysInMonth(month) }, (_, index) => {
            const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
            const key = format(date, "yyyy-MM-dd");
            const count = byDate.get(key)?.length ?? 0;
            const isSelected = key === selectedKey;
            const isToday = key === todayKey;
            const dayTone = isSelected ? "bg-brand-600 text-white" : "text-gray-900 hover:bg-gray-100";
            const markerTone = isSelected ? "bg-white" : "bg-brand-600";
  
            return (
              <button
                key={key}
                type="button"
                aria-label={format(date, "PPPP") + ", scheduled payments: " + count}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                onClick={() => setSelectedDate(date)}
                className={`flex min-h-11 flex-col items-center justify-center rounded-md text-[11px] tabular-nums ${dayTone} ${isToday ? "font-bold" : ""}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${isToday ? "ring-1 ring-inset ring-current" : ""}`}>
                  {index + 1}
                </span>
                <span aria-hidden className="flex h-2 items-center justify-center gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }, (_, dot) => (
                    <span key={dot} className={`h-1 w-1 rounded-full ${markerTone}`} />
                  ))}
                  {count > 3 && <span className="text-[8px] leading-none">+{count - 3}</span>}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 border-t border-gray-100 px-1 pt-1">
          <h4 className="py-2 text-[11px] font-semibold text-gray-900">{format(selectedDate, "EEE, MMM d, yyyy")}</h4>
          {selectedItems.length === 0 ? (
            <p className="pb-2 text-[11px] text-gray-600">No scheduled payments for this day.</p>
          ) : (
            <ul className="space-y-1 pb-1">
              {selectedItems.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => onItemClick(item)} className="flex min-h-11 w-full items-start justify-between gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-left hover:bg-gray-100">
                    <span className="min-w-0 break-words text-[11px] font-medium text-gray-900">
                      {item.title}
                      <span className="block text-[10px] font-normal text-gray-600">
                        {format(new Date(item.scheduledAt), "p")} · {statusLabel(item)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-gray-900">{formatAmount(item)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
