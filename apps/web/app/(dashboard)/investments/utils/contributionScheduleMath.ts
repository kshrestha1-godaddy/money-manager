import {
  computeNextScheduledAt,
  endOfCalendarDateInTimezone,
} from "../../../utils/scheduledPaymentTime";

export type ContributionFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface ContributionInstallment {
  index: number;
  scheduledAt: Date;
  amount: number;
}

/** Round money to cents (half-up via Math.round). */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Count occurrences from firstAt through completionDate (inclusive), at frequency. */
export function countContributionPeriods(
  firstAt: Date,
  completionDate: Date,
  frequency: ContributionFrequency,
  timezone: string
): number {
  return buildContributionDates(firstAt, completionDate, frequency, timezone).length;
}

/**
 * Dates from firstAt through the end of the completion calendar day in `timezone`.
 * Completion is treated as a date-only value (UTC Y/M/D → end of that day in tz).
 */
export function buildContributionDates(
  firstAt: Date,
  completionDate: Date,
  frequency: ContributionFrequency,
  timezone: string
): Date[] {
  const endMs = endOfCalendarDateInTimezone(completionDate, timezone).getTime();
  if (firstAt.getTime() > endMs) return [];

  const dates: Date[] = [];
  let cursor = new Date(firstAt);
  const maxIterations = 5000;

  while (cursor.getTime() <= endMs && dates.length < maxIterations) {
    dates.push(new Date(cursor));
    cursor = computeNextScheduledAt(cursor, frequency, timezone);
  }
  return dates;
}

export function calculateContributionPerPeriod(
  remainingAmount: number,
  periods: number
): number {
  const remaining = roundMoney(remainingAmount);
  if (periods <= 0 || remaining <= 0) return 0;
  // Keep 2 decimal places for money; last payment absorbs rounding via recalc.
  return Math.floor((remaining / periods) * 100) / 100;
}

export interface ContributionPreview {
  periods: number;
  amountPerPeriod: number;
  totalScheduled: number;
  remainingAmount: number;
  installments: ContributionInstallment[];
}

export function previewContributionSchedule(
  remainingAmount: number,
  firstAt: Date,
  completionDate: Date,
  frequency: ContributionFrequency,
  timezone: string
): ContributionPreview {
  const remaining = roundMoney(Math.max(0, remainingAmount));
  const dates = buildContributionDates(firstAt, completionDate, frequency, timezone);
  const periods = dates.length;
  const amountPerPeriod = calculateContributionPerPeriod(remaining, periods);
  const baseTotal = amountPerPeriod * periods;
  const lastExtra = periods > 0 ? roundMoney(remaining - baseTotal) : 0;

  const installments: ContributionInstallment[] = dates.map((scheduledAt, index) => ({
    index: index + 1,
    scheduledAt,
    amount:
      index === periods - 1 ? amountPerPeriod + lastExtra : amountPerPeriod,
  }));

  return {
    periods,
    amountPerPeriod,
    totalScheduled: installments.reduce((sum, row) => sum + row.amount, 0),
    remainingAmount: remaining,
    installments,
  };
}
