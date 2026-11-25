/**
 * Calendar handling for dated series.
 *
 * This module is the only part of the forecasting folder aware of `Date`;
 * everything beneath it works on a regular integer grid.
 * Months and quarters are advanced by calendar arithmetic rather than by a
 * fixed number of milliseconds, so a monthly series stays aligned across
 * varying month lengths and daylight-saving shifts.
 */

import { at } from "./linalg";
import type { Frequency, TimeSeriesPoint } from "./types";

const MILLISECONDS_PER_DAY = 86_400_000;

/** Nominal day count of each supported frequency, used for inference only. */
const NOMINAL_DAYS: Record<Frequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30.44,
  quarterly: 91.31,
  yearly: 365.25,
};

/**
 * Infer the sampling frequency from consecutive timestamps.
 *
 * Uses the lower-quartile gap rather than the median: missing observations
 * inflate individual gaps but nothing deflates them, so a central measure is
 * biased upwards on a series with holes — enough to read a gappy monthly
 * series as quarterly. The lower quartile tracks the underlying spacing while
 * still resisting a single anomalous pair.
 *
 * @param dates - Chronologically ordered timestamps; at least two are needed.
 * @returns The closest matching frequency.
 * @throws RangeError If fewer than two dates are supplied.
 */
function inferFrequency(dates: readonly Date[]): Frequency {
  const gap = gapQuantileInDays(dates, 0.25);
  let best: Frequency = "daily";
  let bestDistance = Infinity;
  for (const candidate of Object.keys(NOMINAL_DAYS) as Frequency[]) {
    const distance = Math.abs(Math.log(gap / NOMINAL_DAYS[candidate]));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

/**
 * Quantile of the gaps between consecutive timestamps, in days.
 *
 * @param dates - Chronologically ordered timestamps.
 * @param quantile - Quantile to take, between 0 and 1.
 * @returns The requested gap quantile; never less than a small positive value.
 * @throws RangeError If fewer than two dates are supplied.
 */
function gapQuantileInDays(dates: readonly Date[], quantile: number): number {
  const gaps = sortedGapsInDays(dates);
  const position = Math.floor(quantile * (gaps.length - 1));
  const chosen = gaps[Math.max(Math.min(position, gaps.length - 1), 0)];
  return chosen === undefined || chosen <= 0 ? 1 : chosen;
}

/**
 * Gaps between consecutive timestamps, in ascending order.
 *
 * @throws RangeError If fewer than two dates are supplied.
 */
function sortedGapsInDays(dates: readonly Date[]): number[] {
  if (dates.length < 2) {
    throw new RangeError("At least two dates are required to infer a frequency.");
  }
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i += 1) {
    const current = dates[i];
    const previous = dates[i - 1];
    if (current === undefined || previous === undefined) continue;
    gaps.push((current.getTime() - previous.getTime()) / MILLISECONDS_PER_DAY);
  }
  return gaps.sort((left, right) => left - right);
}

/**
 * Advance a date by a whole number of periods at a given frequency.
 *
 * @param date - The starting date; not mutated.
 * @param steps - Number of periods to advance; may be negative.
 * @param frequency - The sampling frequency.
 * @returns A new `Date` advanced by `steps` periods.
 */
function addPeriods(date: Date, steps: number, frequency: Frequency): Date {
  const next = new Date(date.getTime());
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + steps);
      return next;
    case "weekly":
      next.setDate(next.getDate() + steps * 7);
      return next;
    case "monthly":
      return addMonthsClamped(next, steps);
    case "quarterly":
      return addMonthsClamped(next, steps * 3);
    case "yearly":
      return addMonthsClamped(next, steps * 12);
  }
}

/**
 * Add months while clamping the day-of-month to the target month's length.
 *
 * Without clamping, advancing 31 January by one month would roll over into
 * March, silently shifting every later forecast date.
 */
function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const shifted = new Date(date.getTime());
  shifted.setDate(1);
  shifted.setMonth(shifted.getMonth() + months);
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDay));
  return shifted;
}

