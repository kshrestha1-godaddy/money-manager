"use client";

import type { LifeEventCategory } from "@prisma/client";
import type { LifeEventItem } from "../../../types/life-event";
import {
  formatLifeEventDateDisplay,
  LIFE_EVENT_CATEGORY_LABELS,
} from "../life-event-helpers";
import { BUTTON_COLORS } from "../../../config/colorConfig";

interface LifeEventDetailModalProps {
  event: LifeEventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

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

const secondaryOutlineButton = BUTTON_COLORS.secondaryBlue;

export function LifeEventDetailModal({ event, isOpen, onClose, onEdit }: LifeEventDetailModalProps) {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">{event.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{formatLifeEventDateDisplay(event)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
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
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Description</h3>
              <p className="whitespace-pre-wrap text-gray-800">{event.description}</p>
            </div>
          ) : null}

          {event.tags.length > 0 ? (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {event.tags.map((t) => (
                  <span key={t} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {event.externalLink ? (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Link</h3>
              <a
                href={event.externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-medium text-brand-600 hover:text-brand-700 hover:underline"
              >
                {event.externalLink}
              </a>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className={`${secondaryOutlineButton} px-4 py-2.5 text-sm font-medium`}
            >
              Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
