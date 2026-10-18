import { getDatePartsInTimezone, zonedDateTimeToUtc } from "../../utils/scheduledPaymentTime";
export { getDatePartsInTimezone, zonedDateTimeToUtc, toDatetimeLocalValue, parseDatetimeLocalInTimezone } from "../../utils/scheduledPaymentTime";
import { ScheduledPaymentItem } from "../../types/scheduled-payment";
import { convertForDisplaySync } from "../../utils/currencyDisplay";

/** YYYY-MM-DD for a Date in the given IANA timezone */
export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) return "";
  return `${y}-${m}-${d}`;
}

export function isScheduledOnLocalDate(
  scheduledAt: Date,
  dateKey: string,
  timezone: string
): boolean {
  return dateKeyInTimeZone(scheduledAt, timezone) === dateKey;
}

/**
 * Add N calendar days in user's timezone to the original scheduled datetime.
 * Keeps the wall-clock time in that timezone, then converts back to UTC Date.
 */
export function postponeFromOriginalScheduledDate(
  scheduledAt: Date,
  days: number,
  timezone: string
): Date {
  const sourceParts = getDatePartsInTimezone(scheduledAt, timezone);
  const shifted = new Date(
    Date.UTC(
      sourceParts.year,
      sourceParts.month - 1,
      sourceParts.day,
      sourceParts.hour,
      sourceParts.minute,
      sourceParts.second,
      scheduledAt.getMilliseconds()
    )
  );
  shifted.setUTCDate(shifted.getUTCDate() + days);
  const target = zonedDateTimeToUtc(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    shifted.getUTCMinutes(),
    shifted.getUTCSeconds(),
    shifted.getUTCMilliseconds(),
    timezone
  );

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

/** Still upcoming or awaiting confirmation (not accepted/rejected). */
export function isScheduledUnresolved(item: ScheduledPaymentItem): boolean {
  return item.resolution === null;
}

/**
 * Heuristic series match for recurring occurrences created by accept/reject
 * (same title, category, account, currency, and frequency).
 */
export function belongsToSameRecurringSeries(
  current: ScheduledPaymentItem,
  candidate: ScheduledPaymentItem
): boolean {
  if (!current.isRecurring || !current.recurringFrequency) return false;
  if (!candidate.isRecurring) return false;
  if (candidate.recurringFrequency !== current.recurringFrequency) return false;
  if (candidate.title.trim() !== current.title.trim()) return false;
  if (candidate.categoryId !== current.categoryId) return false;
  if ((candidate.accountId ?? null) !== (current.accountId ?? null)) return false;
  if (candidate.currency !== current.currency) return false;
  return true;
}

/** Previously accepted occurrences in the same recurring series (newest first). */
export function getAcceptedRecurringHistoryFromItems(
  current: ScheduledPaymentItem,
  all: ScheduledPaymentItem[]
): ScheduledPaymentItem[] {
  if (!current.isRecurring || !isScheduledUnresolved(current)) return [];
  return all
    .filter(
      (candidate) =>
        candidate.id !== current.id &&
        candidate.resolution === "ACCEPTED" &&
        belongsToSameRecurringSeries(current, candidate)
    )
    .sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );
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
