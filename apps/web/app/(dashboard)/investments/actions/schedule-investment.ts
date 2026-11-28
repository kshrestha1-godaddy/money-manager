"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import prisma from "@repo/db/client";
import { RecurringFrequency, type Prisma } from "@prisma/client";
import { authOptions } from "../../../lib/auth";
import { getUserIdFromSession, decimalToNumber } from "../../../utils/auth";
import { getLockedLedgerCurrency } from "../../../utils/ledgerCurrency";
import { SUPPORTED_CURRENCIES } from "../../../utils/currency";
import {
  buildContributionDates,
  calculateContributionPerPeriod,
  countContributionPeriods,
  roundMoney,
  type ContributionFrequency,
} from "../utils/contributionScheduleMath";
import { endOfCalendarDateInTimezone } from "../../../utils/scheduledPaymentTime";
import { assertAccountHasFreeBalanceForWithheld } from "./investments";
import { getInvestmentTypeLabel } from "../utils/investmentTypeUi";
import { presentValueForPosition } from "../utils/stocksExpenseBasis";

export interface ScheduleInvestmentInput {
  investmentTargetId: number;
  accountId: number;
  initialAmount: number;
  currency: string;
  firstReminderAt: Date;
  frequency: ContributionFrequency;
  categoryId: number;
  name?: string;
}

/** Present value toward a target (quantity × currentPrice) — same rule as target progress. */
async function sumPresentValueForTarget(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: number,
  targetId: number
): Promise<number> {
  const rows = await tx.investment.findMany({
    where: { userId, investmentTargetId: targetId },
    select: { quantity: true, currentPrice: true },
  });
  return rows.reduce((sum, row) => sum + presentValueForPosition(row), 0);
}

/** Find the one open scheduled-contribution series investment for a target, if any. */
async function findOpenScheduledSeriesInvestmentId(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: number,
  targetId: number
): Promise<number | null> {
  const open = await tx.scheduledPayment.findFirst({
    where: {
      userId,
      resolution: null,
      investmentId: { not: null },
      investment: { investmentTargetId: targetId },
    },
    select: { investmentId: true },
  });
  return open?.investmentId ?? null;
}

/**
 * Redistribute remaining target gap across the rolling contribution series.
 *
 * Only one open payment usually exists (next occurrence is created on accept/reject).
 * Amount is sized by remaining *periods* from the open payment through the target
 * completion day — not by openPayments.length — so a multi-period plan does not
 * collapse into one giant next installment.
 */
