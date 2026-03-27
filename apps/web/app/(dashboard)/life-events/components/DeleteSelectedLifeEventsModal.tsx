"use client";

import { useEffect, useState } from "react";
import { BUTTON_COLORS } from "../../../config/colorConfig";

interface DeleteSelectedLifeEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onConfirm: (screenLockPassword: string) => Promise<void>;
}

const secondaryOutline = BUTTON_COLORS.secondaryBlue;
const danger = BUTTON_COLORS.danger;

export function DeleteSelectedLifeEventsModal({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
}: DeleteSelectedLifeEventsModalProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPassword("");
    setError(null);
    setSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-selected-life-events-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-selected-life-events-title" className="text-lg font-semibold text-gray-900">
          Delete selected life events?
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          This will permanently remove {selectedCount} selected life event{selectedCount === 1 ? "" : "s"}. This
          cannot be undone.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <div>
            <label htmlFor="delete-selected-screen-lock" className="mb-1 block text-sm font-medium text-gray-700">
              Screen lock password
            </label>
            <input
              id="delete-selected-screen-lock"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-brand-500"
              placeholder="Password"
              disabled={submitting}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`${secondaryOutline} px-4 py-2.5 text-sm font-medium disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !password.trim()}
              className={`${danger} px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {submitting ? "Deleting…" : "Delete selected"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
