"use server";

import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession, decimalToNumber } from "../../../utils/auth";
import { formatLocalDateKey, formatDateKeyInTimezone } from "../../../utils/calendarDateUtils";
import { formatDateInTimezone } from "../../../utils/timezone";
import { CalendarDebtEvent } from "../../../types/transaction-bookmarks";

export async function getActiveDebtsWithDueDates(): Promise<CalendarDebtEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    // Fetch active debts with due dates
    const debts = await prisma.debt.findMany({
      where: {
        userId: userId,
        // Only fetch debts that have due dates
        dueDate: {
          not: null
        },
        // Only fetch debts that are not fully paid
        status: {
          not: "FULLY_PAID"
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    const calendarEvents: CalendarDebtEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for comparison

    for (const debt of debts) {
      if (debt.dueDate) {
        // Format the due date to local date string
        const dueDate = new Date(debt.dueDate);
        const dateKey = formatLocalDateKey(dueDate);
        
        // Check if debt is overdue
        const isOverdue = dueDate < today;
        
        calendarEvents.push({
          id: `debt-due-${debt.id}`,
          date: dateKey,
          title: `${debt.borrowerName} - Due`,
          type: "DEBT_DUE",
          borrowerName: debt.borrowerName,
          amount: decimalToNumber(debt.amount, 'debt amount'),
          status: debt.status,
          debtId: debt.id,
          isOverdue
        });
      }
    }

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching debts with due dates for calendar:", error);
    throw new Error("Failed to fetch debts with due dates for calendar");
  }
}

export async function getDebtsForDateRange(
  startDate: string, 
  endDate: string
): Promise<CalendarDebtEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    // Parse the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date range provided");
    }

    // Fetch debts with due dates in the specified range
    const debts = await prisma.debt.findMany({
      where: {
        userId: userId,
        dueDate: {
          gte: start,
          lte: end,
          not: null
        },
        // Only fetch debts that are not fully paid
        status: {
          not: "FULLY_PAID"
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    const calendarEvents: CalendarDebtEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for comparison

    for (const debt of debts) {
      if (debt.dueDate) {
        // Format the due date to local date string
        const dueDate = new Date(debt.dueDate);
        const dateKey = formatLocalDateKey(dueDate);
        
        // Check if debt is overdue
        const isOverdue = dueDate < today;
        
        calendarEvents.push({
          id: `debt-due-${debt.id}`,
          date: dateKey,
          title: `${debt.borrowerName} - Due`,
          type: "DEBT_DUE",
          borrowerName: debt.borrowerName,
          amount: decimalToNumber(debt.amount, 'debt amount'),
          status: debt.status,
          debtId: debt.id,
          isOverdue
        });
      }
    }

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching debts for date range:", error);
    throw new Error("Failed to fetch debts for date range");
  }
}

// ===== TIMEZONE-AWARE DEBT FUNCTIONS =====

export async function getActiveDebtsWithDueDatesInTimezone(timezone: string): Promise<CalendarDebtEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    // Fetch active debts with due dates
    const debts = await prisma.debt.findMany({
      where: {
        userId: userId,
        // Only fetch debts that have due dates
        dueDate: {
          not: null
        },
        // Only fetch debts that are not fully paid
        status: {
          not: "FULLY_PAID"
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    const calendarEvents: CalendarDebtEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for comparison

    for (const debt of debts) {
      if (debt.dueDate) {
        // Format the due date in the specified timezone
        const dueDate = new Date(debt.dueDate);
        const dateKey = formatDateInTimezone(dueDate, timezone, {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        
        // Check if debt is overdue
        const isOverdue = dueDate < today;
        
        calendarEvents.push({
          id: `debt-due-${debt.id}`,
          date: dateKey,
          title: `${debt.borrowerName} - Due`,
          type: "DEBT_DUE",
          borrowerName: debt.borrowerName,
          amount: decimalToNumber(debt.amount, 'debt amount'),
          status: debt.status,
          debtId: debt.id,
          isOverdue
        });
      }
    }

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching debts with due dates for calendar:", error);
    throw new Error("Failed to fetch debts with due dates for calendar");
  }
}

export async function getDebtsForDateRangeInTimezone(
  startDate: string, 
  endDate: string,
  timezone: string
): Promise<CalendarDebtEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    // Parse the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date range provided");
    }

    // Fetch debts with due dates in the specified range
    const debts = await prisma.debt.findMany({
      where: {
        userId: userId,
        dueDate: {
          gte: start,
          lte: end,
          not: null
        },
        // Only fetch debts that are not fully paid
        status: {
          not: "FULLY_PAID"
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    const calendarEvents: CalendarDebtEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for comparison

    for (const debt of debts) {
      if (debt.dueDate) {
        // Format the due date in the specified timezone
        const dueDate = new Date(debt.dueDate);
        const dateKey = formatDateInTimezone(dueDate, timezone, {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        
        // Check if debt is overdue
        const isOverdue = dueDate < today;
        
        calendarEvents.push({
          id: `debt-due-${debt.id}`,
          date: dateKey,
          title: `${debt.borrowerName} - Due`,
          type: "DEBT_DUE",
          borrowerName: debt.borrowerName,
          amount: decimalToNumber(debt.amount, 'debt amount'),
          status: debt.status,
          debtId: debt.id,
          isOverdue
        });
      }
    }

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching debts for date range:", error);
    throw new Error("Failed to fetch debts for date range");
  }
}
