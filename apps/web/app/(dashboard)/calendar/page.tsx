"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  formatLocalDateKey, 
  generateCalendarMatrix, 
  isSameDay, 
  getTodayAtMidnight,
  getPreviousMonth,
  getNextMonth,
  getDaysInMonth,
  formatDateKeyInTimezone,
  generateCalendarMatrixInTimezone,
  isSameDayInTimezone,
  getTodayAtMidnightInTimezone,
  getDateRangeInTimezone
} from "../../utils/calendarDateUtils";
import { formatDate } from "../../utils/date";
import { getTodayInTimezone } from "../../utils/timezone";
import { getBookmarkedTransactionsForCalendar, getBookmarkedTransactionsForCalendarInTimezone } from "./actions/calendar-bookmarks";
import { getActiveDebtsWithDueDates, getActiveDebtsWithDueDatesInTimezone } from "./actions/calendar-debts";
import { getNotesWithRemindersForCalendar, getNotesWithRemindersForCalendarInTimezone, CalendarNoteEvent } from "./actions/calendar-notes";
import { useTimezone } from "../../providers/TimezoneProvider";
import { TimezoneSelector } from "../../components/shared/TimezoneSelector";

import { CalendarBookmarkEvent, CalendarDebtEvent } from "../../types/transaction-bookmarks";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { LOADING_COLORS } from "../../config/colorConfig";

