"use client";

import React, { useMemo, useState } from "react";

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthMatrix(year: number, monthIndex: number) {
  // monthIndex: 0-11
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7)); // Monday-first grid
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (7 - ((lastDay.getDay() + 6) % 7) - 1));

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return { weeks, firstDay, lastDay };
}

export default function CalendarPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  const monthData = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

  // Placeholder demo events; later wire to debts/tasks/events
  const demoEvents: CalendarEvent[] = [
    { id: "1", date: formatDateKey(new Date(viewYear, viewMonth, 5)), title: "Incoming SMS taken one month" },
    { id: "2", date: formatDateKey(new Date(viewYear, viewMonth, 28)), title: "Bike Scooter Servicing every 3 months" },
  ];
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    demoEvents.forEach((e) => {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    });
    return map;
  }, [demoEvents]);

  function prevMonth() {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function nextMonth() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
  const monthNames = useMemo(() =>
    Array.from({ length: 12 }).map((_, i) => new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2000, i, 1))),
  []);
  const baseYear = now.getFullYear();
  const yearOptions = useMemo(() => Array.from({ length: 11 }).map((_, i) => baseYear - 5 + i), [baseYear]);
  const lastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const daysInCurrentMonth = lastDayOfMonth(viewYear, viewMonth);

  return (
    <div className="w-full min-h-[calc(100vh-12rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prevMonth} className="px-3 py-0.5 rounded-md border bg-white hover:bg-gray-50">Prev</button>
          <button onClick={() => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); setSelectedDay(now.getDate()); }} className="px-3 py-0.5 rounded-md border bg-white hover:bg-gray-50">Today</button>
          <button onClick={nextMonth} className="px-3 py-0.5 rounded-md border bg-white hover:bg-gray-50">Next</button>
        </div>
        <h1 className="text-xl font-semibold">{monthFormatter.format(new Date(viewYear, viewMonth, 1))}</h1>
        <div className="flex items-center gap-2 justify-end">
          {/* Year / Month / Day selectors */}
          <select
            aria-label="Select year"
            value={viewYear}
            onChange={(e) => {
              const y = Number(e.target.value);
              setViewYear(y);
              setSelectedDay((d) => Math.min(d, lastDayOfMonth(y, viewMonth)));
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
              setSelectedDay((d) => Math.min(d, lastDayOfMonth(viewYear, m)));
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
        <div className="grid grid-cols-7 text-xs font-medium text-slate-500 border-b w-full">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(2025, 7, 3 + i); // arbitrary week to generate names
            return (
              <div key={i} className="px-3 py-2 text-center">{weekdayFormatter.format(date)}</div>
            );
          })}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 w-full flex-1 auto-rows-fr h-full">
          {monthData.weeks.flat().map((day, idx) => {
            const isCurrentMonth = day.getMonth() === viewMonth;
            const isToday = formatDateKey(day) === formatDateKey(now);
            const events = eventsByDay.get(formatDateKey(day)) ?? [];
            return (
              <div
                key={idx}
                    className={`h-full p-2 flex flex-col bg-white ${isToday ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="text-xs font-medium mb-1">{day.getDate()}</div>
                <div className="flex flex-col gap-1">
                  {events.map((ev) => (
                    <div key={ev.id} className="truncate text-xs rounded px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200">
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


