"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import {
  accountDisplay,
  formatScheduledPaymentWhenDate,
  recurringDisplay,
} from "../scheduled-payment-helpers";

interface AcceptedRecurringHistoryToggleProps {
  count: number;
  isOpen: boolean;
  onToggle: () => void;
  compact?: boolean;
}

/** Expand/collapse control for previously accepted recurring payments. */
export function AcceptedRecurringHistoryToggle({
  count,
  isOpen,
  onToggle,
  compact = false,
}: AcceptedRecurringHistoryToggleProps) {
  if (count <= 0) return null;

  const countLabel =
    count === 1 ? "1 previously accepted" : `${count} previously accepted`;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex max-w-full items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/90 text-left font-medium text-emerald-900 transition-colors hover:bg-emerald-100 ${
        compact ? "px-1.5 py-0.5 text-[11px] leading-snug" : "px-2.5 py-1.5 text-xs"
      }`}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <ChevronDown className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} aria-hidden />
      ) : (
        <ChevronRight className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} aria-hidden />
      )}
      <span className="truncate">{countLabel}</span>
    </button>
  );
}

interface AcceptedRecurringHistoryDropdownProps {
  items: ScheduledPaymentItem[];
  displayCurrency: string;
  userTimezone: string;
  compact?: boolean;
}

/** Panel list for modals / prompts (non-table contexts). */
export function AcceptedRecurringHistoryDropdown({
  items,
  displayCurrency,
  userTimezone,
  compact = false,
}: AcceptedRecurringHistoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className={compact ? "mt-1.5" : "mt-3"}>
      <AcceptedRecurringHistoryToggle
        count={items.length}
        isOpen={isOpen}
        onToggle={() => setIsOpen((open) => !open)}
        compact={compact}
      />

      {isOpen ? (
        <ul
          className={`mt-1.5 max-h-64 space-y-2 overflow-y-auto rounded-md border border-emerald-100 bg-white p-2 shadow-sm ${
            compact ? "text-[11px]" : "text-xs"
          }`}
        >
          {items.map((item) => {
            const amount = convertForDisplaySync(
              item.amount,
              item.currency,
              displayCurrency
            );
            const notes = item.notes?.trim() || "—";
            const fields: { label: string; value: string; emphasize?: boolean }[] = [
              {
                label: "When",
                value: formatScheduledPaymentWhenDate(item.scheduledAt, userTimezone),
              },
              {
                label: "Amount",
                value: formatCurrency(amount, displayCurrency),
                emphasize: true,
              },
              { label: "Category", value: item.category.name },
              { label: "Account", value: accountDisplay(item) },
              { label: "Notes", value: notes },
              { label: "Recurrence", value: recurringDisplay(item) },
              { label: "Status", value: "Accepted" },
            ];

            return (
              <li
                key={item.id}
                className="rounded-md border border-emerald-100/80 bg-emerald-50/30 px-2.5 py-2"
              >
                <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div key={field.label} className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        {field.label}
                      </dt>
                      <dd
                        className={`mt-0.5 truncate ${
                          field.emphasize
                            ? "font-semibold tabular-nums text-emerald-800"
                            : "text-gray-800"
                        }`}
                        title={field.value}
                      >
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
