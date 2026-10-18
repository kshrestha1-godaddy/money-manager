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
    hourCycle: "h23",
  });
  timezoneFormatterCache.set(timezone, formatter);
  return formatter;
}

export function getDatePartsInTimezone(date: Date, timezone: string): TimezoneDateParts {
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

export function zonedDateTimeToUtc(
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
  const wallTime = (instant: number) => {
    const parts = getDatePartsInTimezone(new Date(instant), timezone);
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, millisecond);
  };
  // Check offsets on both sides of a clock change. For repeated times choose
  // the earlier instant; for a skipped time advance by the size of the gap.
  const offsets = new Set<number>();
  for (const hours of [-36, 0, 36]) {
    const sample = targetAsUtcMs + hours * 3_600_000;
    offsets.add(wallTime(sample) - sample);
  }
  const candidates = Array.from(offsets, offset => targetAsUtcMs - offset);
  const exact = candidates.filter(candidate => wallTime(candidate) === targetAsUtcMs);
  if (exact.length) return new Date(Math.min(...exact));
  const after = candidates.filter(candidate => wallTime(candidate) > targetAsUtcMs);
  if (!after.length) throw new Error("Cannot resolve scheduled time in timezone");
  return new Date(Math.min(...after));
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
    const result = zonedDateTimeToUtc(year, month - 1, day, hour, minute, second, 0, timezone);
    const parts = getDatePartsInTimezone(result, timezone);
    // Reject invalid dates and nonexistent wall-clock times entered by a user.
    return parts.year === year && parts.month === month && parts.day === day &&
      parts.hour === hour && parts.minute === minute && parts.second === second
      ? result : null;
  } catch {
    return null;
  }
}

/** Advance by a calendar period in the saved timezone, preserving wall-clock time. */
export function computeNextScheduledAt(
  from: Date,
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
  timezone: string
): Date {
  const parts = getDatePartsInTimezone(from, timezone);
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, from.getUTCMilliseconds()));
  if (frequency === "DAILY") d.setUTCDate(d.getUTCDate() + 1);
  else if (frequency === "WEEKLY") d.setUTCDate(d.getUTCDate() + 7);
  else {
    const originalDay = d.getUTCDate();
    d.setUTCDate(1);
    if (frequency === "MONTHLY") d.setUTCMonth(d.getUTCMonth() + 1);
    else d.setUTCFullYear(d.getUTCFullYear() + 1);
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(originalDay, lastDay));
  }
  return zonedDateTimeToUtc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds(), timezone);
}