export async function recalcOpenContributionSchedulesForTarget(
  userId: number,
  targetId: number,
  transaction?: Prisma.TransactionClient
): Promise<void> {
  if (!transaction) {
    await prisma.$transaction(async (tx) => {
      await getLockedLedgerCurrency(tx, userId);
      await recalcOpenContributionSchedulesForTarget(userId, targetId, tx);
    });
    revalidatePath("/scheduled-payments");
    revalidatePath("/calendar");
    return;
  }

  const target = await transaction.investmentTarget.findFirst({
    where: { id: targetId, userId },
    select: { id: true, targetAmount: true, targetCompletionDate: true },
  });
  if (!target) return;

  const seriesInvestmentId = await findOpenScheduledSeriesInvestmentId(
    transaction,
    userId,
    targetId
  );
  if (!seriesInvestmentId) return;

  const payments = await transaction.scheduledPayment.findMany({
    where: {
      userId,
      investmentId: seriesInvestmentId,
      resolution: null,
    },
    select: { id: true, scheduledAt: true, recurringFrequency: true },
    orderBy: { scheduledAt: "asc" },
  });
  if (payments.length === 0) return;

  const presentValue = await sumPresentValueForTarget(transaction, userId, targetId);
  const remaining = roundMoney(
    Math.max(
      0,
      decimalToNumber(target.targetAmount, "targetAmount") - presentValue
    )
  );

  if (remaining < 0.01 || !target.targetCompletionDate) {
    await transaction.scheduledPayment.deleteMany({
      where: {
        userId,
        investmentId: seriesInvestmentId,
        resolution: null,
      },
    });
    return;
  }

  const user = await transaction.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timezone = user?.timezone || "UTC";
  const cutoff = endOfCalendarDateInTimezone(new Date(target.targetCompletionDate), timezone);
  const expired = payments.filter(payment => payment.scheduledAt > cutoff);
  if (expired.length) {
    await transaction.scheduledPayment.deleteMany({
      where: { userId, id: { in: expired.map(payment => payment.id) }, resolution: null },
    });
  }
  const openPayments = payments.filter(payment => payment.scheduledAt <= cutoff);
  const firstOpen = openPayments[0];
  if (!firstOpen) return;
  const frequency = (firstOpen.recurringFrequency ||
    "MONTHLY") as ContributionFrequency;

  let periods = openPayments.length;
  if (target.targetCompletionDate) {
    const remainingPeriods = countContributionPeriods(
      firstOpen.scheduledAt,
      new Date(target.targetCompletionDate),
      frequency,
      timezone
    );
    // Prefer calendar periods; never size below the number of already-open rows.
    periods = Math.max(remainingPeriods, openPayments.length);
  }
  if (periods <= 0) periods = openPayments.length;

  let amountPerPeriod = calculateContributionPerPeriod(remaining, periods);
  // Tiny remainder across many periods can floor to 0 — put it on the open row(s).
  if (amountPerPeriod <= 0) {
    periods = openPayments.length;
    amountPerPeriod = calculateContributionPerPeriod(remaining, periods);
  }
  if (amountPerPeriod <= 0) {
    for (const [index, payment] of openPayments.entries()) {
      await transaction.scheduledPayment.updateMany({
        where: { id: payment.id, resolution: null },
        data: { amount: index === openPayments.length - 1 ? remaining : 0 },
      });
    }
    // Drop zero-amount open rows except the last (which holds the remainder).
    if (openPayments.length > 1) {
      await transaction.scheduledPayment.deleteMany({
        where: {
          userId,
          id: { in: openPayments.slice(0, -1).map((p) => p.id) },
          resolution: null,
        },
      });
    }
    return;
  }

  // When multiple rows are open, put rounding remainder on the last.
  // For the usual single open row, that row gets floor(remaining/periods).
  const baseTotal = amountPerPeriod * openPayments.length;
  const lastExtra =
    openPayments.length === periods
      ? roundMoney(remaining - baseTotal)
      : 0;

  for (const [index, payment] of openPayments.entries()) {
    await transaction.scheduledPayment.updateMany({
      where: { id: payment.id, resolution: null },
      data: {
        amount:
          index === openPayments.length - 1
            ? roundMoney(amountPerPeriod + lastExtra)
            : amountPerPeriod,
      },
    });
  }
}

