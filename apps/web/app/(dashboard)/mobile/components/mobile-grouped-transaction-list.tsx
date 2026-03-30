"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { MobileCollapsibleToolbar } from "./mobile-collapsible-toolbar";
import type { Income, Expense } from "../../../types/financial";
import { formatDate } from "../../../utils/date";

export interface TransactionMonthBucket<T extends Income | Expense> {
  monthIndex: number;
  monthLabel: string;
  items: T[];
}

export interface TransactionYearGroup<T extends Income | Expense> {
  year: number;
  months: TransactionMonthBucket<T>[];
}

function localYearMonth(d: Date): { year: number; monthIndex: number } {
  const x = new Date(d);
  return { year: x.getFullYear(), monthIndex: x.getMonth() };
}

/** Newest years and months first; items within a month sorted by date descending. */
export function groupTransactionsByYearAndMonth<T extends Income | Expense>(
  items: T[]
): TransactionYearGroup<T>[] {
  const byYear = new Map<number, Map<number, T[]>>();
  for (const item of items) {
    const { year, monthIndex } = localYearMonth(item.date);
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
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return {
          monthIndex,
          monthLabel: format(new Date(year, monthIndex, 1), "MMMM"),
          items: list,
        };
      }),
    };
  });
}

const amountToneClass: Record<"income" | "expense", string> = {
  income: "text-emerald-700",
  expense: "text-red-700",
};

export interface MobileGroupedTransactionListProps<T extends Income | Expense> {
  grouped: TransactionYearGroup<T>[];
  variant: "income" | "expense";
  formatAmount: (item: T) => string;
  onItemClick: (item: T) => void;
  /** Shown on the left of Expand all / Collapse all (e.g. Add income on mobile). */
  toolbarLeading?: ReactNode;
}

export function MobileGroupedTransactionList<T extends Income | Expense>({
  grouped,
  variant,
  formatAmount,
  onItemClick,
  toolbarLeading,
}: MobileGroupedTransactionListProps<T>) {
  const detailsRootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = detailsRootRef.current;
    if (!root) return;
    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth();
    root.querySelectorAll("details[data-year]").forEach((el) => {
      const d = el as HTMLDetailsElement;
      const y = Number(d.getAttribute("data-year"));
      if (Number.isNaN(y)) return;
      const mStr = d.getAttribute("data-month");
      if (mStr === null) {
        if (y === cy) d.open = true;
      } else {
        const m = Number(mStr);
        if (y === cy && m === cm) d.open = true;
      }
    });
  }, [grouped]);

  if (grouped.length === 0) return null;

  const amountClass = amountToneClass[variant];
  const label = variant === "income" ? "incomes" : "expenses";

  return (
    <>
      <MobileCollapsibleToolbar rootRef={detailsRootRef} leading={toolbarLeading} />
      <div ref={detailsRootRef} className="space-y-3">
      {grouped.map(({ year, months }) => {
        const yearCount = months.reduce((acc, m) => acc + m.items.length, 0);
        return (
          <details
            key={year}
            data-year={year}
            className="group rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <summary className="cursor-pointer list-none px-3 py-2.5 font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-90"
                  aria-hidden
                />
                {year}
                <span className="text-sm font-normal text-gray-500">
                  ({yearCount} {label})
                </span>
              </span>
            </summary>
            <div className="border-t border-gray-100 px-2 pb-2 pt-1">
              {months.map(({ monthLabel, monthIndex, items: monthItems }) => (
                <details
                  key={`${year}-${monthIndex}`}
                  data-year={year}
                  data-month={monthIndex}
                  className="group/month mt-2 rounded-md border border-gray-100 bg-gray-50/80"
                >
                  <summary className="cursor-pointer px-2.5 py-2 text-sm font-medium text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 group-open/month:rotate-90"
                        aria-hidden
                      />
                      {monthLabel}
                      <span className="font-normal text-gray-500">({monthItems.length})</span>
                    </span>
                  </summary>
                  <ul className="space-y-2 border-t border-gray-100/80 p-2.5 pt-3">
                    {monthItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onItemClick(item)}
                          className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm min-h-[72px] active:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between gap-3 items-center">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate">{item.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {formatDate(item.date)}
                                {item.category?.name ? ` · ${item.category.name}` : ""}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 text-base font-semibold tabular-nums ${amountClass}`}
                            >
                              {formatAmount(item)}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </details>
        );
      })}
      </div>
    </>
  );
}
