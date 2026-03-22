"use client";

import { useQuery } from "@tanstack/react-query";
import {
    getIncomeExpenseAccountBalanceActivityLogs,
    type IncomeExpenseAccountActivityRow,
} from "../actions/accounts";
import { formatCurrency } from "../../../utils/currency";
import { UI_STYLES } from "../../../config/colorConfig";

function formatAction(action: string): string {
    return action
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function parseMetadata(row: IncomeExpenseAccountActivityRow) {
    const m = row.metadata || {};
    const balanceDelta =
        typeof m.balanceDeltaUserCurrency === "number" ? m.balanceDeltaUserCurrency : null;
    const userCurrency = typeof m.userCurrency === "string" ? m.userCurrency : "USD";
    const accountLabel = typeof m.accountLabel === "string" ? m.accountLabel : "—";
    const transactionTitle =
        typeof m.transactionTitle === "string" ? m.transactionTitle : "—";
    const txAmt =
        typeof m.transactionAmountOriginal === "number" ? m.transactionAmountOriginal : null;
    const txCur =
        typeof m.transactionCurrency === "string" ? m.transactionCurrency : userCurrency;
    return { balanceDelta, userCurrency, accountLabel, transactionTitle, txAmt, txCur };
}

function entityTypeBadgeClass(entityType: string): string {
    if (entityType === "INCOME") return "bg-green-100 text-green-800";
    if (entityType === "EXPENSE") return "bg-red-100 text-red-800";
    if (entityType === "DEBT") return "bg-amber-100 text-amber-900";
    if (entityType === "DEBT_REPAYMENT") return "bg-violet-100 text-violet-800";
    if (entityType === "INVESTMENT") return "bg-indigo-100 text-indigo-800";
    return "bg-gray-100 text-gray-800";
}

export function AccountIncomeExpenseActivityTable() {
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["account-balance-activity"],
        queryFn: () => getIncomeExpenseAccountBalanceActivityLogs(200),
    });

    if (isLoading) {
        return (
            <div className={UI_STYLES.chart.container}>
                <h2 className={UI_STYLES.chart.title}>Balance activity log</h2>
                <p className="text-sm text-gray-500">Loading activity log…</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className={UI_STYLES.chart.container}>
                <h2 className={UI_STYLES.chart.title}>Balance activity log</h2>
                <p className="text-sm text-red-600">
                    {error instanceof Error ? error.message : "Could not load activity."}
                </p>
                <button
                    type="button"
                    className="mt-2 text-sm text-blue-600 underline"
                    onClick={() => refetch()}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!data?.length) {
        return (
            <div className={UI_STYLES.chart.container}>
                <h2 className={UI_STYLES.chart.title}>Balance activity log</h2>
                <p className="text-sm text-gray-600">
                    When you add or change income, expenses, lendings (and repayments), or investments
                    that adjust a linked account, balance changes will appear here so you can review
                    them later.
                </p>
            </div>
        );
    }

    return (
        <div className={UI_STYLES.chart.container}>
            <div className="mb-4">
                <h2 className={UI_STYLES.chart.title}>Balance activity log</h2>
                <p className="text-sm text-gray-600">
                    Income, expenses, lending, and investment activity that moved money in or out of a
                    linked account. “Balance Δ” uses your display currency where applicable; investments
                    use purchase cost (quantity × purchase price) when “deduct from account” applies.
                </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">When</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Account</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Transaction</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">
                                Entry amount
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">Balance Δ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {data.map((row) => {
                            const {
                                balanceDelta,
                                userCurrency,
                                accountLabel,
                                transactionTitle,
                                txAmt,
                                txCur,
                            } = parseMetadata(row);
                            const deltaColor =
                                balanceDelta === null
                                    ? "text-gray-500"
                                    : balanceDelta > 0
                                      ? "text-green-600"
                                      : balanceDelta < 0
                                        ? "text-red-600"
                                        : "text-gray-600";
                            return (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                        {formatDateTime(row.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">{accountLabel}</td>
                                    <td className="whitespace-nowrap px-4 py-3">
                                        <span
                                            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${entityTypeBadgeClass(row.entityType)}`}
                                        >
                                            {row.entityType === "DEBT_REPAYMENT"
                                                ? "REPAYMENT"
                                                : row.entityType === "INVESTMENT"
                                                  ? "INVEST"
                                                  : row.entityType}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                        {formatAction(row.action)}
                                    </td>
                                    <td
                                        className="max-w-[220px] truncate px-4 py-3 text-gray-800"
                                        title={transactionTitle}
                                    >
                                        {transactionTitle}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                                        {txAmt !== null ? formatCurrency(txAmt, txCur) : "—"}
                                    </td>
                                    <td
                                        className={`whitespace-nowrap px-4 py-3 text-right font-medium ${deltaColor}`}
                                    >
                                        {balanceDelta !== null
                                            ? formatCurrency(balanceDelta, userCurrency)
                                            : "—"}
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
