"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { AccountInterface } from "../../../types/accounts";
import { formatDateYearMonthDay } from "../../../utils/date";

export interface MobileAccountDetailSheetProps {
  account: AccountInterface | null;
  isOpen: boolean;
  onClose: () => void;
  /** Balance converted to the hub display currency and formatted */
  formattedBalance: string;
}

function maskAccountNumber(num: string): string {
  const s = String(num).trim();
  if (s.length <= 4) return s;
  return `****${s.slice(-4)}`;
}

export function MobileAccountDetailSheet({
  account,
  isOpen,
  onClose,
  formattedBalance,
}: MobileAccountDetailSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !account) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-account-title"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 pr-2">
          <h1 id="mobile-account-title" className="text-base font-semibold leading-tight text-gray-900">
            {account.bankName}
          </h1>
          {account.nickname ? (
            <p className="truncate text-xs text-blue-600">{account.nickname}</p>
          ) : (
            <p className="truncate text-xs text-gray-500">{account.holderName}</p>
          )}
        </div>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <section className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">Balance</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">{formattedBalance}</p>
        </section>

        <section className="mt-4 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h2 className="text-sm font-semibold text-gray-900">Account</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 shrink-0">Holder</dt>
              <dd className="text-right text-gray-900">{account.holderName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 shrink-0">Number</dt>
              <dd className="text-right font-mono text-xs text-gray-900 break-all">
                {maskAccountNumber(account.accountNumber)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 shrink-0">Type</dt>
              <dd className="text-right text-gray-900">{account.accountType}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 shrink-0">IFSC / code</dt>
              <dd className="text-right text-gray-900 break-all">{account.branchCode || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 shrink-0">Branch</dt>
              <dd className="text-right text-gray-900">{account.branchName || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600 shrink-0">Opened</dt>
              <dd className="text-right text-gray-900">
                {formatDateYearMonthDay(
                  account.accountOpeningDate instanceof Date
                    ? account.accountOpeningDate
                    : new Date(account.accountOpeningDate)
                )}
              </dd>
            </div>
          </dl>
        </section>

        {account.notes ? (
          <section className="mt-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{account.notes}</p>
          </section>
        ) : null}

        <p className="mt-6 text-center">
          <Link
            href="/accounts"
            className="text-sm font-medium text-brand-600 min-h-[44px] inline-flex items-center justify-center px-2 py-2"
            onClick={onClose}
          >
            Manage accounts
          </Link>
        </p>
      </div>
    </div>
  );
}
