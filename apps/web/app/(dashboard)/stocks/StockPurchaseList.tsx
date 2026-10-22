"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { StockPurchase } from "../investments/utils/stockPurchases";
import { formatCurrency } from "../../utils/currency";

function receiptUrl(value: string | null) {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ||
    (value.startsWith("/") && !value.startsWith("//"))
    ? value
    : null;
}

export function StockPurchaseList({
  purchases,
  currency,
  hasFilters = false,
  label = "Stocks",
}: {
  purchases: StockPurchase[];
  currency: string;
  hasFilters?: boolean;
  label?: string;
}) {
  const [requestedPage, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleDetails = (id: number) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pageSize = 25;
  const rows = purchases.filter(
    (p) => Number.isFinite(p.originalAmount) && p.originalAmount > 0,
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const start = (page - 1) * pageSize;
  const visibleRows = rows.slice(start, start + pageSize);
  const date = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const timestamp = (value: string) => new Date(value).toLocaleString();
  return (
    <section
      aria-labelledby="stock-purchases-heading"
      className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">
        <div>
          <h2
            id="stock-purchases-heading"
            className="text-lg font-semibold text-gray-900"
          >
            {hasFilters
              ? `Matching ${label} purchases`
              : `All ${label} purchases`}{" "}
            <span className="text-sm font-normal text-gray-500">
              ({rows.length})
            </span>
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Newest first · Click a row for purchase details.
          </p>
        </div>
      </div>
      {!rows.length ? (
        <p className="px-6 py-10 text-center text-sm text-gray-500">
          {hasFilters
            ? "No purchases match your search or date range."
            : `No ${label} purchases with a cost greater than zero yet.`}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Date
                </th>
                <th scope="col" className="px-4 py-3">
                  Purchase
                </th>
                <th scope="col" className="px-4 py-3">
                  Expense ID
                </th>
                <th scope="col" className="px-4 py-3">
                  Account
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Cost ({currency})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleRows.map((p) => {
                const receipt = receiptUrl(p.receipt);
                const isExpanded = expanded.has(p.id);
                return (
                  <Fragment key={p.id}>
                    <tr
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      aria-controls={
                        isExpanded ? `purchase-details-${p.id}` : undefined
                      }
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("a, button"))
                          return;
                        toggleDetails(p.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleDetails(p.id);
                        }
                      }}
                      className={`cursor-pointer hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 ${isExpanded ? "bg-indigo-50/40" : ""}`}
                    >
                      <td className="whitespace-nowrap px-6 py-3 text-gray-600">
                        {date(p.date)}
                      </td>
                      <td className="min-w-48 px-4 py-3 font-medium text-gray-900">
                        <span className="inline-flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            aria-hidden
                          />
                          {p.title}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/expenses?view=${p.id}`}
                          className="font-medium text-indigo-700 hover:underline"
                          aria-label={`View expense ${p.id}`}
                        >
                          #{p.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.account?.nickname || p.account?.bankName || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(p.amount, currency)}
                        </p>
                        {p.currency !== currency && (
                          <p className="mt-1 text-xs text-gray-500">
                            {formatCurrency(p.originalAmount, p.currency)} (
                            {p.currency})
                          </p>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr id={`purchase-details-${p.id}`}>
                        <td colSpan={5}>
                          <dl className="grid gap-x-8 gap-y-4 bg-gray-50/70 px-6 py-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                            {[
                              ["Expense ID", `#${p.id}`],
                              ["Purchase date", timestamp(p.date)],
                              ["Category", p.category],
                              [
                                "Original purchase cost",
                                `${formatCurrency(p.originalAmount, p.currency)} (${p.currency})`,
                              ],
                              [
                                "Cost in selected currency",
                                `${formatCurrency(p.amount, currency)} (${currency})`,
                              ],
                              [
                                "Account",
                                p.account
                                  ? [
                                      p.account.nickname,
                                      p.account.bankName,
                                      p.account.holderName,
                                      p.account.accountNumber,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")
                                  : "No account linked",
                              ],
                              ["Description", p.description || "—"],
                              ["Notes", p.notes || "—"],
                              ["Tags", p.tags.join(", ") || "—"],
                              [
                                "Locations / links",
                                p.location.join("\n") || "—",
                              ],
                              [
                                "Coordinates",
                                p.coordinates
                                  ? `${p.coordinates.latitude}, ${p.coordinates.longitude}`
                                  : "—",
                              ],
                              [
                                "Recurring",
                                p.isRecurring
                                  ? `Yes${p.recurringFrequency ? ` · ${p.recurringFrequency.replace(/_/g, " ").toLowerCase()}` : ""}`
                                  : "No",
                              ],
                              ["Created", timestamp(p.createdAt)],
                              ["Last updated", timestamp(p.updatedAt)],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <dt className="text-xs font-medium text-gray-500">
                                  {label}
                                </dt>
                                <dd className="mt-1 whitespace-pre-wrap break-words text-gray-900">
                                  {label === "Expense ID" ? (
                                    <Link
                                      href={`/expenses?view=${p.id}`}
                                      className="font-medium text-indigo-700 hover:underline"
                                      aria-label={`View expense ${p.id}`}
                                    >
                                      {value}
                                    </Link>
                                  ) : (
                                    value
                                  )}
                                </dd>
                              </div>
                            ))}
                            <div>
                              <dt className="text-xs font-medium text-gray-500">
                                Receipt
                              </dt>
                              <dd className="mt-1 break-words text-gray-900">
                                {receipt ? (
                                  <a
                                    href={receipt}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-700 hover:underline"
                                  >
                                    View receipt ↗
                                  </a>
                                ) : (
                                  p.receipt || "—"
                                )}
                              </dd>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <nav
          aria-label={`${label} purchases pagination`}
          className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4"
        >
          <p aria-live="polite" className="text-sm text-gray-500">
            Showing {start + 1}–{Math.min(start + pageSize, rows.length)} of{" "}
            {rows.length} purchases
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              disabled={page === pageCount}
              onClick={() => setPage(page + 1)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </section>
  );
}
