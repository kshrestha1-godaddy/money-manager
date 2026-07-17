import prisma from "@repo/db/client";
import { createNotification } from "../actions/notifications";
import { buildBalanceSheetXlsxBuffer } from "./balance-sheet-export";
import {
  getPreviousMonthRangeInTimezone,
  isLocalFirstOfMonth,
} from "./balance-sheet-date-utils";
import { sendMonthlyBalanceSheetEmail } from "./email";
import { createCronLogCollector, type CronLogEntry } from "./cron/cron-log-types";

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
  logs: CronLogEntry[];
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
  const log = createCronLogCollector();
  const errors: string[] = [];
  let emailsAttempted = 0;
  let emailsSent = 0;
  let skippedNotFirst = 0;
  let skippedNoTransactions = 0;
  let skippedAlreadySent = 0;

  const now = new Date();
  log.info("Starting monthly balance sheet email job");

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
  log.info(`Found ${eligible.length} users with email addresses`, {
    details: { eligibleUsers: eligible.length },
  });

  for (const user of eligible) {
    const email = user.email!.trim();
    const timezone = user.timezone?.trim() || "UTC";
    const displayCurrency = user.currency?.trim() || "USD";

    try {
      if (!isLocalFirstOfMonth(now, timezone)) {
        skippedNotFirst += 1;
        log.skip("Not the 1st of the month in user timezone", {
          userId: user.id,
          email,
          details: { timezone },
        });
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
        log.skip("Balance sheet already sent for this month", {
          userId: user.id,
          email,
          details: { monthKey: range.monthKey, periodLabel: range.label },
        });
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
        log.skip("No transactions in previous month", {
          userId: user.id,
          email,
          details: { periodLabel: range.label, monthKey: range.monthKey },
        });
        continue;
      }

      emailsAttempted += 1;
      log.info("Sending monthly balance sheet email", {
        userId: user.id,
        email,
        details: {
          periodLabel: range.label,
          transactionCount: built.transactionCount,
          openingBalance: built.openingBalance,
          closingBalance: built.closingBalance,
          displayCurrency,
        },
      });

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
        log.success("Monthly balance sheet email sent", {
          userId: user.id,
          email,
          details: {
            periodLabel: range.label,
            transactionCount: built.transactionCount,
          },
        });
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
        log.error(`Failed to send balance sheet: ${send.error ?? "send failed"}`, {
          userId: user.id,
          email,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "unknown error";
      errors.push(`user ${user.id}: ${message}`);
      log.error(`Error processing balance sheet: ${message}`, {
        userId: user.id,
        email,
      });
    }
  }

  log.info("Monthly balance sheet job finished", {
    details: {
      eligibleUsers: eligible.length,
      emailsAttempted,
      emailsSent,
      skippedNotFirst,
      skippedNoTransactions,
      skippedAlreadySent,
      errorCount: errors.length,
    },
  });

  return {
    eligibleUsers: eligible.length,
    emailsAttempted,
    emailsSent,
    skippedNotFirst,
    skippedNoTransactions,
    skippedAlreadySent,
    errors: errors.slice(0, 25),
    logs: log.logs,
  };
}
