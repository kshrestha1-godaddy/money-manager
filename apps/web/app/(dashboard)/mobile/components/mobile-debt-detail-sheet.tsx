"use client";

import { useEffect, useMemo } from "react";
import type { DebtInterface } from "../../../types/debts";
import { formatCurrency } from "../../../utils/currency";
import { formatDateYearMonthDay } from "../../../utils/date";
import { calculateRemainingWithInterest } from "../../../utils/interestCalculation";

export interface MobileDebtDetailSheetProps {
  debt: DebtInterface | null;
  isOpen: boolean;
  onClose: () => void;
  displayCurrency: string;
}

function statusClass(status: DebtInterface["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "bg-blue-100 text-blue-800";
    case "PARTIALLY_PAID":
      return "bg-yellow-100 text-yellow-800";
    case "FULLY_PAID":
      return "bg-green-100 text-green-800";
    case "OVERDUE":
      return "bg-red-100 text-red-800";
    case "DEFAULTED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function MobileDebtDetailSheet({
  debt,
  isOpen,
  onClose,
  displayCurrency,
}: MobileDebtDetailSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const summary = useMemo(() => {
    if (!debt) return null;
    const totalRepayments = debt.repayments?.reduce((sum, r) => sum + r.amount, 0) ?? 0;
    const remainingWithInterest = calculateRemainingWithInterest(
      debt.amount,
      debt.interestRate,
      debt.lentDate,
      debt.dueDate,
      debt.repayments ?? [],
      new Date(),
      debt.status
    );
    const remainingAmount = remainingWithInterest.remainingAmount;
    const repaymentPercentage =
      remainingWithInterest.totalWithInterest > 0
        ? (totalRepayments / remainingWithInterest.totalWithInterest) * 100
        : 0;
    const repaymentsSorted = [...(debt.repayments ?? [])].sort(
      (a, b) =>
        new Date(b.repaymentDate).getTime() - new Date(a.repaymentDate).getTime()
    );
    return {
      totalRepayments,
      remainingWithInterest,
      remainingAmount,
      repaymentPercentage,
      repaymentsSorted,
    };
  }, [debt]);

  if (!isOpen || !debt || !summary) return null;

  const {
    totalRepayments,
    remainingWithInterest,
    remainingAmount,
    repaymentPercentage,
    repaymentsSorted,
  } = summary;

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-debt-title"
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
          <h1 id="mobile-debt-title" className="text-base font-semibold leading-tight text-gray-900">
            {debt.borrowerName}
          </h1>
          <p className="truncate text-xs text-gray-500">{debt.purpose || "Lending"}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${statusClass(debt.status)}`}
        >
          {debt.status.replace(/_/g, " ")}
        </span>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <p className="text-[10px] font-medium uppercase text-blue-700">Principal</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-blue-900">
              {formatCurrency(debt.amount, displayCurrency)}
            </p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50 p-3">
            <p className="text-[10px] font-medium uppercase text-green-700">Repaid</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-green-900">
              {formatCurrency(totalRepayments, displayCurrency)}
            </p>
          </div>
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
            <p className="text-[10px] font-medium uppercase text-orange-700">Interest</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-orange-900">
              {formatCurrency(remainingWithInterest.interestAmount, displayCurrency)}
            </p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-[10px] font-medium uppercase text-red-700">Remaining</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-red-900">
              {formatCurrency(remainingAmount, displayCurrency)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-gray-600">
            <span>Repayment progress</span>
            <span>{repaymentPercentage.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${Math.min(repaymentPercentage, 100)}%` }}
            />
          </div>
        </div>

        <section className="mt-6" aria-label="Repayment history">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Repayment history
            </h2>
            <span className="text-xs text-gray-500">
              {repaymentsSorted.length} payment{repaymentsSorted.length !== 1 ? "s" : ""}
            </span>
          </div>
          {repaymentsSorted.length > 0 ? (
            <ul className="space-y-2">
              {repaymentsSorted.map((repayment) => {
                const repDate =
                  repayment.repaymentDate instanceof Date
                    ? repayment.repaymentDate
                    : new Date(repayment.repaymentDate);
                return (
                  <li
                    key={repayment.id}
                    className="rounded-xl border border-gray-200 bg-gray-50/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-600">{formatDateYearMonthDay(repDate)}</p>
                        <p className="mt-1 text-sm text-gray-800 line-clamp-4 whitespace-pre-wrap">
                          {repayment.notes?.trim() ? repayment.notes : "—"}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums text-green-700">
                        {formatCurrency(repayment.amount, displayCurrency)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
              No repayments recorded yet
            </p>
          )}
        </section>

        <section className="mt-6 space-y-2 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dates</h2>
          <p className="text-gray-800">
            <span className="text-gray-600">Lent: </span>
            {formatDateYearMonthDay(debt.lentDate)}
          </p>
          {debt.dueDate ? (
            <p className="text-gray-800">
              <span className="text-gray-600">Due: </span>
              {formatDateYearMonthDay(debt.dueDate)}
            </p>
          ) : null}
          <p className="text-gray-800">
            <span className="text-gray-600">Rate: </span>
            {debt.interestRate}% p.a.
          </p>
        </section>

        {debt.borrowerContact ? (
          <p className="mt-3 text-sm text-gray-800">
            <span className="text-gray-600">Contact: </span>
            {debt.borrowerContact}
          </p>
        ) : null}

        {debt.notes ? (
          <section className="mt-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{debt.notes}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
