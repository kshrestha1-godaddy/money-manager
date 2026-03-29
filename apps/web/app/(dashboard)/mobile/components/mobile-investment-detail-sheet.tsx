"use client";

import { useEffect } from "react";
import type { InvestmentInterface } from "../../../types/investments";
import { formatCurrency } from "../../../utils/currency";
import { formatDateYearMonthDay } from "../../../utils/date";

export interface MobileInvestmentDetailSheetProps {
  investment: InvestmentInterface | null;
  isOpen: boolean;
  onClose: () => void;
  displayCurrency: string;
}

function formatType(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getTypeIcon(type: string): string {
  switch (type) {
    case "STOCKS":
      return "📈";
    case "CRYPTO":
      return "₿";
    case "MUTUAL_FUNDS":
      return "📊";
    case "BONDS":
      return "🏛️";
    case "REAL_ESTATE":
      return "🏠";
    case "GOLD":
      return "🥇";
    case "FIXED_DEPOSIT":
      return "🏦";
    case "PROVIDENT_FUNDS":
      return "🏛️";
    case "SAFE_KEEPINGS":
      return "🔒";
    default:
      return "💼";
  }
}

export function MobileInvestmentDetailSheet({
  investment,
  isOpen,
  onClose,
  displayCurrency,
}: MobileInvestmentDetailSheetProps) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !investment) return null;

  const totalValue = investment.quantity * investment.currentPrice;
  const totalCost = investment.quantity * investment.purchasePrice;
  const gain = totalValue - totalCost;
  const gainPercentage =
    investment.purchasePrice !== 0
      ? (((investment.currentPrice - investment.purchasePrice) / investment.purchasePrice) * 100).toFixed(2)
      : "0.00";

  const gainColor = gain > 0 ? "text-emerald-700" : gain < 0 ? "text-red-700" : "text-gray-700";

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-inv-title"
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
        <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
          <span className="text-2xl shrink-0" aria-hidden>
            {getTypeIcon(investment.type)}
          </span>
          <div className="min-w-0">
            <h1 id="mobile-inv-title" className="text-base font-semibold leading-tight text-gray-900">
              {investment.name}
            </h1>
            {investment.symbol ? (
              <p className="truncate text-xs text-gray-500">{investment.symbol}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mt-4 flex justify-center">
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
            {formatType(investment.type)}
          </span>
        </div>

        {investment.investmentTarget ? (
          <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-center text-sm text-purple-900">
            <span className="text-xs font-medium uppercase tracking-wide text-purple-700">Savings target</span>
            <p className="font-semibold">
              {investment.investmentTarget.nickname?.trim() ||
                formatType(investment.investmentTarget.investmentType)}
            </p>
          </div>
        ) : null}

        <section className="mt-6 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h2 className="text-sm font-semibold text-gray-900">Position</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">Current value</span>
              <span className="font-semibold text-gray-900 tabular-nums">
                {formatCurrency(totalValue, displayCurrency)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">Total cost</span>
              <span className="tabular-nums text-gray-900">{formatCurrency(totalCost, displayCurrency)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">Gain / loss</span>
              <span className={`font-semibold tabular-nums ${gainColor}`}>
                {formatCurrency(gain, displayCurrency)} ({gainPercentage}%)
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-600">Purchase date</span>
              <span className="text-gray-900">{formatDateYearMonthDay(investment.purchaseDate)}</span>
            </div>
          </div>
        </section>

        {investment.notes ? (
          <section className="mt-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{investment.notes}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
