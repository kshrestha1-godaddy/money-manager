"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
    getIncomeExpenseAccountBalanceActivityLogs,
    type IncomeExpenseAccountActivityRow,
} from "../actions/accounts";
import { formatCurrency } from "../../../utils/currency";
import { INPUT_COLORS, TEXT_COLORS, UI_STYLES } from "../../../config/colorConfig";

const standardInput = INPUT_COLORS.standard;
const labelText = TEXT_COLORS.label;

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

function rowAccountId(row: IncomeExpenseAccountActivityRow): number | null {
    const id = row.metadata?.accountId;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (typeof id === "string" && id.trim() !== "") {
        const n = Number(id);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function isRowInDateRange(iso: string, from: string, to: string): boolean {
    const d = new Date(iso);
    if (from) {
        const start = new Date(`${from}T00:00:00`);
        if (d < start) return false;
    }
    if (to) {
        const end = new Date(`${to}T23:59:59.999`);
        if (d > end) return false;
    }
    return true;
}

function actionMatchesFilter(rowAction: string, filter: string): boolean {
    if (!filter) return true;
    if (filter === "DELETE") {
        return rowAction === "DELETE" || rowAction === "BULK_DELETE";
    }
    return rowAction === filter;
}

/**
 * RFC 4180–style quoting (same pattern as FinancialList) so commas in titles
 * do not break columns in Sheets/Excel.
 */
function csvQuoteCell(value: string | number | undefined | null): string {
    const s = String(value ?? "");
    return `"${s.replace(/"/g, '""')}"`;
}

function formatAmountCsvPlain(n: number): string {
    return (Math.round(n * 100) / 100).toFixed(2);
}

function entityTypeDisplayForCsv(entityType: string): string {
    if (entityType === "DEBT_REPAYMENT") return "REPAYMENT";
    if (entityType === "INVESTMENT") return "INVEST";
    return entityType;
}

function buildBalanceActivityCsv(rows: IncomeExpenseAccountActivityRow[]): string {
    const headers = [
        "When (ISO)",
        "Account",
        "Account ID",
        "Type",
        "Action",
        "Transaction",
        "Entry amount",
        "Entry currency",
        "Balance delta",
        "Balance delta currency",
        "Reason",
        "Description",
    ];
    const lines: (string | number)[][] = [headers];
    for (const row of rows) {
        const meta = parseMetadata(row);
        const aid = rowAccountId(row);
        const reason =
            typeof row.metadata?.reason === "string" ? row.metadata.reason : "";
        lines.push([
            row.createdAt,
            meta.accountLabel,
            aid ?? "",
            entityTypeDisplayForCsv(row.entityType),
            formatAction(row.action),
            meta.transactionTitle,
            meta.txAmt !== null ? formatAmountCsvPlain(meta.txAmt) : "",
            meta.txCur,
            meta.balanceDelta !== null ? formatAmountCsvPlain(meta.balanceDelta) : "",
            meta.userCurrency,
            reason,
            row.description,
        ]);
    }
    return lines
        .map((line) => line.map((cell) => csvQuoteCell(cell)).join(","))
        .join("\r\n");
}

export function AccountIncomeExpenseActivityTable() {
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [accountId, setAccountId] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [actionFilter, setActionFilter] = useState("");

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["account-balance-activity"],
        queryFn: () => getIncomeExpenseAccountBalanceActivityLogs(500),
    });

    const accountOptions = useMemo(() => {
        if (!data?.length) return [];
        const map = new Map<number, string>();
        for (const row of data) {
            const id = rowAccountId(row);
            if (id === null) continue;
            const label =
                typeof row.metadata?.accountLabel === "string"
                    ? row.metadata.accountLabel
                    : `Account #${id}`;
            if (!map.has(id)) map.set(id, label);
        }
        return [...map.entries()]
            .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: "base" }))
            .map(([id, label]) => ({ id, label }));
    }, [data]);

    const filteredRows = useMemo(() => {
        if (!data?.length) return [];
        const rangeFrom =
            dateFrom && dateTo && dateFrom > dateTo ? dateTo : dateFrom;
        const rangeTo =
            dateFrom && dateTo && dateFrom > dateTo ? dateFrom : dateTo;
        return data.filter((row) => {
            if (!isRowInDateRange(row.createdAt, rangeFrom, rangeTo)) return false;
            if (accountId) {
                const id = rowAccountId(row);
                if (id === null || String(id) !== accountId) return false;
            }
            if (typeFilter && row.entityType !== typeFilter) return false;
            if (!actionMatchesFilter(row.action, actionFilter)) return false;
            return true;
        });
    }, [data, dateFrom, dateTo, accountId, typeFilter, actionFilter]);

    const hasActiveFilters =
        Boolean(dateFrom) ||
        Boolean(dateTo) ||
        Boolean(accountId) ||
        Boolean(typeFilter) ||
        Boolean(actionFilter);

    function clearFilters() {
        setDateFrom("");
        setDateTo("");
        setAccountId("");
        setTypeFilter("");
        setActionFilter("");
    }

    const handleDownloadCsv = useCallback(() => {
        if (!filteredRows.length) return;
        const csv = buildBalanceActivityCsv(filteredRows);
        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8",
        });
        const link = document.createElement("a");
        const scope = hasActiveFilters ? "filtered" : "all";
        link.download = `balance-activity-${scope}-${new Date().toISOString().split("T")[0]}.csv`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }, [filteredRows, hasActiveFilters]);

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
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <h2 className={UI_STYLES.chart.title}>Balance activity log</h2>
                    <p className="text-sm text-gray-600">
                        Income, expenses, lending, and investment activity that moved money in or out of a
                        linked account. “Balance Δ” uses your display currency where applicable; investments
                        use purchase cost (quantity × purchase price) when “deduct from account” applies.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={filteredRows.length === 0}
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50"
                >
                    <Download className="h-4 w-4 shrink-0" aria-hidden />
                    Download CSV
                </button>
            </div>

            <div className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="xl:col-span-1">
                    <label className={labelText} htmlFor="activity-filter-date-from">
                        From date
                    </label>
                    <input
                        id="activity-filter-date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className={standardInput}
                    />
                </div>
                <div className="xl:col-span-1">
                    <label className={labelText} htmlFor="activity-filter-date-to">
                        To date
                    </label>
                    <input
                        id="activity-filter-date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className={standardInput}
                    />
                </div>
                <div className="xl:col-span-2">
                    <label className={labelText} htmlFor="activity-filter-account">
                        Account
                    </label>
                    <select
                        id="activity-filter-account"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className={standardInput}
                    >
                        <option value="">All accounts</option>
                        {accountOptions.map(({ id, label }) => (
                            <option key={id} value={String(id)}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelText} htmlFor="activity-filter-type">
                        Type
                    </label>
                    <select
                        id="activity-filter-type"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className={standardInput}
                    >
                        <option value="">All types</option>
                        <option value="INCOME">Income</option>
                        <option value="EXPENSE">Expense</option>
                        <option value="DEBT">Debt</option>
                        <option value="DEBT_REPAYMENT">Repayment</option>
                        <option value="INVESTMENT">Invest</option>
                    </select>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end xl:flex-col xl:items-stretch">
                    <div className="min-w-0 flex-1">
                        <label className={labelText} htmlFor="activity-filter-action">
                            Action
                        </label>
                        <select
                            id="activity-filter-action"
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className={standardInput}
                        >
                            <option value="">All actions</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                        </select>
                    </div>
                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                        >
                            Clear filters
                        </button>
                    ) : null}
                </div>
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
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-4 py-10 text-center text-sm text-gray-600"
                                >
                                    No entries match your filters.{" "}
                                    <button
                                        type="button"
                                        className="font-medium text-blue-600 underline"
                                        onClick={clearFilters}
                                    >
                                        Clear filters
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map((row) => {
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
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