export async function scheduleInvestmentTowardTarget(
  input: ScheduleInvestmentInput
): Promise<{ ok: true; investmentId: number; reminderCreated: boolean } | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");
    const userId = getUserIdFromSession(session.user.id);

    if (!Number.isSafeInteger(input.investmentTargetId) || input.investmentTargetId <= 0) {
      throw new Error("Select an investment target");
    }
    if (!Number.isSafeInteger(input.accountId) || input.accountId <= 0) {
      throw new Error("Select an account");
    }
    if (
      typeof input.initialAmount !== "number" ||
      !Number.isFinite(input.initialAmount) ||
      input.initialAmount < 0
    ) {
      throw new Error("Initial contribution must be zero or a positive amount");
    }
    if (!SUPPORTED_CURRENCIES.some((c) => c === input.currency)) {
      throw new Error("Unsupported currency");
    }
    if (
      !(input.firstReminderAt instanceof Date) ||
      !Number.isFinite(input.firstReminderAt.getTime())
    ) {
      throw new Error("Invalid first reminder date");
    }
    if (!Number.isSafeInteger(input.categoryId) || input.categoryId <= 0) {
      throw new Error("Select an expense category");
    }
    const frequencies: ContributionFrequency[] = [
      "DAILY",
      "WEEKLY",
      "MONTHLY",
      "YEARLY",
    ];
    if (!frequencies.includes(input.frequency)) {
      throw new Error("Select a valid frequency");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, currency: true },
    });
    const timezone = user?.timezone || "UTC";

    const result = await prisma.$transaction(async (tx) => {
      const ledgerCurrency = await getLockedLedgerCurrency(tx, userId);

      const target = await tx.investmentTarget.findFirst({
        where: { id: input.investmentTargetId, userId },
      });
      if (!target) throw new Error("Investment target not found");
      if (!target.targetCompletionDate) {
        throw new Error("Target must have a completion date to schedule contributions");
      }

      const completionDate = new Date(target.targetCompletionDate);
      const completionEnd = endOfCalendarDateInTimezone(completionDate, timezone);
      if (input.firstReminderAt.getTime() > completionEnd.getTime()) {
        throw new Error("First reminder must be on or before the target completion date");
      }

      const existingSeries = await findOpenScheduledSeriesInvestmentId(
        tx,
        userId,
        target.id
      );
      if (existingSeries) {
        throw new Error(
          "This target already has a scheduled investment series. Finish or cancel it before starting another."
        );
      }

      const account = await tx.account.findFirst({
        where: { id: input.accountId, userId },
        select: { id: true },
      });
      if (!account) throw new Error("Invalid account");

      const category = await tx.category.findFirst({
        where: { id: input.categoryId, userId, type: "EXPENSE" },
        select: { id: true },
      });
      if (!category) throw new Error("Invalid expense category");

      const targetAmount = decimalToNumber(target.targetAmount, "targetAmount");
      const presentValue = await sumPresentValueForTarget(tx, userId, target.id);
      const remainingBeforeInitial = Math.max(0, targetAmount - presentValue);
      if (input.initialAmount > remainingBeforeInitial) {
        throw new Error(
          `Initial contribution cannot exceed remaining toward target (${remainingBeforeInitial})`
        );
      }

      const remainingAfterInitial = Math.max(
        0,
        remainingBeforeInitial - input.initialAmount
      );
      if (remainingAfterInitial <= 0 && input.initialAmount <= 0) {
        throw new Error("Nothing left to contribute for this target");
      }

      const periods = countContributionPeriods(
        input.firstReminderAt,
        completionDate,
        input.frequency,
        timezone
      );
      if (remainingAfterInitial > 0 && periods <= 0) {
        throw new Error(
          "No contribution dates fall on or before the target completion date — adjust the first reminder or frequency"
        );
      }

      if (input.initialAmount > 0) {
        await assertAccountHasFreeBalanceForWithheld(
          tx,
          userId,
          input.accountId,
          input.initialAmount
        );
      }

      const typeLabel = getInvestmentTypeLabel(target.investmentType);
      const investmentLabel = target.nickname?.trim() || typeLabel;
      const name = input.name?.trim() || `[Scheduled] : [${investmentLabel}]`;

      const created = await tx.investment.create({
        data: {
          name,
          type: "SAFE_KEEPINGS",
          quantity: 1,
          purchasePrice: input.initialAmount,
          currentPrice: input.initialAmount,
          purchaseDate: new Date(),
          accountId: input.accountId,
          userId,
          // Schedule flow always withholds against the linked account (now and on accept).
          deductFromAccount: true,
          investmentTargetId: target.id,
          notes: "Created via Schedule an Investment",
        },
      });

      const reminderCreated = remainingAfterInitial >= 0.01 && periods > 0;
      if (reminderCreated) {
        const amountPerPeriod = calculateContributionPerPeriod(remainingAfterInitial, periods)
          || roundMoney(remainingAfterInitial);
        await tx.scheduledPayment.create({
          data: {
            title: created.name,
            description: `Scheduled contributions toward ${typeLabel} target`,
            amount: amountPerPeriod,
            currency: ledgerCurrency,
            scheduledAt: input.firstReminderAt,
            categoryId: input.categoryId,
            accountId: input.accountId,
            userId,
            tags: ["investment-contribution"],
            notes: `Completes by ${completionDate.toISOString().slice(0, 10)}`,
            isRecurring: true,
            recurringFrequency: input.frequency as RecurringFrequency,
            investmentId: created.id,
          },
        });
      }

      return { investmentId: created.id, reminderCreated };
    });

    revalidatePath("/investments");
    revalidatePath("/accounts");
    revalidatePath("/scheduled-payments");
    revalidatePath("/calendar");
    revalidatePath("/expenses");

    return { ok: true, ...result };
  } catch (error) {
    console.error("Failed to schedule investment:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to schedule investment",
    };
  }
}

export interface TargetLinkedInvestmentSummary {
  id: number;
  name: string;
  type: string;
  /** Present value (quantity × currentPrice) for this position. */
  investedAmount: number;
}

export interface ScheduleableTargetOption {
  id: number;
  nickname: string | null;
  investmentType: string;
  targetAmount: number;
  /** Sum of linked present values — same basis as target progress. */
  investedAmount: number;
  remainingAmount: number;
  completionDate: Date;
  hasOpenSeries: boolean;
}

