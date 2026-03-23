"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDueScheduledPaymentsPending,
  acceptScheduledPayment,
  rejectScheduledPayment,
} from "../(dashboard)/scheduled-payments/actions/scheduled-payments";
import { ScheduledPaymentItem } from "../types/scheduled-payment";
import { formatCurrency } from "../utils/currency";
import { useCurrency } from "../providers/CurrencyProvider";
import { convertForDisplaySync } from "../utils/currencyDisplay";
import Link from "next/link";

export function PendingScheduledPaymentsPrompt() {
  const { currency: userCurrency } = useCurrency();
  const [queue, setQueue] = useState<ScheduledPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const items = await getDueScheduledPaymentsPending();
      setQueue(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const current = queue[0];

  const handleAccept = async () => {
    if (!current) return;
    setActing(true);
    try {
      await acceptScheduledPayment(current.id);
      setQueue((q) => q.slice(1));
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not accept");
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!current) return;
    setActing(true);
    try {
      await rejectScheduledPayment(current.id);
      setQueue((q) => q.slice(1));
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not reject");
    } finally {
      setActing(false);
    }
  };

  if (loading || !current) return null;

  const displayAmount = convertForDisplaySync(
    current.amount,
    current.currency,
    userCurrency
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheduled-payment-prompt-title"
      >
        <h2
          id="scheduled-payment-prompt-title"
          className="text-lg font-semibold text-gray-900 mb-1"
        >
          Scheduled payment due
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Confirm whether this payment should be recorded as an expense. Accepting will deduct the
          amount from the linked account (if any) and add it under Expenses.
        </p>
        <div className="rounded-lg bg-gray-50 p-4 mb-4 space-y-2 text-sm">
          <p>
            <span className="text-gray-500">Title:</span>{" "}
            <span className="font-medium text-gray-900">{current.title}</span>
          </p>
          <p>
            <span className="text-gray-500">Amount:</span>{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(displayAmount, userCurrency)}
            </span>
            {current.currency !== userCurrency && (
              <span className="text-gray-500 ml-1">({current.currency})</span>
            )}
          </p>
          <p>
            <span className="text-gray-500">Scheduled for:</span>{" "}
            <span className="text-gray-900">
              {new Date(current.scheduledAt).toLocaleString()}
            </span>
          </p>
          {current.account && (
            <p>
              <span className="text-gray-500">Account:</span>{" "}
              <span className="text-gray-900">
                {current.account.bankName} — {current.account.holderName}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Link
            href="/scheduled-payments"
            className="text-center text-sm text-blue-600 hover:text-blue-800 py-2 sm:mr-auto"
          >
            View all scheduled
          </Link>
          <button
            type="button"
            onClick={handleReject}
            disabled={acting}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={acting}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {acting ? "…" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
