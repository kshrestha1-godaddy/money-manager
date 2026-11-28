"use server";

import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession, decimalToNumber } from "../../../utils/auth";
import { formatDate } from "../../../utils/date";
import { formatDateInTimezone } from "../../../utils/timezone";

export interface CalendarScheduledPaymentEvent {
  id: string;
  date: string;
  title: string;
  type: "SCHEDULED_PAYMENT";
  amount: number;
  category: string;
  scheduledPaymentId: number;
  isInvestmentContribution: boolean;
  investmentName?: string;
  isOverdue: boolean;
}

export async function getScheduledPaymentsForCalendar(): Promise<CalendarScheduledPaymentEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.user?.id) return [];

    const userId = getUserIdFromSession(session.user.id);
    const now = new Date();

    const rows = await prisma.scheduledPayment.findMany({
      where: {
        userId,
        resolution: null,
      },
      include: {
        category: { select: { name: true } },
        investment: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return rows.map((row) => ({
      id: `scheduled-payment-${row.id}`,
      date: formatDate(row.scheduledAt),
      title: row.title,
      type: "SCHEDULED_PAYMENT" as const,
      amount: decimalToNumber(row.amount, "scheduled payment amount"),
      category: row.category.name,
      scheduledPaymentId: row.id,
      isInvestmentContribution: row.investmentId != null,
      investmentName: row.investment?.name,
      isOverdue: row.scheduledAt <= now,
    }));
  } catch (error) {
    console.error("Error fetching scheduled payments for calendar:", error);
    return [];
  }
}

export async function getScheduledPaymentsForCalendarInTimezone(
  timezone: string
): Promise<CalendarScheduledPaymentEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.user?.id) return [];

    const userId = getUserIdFromSession(session.user.id);
    const now = new Date();

    const rows = await prisma.scheduledPayment.findMany({
      where: {
        userId,
        resolution: null,
      },
      include: {
        category: { select: { name: true } },
        investment: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return rows.map((row) => ({
      id: `scheduled-payment-${row.id}`,
      date: formatDateInTimezone(row.scheduledAt, timezone),
      title: row.title,
      type: "SCHEDULED_PAYMENT" as const,
      amount: decimalToNumber(row.amount, "scheduled payment amount"),
      category: row.category.name,
      scheduledPaymentId: row.id,
      isInvestmentContribution: row.investmentId != null,
      investmentName: row.investment?.name,
      isOverdue: row.scheduledAt <= now,
    }));
  } catch (error) {
    console.error("Error fetching scheduled payments for calendar:", error);
    return [];
  }
}
