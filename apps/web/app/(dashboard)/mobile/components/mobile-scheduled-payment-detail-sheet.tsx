"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../../../utils/date";
import {
  accountDisplay,
  recurringDisplay,
} from "../../scheduled-payments/scheduled-payment-helpers";

export interface MobileScheduledPaymentDetailSheetProps {
  payment: ScheduledPaymentItem | null;
  isOpen: boolean;
  onClose: () => void;
  formatAmount: (item: ScheduledPaymentItem) => string;
  statusLabel: (item: ScheduledPaymentItem) => string;
}

export function MobileScheduledPaymentDetailSheet({
  payment,
  isOpen,
  onClose,
  formatAmount,
  statusLabel,
}: MobileScheduledPaymentDetailSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !payment) return null;

  const st = statusLabel(payment);
  const statusClass =
    st === "Accepted"
      ? "text-green-700"
      : st === "Rejected"
        ? "text-red-700"
        : st === "Upcoming"
          ? "text-blue-700"
          : "text-amber-700";

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-scheduled-payment-title"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-brand-600 min-h-[44px] hover:bg-brand-50"
        >
          Close
        </button>
        <h1
          id="mobile-scheduled-payment-title"
          className="min-w-0 flex-1 truncate text-center text-base font-semibold text-gray-900 pr-14"
        >
          Scheduled payment
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-red-800/80">Amount</p>
          <p className="text-2xl font-semibold tabular-nums text-red-700">{formatAmount(payment)}</p>
          <p className="text-xs text-red-800/70 mt-1">
            Original: {formatCurrency(payment.amount, payment.currency)}
          </p>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-gray-500">Title</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{payment.title}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Scheduled for</dt>
            <dd className="mt-0.5 text-gray-900">
              {formatDate(new Date(payment.scheduledAt))}{" "}
              <span className="text-gray-500">
                · {new Date(payment.scheduledAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Status</dt>
            <dd className={`mt-0.5 font-medium ${statusClass}`}>{st}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Category</dt>
            <dd className="mt-0.5 text-gray-900">{payment.category.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Account</dt>
            <dd className="mt-0.5 text-gray-900">{accountDisplay(payment)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Recurrence</dt>
            <dd className="mt-0.5 text-gray-900">{recurringDisplay(payment)}</dd>
          </div>
          {payment.description?.trim() ? (
            <div>
              <dt className="text-xs font-medium text-gray-500">Description</dt>
              <dd className="mt-0.5 text-gray-900 whitespace-pre-wrap">{payment.description}</dd>
            </div>
          ) : null}
          {payment.notes?.trim() ? (
            <div>
              <dt className="text-xs font-medium text-gray-500">Notes</dt>
              <dd className="mt-0.5 text-gray-900 whitespace-pre-wrap">{payment.notes}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-6 text-center text-sm text-gray-600">
          Accept, reject, or edit from the{" "}
          <Link href="/scheduled-payments" className="font-medium text-brand-600 underline">
            scheduled payments
          </Link>{" "}
          page.
        </p>
      </div>
    </div>
  );
}
