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

const DISMISSED_IDS_KEY = "scheduledPaymentPromptDismissedIds";

function readDismissedIds(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(DISMISSED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is number => typeof x === "number"));
  } catch {
    return new Set();
  }
}

function addDismissedId(id: number) {
  const next = readDismissedIds();
  next.add(id);
  sessionStorage.setItem(DISMISSED_IDS_KEY, JSON.stringify([...next]));
}

export function PendingScheduledPaymentsPrompt() {
  const { currency: userCurrency } = useCurrency();
  const [queue, setQueue] = useState<ScheduledPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const items = await getDueScheduledPaymentsPending();
      const dismissed = readDismissedIds();
      setQueue(items.filter((item) => !dismissed.has(item.id)));
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

  function handleDecideLater() {
    if (!current) return;
    addDismissedId(current.id);
    setQueue((q) => q.filter((item) => item.id !== current.id));
  }

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
          amount from the linked account (if any) and add it under Expenses.{" "}
          <span className="font-medium text-gray-800">Decide later</span> closes this reminder for
          now; you can accept or reject anytime from Scheduled payments.
        </p>
        <div className="rounded-lg bg-gray-50 p-4 mb-4 space-y-2 text-sm">
          <p>
            <span className="text-gray-500">Title:</span>{" "}
            <span className="font-medium text-gray-900">{current.title}</span>
          </p>
          <p>
            <span className="text-gray-500">Amount:</span>{" "}
            <span className="font-semibold text-gray-900 whitespace-nowrap tabular-nums">
              {formatCurrency(displayAmount, userCurrency)}
            </span>
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
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex min-w-0 flex-nowrap items-center justify-end gap-1.5 overflow-x-auto sm:gap-2">
            <button
              type="button"
              onClick={handleDecideLater}
              disabled={acting}
              className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:px-4"
            >
              Decide later
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={acting}
              className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50 sm:px-4"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={acting}
              className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 sm:px-4"
            >
              {acting ? "…" : "Accept"}
            </button>
          </div>
          <Link
            href="/scheduled-payments"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all scheduled
          </Link>
        </div>
      </div>
    </div>
  );
}
