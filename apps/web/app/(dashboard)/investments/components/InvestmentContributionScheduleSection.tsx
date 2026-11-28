"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getInvestmentContributionPlan,
  type ContributionPlanRowStatus,
} from "../actions/schedule-investment";
import { formatScheduledPaymentWhenDate } from "../../scheduled-payments/scheduled-payment-helpers";
import { useDisplayCurrency } from "../../../hooks/useDisplayCurrency";
import { useTimezone } from "../../../providers/TimezoneProvider";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";

interface InvestmentContributionScheduleSectionProps {
  investmentId: number;
}

function statusLabel(status: ContributionPlanRowStatus): string {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "REJECTED") return "Rejected";
  if (status === "AWAITING") return "Awaiting confirmation";
  return "Upcoming";
}

function statusClassName(status: ContributionPlanRowStatus): string {
  if (status === "ACCEPTED") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "REJECTED") return "text-red-700 bg-red-50 border-red-200";
  if (status === "AWAITING") return "text-amber-800 bg-amber-50 border-amber-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

export function InvestmentContributionScheduleSection({
  investmentId,
}: InvestmentContributionScheduleSectionProps) {
  const { displayCurrency, convertAmount } = useDisplayCurrency();
  const { timezone } = useTimezone();
  const userTimezone = timezone || "UTC";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["investment-contribution-plan", investmentId],
    queryFn: () => getInvestmentContributionPlan(investmentId),
    enabled: Number.isSafeInteger(investmentId) && investmentId > 0,
  });

  const plan = data && !("error" in data) ? data : null;
  const errorMessage =
    data && "error" in data ? data.error : isError ? "Failed to load plan" : null;

  const totals = useMemo(() => {
    if (!plan) return null;
    let accepted = 0;
    let scheduledLeft = 0;
    for (const row of plan.rows) {
      if (row.status === "ACCEPTED") accepted += row.amount;
      else if (row.status !== "REJECTED") scheduledLeft += row.amount;
    }
    return { accepted, scheduledLeft };
  }, [plan]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3.5">
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Contribution schedule</h3>
        <p className="text-sm text-gray-500">Loading payment plan…</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50/60 p-3.5">
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Contribution schedule</h3>
        <p className="text-sm text-red-700">{errorMessage}</p>
      </div>
    );
  }

  if (!plan || plan.rows.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-teal-100 bg-teal-50/40 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">Contribution payment plan</h3>
        <Link
          href="/scheduled-payments"
          className="text-xs font-medium text-teal-800 hover:underline"
        >
          Open scheduled payments
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-white/80 bg-white/90 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Remaining to target
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-teal-900">
            {formatCurrency(convertAmount(plan.remainingAmount), displayCurrency)}
          </p>
        </div>
        <div className="rounded-md border border-white/80 bg-white/90 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Accepted so far
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
            {formatCurrency(convertAmount(totals?.accepted ?? 0), displayCurrency)}
          </p>
        </div>
        <div className="rounded-md border border-white/80 bg-white/90 px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Still scheduled
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
            {formatCurrency(convertAmount(totals?.scheduledLeft ?? 0), displayCurrency)}
          </p>
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full min-w-[36rem] border-collapse text-xs">
          <thead className="sticky top-0 bg-gray-50 text-left text-gray-500">
            <tr className="border-b border-gray-200">
              <th scope="col" className="px-3 py-2 font-medium">
                #
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Date
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Amount
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Cumulative
              </th>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Left
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {plan.rows.map((row, index) => {
              const amountDisplay = convertForDisplaySync(
                row.amount,
                row.currency,
                displayCurrency
              );
              const cumulative = plan.rows
                .slice(0, index + 1)
                .reduce((sum, item) => sum + item.amount, 0);
              const planTotal = plan.rows.reduce((sum, item) => sum + item.amount, 0);
              const left = Math.max(0, planTotal - cumulative);
              return (
                <tr
                  key={`${row.index}-${row.scheduledAt.toISOString()}-${row.paymentId ?? "p"}`}
                  className={`border-b border-gray-100 last:border-0 ${
                    row.isNext ? "bg-teal-50/80" : ""
                  }`}
                >
                  <td className="px-3 py-2 tabular-nums text-gray-500">{row.index}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-800">
                    {formatScheduledPaymentWhenDate(row.scheduledAt, userTimezone)}
                    {row.isNext ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                        Next
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-900">
                    {formatCurrency(amountDisplay, displayCurrency)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {formatCurrency(convertAmount(cumulative), displayCurrency)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {formatCurrency(convertAmount(left), displayCurrency)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClassName(row.status)}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