/** Targets eligible for Schedule an Investment (must have a completion date). */
export async function listScheduleableTargets(): Promise<
  ScheduleableTargetOption[] | { error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");
    const userId = getUserIdFromSession(session.user.id);

    const targets = await prisma.investmentTarget.findMany({
      where: {
        userId,
        targetCompletionDate: { not: null },
      },
      orderBy: [{ nickname: "asc" }, { investmentType: "asc" }],
    });

    const options: ScheduleableTargetOption[] = [];
    for (const target of targets) {
      if (!target.targetCompletionDate) continue;
      const investedAmount = await sumPresentValueForTarget(prisma, userId, target.id);
      const targetAmount = decimalToNumber(target.targetAmount, "targetAmount");
      const hasOpenSeries =
        (await findOpenScheduledSeriesInvestmentId(prisma, userId, target.id)) != null;
      options.push({
        id: target.id,
        nickname: target.nickname,
        investmentType: target.investmentType,
        targetAmount,
        investedAmount,
        remainingAmount: Math.max(0, targetAmount - investedAmount),
        completionDate: new Date(target.targetCompletionDate),
        hasOpenSeries,
      });
    }
    return options;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to load targets",
    };
  }
}

export type ContributionPlanRowStatus =
  | "ACCEPTED"
  | "REJECTED"
  | "UPCOMING"
  | "AWAITING";

export interface ContributionPlanRow {
  index: number;
  scheduledAt: Date;
  amount: number;
  currency: string;
  status: ContributionPlanRowStatus;
  isNext: boolean;
  paymentId: number | null;
  resolvedAt: Date | null;
}

export interface InvestmentContributionPlan {
  investmentId: number;
  targetAmount: number;
  presentValue: number;
  remainingAmount: number;
  completionDate: Date | null;
  frequency: ContributionFrequency | null;
  rows: ContributionPlanRow[];
}

/**
 * Full contribution plan for a scheduled investment: accepted history + projected
 * remaining installments through the target completion date.
 */
export async function getInvestmentContributionPlan(
  investmentId: number
): Promise<InvestmentContributionPlan | { error: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");
    const userId = getUserIdFromSession(session.user.id);

    if (!Number.isSafeInteger(investmentId) || investmentId <= 0) {
      throw new Error("Invalid investment");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true, currency: true },
    });
    const timezone = user?.timezone || "UTC";
    const ledgerCurrency = (user?.currency?.trim() || "USD").toUpperCase();
    const now = new Date();

    const investment = await prisma.investment.findFirst({
      where: { id: investmentId, userId },
      select: {
        id: true,
        investmentTargetId: true,
        investmentTarget: {
          select: {
            targetAmount: true,
            targetCompletionDate: true,
          },
        },
      },
    });
    if (!investment) throw new Error("Investment not found");

    const payments = await prisma.scheduledPayment.findMany({
      where: { userId, investmentId },
      orderBy: { scheduledAt: "asc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        scheduledAt: true,
        resolution: true,
        resolvedAt: true,
        recurringFrequency: true,
      },
    });

    if (payments.length === 0) {
      return {
        investmentId,
        targetAmount: investment.investmentTarget
          ? decimalToNumber(investment.investmentTarget.targetAmount, "targetAmount")
          : 0,
        presentValue: 0,
        remainingAmount: 0,
        completionDate: investment.investmentTarget?.targetCompletionDate
          ? new Date(investment.investmentTarget.targetCompletionDate)
          : null,
        frequency: null,
        rows: [],
      };
    }

    const targetAmount = investment.investmentTarget
      ? decimalToNumber(investment.investmentTarget.targetAmount, "targetAmount")
      : 0;
    const presentValue =
      investment.investmentTargetId != null
        ? await sumPresentValueForTarget(prisma, userId, investment.investmentTargetId)
        : 0;
    const remainingAmount = roundMoney(Math.max(0, targetAmount - presentValue));
    const completionDate = investment.investmentTarget?.targetCompletionDate
      ? new Date(investment.investmentTarget.targetCompletionDate)
      : null;

    const frequency = (payments.find((p) => p.recurringFrequency)?.recurringFrequency ||
      "MONTHLY") as ContributionFrequency;

    const historical = payments.filter((p) => p.resolution !== null);
    const open = payments.filter((p) => p.resolution === null);

    const rows: ContributionPlanRow[] = [];

    for (const payment of historical) {
      rows.push({
        index: 0,
        scheduledAt: new Date(payment.scheduledAt),
        amount: decimalToNumber(payment.amount, "amount"),
        currency: payment.currency || ledgerCurrency,
        status: payment.resolution === "ACCEPTED" ? "ACCEPTED" : "REJECTED",
        isNext: false,
        paymentId: payment.id,
        resolvedAt: payment.resolvedAt ? new Date(payment.resolvedAt) : null,
      });
    }

    // Project remaining installments from the real open payment (handles postpone).
    // Do not invent phantom dates when the gap is closed or there is no open row.
    if (
      remainingAmount >= 0.01 &&
      open[0] &&
      completionDate != null
    ) {
      const firstOpen = open[0];
      const futureDates = buildContributionDates(
        new Date(firstOpen.scheduledAt),
        completionDate,
        frequency,
        timezone
      );
      const periodCount = Math.max(futureDates.length, 1);
      let amountPerPeriod = calculateContributionPerPeriod(
        remainingAmount,
        periodCount
      );
      if (amountPerPeriod <= 0) {
        amountPerPeriod = remainingAmount;
      }
      const baseTotal = amountPerPeriod * periodCount;
      const lastExtra = roundMoney(remainingAmount - baseTotal);

      for (const [i, scheduledAt] of futureDates.entries()) {
        const matchedOpen = open[i] ?? null;
        const amount =
          i === futureDates.length - 1
            ? roundMoney(amountPerPeriod + lastExtra)
            : amountPerPeriod;
        const status: ContributionPlanRowStatus = matchedOpen
          ? new Date(matchedOpen.scheduledAt).getTime() > now.getTime()
            ? "UPCOMING"
            : "AWAITING"
          : scheduledAt.getTime() > now.getTime()
            ? "UPCOMING"
            : "AWAITING";

        rows.push({
          index: 0,
          scheduledAt: matchedOpen
            ? new Date(matchedOpen.scheduledAt)
            : scheduledAt,
          // Always split current remaining so the plan matches target gap math.
          amount,
          currency: matchedOpen?.currency || ledgerCurrency,
          status,
          isNext: false,
          paymentId: matchedOpen?.id ?? null,
          resolvedAt: null,
        });
      }
    } else if (open.length > 0) {
      // No completion / no remaining — still surface the open row(s) as-is.
      for (const payment of open) {
        rows.push({
          index: 0,
          scheduledAt: new Date(payment.scheduledAt),
          amount: decimalToNumber(payment.amount, "amount"),
          currency: payment.currency || ledgerCurrency,
          status:
            new Date(payment.scheduledAt).getTime() > now.getTime()
              ? "UPCOMING"
              : "AWAITING",
          isNext: false,
          paymentId: payment.id,
          resolvedAt: null,
        });
      }
    }

    rows.sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
    );

    let nextAssigned = false;
    const numbered = rows.map((row, index) => {
      const isNext =
        !nextAssigned &&
        (row.status === "UPCOMING" || row.status === "AWAITING");
      if (isNext) nextAssigned = true;
      return { ...row, index: index + 1, isNext };
    });

    return {
      investmentId,
      targetAmount,
      presentValue,
      remainingAmount,
      completionDate,
      frequency,
      rows: numbered,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to load contribution plan",
    };
  }
}

