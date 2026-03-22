"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, RefreshCw } from "lucide-react";
import {
    getIncomeExpenseAccountBalanceActivityLogs,
    type IncomeExpenseAccountActivityRow,
} from "../actions/accounts";
import { formatCurrency } from "../../../utils/currency";
import { INPUT_COLORS, TEXT_COLORS, UI_STYLES } from "../../../config/colorConfig";

const standardInput = INPUT_COLORS.standard;
const labelText = TEXT_COLORS.label;

const ACTIVITY_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: "INCOME", label: "Income" },
    { value: "EXPENSE", label: "Expense" },
    { value: "DEBT", label: "Debt" },
    { value: "DEBT_REPAYMENT", label: "Repayment" },
    { value: "INVESTMENT", label: "Invest" },
];

const ACTIVITY_ACTION_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: "CREATE", label: "Create" },
    { value: "UPDATE", label: "Update" },
    { value: "DELETE", label: "Delete" },
];

function actionMatchesMultiSelect(rowAction: string, selected: string[]): boolean {
    if (selected.length === 0) return true;
    return selected.some((f) => {
        if (f === "DELETE") {
            return rowAction === "DELETE" || rowAction === "BULK_DELETE";
        }
        return rowAction === f;
    });
}

interface ActivityFilterMultiDropdownProps<T extends string | number> {
    id: string;
    label: string;
    options: { value: T; label: string }[];
    selected: T[];
    onChange: (next: T[]) => void;
    emptySummary: string;
    pluralNoun: string;
}