interface CalendarEvent {
  id: string;
  date: string; // Human-readable format like "January 15, 2024"
  title: string;
  type?: "INCOME" | "EXPENSE" | "DEBT_DUE" | "NOTE_REMINDER";
  amount?: number;
  category?: string;
  borrowerName?: string;
  status?: string;
  isOverdue?: boolean;
  content?: string;
  tags?: string[];
  noteId?: number;
}

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default function CalendarPage() {
  const router = useRouter();
  const { timezone, isLoading: timezoneLoading } = useTimezone();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [bookmarkedEvents, setBookmarkedEvents] = useState<CalendarBookmarkEvent[]>([]);
  const [debtEvents, setDebtEvents] = useState<CalendarDebtEvent[]>([]);
  const [noteEvents, setNoteEvents] = useState<CalendarNoteEvent[]>([]);
  const [calendarDataLoading, setCalendarDataLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { currency: userCurrency } = useCurrency();

  // Overall loading state - show loading during initial load or timezone changes
  const loading = timezoneLoading || calendarDataLoading || (!isInitialized && !timezoneLoading);

  const monthData = useMemo(() => {
    // Don't generate calendar matrix while timezone is loading
    if (timezoneLoading) {
      return {
        weeks: [],
        firstDay: new Date(viewYear, viewMonth, 1),
        lastDay: new Date(viewYear, viewMonth + 1, 0),
        daysInMonth: getDaysInMonth(viewYear, viewMonth),
        allDaysIncluded: []
      };
    }

    try {
      // Use timezone-aware calendar generation when timezone is available
      if (timezone && !timezoneLoading) {
        return generateCalendarMatrixInTimezone(viewYear, viewMonth, timezone);
      }
      return generateCalendarMatrix(viewYear, viewMonth);
    } catch (error) {
      console.error('Error generating calendar matrix:', error);
      // Fallback to empty calendar
      return {
        weeks: [],
        firstDay: new Date(viewYear, viewMonth, 1),
        lastDay: new Date(viewYear, viewMonth + 1, 0),
        daysInMonth: getDaysInMonth(viewYear, viewMonth),
        allDaysIncluded: []
      };
    }
  }, [viewYear, viewMonth, timezone, timezoneLoading]);

  // Load bookmarked transactions and debt due dates
  const refreshCalendarData = async () => {
    try {
      setCalendarDataLoading(true);
      
      // Use timezone-aware functions when timezone is available
      if (timezone && !timezoneLoading) {
        // Fetch bookmarked transactions, debt due dates, and note reminders in parallel with timezone
        const [bookmarkedTransactions, debtsWithDueDates, notesWithReminders] = await Promise.all([
          getBookmarkedTransactionsForCalendarInTimezone(timezone),
          getActiveDebtsWithDueDatesInTimezone(timezone),
          getNotesWithRemindersForCalendarInTimezone(timezone)
        ]);
        
        setBookmarkedEvents(bookmarkedTransactions);
        setDebtEvents(debtsWithDueDates);
        setNoteEvents(notesWithReminders);
      } else {
        // Fallback to timezone-unaware functions
        const [bookmarkedTransactions, debtsWithDueDates, notesWithReminders] = await Promise.all([
          getBookmarkedTransactionsForCalendar(),
          getActiveDebtsWithDueDates(),
          getNotesWithRemindersForCalendar()
        ]);
        
        setBookmarkedEvents(bookmarkedTransactions);
        setDebtEvents(debtsWithDueDates);
        setNoteEvents(notesWithReminders);
      }
    } catch (error) {
      console.error("Error loading calendar data:", error);
      setBookmarkedEvents([]);
      setDebtEvents([]);
      setNoteEvents([]);
    } finally {
      setCalendarDataLoading(false);
      setIsInitialized(true);
    }
  };

  // Load calendar data when timezone is ready or when timezone changes
  useEffect(() => {
    if (!timezoneLoading) {
      refreshCalendarData();
    }
  }, [timezone, timezoneLoading]);

  // Navigation function for events
  const handleEventClick = (event: CalendarEvent, eventDate: Date) => {
    if (event.type === "DEBT_DUE") {
      // Navigate to debts page
      router.push("/debts");
    } else if (event.type === "NOTE_REMINDER") {
      // Navigate to notes page
      router.push("/notes");
    } else if (event.type === "EXPENSE" || event.type === "INCOME") {
      // Calculate d-1, d, d+1 date range
      const eventDateCopy = new Date(eventDate);
      const startDate = new Date(eventDateCopy);
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date(eventDateCopy);
      endDate.setDate(endDate.getDate() + 1);

      // Format dates as YYYY-MM-DD for URL parameters using timezone-aware functions
      let startDateStr, endDateStr;
      if (timezone && !timezoneLoading) {
        const { startKey, endKey } = getDateRangeInTimezone(startDate, endDate, timezone);
        startDateStr = startKey;
        endDateStr = endKey;
      } else {
        startDateStr = formatLocalDateKey(startDate);
        endDateStr = formatLocalDateKey(endDate);
      }

      // Navigate to respective page with date filtering
      const page = event.type === "EXPENSE" ? "/expenses" : "/incomes";
      router.push(`${page}?startDate=${startDateStr}&endDate=${endDateStr}`);
    }
  };

  // Convert bookmarked events and debt events to calendar events and group by date
  const eventsByDay = useMemo(() => {
    // Don't process events while timezone is loading
    if (timezoneLoading) {
      return new Map<string, CalendarEvent[]>();
    }

    const map = new Map<string, CalendarEvent[]>();
    
    // Helper function to convert human-readable date back to calendar key
    const getDateKeyFromHumanDate = (humanDate: string): string => {
      // Parse common human-readable formats like "January 15, 2024"
      const parsedDate = new Date(humanDate);
      if (!isNaN(parsedDate.getTime())) {
        // Use timezone-aware formatting when timezone is available
        if (timezone && !timezoneLoading) {
          return formatDateKeyInTimezone(parsedDate, timezone);
        }
        return formatLocalDateKey(parsedDate);
      }
      return humanDate; // Fallback if parsing fails
    };
    
    // Add bookmarked transactions
    bookmarkedEvents.forEach((event) => {
      const calendarEvent: CalendarEvent = {
        id: event.id,
        date: event.date,
        title: event.title,
        type: event.type,
        amount: event.amount,
        category: event.category
      };
      
      const dateKey = getDateKeyFromHumanDate(event.date);
      const arr = map.get(dateKey) ?? [];
      arr.push(calendarEvent);
      map.set(dateKey, arr);
    });
    
    // Add debt due dates
    debtEvents.forEach((event) => {
      const calendarEvent: CalendarEvent = {
        id: event.id,
        date: event.date,
        title: event.title,
        type: event.type,
        amount: event.amount,
        borrowerName: event.borrowerName,
        status: event.status,
        isOverdue: event.isOverdue
      };
      
      const dateKey = getDateKeyFromHumanDate(event.date);
      const arr = map.get(dateKey) ?? [];
      arr.push(calendarEvent);
      map.set(dateKey, arr);
    });
    
    // Add note reminders
    noteEvents.forEach((event) => {
      const calendarEvent: CalendarEvent = {
        id: event.id,
        date: event.date,
        title: event.title,
        type: event.type,
        content: event.content,
        tags: event.tags,
        noteId: event.noteId
      };
      
      const dateKey = getDateKeyFromHumanDate(event.date);
      const arr = map.get(dateKey) ?? [];
      arr.push(calendarEvent);
      map.set(dateKey, arr);
    });
    
    return map;
  }, [bookmarkedEvents, debtEvents, noteEvents, timezone, timezoneLoading]);

  function prevMonth() {
    const { year, monthIndex } = getPreviousMonth(viewYear, viewMonth);
    setViewYear(year);
    setViewMonth(monthIndex);
    // Adjust selected day if it doesn't exist in the new month
    const maxDayInNewMonth = getDaysInMonth(year, monthIndex);
    setSelectedDay(prev => Math.min(prev, maxDayInNewMonth));
    // Refresh calendar data for the new month (only if already initialized)
    if (isInitialized) {
      refreshCalendarData();
    }
  }

  function nextMonth() {
    const { year, monthIndex } = getNextMonth(viewYear, viewMonth);
    setViewYear(year);
    setViewMonth(monthIndex);
    // Adjust selected day if it doesn't exist in the new month
    const maxDayInNewMonth = getDaysInMonth(year, monthIndex);
    setSelectedDay(prev => Math.min(prev, maxDayInNewMonth));
    // Refresh calendar data for the new month (only if already initialized)
    if (isInitialized) {
      refreshCalendarData();
    }
  }

  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  const monthNames = useMemo(() =>
    Array.from({ length: 12 }).map((_, i) => new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2000, i, 1))),
  []);
  const baseYear = now.getFullYear();
  const yearOptions = useMemo(() => Array.from({ length: 11 }).map((_, i) => baseYear - 5 + i), [baseYear]);
  const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth);
  
  // Use timezone-aware today calculation when timezone is available
  const today = useMemo(() => {
    // Don't calculate today while timezone is loading
    if (timezoneLoading) {
      return new Date(); // Temporary date, won't be used for rendering
    }

    if (timezone && !timezoneLoading) {
      const todayInfo = getTodayInTimezone(timezone);
      // Create a date object representing today in the selected timezone
      return new Date(todayInfo.year, todayInfo.month, todayInfo.day);
    }
    return getTodayAtMidnight();
  }, [timezone, timezoneLoading]);

  if (loading) {
    let loadingMessage = "Loading calendar...";
    if (timezoneLoading) {
      loadingMessage = isInitialized ? "Updating timezone..." : "Loading timezone settings...";
    } else if (calendarDataLoading) {
      loadingMessage = isInitialized ? "Refreshing calendar..." : "Loading calendar events...";
    } else if (!isInitialized) {
      loadingMessage = "Initializing calendar...";
    }

    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner}></div>
        <p className={loadingText}>{loadingMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-12rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prevMonth} className="px-3 py-0.5 rounded-md border bg-white hover:bg-gray-50">Prev</button>
          <button onClick={() => { 
            setViewYear(now.getFullYear()); 
            setViewMonth(now.getMonth()); 
            setSelectedDay(now.getDate()); 
            if (isInitialized) {
              refreshCalendarData();
            }
          }} className="px-3 py-0.5 rounded-md border bg-white hover:bg-gray-50">Today</button>
          <button onClick={nextMonth} className="px-3 py-0.5 rounded-md border bg-white hover:bg-gray-50">Next</button>
        </div>
                  <div className="text-center">
            <h1 className="text-xl font-semibold">{monthFormatter.format(new Date(viewYear, viewMonth, 1))}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {bookmarkedEvents.length === 0 && debtEvents.length === 0
                ? "No events to display"
                : `${bookmarkedEvents.length} bookmarked transaction${bookmarkedEvents.length !== 1 ? 's' : ''}, ${debtEvents.length} debt due date${debtEvents.length !== 1 ? 's' : ''}`
              }
            </p>
            {timezone && !timezoneLoading && (
              <p className="text-xs text-blue-600 mt-1">
                Today in {timezone}: {today.getFullYear()}-{(today.getMonth() + 1).toString().padStart(2, '0')}-{today.getDate().toString().padStart(2, '0')}
              </p>
            )}
          </div>
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {/* Timezone selector */}
          <TimezoneSelector compact={true} showAutoDetect={false} className="min-w-[140px]" />
          
          {/* Year / Month / Day selectors */}
          <select
            aria-label="Select year"
            value={viewYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              setViewYear(y);
              setSelectedDay((d) => Math.min(d, getDaysInMonth(y, viewMonth)));
            }}
            className="px-2 py-1 border rounded-md bg-white text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            aria-label="Select month"
            value={viewMonth}
            onChange={(e) => {
              const m = Number(e.target.value);
              setViewMonth(m);
              setSelectedDay((d) => Math.min(d, getDaysInMonth(viewYear, m)));
            }}
            className="px-2 py-1 border rounded-md bg-white text-sm"
          >
            {monthNames.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>

          <select
            aria-label="Select day"
            value={Math.min(selectedDay, daysInCurrentMonth)}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="px-2 py-1 border rounded-md bg-white text-sm"
          >
            {Array.from({ length: daysInCurrentMonth }).map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm w-full flex-1 flex flex-col">
        {bookmarkedEvents.length === 0 && debtEvents.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Calendar Events</h3>
              <p className="text-gray-500 max-w-sm">
                Bookmark important transactions and create debts with due dates to see them displayed here on the calendar.
              </p>
            </div>
          </div>
        )}
        {(bookmarkedEvents.length > 0 || debtEvents.length > 0) && (
          <>
        
        <div className="grid grid-cols-7 text-xs font-medium text-slate-500 border-b w-full">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(2025, 7, 3 + i); // arbitrary week to generate names
            return (
              <div key={i} className="px-3 py-2 text-center">{weekdayFormatter.format(date)}</div>
            );
          })}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 w-full flex-1 auto-rows-fr h-full">
          {monthData.weeks.flat().map((day: Date, idx: number) => {
            const isCurrentMonth = day.getMonth() === viewMonth;
            
            // Simplified today comparison - compare year, month, day directly
            const isToday = day.getFullYear() === today.getFullYear() &&
                           day.getMonth() === today.getMonth() &&
                           day.getDate() === today.getDate();
            
            // Use timezone-aware date key for event lookup
            const dateKey = timezone && !timezoneLoading
              ? formatDateKeyInTimezone(day, timezone)
              : formatLocalDateKey(day);
            const events = eventsByDay.get(dateKey) ?? [];
            return (
              <div
                key={idx}
                className={`h-full p-2 flex flex-col bg-white ${
                  isToday ? "ring-2 ring-blue-500" : ""
                } ${
                  !isCurrentMonth ? "text-gray-400 bg-gray-50" : ""
                }`}
              >
                <div className="text-xs font-medium mb-1">{day.getDate()}</div>
                <div className="flex flex-col gap-1">
                  {events.map((ev) => {
                    // Handle different event types
                    let bgColor, textColor, borderColor;
                    
                    if (ev.type === "INCOME") {
                      bgColor = "bg-green-50";
                      textColor = "text-green-700";
                      borderColor = "border-green-200";
                    } else if (ev.type === "EXPENSE") {
                      bgColor = "bg-red-50";
                      textColor = "text-red-700";
                      borderColor = "border-red-200";
                    } else if (ev.type === "DEBT_DUE") {
                      // Special styling for debt due dates
                      if (ev.isOverdue) {
                        bgColor = "bg-red-100";
                        textColor = "text-red-800";
                        borderColor = "border-red-400";
                      } else {
                        bgColor = "bg-orange-50";
                        textColor = "text-orange-700";
                        borderColor = "border-orange-200";
                      }
                    } else if (ev.type === "NOTE_REMINDER") {
                      // Special styling for note reminders
                      bgColor = "bg-purple-50";
                      textColor = "text-purple-700";
                      borderColor = "border-purple-200";
                    } else {
                      // Default styling
                      bgColor = "bg-blue-50";
                      textColor = "text-blue-700";
                      borderColor = "border-blue-200";
                    }
                    
                    const tooltip = ev.type === "DEBT_DUE" 
                      ? `${ev.borrowerName} - ${ev.amount ? formatCurrency(ev.amount, userCurrency) : ''} (${ev.status}${ev.isOverdue ? ' - OVERDUE' : ''})`
                      : `${ev.category || 'Event'} - ${ev.amount ? formatCurrency(ev.amount, userCurrency) : ''}`;
                    
                    return (
                      <div 
                        key={ev.id} 
                        className={`text-xs rounded px-2 py-1 border ${bgColor} ${textColor} ${borderColor} relative cursor-pointer hover:opacity-80 transition-opacity group`}
                        title={tooltip}
                        onClick={() => handleEventClick(ev, day)}
                      >
                        <div className="truncate font-medium">
                          <span className="truncate">{ev.title}</span>
                        </div>
                        {ev.amount && (
                          <div className="truncate text-xs opacity-75">
                            {formatCurrency(ev.amount, userCurrency)}
                          </div>
                        )}

                        {ev.type === "DEBT_DUE" && ev.isOverdue && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
          </>
        )}
      </div>
    </div>
  );
}


