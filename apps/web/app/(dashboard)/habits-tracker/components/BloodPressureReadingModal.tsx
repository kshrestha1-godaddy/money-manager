"use client";

import { useEffect, useState } from "react";
import type { BloodPressureReadingDTO } from "../actions/blood-pressure";
import { datetimeLocalValue } from "../blood-pressure-helpers";

interface BloodPressureReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: BloodPressureReadingDTO | null;
  onSubmit: (payload: { measuredAt: string; systolic: number; diastolic: number; notes: string }) => Promise<void>;
}

export function BloodPressureReadingModal({
  isOpen,
  onClose,
  editing,
  onSubmit,
}: BloodPressureReadingModalProps) {
  const [measuredAt, setMeasuredAt] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editing) {
      setMeasuredAt(datetimeLocalValue(new Date(editing.measuredAt)));
      setSystolic(String(editing.systolic));
      setDiastolic(String(editing.diastolic));
      setNotes(editing.notes ?? "");
    } else {
      setMeasuredAt(datetimeLocalValue(new Date()));
      setSystolic("");
      setDiastolic("");
      setNotes("");
    }
  }, [isOpen, editing]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        measuredAt,
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        notes,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {editing ? "Edit BP reading" : "Log BP reading"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="bp-measured-at" className="block text-sm font-medium text-gray-700 mb-1">
              Date & time
            </label>
            <input
              id="bp-measured-at"
              type="datetime-local"
              required
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bp-systolic" className="block text-sm font-medium text-gray-700 mb-1">
                Systolic (mmHg)
              </label>
              <input
                id="bp-systolic"
                type="number"
                required
                min={30}
                max={300}
                step={1}
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="bp-diastolic" className="block text-sm font-medium text-gray-700 mb-1">
                Diastolic (mmHg)
              </label>
              <input
                id="bp-diastolic"
                type="number"
                required
                min={30}
                max={300}
                step={1}
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="bp-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="bp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "Saving…" : editing ? "Save" : "Add reading"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
