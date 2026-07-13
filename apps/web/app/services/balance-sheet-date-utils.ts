import {
  dateKeyInTimeZone,
  getDatePartsInTimezone,
  zonedDateTimeToUtc,
} from "../(dashboard)/scheduled-payments/scheduled-payment-helpers";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export interface PreviousMonthRange {
  monthKey: string;
  startUtc: Date;
  endUtc: Date;
  startYmd: string;
  endYmd: string;
  label: string;
}

export function isLocalFirstOfMonth(now: Date, timezone: string): boolean {
  const parts = getDatePartsInTimezone(now, timezone);
  return parts.day === 1;
}

/** Previous calendar month relative to `now` in the given IANA timezone. */
export function getPreviousMonthRangeInTimezone(
  timezone: string,
  now: Date = new Date()
): PreviousMonthRange {
  const safeTimezone = timezone?.trim() || "UTC";
  const parts = getDatePartsInTimezone(now, safeTimezone);
  const prevMonth = parts.month === 1 ? 12 : parts.month - 1;
  const prevYear = parts.month === 1 ? parts.year - 1 : parts.year;
  const lastDay = new Date(prevYear, prevMonth, 0).getDate();
  const monthIndex = prevMonth - 1;

  const startUtc = zonedDateTimeToUtc(
    prevYear,
    monthIndex,
    1,
    0,
    0,
    0,
    0,
    safeTimezone
  );
  const endUtc = zonedDateTimeToUtc(
    prevYear,
    monthIndex,
    lastDay,
    23,
    59,
    59,
    999,
    safeTimezone
  );

  const startYmd = `${prevYear}-${pad2(prevMonth)}-01`;
  const endYmd = `${prevYear}-${pad2(prevMonth)}-${pad2(lastDay)}`;
  const monthKey = `${prevYear}-${pad2(prevMonth)}`;
  const labelDate = zonedDateTimeToUtc(prevYear, monthIndex, 15, 12, 0, 0, 0, safeTimezone);
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeTimezone,
    month: "long",
    year: "numeric",
  }).format(labelDate);

  return {
    monthKey,
    startUtc,
    endUtc,
    startYmd,
    endYmd,
    label,
  };
}

export function localDateKey(now: Date, timezone: string): string {
  return dateKeyInTimeZone(now, timezone?.trim() || "UTC");
}
