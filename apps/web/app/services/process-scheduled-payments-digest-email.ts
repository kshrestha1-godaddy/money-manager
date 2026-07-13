import prisma from "@repo/db/client";
import { RecurringFrequency } from "@prisma/client";
import {
  accountDisplay,
  dateKeyInTimeZone,
  formatScheduledPaymentWhenDate,
  isScheduledOnLocalDate,
  recurringDisplay,
  scheduledPaymentStatusLabel,
} from "../(dashboard)/scheduled-payments/scheduled-payment-helpers";
import { ScheduledPaymentItem } from "../types/scheduled-payment";
import { createNotification } from "../actions/notifications";
import {
  sendScheduledPaymentsDigestEmail,
  type ScheduledPaymentDigestItem,
} from "./email";

const DIGEST_MESSAGE_PREFIX = "scheduled-payments-digest:";
const WINDOW_HOURS = 36;

export interface ScheduledPaymentsDigestEmailResult {
  eligibleUsers: number;
  emailsAttempted: number;
  emailsSent: number;
  skippedNoPayments: number;
  skippedAlreadySent: number;
  errors: string[];
}

function shiftHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function digestMessageForDate(dateKey: string): string {
  return `${DIGEST_MESSAGE_PREFIX}${dateKey}`;
}

function formatDateLabel(dateKey: string, timezone: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(utcNoon);
}

function toScheduledPaymentItem(row: {
  id: number;
  title: string;
  description: string | null;
  amount: unknown;
  currency: string;
  scheduledAt: Date;
  categoryId: number;
  accountId: number | null;
  userId: number;
  tags: string[];
  notes: string | null;
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency | null;
  resolution: "ACCEPTED" | "REJECTED" | null;
  resolvedAt: Date | null;
  createdExpenseId: number | null;
  createdAt: Date;
  updatedAt: Date;
  category: { id: number; name: string; type: string };
  account: {
    id: number;
    holderName: string;
    bankName: string;
  } | null;
}): ScheduledPaymentItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    amount: parseFloat(String(row.amount)),
    currency: row.currency,
    scheduledAt: new Date(row.scheduledAt),
    categoryId: row.categoryId,
    category: row.category as ScheduledPaymentItem["category"],
    accountId: row.accountId,
    account: row.account
      ? ({
          ...row.account,
          accountNumber: "",
          branchCode: "",
          branchName: "",
          bankAddress: "",
          accountType: "",
          mobileNumbers: [],
          branchContacts: [],
          swift: "",
          bankEmail: "",
          accountOpeningDate: new Date(),
          securityQuestion: [],
          balance: 0,
          userId: row.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as ScheduledPaymentItem["account"])
      : null,
    userId: row.userId,
    tags: row.tags ?? [],
    notes: row.notes,
    isRecurring: row.isRecurring,
    recurringFrequency: row.recurringFrequency,
    resolution: row.resolution,
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : null,
    createdExpenseId: row.createdExpenseId,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function buildDigestItems(
  payments: ScheduledPaymentItem[],
  timezone: string,
  now: Date
): ScheduledPaymentDigestItem[] {
  return payments.map((payment) => ({
    title: payment.title,
    amount: payment.amount,
    currency: payment.currency,
    whenLabel: formatScheduledPaymentWhenDate(payment.scheduledAt, timezone),
    categoryName: payment.category.name,
    accountLabel: accountDisplay(payment),
    statusLabel: scheduledPaymentStatusLabel(payment, now),
    recurringLabel: recurringDisplay(payment),
  }));
}

function buildTotalByCurrency(payments: ScheduledPaymentItem[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const payment of payments) {
    totals[payment.currency] = (totals[payment.currency] ?? 0) + payment.amount;
  }
  return totals;
}

/**
 * Daily digest of unresolved scheduled payments due today in each user's timezone.
 * Skips users with no payments today and users already emailed for that local day.
 */
export async function processScheduledPaymentsDigestEmails(): Promise<ScheduledPaymentsDigestEmailResult> {
  const errors: string[] = [];
  let emailsAttempted = 0;
  let emailsSent = 0;
  let skippedNoPayments = 0;
  let skippedAlreadySent = 0;

  if (process.env.SCHEDULED_PAYMENTS_DIGEST_ENABLED === "false") {
    return {
      eligibleUsers: 0,
      emailsAttempted: 0,
      emailsSent: 0,
      skippedNoPayments: 0,
      skippedAlreadySent: 0,
      errors: ["SCHEDULED_PAYMENTS_DIGEST_DISABLED"],
    };
  }

  const now = new Date();
  const windowStart = shiftHours(now, -WINDOW_HOURS);
  const windowEnd = shiftHours(now, WINDOW_HOURS);

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
    },
  });

  const eligible = users.filter((user) => Boolean(user.email?.trim()));

  for (const user of eligible) {
    const email = user.email!.trim();
    const timezone = user.timezone?.trim() || "UTC";
    const todayKey = dateKeyInTimeZone(now, timezone);

    try {
      const alreadySent = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          message: { contains: digestMessageForDate(todayKey) },
          createdAt: { gte: shiftHours(now, -WINDOW_HOURS) },
        },
      });

      if (alreadySent) {
        skippedAlreadySent += 1;
        continue;
      }

      const rows = await prisma.scheduledPayment.findMany({
        where: {
          userId: user.id,
          resolution: null,
          scheduledAt: { gte: windowStart, lte: windowEnd },
        },
        include: {
          category: true,
          account: {
            select: {
              id: true,
              holderName: true,
              bankName: true,
            },
          },
        },
        orderBy: { scheduledAt: "asc" },
      });

      const payments = rows
        .map((row) => toScheduledPaymentItem(row as never))
        .filter((payment) => isScheduledOnLocalDate(payment.scheduledAt, todayKey, timezone));

      if (payments.length === 0) {
        skippedNoPayments += 1;
        continue;
      }

      emailsAttempted += 1;

      const send = await sendScheduledPaymentsDigestEmail({
        to: email,
        userName: user.name ?? undefined,
        dateLabel: formatDateLabel(todayKey, timezone),
        timezone,
        payments: buildDigestItems(payments, timezone, now),
        totalByCurrency: buildTotalByCurrency(payments),
      });

      if (send.success) {
        emailsSent += 1;
        await createNotification(
          user.id,
          "Scheduled payments for today",
          `${digestMessageForDate(todayKey)} Sent daily digest for ${payments.length} payment(s).`,
          "DUE_DATE_REMINDER",
          "NORMAL",
          "/scheduled-payments"
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
    skippedNoPayments,
    skippedAlreadySent,
    errors: errors.slice(0, 25),
  };
}
