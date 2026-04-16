import { ScheduledPaymentItem } from "../../types/scheduled-payment";
import { convertForDisplaySync } from "../../utils/currencyDisplay";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

interface TimezoneDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const timezoneFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getTimezoneFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = timezoneFormatterCache.get(timezone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  timezoneFormatterCache.set(timezone, formatter);
  return formatter;
}

function getDatePartsInTimezone(date: Date, timezone: string): TimezoneDateParts {
  const formatter = getTimezoneFormatter(timezone);
  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((item) => item.type === type);
    return part ? Number(part.value) : 0;
  };
  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second"),
  };
}

function zonedDateTimeToUtc(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timezone: string
): Date {
  const targetAsUtcMs = Date.UTC(year, monthIndex, day, hour, minute, second, millisecond);
  let candidateUtcMs = targetAsUtcMs;

  // Iteratively correct offset to handle DST transitions.
  for (let attempt = 0; attempt < 4; attempt++) {
    const candidateParts = getDatePartsInTimezone(new Date(candidateUtcMs), timezone);
    const candidateAsUtcMs = Date.UTC(
      candidateParts.year,
      candidateParts.month - 1,
      candidateParts.day,
      candidateParts.hour,
      candidateParts.minute,
      candidateParts.second,
      0
    );
    const deltaMs = targetAsUtcMs - candidateAsUtcMs;
    if (deltaMs === 0) break;
    candidateUtcMs += deltaMs;
  }

  return new Date(candidateUtcMs);
}

/**
 * Value for `<input type="datetime-local" />` in user's timezone.
 * Falls back to local timezone formatting if timezone is invalid.
 */
export function toDatetimeLocalValue(d: Date, timezone?: string): string {
  if (!timezone) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  try {
    const parts = getDatePartsInTimezone(d, timezone);
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}`;
  } catch {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
}

/**
 * Parse datetime-local value as wall-clock time in user's timezone.
 * Returns null for invalid values.
 */
export function parseDatetimeLocalInTimezone(value: string, timezone: string): Date | null {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] ?? "0");

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    Number.isNaN(second)
  ) {
    return null;
  }

  try {
    return zonedDateTimeToUtc(year, month - 1, day, hour, minute, second, 0, timezone);
  } catch {
    return null;
  }
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