/**
 * Generate the dates following the end of a series.
 *
 * @param lastDate - The final observed timestamp.
 * @param horizon - Number of future dates to produce.
 * @param frequency - The sampling frequency.
 * @returns `horizon` dates, each one period after the last.
 */
export function futureDates(
  lastDate: Date,
  horizon: number,
  frequency: Frequency,
): Date[] {
  const dates: Date[] = [];
  for (let step = 1; step <= horizon; step += 1) {
    dates.push(addPeriods(lastDate, step, frequency));
  }
  return dates;
}

/**
 * Number of whole periods between two dates at a given frequency.
 *
 * Used to detect gaps in an otherwise regular series.
 *
 * @param from - The earlier date.
 * @param to - The later date.
 * @param frequency - The sampling frequency.
 * @returns The rounded number of periods separating the two dates.
 */
function periodsBetween(from: Date, to: Date, frequency: Frequency): number {
  if (frequency === "monthly" || frequency === "quarterly" || frequency === "yearly") {
    const months =
      (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    const divisor = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
    return Math.round(months / divisor);
  }
  const days = (to.getTime() - from.getTime()) / MILLISECONDS_PER_DAY;
  return Math.round(frequency === "weekly" ? days / 7 : days);
}

export interface RegularSeries {
  values: number[];
  dates: Date[];
  frequency: Frequency;
}

export interface RegulariseOptions {
  frequency?: Frequency;
  /** How to treat missing steps. Daily/weekly cashflow defaults to zero. */
  gapFill?: "interpolate" | "zero";
}

export function toRegularSeries(
  points: readonly TimeSeriesPoint[],
  options: RegulariseOptions = {},
): RegularSeries {
  const collapsed = collapseDuplicates(points);
  if (collapsed.length < 2) {
    throw new RangeError("At least two distinct dates are required to build a series.");
  }
  const frequency = options.frequency ?? inferFrequency(collapsed.map((point) => point.date));
  const gapFill =
    options.gapFill ??
    (frequency === "daily" || frequency === "weekly" ? "zero" : "interpolate");
  return fillGrid(collapsed, frequency, gapFill);
}

function collapseDuplicates(points: readonly TimeSeriesPoint[]): TimeSeriesPoint[] {
  const buckets = new Map<number, { total: number; count: number; date: Date }>();
  for (const point of points) {
    const key = point.date.getTime();
    const existing = buckets.get(key);
    if (existing === undefined) {
      buckets.set(key, { total: point.value, count: 1, date: point.date });
      continue;
    }
    existing.total += point.value;
    existing.count += 1;
  }
  return [...buckets.values()]
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .map((bucket) => ({ date: bucket.date, value: bucket.total / bucket.count }));
}

function fillGrid(
  sorted: readonly TimeSeriesPoint[],
  frequency: Frequency,
  gapFill: "interpolate" | "zero",
): RegularSeries {
  const first = sorted[0];
  if (first === undefined) throw new RangeError("Cannot build a grid from an empty series.");
  const values: number[] = [first.value];
  const dates: Date[] = [first.date];
  for (let i = 1; i < sorted.length; i += 1) {
    const point = sorted[i];
    if (point === undefined) continue;
    const gap = Math.max(periodsBetween(at(dates, dates.length - 1), point.date, frequency), 1);
    appendGap(values, dates, point, gap, frequency, gapFill);
  }
  return { values, dates, frequency };
}

function appendGap(
  values: number[],
  dates: Date[],
  point: TimeSeriesPoint,
  gap: number,
  frequency: Frequency,
  gapFill: "interpolate" | "zero",
): void {
  const previousValue = at(values, values.length - 1);
  const anchor = at(dates, dates.length - 1);
  const bridge = futureDates(anchor, gap - 1, frequency);
  for (let step = 0; step < bridge.length; step += 1) {
    const filled =
      gapFill === "zero"
        ? 0
        : previousValue + ((point.value - previousValue) * (step + 1)) / gap;
    values.push(filled);
    dates.push(at(bridge, step));
  }
  values.push(point.value);
  dates.push(point.date);
}
