"use client";

import React, { useMemo, useState, useEffect } from "react";
import { 
  formatLocalDateKey, 
  generateCalendarMatrix, 
  isSameDay, 
  getTodayAtMidnight,
  getPreviousMonth,
  getNextMonth,
  getDaysInMonth
} from "../../utils/calendarDateUtils";
import { getBookmarkedTransactionsForCalendar } from "./actions/calendar-bookmarks";
import { getActiveDebtsWithDueDates } from "./actions/calendar-debts";
import { CalendarBookmarkEvent, CalendarDebtEvent } from "../../types/transaction-bookmarks";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD in local timezone
  title: string;
  type?: "INCOME" | "EXPENSE" | "DEBT_DUE";
  amount?: number;
  category?: string;
  borrowerName?: string;
  status?: string;
  isOverdue?: boolean;
}

export default function CalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [bookmarkedEvents, setBookmarkedEvents] = useState<CalendarBookmarkEvent[]>([]);
  const [debtEvents, setDebtEvents] = useState<CalendarDebtEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { currency: userCurrency } = useCurrency();

  const monthData = useMemo(() => {
    try {
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
  }, [viewYear, viewMonth]);

  // Load bookmarked transactions and debt due dates
  const refreshCalendarData = async () => {
    try {
      setLoading(true);
      
      // Fetch both bookmarked transactions and debt due dates in parallel
      const [bookmarkedTransactions, debtsWithDueDates] = await Promise.all([
        getBookmarkedTransactionsForCalendar(),
        getActiveDebtsWithDueDates()
      ]);
      
      setBookmarkedEvents(bookmarkedTransactions);
      setDebtEvents(debtsWithDueDates);
    } catch (error) {
      console.error("Error loading calendar data:", error);
      setBookmarkedEvents([]);
      setDebtEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCalendarData();
  }, []);

  // Convert bookmarked events and debt events to calendar events and group by date
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    
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
      
      const arr = map.get(event.date) ?? [];
      arr.push(calendarEvent);
      map.set(event.date, arr);
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
      
      const arr = map.get(event.date) ?? [];
      arr.push(calendarEvent);
      map.set(event.date, arr);
    });
    
    return map;
  }, [bookmarkedEvents, debtEvents]);

  function prevMonth() {
    const { year, monthIndex } = getPreviousMonth(viewYear, viewMonth);
    setViewYear(year);
    setViewMonth(monthIndex);
    // Adjust selected day if it doesn't exist in the new month
    const maxDayInNewMonth = getDaysInMonth(year, monthIndex);
    setSelectedDay(prev => Math.min(prev, maxDayInNewMonth));
    // Refresh calendar data for the new month
    refreshCalendarData();
  }

  function nextMonth() {
    const { year, monthIndex } = getNextMonth(viewYear, viewMonth);
    setViewYear(year);
    setViewMonth(monthIndex);
    // Adjust selected day if it doesn't exist in the new month
    const maxDayInNewMonth = getDaysInMonth(year, monthIndex);
    setSelectedDay(prev => Math.min(prev, maxDayInNewMonth));
    // Refresh calendar data for the new month
    refreshCalendarData();
  }

  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  const monthNames = useMemo(() =>
    Array.from({ length: 12 }).map((_, i) => new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2000, i, 1))),
  []);
  const baseYear = now.getFullYear();
  const yearOptions = useMemo(() => Array.from({ length: 11 }).map((_, i) => baseYear - 5 + i), [baseYear]);
  const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth);
  const today = getTodayAtMidnight();

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-12rem)] flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Calendar</h1>
        </div>
        <div className="bg-white rounded-lg border shadow-sm w-full flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-4">📅</div>
            <p className="text-gray-500">Loading bookmarked transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-12rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prevMonth} className="px-3 py-0.5 rounded-md border bg-white hover:bg-gray-50">Prev</button>
          <button onClick={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); setSelectedDay(now.getDate()); refreshCalendarData(); }} className="px-3 py-0.5 rounded-md border bg-white hover:bg-gray-50">Today</button>
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
          </div>
        <div className="flex items-center gap-2 justify-end">
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
            const isToday = isSameDay(day, today);
            const events = eventsByDay.get(formatLocalDateKey(day)) ?? [];
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
                    let bgColor, textColor, borderColor, displayIcon;
                    
                    if (ev.type === "INCOME") {
                      bgColor = "bg-green-50";
                      textColor = "text-green-700";
                      borderColor = "border-green-200";
                      displayIcon = "💰";
                    } else if (ev.type === "EXPENSE") {
                      bgColor = "bg-red-50";
                      textColor = "text-red-700";
                      borderColor = "border-red-200";
                      displayIcon = "💸";
                    } else if (ev.type === "DEBT_DUE") {
                      // Special styling for debt due dates
                      if (ev.isOverdue) {
                        bgColor = "bg-red-100";
                        textColor = "text-red-800";
                        borderColor = "border-red-400";
                        displayIcon = "🚨";
                      } else {
                        bgColor = "bg-orange-50";
                        textColor = "text-orange-700";
                        borderColor = "border-orange-200";
                        displayIcon = "⏰";
                      }
                    } else {
                      // Default styling
                      bgColor = "bg-blue-50";
                      textColor = "text-blue-700";
                      borderColor = "border-blue-200";
                      displayIcon = "📅";
                    }
                    
                    const tooltip = ev.type === "DEBT_DUE" 
                      ? `${ev.borrowerName} - ${ev.amount ? formatCurrency(ev.amount, userCurrency) : ''} (${ev.status}${ev.isOverdue ? ' - OVERDUE' : ''})`
                      : `${ev.category || 'Event'} - ${ev.amount ? formatCurrency(ev.amount, userCurrency) : ''}`;
                    
                    return (
                      <div 
                        key={ev.id} 
                        className={`text-xs rounded px-2 py-1 border ${bgColor} ${textColor} ${borderColor} relative`}
                        title={tooltip}
                      >
                        <div className="truncate font-medium flex items-center gap-1">
                          <span className="text-xs opacity-75">{displayIcon}</span>
                          <span className="flex-1 truncate">{ev.title}</span>
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


