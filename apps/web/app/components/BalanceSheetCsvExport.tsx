"use client";

import { useMemo, useState } from "react";
import { Table2, X } from "lucide-react";
import { Transaction } from "../types/financial";
import { useCurrency } from "../providers/CurrencyProvider";
import { convertForDisplaySync } from "../utils/currencyDisplay";

interface BalanceSheetCsvExportProps {
    transactions: Transaction[];
}

function escapeCsvField(value: string | number | undefined | null): string {
    if (value === undefined || value === null) return "";
    const s = String(value);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function formatDateOnly(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatAmountForCsv(n: number): string {
    return n.toFixed(2);
}

function toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function addMonths(d: Date, deltaMonths: number): Date {
    const r = new Date(d);
    r.setMonth(r.getMonth() + deltaMonths);
    return r;
}

function filterByDateRange(
    items: Transaction[],
    start: string,
    end: string
): Transaction[] {
    return items.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        if (!start && !end) return true;
        if (start && end) {
            const s = new Date(start);
            const e = new Date(end);
            e.setHours(23, 59, 59, 999);
            return transactionDate >= s && transactionDate <= e;
        }
        if (start) return transactionDate >= new Date(start);
        const e = new Date(end);
        e.setHours(23, 59, 59, 999);
        return transactionDate <= e;
    });
}

export function BalanceSheetCsvExport({ transactions }: BalanceSheetCsvExportProps) {
    const { currency: displayCurrency } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const [rangeStart, setRangeStart] = useState("");
    const [rangeEnd, setRangeEnd] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    const transactionsForExport = useMemo(
        () => filterByDateRange(transactions, rangeStart, rangeEnd),
        [transactions, rangeStart, rangeEnd]
    );

    const rangeInvalid =
        Boolean(rangeStart && rangeEnd) &&
        new Date(rangeStart) > new Date(rangeEnd);

    const getDateRangeSlug = (): string => {
        if (!rangeStart && !rangeEnd) return "all-time";
        if (rangeStart && rangeEnd) return `${rangeStart}_to_${rangeEnd}`;
        if (rangeStart) return `from_${rangeStart}`;
        return `until_${rangeEnd}`;
    };

    const applyPreset = (preset: "all" | "3m" | "6m" | "1y") => {
        if (preset === "all") {
            setRangeStart("");
            setRangeEnd("");
            return;
        }
        const end = new Date();
        const months = preset === "3m" ? -3 : preset === "6m" ? -6 : -12;
        const start = addMonths(end, months);
        setRangeStart(toYmd(start));
        setRangeEnd(toYmd(end));
    };

    const buildCsv = (sorted: Transaction[]): string => {
        const headers = [
            "SN",
            "Date",
            "Type",
            "Title",
            "Description",
            "Category",
            "Account",
            "Tags",
            "Location",
            "Notes",
            "Original currency",
            "Amount (original)",
            `Debit (${displayCurrency})`,
            `Credit (${displayCurrency})`,
            `Balance (${displayCurrency})`,
        ];

        let runningBalance = 0;
        const rows: string[][] = [headers];

        sorted.forEach((transaction, index) => {
            const displayAmount = convertForDisplaySync(
                transaction.amount,
                transaction.currency,
                displayCurrency
            );
            const isIncome = transaction.type === "INCOME";
            const isOutflow =
                transaction.type === "EXPENSE" ||
                transaction.type === "DEBT" ||
                transaction.type === "INVESTMENT";
            const debit = isOutflow ? formatAmountForCsv(displayAmount) : "";
            const credit = isIncome ? formatAmountForCsv(displayAmount) : "";
            runningBalance += isIncome ? displayAmount : -displayAmount;

            rows.push([
                String(index + 1),
                formatDateOnly(transaction.date),
                transaction.type,
                transaction.title,
                transaction.description ?? "",
                transaction.category,
                transaction.account,
                (transaction.tags ?? []).join("; "),
                (transaction.location ?? []).join("; "),
                transaction.notes ?? "",
                transaction.currency,
                formatAmountForCsv(transaction.amount),
                debit,
                credit,
                formatAmountForCsv(runningBalance),
            ]);
        });

        const totalDebit = sorted
            .filter(
                (t) =>
                    t.type === "EXPENSE" ||
                    t.type === "DEBT" ||
                    t.type === "INVESTMENT"
            )
            .reduce(
                (sum, t) =>
                    sum +
                    convertForDisplaySync(t.amount, t.currency, displayCurrency),
                0
            );
        const totalCredit = sorted
            .filter((t) => t.type === "INCOME")
            .reduce(
                (sum, t) =>
                    sum +
                    convertForDisplaySync(t.amount, t.currency, displayCurrency),
                0
            );

        rows.push([]);
        rows.push([
            "TOTALS",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            formatAmountForCsv(totalDebit),
            formatAmountForCsv(totalCredit),
            formatAmountForCsv(totalCredit - totalDebit),
        ]);

        return rows
            .map((line) => line.map((cell) => escapeCsvField(cell)).join(","))
            .join("\r\n");
    };

    const handleExport = () => {
        if (transactionsForExport.length === 0 || rangeInvalid) return;
        setIsExporting(true);
        try {
            const sorted = [...transactionsForExport].sort((a, b) => {
                const da = a.date instanceof Date ? a.date : new Date(a.date);
                const db = b.date instanceof Date ? b.date : new Date(b.date);
                const t = da.getTime() - db.getTime();
                if (t !== 0) return t;
                return String(a.id).localeCompare(String(b.id));
            });
            const csv = buildCsv(sorted);
            const blob = new Blob(["\uFEFF", csv], {
                type: "text/csv;charset=utf-8",
            });
            const link = document.createElement("a");
            const slug = getDateRangeSlug();
            link.download = `balance-sheet-${slug}-${new Date().toISOString().split("T")[0]}.csv`;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            setIsOpen(false);
        } finally {
            setIsExporting(false);
        }
    };

    const openModal = () => {
        setIsOpen(true);
    };

    const exportDisabled =
        transactionsForExport.length === 0 || rangeInvalid || isExporting;

    return (
        <>
            <button
                type="button"
                onClick={openModal}
                disabled={transactions.length === 0}
                className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
            >
                <Table2 size={18} aria-hidden />
                Balance sheet
            </button>

            {isOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="fixed inset-0 bg-black/50"
                        aria-label="Close"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="balance-sheet-title"
                        className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <h2
                                id="balance-sheet-title"
                                className="text-lg font-semibold text-gray-900"
                            >
                                Balance sheet export
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                            Choose a date range. Income appears under Credit, expenses
                            under Debit.
                        </p>

                        <div className="mt-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                Quick ranges
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {(
                                    [
                                        ["all", "All time"],
                                        ["3m", "3 months"],
                                        ["6m", "6 months"],
                                        ["1y", "1 year"],
                                    ] as const
                                ).map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => applyPreset(key)}
                                        className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="bs-start"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Start date
                                </label>
                                <input
                                    id="bs-start"
                                    type="date"
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(e.target.value)}
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="bs-end"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    End date
                                </label>
                                <input
                                    id="bs-end"
                                    type="date"
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(e.target.value)}
                                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {rangeInvalid ? (
                            <p className="mt-2 text-sm text-red-600">
                                Start date must be on or before end date.
                            </p>
                        ) : null}

                        <p className="mt-2 text-sm text-gray-600">
                            {transactionsForExport.length} transaction
                            {transactionsForExport.length === 1 ? "" : "s"} in range
                        </p>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExport}
                                disabled={exportDisabled}
                                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                            >
                                {isExporting ? "Exporting…" : "Download CSV"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
