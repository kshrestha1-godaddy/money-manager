import prisma from "@repo/db/client";
import { createNotification } from "../actions/notifications";
import { buildBalanceSheetXlsxBuffer } from "./balance-sheet-export";
import {
  getPreviousMonthRangeInTimezone,
  isLocalFirstOfMonth,
} from "./balance-sheet-date-utils";
import { sendMonthlyBalanceSheetEmail } from "./email";

const BALANCE_SHEET_MESSAGE_PREFIX = "balance-sheet-email:";
const DEDUP_WINDOW_DAYS = 45;

export interface MonthlyBalanceSheetEmailResult {
  eligibleUsers: number;
  emailsAttempted: number;
  emailsSent: number;
  skippedNotFirst: number;
  skippedNoTransactions: number;
  skippedAlreadySent: number;
  errors: string[];
}

function balanceSheetMessageForMonth(monthKey: string): string {
  return `${BALANCE_SHEET_MESSAGE_PREFIX}${monthKey}`;
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * On each user's local 1st of the month, email the previous month's balance sheet as Excel.
 */
export async function processMonthlyBalanceSheetEmails(): Promise<MonthlyBalanceSheetEmailResult> {
  const errors: string[] = [];
  let emailsAttempted = 0;
  let emailsSent = 0;
  let skippedNotFirst = 0;
  let skippedNoTransactions = 0;
  let skippedAlreadySent = 0;

  if (process.env.MONTHLY_BALANCE_SHEET_ENABLED === "false") {
    return {
      eligibleUsers: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      skippedNotFirst: 0,
      skippedNoTransactions: 0,
      skippedAlreadySent: 0,
      errors: ["MONTHLY_BALANCE_SHEET_DISABLED"],
    };
  }

  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      NOT: { email: "" },
    },
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      currency: true,
    },
  });

  const eligible = users.filter((user) => Boolean(user.email?.trim()));

  for (const user of eligible) {
    const email = user.email!.trim();
    const timezone = user.timezone?.trim() || "UTC";
    const displayCurrency = user.currency?.trim() || "USD";

    try {
      if (!isLocalFirstOfMonth(now, timezone)) {
        skippedNotFirst += 1;
        continue;
      }

      const range = getPreviousMonthRangeInTimezone(timezone, now);

      const alreadySent = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          message: { contains: balanceSheetMessageForMonth(range.monthKey) },
          createdAt: { gte: shiftDays(now, -DEDUP_WINDOW_DAYS) },
        },
      });

      if (alreadySent) {
        skippedAlreadySent += 1;
        continue;
      }

      const built = await buildBalanceSheetXlsxBuffer({
        userId: user.id,
        displayCurrency,
        rangeStart: range.startUtc,
        rangeEnd: range.endUtc,
        periodLabel: range.label,
      });

      if (!built) {
        skippedNoTransactions += 1;
        continue;
      }

      emailsAttempted += 1;

      const send = await sendMonthlyBalanceSheetEmail({
        to: email,
        userName: user.name ?? undefined,
        periodLabel: range.label,
        transactionCount: built.transactionCount,
        openingBalance: built.openingBalance,
        closingBalance: built.closingBalance,
        displayCurrency,
        attachment: {
          filename: built.filename,
          buffer: built.buffer,
        },
      });

      if (send.success) {
        emailsSent += 1;
        await createNotification(
          user.id,
          `Balance sheet for ${range.label}`,
          `${balanceSheetMessageForMonth(range.monthKey)} Sent monthly balance sheet (${built.transactionCount} transaction(s)).`,
          "MONTHLY_SUMMARY",
          "NORMAL",
          "/transactions"
        );
      } else {
        errors.push(`user ${user.id}: ${send.error ?? "send failed"}`);
      }
    } catch (e) {
      errors.push(
        `user ${user.id}: ${e instanceof Error ? e.message : "unknown error"}`
      );
    }
  }

  return {
    eligibleUsers: eligible.length,
    emailsAttempted,
    emailsSent,
    skippedNotFirst,
    skippedNoTransactions,
    skippedAlreadySent,
    errors: errors.slice(0, 25),
  };
}
