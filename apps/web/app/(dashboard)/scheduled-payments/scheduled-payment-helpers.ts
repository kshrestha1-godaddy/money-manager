import { ScheduledPaymentItem } from "../../types/scheduled-payment";

export function accountDisplay(item: ScheduledPaymentItem): string {
  if (!item.account) return "Cash";
  return `${item.account.bankName} — ${item.account.holderName}`;
}

export function recurringDisplay(item: ScheduledPaymentItem): string {
  if (!item.isRecurring || !item.recurringFrequency) return "One-time";
  const m: Record<string, string> = {
    DAILY: "Daily",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    YEARLY: "Yearly",
  };
  return m[item.recurringFrequency] ?? item.recurringFrequency;
}

/** Order for table section headers (One-time first, then increasing frequency). */
export function recurrenceGroupSortIndex(label: string): number {
  const order: Record<string, number> = {
    "One-time": 0,
    Daily: 1,
    Weekly: 2,
    Monthly: 3,
    Yearly: 4,
  };
  return order[label] ?? 100;
}

export function matchesSearch(item: ScheduledPaymentItem, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [
    item.title,
    item.description ?? "",
    item.notes ?? "",
    ...(item.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(s);
}
