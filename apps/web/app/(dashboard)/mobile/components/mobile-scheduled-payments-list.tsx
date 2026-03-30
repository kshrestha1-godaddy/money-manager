"use client";

import { format } from "date-fns";
import type { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { formatDate } from "../../../utils/date";
import { accountDisplay, recurringDisplay } from "../../scheduled-payments/scheduled-payment-helpers";

export interface ScheduledYearMonthGroup {
  year: number;
  months: {
    monthIndex: number;
    monthLabel: string;
    items: ScheduledPaymentItem[];
  }[];
}

function localYearMonth(d: Date): { year: number; monthIndex: number } {
  const x = new Date(d);
  return { year: x.getFullYear(), monthIndex: x.getMonth() };
}

export function groupScheduledPaymentsByYearAndMonth(
  items: ScheduledPaymentItem[]
): ScheduledYearMonthGroup[] {
  const byYear = new Map<number, Map<number, ScheduledPaymentItem[]>>();
  for (const item of items) {
    const { year, monthIndex } = localYearMonth(new Date(item.scheduledAt));
    if (!byYear.has(year)) byYear.set(year, new Map());
    const ym = byYear.get(year)!;
    if (!ym.has(monthIndex)) ym.set(monthIndex, []);
    ym.get(monthIndex)!.push(item);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  return years.map((year) => {
    const monthMap = byYear.get(year)!;
    const monthIndices = [...monthMap.keys()].sort((a, b) => b - a);
    return {
      year,
      months: monthIndices.map((monthIndex) => {
        const list = monthMap.get(monthIndex)!;
        list.sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
        );
        return {
          monthIndex,
          monthLabel: format(new Date(year, monthIndex, 1), "MMMM"),
          items: list,
        };
      }),
    };
  });
}

export interface MobileScheduledPaymentsListProps {
  grouped: ScheduledYearMonthGroup[];
  formatAmount: (item: ScheduledPaymentItem) => string;
  statusLabel: (item: ScheduledPaymentItem) => string;
  onItemClick: (item: ScheduledPaymentItem) => void;
}

export function MobileScheduledPaymentsList({
  grouped,
  formatAmount,
  statusLabel: statusLabelFn,
  onItemClick,
}: MobileScheduledPaymentsListProps) {
  if (grouped.length === 0) return null;

  return (
    <div className="space-y-3">
      {grouped.map(({ year, months }) => {
        const yearCount = months.reduce((acc, m) => acc + m.items.length, 0);
        return (
          <section
            key={year}
            className="rounded-lg border border-gray-200 bg-white shadow-sm"
            aria-label={`${year} scheduled payments`}
          >
            <div className="border-b border-gray-100 px-3 py-2.5 font-semibold text-slate-900">
              <span className="inline-flex items-center gap-2">
                {year}
                <span className="text-sm font-normal text-gray-500">
                  ({yearCount} scheduled)
                </span>
              </span>
            </div>
            <div className="px-2 pb-2 pt-1">
              {months.map(({ monthLabel, monthIndex, items: monthItems }) => (
                <div
                  key={`${year}-${monthIndex}`}
                  className="mt-2 rounded-md border border-gray-100 bg-gray-50/80"
                >
                  <div className="border-b border-gray-100/80 px-2.5 py-2 text-sm font-medium text-slate-800">
                    <span className="inline-flex items-center gap-2">
                      {monthLabel}
                      <span className="font-normal text-gray-500">({monthItems.length})</span>
                    </span>
                  </div>
                  <ul className="space-y-2 p-2.5 pt-3">
                    {monthItems.map((item) => {
                      const st = statusLabelFn(item);
                      const stClass =
                        st === "Accepted"
                          ? "text-green-700"
                          : st === "Rejected"
                            ? "text-red-700"
                            : st === "Upcoming"
                              ? "text-blue-700"
                              : "text-amber-700";
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => onItemClick(item)}
                            className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[72px] active:bg-gray-50 transition-colors"
                          >
                            <div className="flex justify-between gap-3 items-center">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 line-clamp-2">{item.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {formatDate(new Date(item.scheduledAt))}
                                  {item.category?.name ? ` · ${item.category.name}` : ""}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  <span className={stClass}>{st}</span>
                                  {" · "}
                                  {recurringDisplay(item)}
                                </p>
                                <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">
                                  {accountDisplay(item)}
                                </p>
                              </div>
                              <span className="shrink-0 text-base font-semibold tabular-nums text-red-700">
                                {formatAmount(item)}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
