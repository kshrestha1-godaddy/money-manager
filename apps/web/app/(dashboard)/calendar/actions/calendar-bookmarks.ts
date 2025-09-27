"use server";

import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession } from "../../../utils/auth";
import { formatDate } from "../../../utils/date";
import { formatDateInTimezone } from "../../../utils/timezone";
import { CalendarBookmarkEvent } from "../../../types/transaction-bookmarks";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";

export async function getBookmarkedTransactionsForCalendar(): Promise<CalendarBookmarkEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    // Get user's preferred currency
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const userCurrency = user.currency;
    
    const bookmarks = await prisma.transactionBookmark.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const calendarEvents: CalendarBookmarkEvent[] = [];

    for (const bookmark of bookmarks) {
      let transaction = null;
      
      if (bookmark.transactionType === 'INCOME') {
        transaction = await prisma.income.findUnique({
          where: { id: bookmark.transactionId },
          include: {
            category: true,
            account: true
          }
        });
      } else if (bookmark.transactionType === 'EXPENSE') {
        transaction = await prisma.expense.findUnique({
          where: { id: bookmark.transactionId },
          include: {
            category: true,
            account: true
          }
        });
      }

      if (transaction) {
        // Format the transaction date using the same format as ExpenseList
        const transactionDate = new Date(transaction.date);
        const dateKey = formatDate(transactionDate);
        
        // Convert amount to user's preferred currency
        const convertedAmount = convertForDisplaySync(
          Number(transaction.amount),
          transaction.currency,
          userCurrency
        );
        
        calendarEvents.push({
          id: `${bookmark.transactionType.toLowerCase()}-${bookmark.transactionId}-${bookmark.id}`,
          date: dateKey,
          title: bookmark.title || transaction.title,
          type: bookmark.transactionType as "INCOME" | "EXPENSE",
          amount: convertedAmount,
          category: transaction.category.name,
          notes: bookmark.notes || transaction.notes || undefined,
          transactionId: bookmark.transactionId,
          bookmarkId: bookmark.id
        });
      }
    }

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching bookmarked transactions for calendar:", error);
    throw new Error("Failed to fetch bookmarked transactions for calendar");
  }
}

export async function getBookmarkedTransactionsForDateRange(
  startDate: string, 
  endDate: string
): Promise<CalendarBookmarkEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    // Get user's preferred currency
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const userCurrency = user.currency;
    
    // Parse the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date range provided");
    }

    const bookmarks = await prisma.transactionBookmark.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const calendarEvents: CalendarBookmarkEvent[] = [];

    for (const bookmark of bookmarks) {
      let transaction = null;
      
      if (bookmark.transactionType === 'INCOME') {
        transaction = await prisma.income.findUnique({
          where: { 
            id: bookmark.transactionId,
            date: {
              gte: start,
              lte: end
            }
          },
          include: {
            category: true,
            account: true
          }
        });
      } else if (bookmark.transactionType === 'EXPENSE') {
        transaction = await prisma.expense.findUnique({
          where: { 
            id: bookmark.transactionId,
            date: {
              gte: start,
              lte: end
            }
          },
          include: {
            category: true,
            account: true
          }
        });
      }

      if (transaction) {
        // Format the transaction date using the same format as ExpenseList
        const transactionDate = new Date(transaction.date);
        const dateKey = formatDate(transactionDate);
        
        // Convert amount to user's preferred currency
        const convertedAmount = convertForDisplaySync(
          Number(transaction.amount),
          transaction.currency,
          userCurrency
        );
        
        calendarEvents.push({
          id: `${bookmark.transactionType.toLowerCase()}-${bookmark.transactionId}-${bookmark.id}`,
          date: dateKey,
          title: bookmark.title || transaction.title,
          type: bookmark.transactionType as "INCOME" | "EXPENSE",
          amount: convertedAmount,
          category: transaction.category.name,
          notes: bookmark.notes || transaction.notes || undefined,
          transactionId: bookmark.transactionId,
          bookmarkId: bookmark.id
        });
      }
    }

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching bookmarked transactions for date range:", error);
    throw new Error("Failed to fetch bookmarked transactions for date range");
  }
}

