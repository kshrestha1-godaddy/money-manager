"use client";

import { ChevronRight } from "lucide-react";
import type { LifeEventCategory } from "@prisma/client";
import type { LifeEventItem } from "../../../types/life-event";
import {
  formatLifeEventDate,
  groupEventsByYearAndMonth,
  LIFE_EVENT_CATEGORY_LABELS,
} from "../../life-events/life-event-helpers";

const categoryBadgeClass: Record<LifeEventCategory, string> = {
  EDUCATION: "bg-indigo-100 text-indigo-800",
  COLLEGE: "bg-violet-100 text-violet-800",
  UNIVERSITY: "bg-purple-100 text-purple-800",
  SCHOOL: "bg-fuchsia-100 text-fuchsia-800",
  CAREER: "bg-sky-100 text-sky-800",
  TRAVEL: "bg-teal-100 text-teal-800",
  PERSONAL: "bg-rose-100 text-rose-800",
  LEGAL: "bg-orange-100 text-orange-800",
  DOCUMENTS: "bg-slate-200 text-slate-800",
  MARRIAGE: "bg-pink-100 text-pink-800",
  OTHER: "bg-slate-100 text-slate-700",
};

export interface MobileLifeEventsTimelineProps {
  events: LifeEventItem[];
  onEventClick: (item: LifeEventItem) => void;
}

export function MobileLifeEventsTimeline({ events, onEventClick }: MobileLifeEventsTimelineProps) {
  const grouped = groupEventsByYearAndMonth(events);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {grouped.map(({ year, months }) => {
        const yearCount = months.reduce((acc, m) => acc + m.events.length, 0);
        return (
          <details
            key={year}
            className="group rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <summary className="cursor-pointer list-none px-3 py-2.5 font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-90"
                  aria-hidden
                />
                {year}
                <span className="text-sm font-normal text-gray-500">({yearCount} events)</span>
              </span>
            </summary>
            <div className="border-t border-gray-100 px-2 pb-2 pt-1">
              {months.map(({ monthLabel, monthIndex, events: monthEvents }) => (
                <details
                  key={`${year}-${monthIndex}`}
                  className="group/month mt-2 rounded-md border border-gray-100 bg-gray-50/80"
                >
                  <summary className="cursor-pointer px-2.5 py-2 text-sm font-medium text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      <ChevronRight
                        className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 group-open/month:rotate-90"
                        aria-hidden
                      />
                      {monthLabel}
                      <span className="font-normal text-gray-500">({monthEvents.length})</span>
                    </span>
                  </summary>
                  <ul className="space-y-2.5 border-t border-gray-100/80 p-2.5 pt-3">
                    {monthEvents.map((item) => (
                      <li
                        key={`${item.id}-${year}-${monthIndex}`}
                        className="relative rounded-lg border border-gray-200 bg-white p-3 pl-5 shadow-sm before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:rounded-full before:bg-brand-200 before:content-['']"
                      >
                        <button
                          type="button"
                          onClick={() => onEventClick(item)}
                          className="w-full text-left active:bg-gray-50/90"
                        >
                          <div className="flex gap-2.5">
                            <div className="flex w-[4.75rem] shrink-0 flex-col items-center justify-center rounded-md border border-gray-200 bg-gray-50/90 px-1 py-2 text-center">
                              {item.eventEndDate ? (
                                <div className="space-y-0.5 text-[10px] leading-tight text-gray-600">
                                  <p>
                                    <span className="font-medium text-gray-500">Start</span>
                                    <br />
                                    <span className="font-semibold text-slate-900">
                                      {formatLifeEventDate(item.eventDate)}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="font-medium text-gray-500">End</span>
                                    <br />
                                    <span className="font-semibold text-slate-900">
                                      {formatLifeEventDate(item.eventEndDate)}
                                    </span>
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[11px] font-semibold leading-snug text-slate-900">
                                  {formatLifeEventDate(item.eventDate)}
                                </p>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-semibold leading-snug text-slate-900">{item.title}</h3>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryBadgeClass[item.category]}`}
                                >
                                  {LIFE_EVENT_CATEGORY_LABELS[item.category]}
                                </span>
                                {item.location ? (
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                                    {item.location}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}
