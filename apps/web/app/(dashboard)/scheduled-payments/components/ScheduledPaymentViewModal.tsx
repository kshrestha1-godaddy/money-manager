"use client";

import { useEffect, useState } from "react";
import { postponeScheduledPayment } from "../actions/scheduled-payments";
import type { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { BUTTON_COLORS } from "../../../config/colorConfig";
import {
  accountDisplay,
  formatScheduledPaymentWhenDate,
  postponeFromOriginalScheduledDate,
  recurringDisplay,
  scheduledPaymentStatusLabel,
  toDatetimeLocalValue,
} from "../scheduled-payment-helpers";

interface ScheduledPaymentViewModalProps {
  item: ScheduledPaymentItem | null;
  isOpen: boolean;
  onClose: () => void;
  displayCurrency: string;
  userTimezone: string;
  onPostponeSuccess: () => void | Promise<void>;
  onEdit?: () => void;
}

const secondaryOutlineButton = BUTTON_COLORS.secondaryBlue;

export function ScheduledPaymentViewModal({
  item,
  isOpen,
  onClose,
  displayCurrency,
  userTimezone,
  onPostponeSuccess,
  onEdit,
}: ScheduledPaymentViewModalProps) {
  const [acting, setActing] = useState(false);
  const [customPostpone, setCustomPostpone] = useState("");

  useEffect(() => {
    if (!item) {
      setCustomPostpone("");
      return;
    }
    const scheduledAtDate = new Date(item.scheduledAt);
    setCustomPostpone(
      toDatetimeLocalValue(postponeFromOriginalScheduledDate(scheduledAtDate, 1))
    );
  }, [item?.id]);

  if (!isOpen || !item) return null;

  const now = new Date();
  const status = scheduledPaymentStatusLabel(item, now);
  const canPostpone = item.resolution === null;
  const displayAmount = convertForDisplaySync(
    item.amount,
    item.currency,
    displayCurrency
  );
  const scheduledAtDate = new Date(item.scheduledAt);
  const minDatetimeLocal = toDatetimeLocalValue(new Date(Date.now() + 60_000));

  async function handlePostpone(when: Date) {
    setActing(true);
    try {
      await postponeScheduledPayment(item.id, when);
      await onPostponeSuccess();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not postpone");
    } finally {
      setActing(false);
    }
  }

  function handleCustomPostpone() {
    if (!customPostpone.trim()) return;
    const parsed = new Date(customPostpone);
    if (Number.isNaN(parsed.getTime())) {
      alert("Invalid date and time");
      return;
    }
    void handlePostpone(parsed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheduled-payment-view-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="scheduled-payment-view-title"
              className="text-xl font-semibold text-gray-900"
            >
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {formatScheduledPaymentWhenDate(item.scheduledAt, userTimezone)}
            </p>
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
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                status === "Accepted"
                  ? "bg-green-100 text-green-800"
                  : status === "Rejected"
                    ? "bg-red-100 text-red-800"
                    : status === "Awaiting confirmation"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-800"
              }`}
            >
              {status}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
              {recurringDisplay(item)}
            </span>
          </div>

          <div className="rounded-lg bg-gray-50 p-4 space-y-2">
            <p>
              <span className="text-gray-500">Amount</span>
              <span className="ml-2 font-semibold tabular-nums text-gray-900">
                {formatCurrency(displayAmount, displayCurrency)}
              </span>
              {item.currency !== displayCurrency ? (
                <span className="ml-2 text-xs text-gray-500">
                  ({formatCurrency(item.amount, item.currency)})
                </span>
              ) : null}
            </p>
            <p>
              <span className="text-gray-500">Category</span>
              <span className="ml-2 font-medium text-gray-900">{item.category.name}</span>
            </p>
            <p>
              <span className="text-gray-500">Account</span>
              <span className="ml-2 text-gray-900">{accountDisplay(item)}</span>
            </p>
          </div>

          {item.description?.trim() ? (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-gray-800">{item.description}</p>
            </div>
          ) : null}

          {item.notes?.trim() ? (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Notes
              </h3>
              <p className="whitespace-pre-wrap text-gray-800">{item.notes}</p>
            </div>
          ) : null}

          {item.tags && item.tags.length > 0 ? (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {canPostpone ? (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
            <p className="mb-2 text-xs font-semibold text-gray-900">Postpone payment</p>
            <p className="mb-3 text-xs text-gray-600">
              Move the scheduled time forward. The new time must be in the future.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  void handlePostpone(postponeFromOriginalScheduledDate(scheduledAtDate, 1))
                }
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
              >
                +1 day
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  void handlePostpone(postponeFromOriginalScheduledDate(scheduledAtDate, 3))
                }
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
              >
                +3 days
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  void handlePostpone(postponeFromOriginalScheduledDate(scheduledAtDate, 7))
                }
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
              >
                +1 week
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:items-center">
              <input
                type="datetime-local"
                value={customPostpone}
                min={minDatetimeLocal}
                onChange={(e) => setCustomPostpone(e.target.value)}
                disabled={acting}
                aria-label="Pick date and time to postpone to"
                className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-50"
              />
              <button
                type="button"
                disabled={acting || !customPostpone.trim()}
                onClick={handleCustomPostpone}
                className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
              >
                Postpone
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-xs text-gray-500">
            Postpone is only available for payments that are not yet accepted or rejected.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          {onEdit && item.resolution === null ? (
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