// ===== TIMEZONE-AWARE CALENDAR FUNCTIONS =====

export async function getBookmarkedTransactionsForCalendarInTimezone(timezone: string): Promise<CalendarBookmarkEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    // Get user's preferred currency
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const userCurrency = user.currency;
    
    const bookmarks = await prisma.transactionBookmark.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const calendarEvents: CalendarBookmarkEvent[] = [];

    for (const bookmark of bookmarks) {
      let transaction = null;
      
      if (bookmark.transactionType === 'INCOME') {
        transaction = await prisma.income.findUnique({
          where: { id: bookmark.transactionId },
          include: {
            category: true,
            account: true
          }
        });
      } else if (bookmark.transactionType === 'EXPENSE') {
        transaction = await prisma.expense.findUnique({
          where: { id: bookmark.transactionId },
          include: {
            category: true,
            account: true
          }
        });
      }

      if (transaction) {
        // Format the transaction date in the specified timezone
        const transactionDate = new Date(transaction.date);
        const dateKey = formatDateInTimezone(transactionDate, timezone, {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        
        // Convert amount to user's preferred currency
        const convertedAmount = convertForDisplaySync(
          Number(transaction.amount),
          transaction.currency,
          userCurrency
        );
        
        calendarEvents.push({
          id: `${bookmark.transactionType.toLowerCase()}-${bookmark.transactionId}-${bookmark.id}`,
          date: dateKey,
          title: bookmark.title || transaction.title,
          type: bookmark.transactionType as "INCOME" | "EXPENSE",
          amount: convertedAmount,
          category: transaction.category.name,
          notes: bookmark.notes || transaction.notes || undefined,
          transactionId: bookmark.transactionId,
          bookmarkId: bookmark.id
        });
      }
    }

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching bookmarked transactions for calendar:", error);
    throw new Error("Failed to fetch bookmarked transactions for calendar");
  }
}

export async function getBookmarkedTransactionsForDateRangeInTimezone(
  startDate: string, 
  endDate: string,
  timezone: string
): Promise<CalendarBookmarkEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);
    
    // Get user's preferred currency
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const userCurrency = user.currency;
    
    // Parse the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date range provided");
    }

    const bookmarks = await prisma.transactionBookmark.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const calendarEvents: CalendarBookmarkEvent[] = [];

    for (const bookmark of bookmarks) {
      let transaction = null;
      
      if (bookmark.transactionType === 'INCOME') {
        transaction = await prisma.income.findUnique({
          where: { 
            id: bookmark.transactionId,
            date: {
              gte: start,
              lte: end
            }
          },
          include: {
            category: true,
            account: true
          }
        });
      } else if (bookmark.transactionType === 'EXPENSE') {
        transaction = await prisma.expense.findUnique({
          where: { 
            id: bookmark.transactionId,
            date: {
              gte: start,
              lte: end
            }
          },
          include: {
            category: true,
            account: true
          }
        });
      }

      if (transaction) {
        // Format the transaction date in the specified timezone
        const transactionDate = new Date(transaction.date);
        const dateKey = formatDateInTimezone(transactionDate, timezone, {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        
        // Convert amount to user's preferred currency
        const convertedAmount = convertForDisplaySync(
          Number(transaction.amount),
          transaction.currency,
          userCurrency
        );
        
        calendarEvents.push({
          id: `${bookmark.transactionType.toLowerCase()}-${bookmark.transactionId}-${bookmark.id}`,
          date: dateKey,
          title: bookmark.title || transaction.title,
          type: bookmark.transactionType as "INCOME" | "EXPENSE",
          amount: convertedAmount,
          category: transaction.category.name,
          notes: bookmark.notes || transaction.notes || undefined,
          transactionId: bookmark.transactionId,
          bookmarkId: bookmark.id
        });
      }
    }

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching bookmarked transactions for date range:", error);
    throw new Error("Failed to fetch bookmarked transactions for date range");
  }
}
