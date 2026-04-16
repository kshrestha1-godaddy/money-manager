import { ScheduledPaymentItem } from "../../types/scheduled-payment";
import { convertForDisplaySync } from "../../utils/currencyDisplay";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Value for `<input type="datetime-local" />` in local timezone. */
export function toDatetimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Add N calendar days to the **originally scheduled** date/time (same clock on the new calendar day).
 * If the result is still not after `now`, nudge to `now + 1 minute` so the server accepts it.
 */
export function postponeFromOriginalScheduledDate(scheduledAt: Date, days: number): Date {
  const target = new Date(scheduledAt);
  target.setDate(target.getDate() + days);
  const now = new Date();
  if (target <= now) {
    target.setTime(now.getTime() + 60_000);
  }
  return target;
}

export function scheduledPaymentStatusLabel(item: ScheduledPaymentItem, now: Date): string {
  if (item.resolution === "ACCEPTED") return "Accepted";
  if (item.resolution === "REJECTED") return "Rejected";
  if (item.scheduledAt > now) return "Upcoming";
  return "Awaiting confirmation";
}

/** e.g. "24 January 2026 | 14:05:09" (24h time) in the given IANA timezone. */
export function formatScheduledPaymentWhenDate(
  date: Date | string,
  timeZone: string
): string {
  const d = date instanceof Date ? date : new Date(date);
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
  return `${dateStr} | ${timeStr}`;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/** Scheduled time is between `now` and two calendar days from `now` (upcoming due soon). */
export function isScheduledWithinNextTwoDays(item: ScheduledPaymentItem, now: Date): boolean {
  const t = new Date(item.scheduledAt).getTime();
  return t >= now.getTime() && t <= now.getTime() + TWO_DAYS_MS;
}

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

export function sumItemsInDisplayCurrency(
  items: ScheduledPaymentItem[],
  displayCurrency: string
): number {
  return items.reduce(
    (sum, item) => sum + convertForDisplaySync(item.amount, item.currency, displayCurrency),
    0
  );
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