function ActivityFilterMultiDropdown<T extends string | number>({
    id,
    label,
    options,
    selected,
    onChange,
    emptySummary,
    pluralNoun,
}: ActivityFilterMultiDropdownProps<T>) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handlePointerDown(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handlePointerDown);
        return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [open]);

    const summary = useMemo(() => {
        if (selected.length === 0) return emptySummary;
        if (selected.length === 1) {
            const v = selected[0];
            const opt = options.find((o) => o.value === v);
            return opt?.label ?? String(v);
        }
        return `${selected.length} ${pluralNoun}`;
    }, [selected, options, emptySummary, pluralNoun]);

    function toggle(value: T) {
        if (selected.includes(value)) {
            onChange(selected.filter((x) => x !== value));
        } else {
            onChange([...selected, value]);
        }
    }

    return (
        <div ref={containerRef} className="relative min-w-0">
            <label className={`${labelText} block`} htmlFor={id}>
                {label}
            </label>
            <button
                id={id}
                type="button"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => setOpen((o) => !o)}
                className={`mt-1 flex w-full min-h-[2.5rem] cursor-pointer items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            >
                <span className="truncate">{summary}</span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
                    aria-hidden
                />
            </button>
            {open ? (
                <div
                    role="listbox"
                    aria-multiselectable="true"
                    className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                >
                    <div className="flex flex-wrap gap-2 border-b border-gray-100 px-2 py-2">
                        <button
                            type="button"
                            className="text-xs font-medium text-blue-600 hover:text-blue-800"
                            onClick={() => onChange([])}
                        >
                            Clear ({emptySummary})
                        </button>
                        <button
                            type="button"
                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                            onClick={() => onChange(options.map((o) => o.value))}
                        >
                            Select all
                        </button>
                    </div>
                    {options.map((opt) => (
                        <label
                            key={String(opt.value)}
                            className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
                        >
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={selected.includes(opt.value)}
                                onChange={() => toggle(opt.value)}
                            />
                            <span className="text-sm text-gray-900">{opt.label}</span>
                        </label>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

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

function optionalMetadataNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    return null;
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
    const balanceBefore = optionalMetadataNumber(m.accountBalanceBeforeUserCurrency);
    const balanceAfter = optionalMetadataNumber(m.accountBalanceAfterUserCurrency);
    return {
        balanceDelta,
        userCurrency,
        accountLabel,
        transactionTitle,
        txAmt,
        txCur,
        balanceBefore,
        balanceAfter,
    };
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

function entityTypeSearchLabel(entityType: string): string {
    if (entityType === "DEBT_REPAYMENT") return "REPAYMENT";
    if (entityType === "INVESTMENT") return "INVEST";
    return entityType;
}

function rowMatchesSearch(row: IncomeExpenseAccountActivityRow, raw: string): boolean {
    const q = raw.trim().toLowerCase();
    if (!q) return true;
    const m = row.metadata || {};
    const haystack = [
        row.description,
        typeof m.accountLabel === "string" ? m.accountLabel : "",
        typeof m.transactionTitle === "string" ? m.transactionTitle : "",
        typeof m.reason === "string" ? m.reason : "",
        row.entityType,
        entityTypeSearchLabel(row.entityType),
        row.action,
        formatAction(row.action),
        formatDateTime(row.createdAt),
        row.createdAt,
        String(row.id),
        typeof m.balanceDeltaUserCurrency === "number"
            ? String(m.balanceDeltaUserCurrency)
            : "",
        typeof m.transactionAmountOriginal === "number"
            ? String(m.transactionAmountOriginal)
            : "",
        typeof m.accountBalanceBeforeUserCurrency === "number"
            ? String(m.accountBalanceBeforeUserCurrency)
            : "",
        typeof m.accountBalanceAfterUserCurrency === "number"
            ? String(m.accountBalanceAfterUserCurrency)
            : "",
    ]
        .join(" ")
        .toLowerCase();
    return haystack.includes(q);
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
        "Previous balance",
        "Balance delta",
        "New balance",
        "Balance currency",
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
            meta.balanceBefore !== null ? formatAmountCsvPlain(meta.balanceBefore) : "",
            meta.balanceDelta !== null ? formatAmountCsvPlain(meta.balanceDelta) : "",
            meta.balanceAfter !== null ? formatAmountCsvPlain(meta.balanceAfter) : "",
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
    const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedActions, setSelectedActions] = useState<string[]>([]);
    const [searchText, setSearchText] = useState("");

    const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
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

    const accountOptionsForDropdown = useMemo(
        () => accountOptions.map(({ id, label }) => ({ value: id, label })),
        [accountOptions]
    );

    const filteredRows = useMemo(() => {
        if (!data?.length) return [];
        const rangeFrom =
            dateFrom && dateTo && dateFrom > dateTo ? dateTo : dateFrom;
        const rangeTo =
            dateFrom && dateTo && dateFrom > dateTo ? dateFrom : dateTo;
        return data.filter((row) => {
            if (!isRowInDateRange(row.createdAt, rangeFrom, rangeTo)) return false;
            if (selectedAccountIds.length > 0) {
                const id = rowAccountId(row);
                if (id === null || !selectedAccountIds.includes(id)) return false;
            }
            if (selectedTypes.length > 0 && !selectedTypes.includes(row.entityType)) {
                return false;
            }
            if (!actionMatchesMultiSelect(row.action, selectedActions)) return false;
            if (!rowMatchesSearch(row, searchText)) return false;
            return true;
        });
    }, [data, dateFrom, dateTo, selectedAccountIds, selectedTypes, selectedActions, searchText]);

    const hasActiveFilters =
        Boolean(dateFrom) ||
        Boolean(dateTo) ||
        selectedAccountIds.length > 0 ||
        selectedTypes.length > 0 ||
        selectedActions.length > 0 ||
        Boolean(searchText.trim());

    function clearFilters() {
        setDateFrom("");
        setDateTo("");
        setSelectedAccountIds([]);
        setSelectedTypes([]);
        setSelectedActions([]);
        setSearchText("");
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
                        Income, expenses, lending, and investment activity that moved money in or out.
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        aria-busy={isFetching}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`h-4 w-4 shrink-0 ${isFetching ? "animate-spin" : ""}`}
                            aria-hidden
                        />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadCsv}
                        disabled={filteredRows.length === 0}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50"
                    >
                        <Download className="h-4 w-4 shrink-0" aria-hidden />
                        Download CSV
                    </button>
                </div>
            </div>

            <div className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12">
                <div className="min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-3">
                    <label className={labelText} htmlFor="activity-search">
                        Search
                    </label>
                    <input
                        id="activity-search"
                        type="search"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Description, account, transaction…"
                        autoComplete="off"
                        className={standardInput}
                    />
                </div>
                <div className="xl:col-span-2">
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
                <div className="xl:col-span-2">
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
                <div className="min-w-0 xl:col-span-2">
                    <ActivityFilterMultiDropdown
                        id="activity-filter-account"
                        label="Account"
                        options={accountOptionsForDropdown}
                        selected={selectedAccountIds}
                        onChange={setSelectedAccountIds}
                        emptySummary="All accounts"
                        pluralNoun="accounts"
                    />
                </div>
                <div className="min-w-0 xl:col-span-1">
                    <ActivityFilterMultiDropdown
                        id="activity-filter-type"
                        label="Type"
                        options={ACTIVITY_TYPE_FILTER_OPTIONS}
                        selected={selectedTypes}
                        onChange={setSelectedTypes}
                        emptySummary="All types"
                        pluralNoun="types"
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end xl:col-span-2 xl:flex-col xl:items-stretch">
                    <div className="min-w-0 flex-1">
                        <ActivityFilterMultiDropdown
                            id="activity-filter-action"
                            label="Action"
                            options={ACTIVITY_ACTION_FILTER_OPTIONS}
                            selected={selectedActions}
                            onChange={setSelectedActions}
                            emptySummary="All actions"
                            pluralNoun="actions"
                        />
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
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">
                                Previous balance
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">Balance Δ</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700">
                                New balance
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredRows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={9}
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
                                    balanceBefore,
                                    balanceAfter,
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
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                                            {balanceBefore !== null
                                                ? formatCurrency(balanceBefore, userCurrency)
                                                : "—"}
                                        </td>
                                        <td
                                            className={`whitespace-nowrap px-4 py-3 text-right font-medium ${deltaColor}`}
                                        >
                                            {balanceDelta !== null
                                                ? formatCurrency(balanceDelta, userCurrency)
                                                : "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                                            {balanceAfter !== null
                                                ? formatCurrency(balanceAfter, userCurrency)
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
