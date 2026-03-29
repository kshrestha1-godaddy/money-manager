"use client";

import { useEffect } from "react";
import type { LifeEventCategory } from "@prisma/client";
import type { LifeEventItem } from "../../../types/life-event";
import {
  formatLifeEventDateDisplay,
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

export interface MobileLifeEventDetailSheetProps {
  event: LifeEventItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileLifeEventDetailSheet({ event, isOpen, onClose }: MobileLifeEventDetailSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !event) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-life-event-title"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 pr-2">
          <h1 id="mobile-life-event-title" className="text-base font-semibold leading-tight text-gray-900">
            {event.title}
          </h1>
          <p className="truncate text-xs text-gray-500">{formatLifeEventDateDisplay(event)}</p>
        </div>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryBadgeClass[event.category]}`}
          >
            {LIFE_EVENT_CATEGORY_LABELS[event.category]}
          </span>
          {event.location ? (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              {event.location}
            </span>
          ) : null}
        </div>

        {event.description ? (
          <section className="mt-6">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Description</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{event.description}</p>
          </section>
        ) : null}

        {event.tags.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {event.tags.map((t) => (
                <span key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {t}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {event.externalLink ? (
          <section className="mt-6">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Link</h2>
            <a
              href={event.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              {event.externalLink}
            </a>
          </section>
        ) : null}
      </div>
    </div>
  );
}