/** Preview helpers for the Schedule Investment modal (server-safe totals). */
export async function getTargetScheduleContext(targetId: number): Promise<
  | {
      targetAmount: number;
      investedAmount: number;
      remainingAmount: number;
      completionDate: Date | null;
      hasOpenSeries: boolean;
      investmentType: string;
      nickname: string | null;
      linkedInvestments: TargetLinkedInvestmentSummary[];
    }
  | { error: string }
> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");
    const userId = getUserIdFromSession(session.user.id);

    const target = await prisma.investmentTarget.findFirst({
      where: { id: targetId, userId },
    });
    if (!target) throw new Error("Target not found");

    const linkedRows = await prisma.investment.findMany({
      where: { userId, investmentTargetId: target.id },
      select: {
        id: true,
        name: true,
        type: true,
        quantity: true,
        currentPrice: true,
      },
      orderBy: { name: "asc" },
    });
    const linkedInvestments: TargetLinkedInvestmentSummary[] = linkedRows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      investedAmount: presentValueForPosition(row),
    }));
    const investedAmount = linkedInvestments.reduce(
      (sum, row) => sum + row.investedAmount,
      0
    );
    const targetAmount = decimalToNumber(target.targetAmount, "targetAmount");
    const hasOpenSeries =
      (await findOpenScheduledSeriesInvestmentId(prisma, userId, target.id)) != null;

    return {
      targetAmount,
      investedAmount,
      remainingAmount: Math.max(0, targetAmount - investedAmount),
      completionDate: target.targetCompletionDate
        ? new Date(target.targetCompletionDate)
        : null,
      hasOpenSeries,
      investmentType: target.investmentType,
      nickname: target.nickname,
      linkedInvestments,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to load target",
    };
  }
}
