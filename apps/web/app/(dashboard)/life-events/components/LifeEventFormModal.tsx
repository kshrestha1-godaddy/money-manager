"use client";

import { useEffect, useState } from "react";
import type { LifeEventCategory } from "@prisma/client";
import type { LifeEventItem } from "../../../types/life-event";
import {
  dateInputFromEventDate,
  LIFE_EVENT_CATEGORY_LABELS,
  LIFE_EVENT_CATEGORY_ORDER,
} from "../life-event-helpers";

interface LifeEventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: LifeEventItem | null;
  onSubmit: (payload: {
    title: string;
    eventDate: string;
    eventEndDate: string;
    description: string;
    location: string;
    category: LifeEventCategory;
    tags: string;
    externalLink: string;
  }) => Promise<void>;
}

const emptyForm = () => ({
  title: "",
  eventDate: "",
  eventEndDate: "",
  description: "",
  location: "",
  category: "OTHER" as LifeEventCategory,
  tags: "",
  externalLink: "",
});

export function LifeEventFormModal({ isOpen, onClose, editing, onSubmit }: LifeEventFormModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editing) {
      setForm({
        title: editing.title,
        eventDate: dateInputFromEventDate(editing.eventDate),
        eventEndDate: editing.eventEndDate ? dateInputFromEventDate(editing.eventEndDate) : "",
        description: editing.description ?? "",
        location: editing.location ?? "",
        category: editing.category,
        tags: editing.tags.join(", "),
        externalLink: editing.externalLink ?? "",
      });
    } else {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      setForm({ ...emptyForm(), eventDate: `${y}-${m}-${d}`, eventEndDate: "" });
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {editing ? "Edit life event" : "Add life event"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500"
              placeholder="e.g. Started at IITH"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start date</label>
              <input
                required
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End date (optional)</label>
              <input
                type="date"
                value={form.eventEndDate}
                min={form.eventDate || undefined}
                onChange={(e) => setForm((f) => ({ ...f, eventEndDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500"
              />
              <p className="mt-1 text-xs text-gray-500">Leave empty for a single day. Set both for a range (e.g. college years).</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as LifeEventCategory }))
              }
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500"
            >
              {LIFE_EVENT_CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {LIFE_EVENT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500"
              placeholder="City, venue, or address"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description / notes</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500"
              placeholder="Extra context, secondary details…"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tags</label>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500"
              placeholder="Comma-separated: scholarship, KTM, …"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">External link</label>
            <input
              value={form.externalLink}
              onChange={(e) => setForm((f) => ({ ...f, externalLink: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500"
              placeholder="https://…"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {submitting ? "Saving…" : editing ? "Save changes" : "Add event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
