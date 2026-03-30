"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Bookmark, Download, RefreshCw } from "lucide-react";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { splitLocationFieldForExport } from "../../utils/csvExportUtils";
import { formatDate } from "../../utils/date";
import { TransactionType } from "../../utils/formUtils";
import { SUPPORTED_CURRENCIES } from "../../utils/currencyConversion";
import { Pagination } from "./Pagination";
import { CompactPagination } from "./CompactPagination";

interface FinancialTransaction {
    id: number;
    title: string;
    description?: string;
    amount: number;
    currency: string;
    date: Date;
    category: {
        id: number;
        name: string;
        color: string;
    };
    account?: {
        id: number;
        bankName: string;
        holderName: string;
        accountType: string;
    } | null;
    tags: string[];
    location?: string[];
    transactionLocation?: { latitude: number; longitude: number } | null;
    notes?: string;
    isRecurring: boolean;
    recurringFrequency?: string;
    isBookmarked?: boolean;
}

interface FinancialListProps {
    transactions: FinancialTransaction[];
    transactionType: TransactionType;
    currency?: string;
    onEdit?: (transaction: FinancialTransaction) => void;
    onView?: (transaction: FinancialTransaction) => void;
    onDelete?: (transaction: FinancialTransaction) => void;
    onBookmark?: (transaction: FinancialTransaction) => void;
    selectedTransactions?: Set<number>;
    onTransactionSelect?: (transactionId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: (ids: number[]) => void;
    onClearSelection?: () => void;
    onRefresh?: () => void | Promise<void>;
}

type SortField = 'title' | 'category' | 'account' | 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

const AMOUNT_VALUE_FORMATTER = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function formatDateNumericOnly(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatDateIso(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/**
 * RFC 4180–style quoting for every cell so commas, newlines, or special
 * characters in titles/notes/account text cannot shift columns in Sheets/Excel.
 */
function csvQuoteCell(value: string | number | undefined | null): string {
    const s = String(value ?? "");
    return `"${s.replace(/"/g, '""')}"`;
}

/** Plain decimal for CSV (no locale grouping) so spreadsheets parse amounts reliably */
function formatAmountCsvPlain(n: number): string {
    return (Math.round(n * 100) / 100).toFixed(2);
}

function formatAccountForCsv(transaction: FinancialTransaction): string {
    if (!transaction.account) return "Cash";
    return `${transaction.account.bankName} | ${transaction.account.holderName} (${transaction.account.accountType})`;
}

function buildCsvFromTransactions(
    rows: FinancialTransaction[],
    displayCurrency: string,
    transactionType: TransactionType
): string {
    const typeLabel = transactionType === "EXPENSE" ? "Expense" : "Income";
    const displayCurrencySafe = (displayCurrency || "USD").trim();
    const displayCurrencyCode = displayCurrencySafe.toUpperCase();
    const headers = [
        "Type",
        "Title",
        "Description",
        "Category",
        "Date",
        "Account",
        "Tags",
        "Location",
        "Links",
        "Latitude",
        "Longitude",
        "Notes",
        "Original currency",
        "Amount (original)",
        `Amount (${displayCurrencyCode})`,
        "Recurring",
        "Bookmarked",
    ];
    const lines: string[][] = [headers];
    rows.forEach((t) => {
        const displayAmount = convertForDisplaySync(
            t.amount,
            t.currency,
            displayCurrencySafe
        );
        const currencyCode = (t.currency ?? "").trim();
        const { locationText, linksText } = splitLocationFieldForExport(t.location);
        const lat =
            t.transactionLocation != null &&
            Number.isFinite(Number(t.transactionLocation.latitude))
                ? String(t.transactionLocation.latitude)
                : "";
        const lng =
            t.transactionLocation != null &&
            Number.isFinite(Number(t.transactionLocation.longitude))
                ? String(t.transactionLocation.longitude)
                : "";
        lines.push([
            typeLabel,
            t.title,
            t.description ?? "",
            t.category.name,
            formatDateIso(t.date),
            formatAccountForCsv(t),
            t.tags.join("; "),
            locationText,
            linksText,
            lat,
            lng,
            t.notes ?? "",
            currencyCode,
            formatAmountCsvPlain(t.amount),
            formatAmountCsvPlain(displayAmount),
            t.isRecurring ? "Yes" : "No",
            t.isBookmarked ? "Yes" : "No",
        ]);
    });
    return lines
        .map((line) => line.map((cell) => csvQuoteCell(cell)).join(","))
        .join("\r\n");
}

export function FinancialList({ 
    transactions, 
    transactionType,
    currency = "USD", 
    onEdit, 
    onView,
    onDelete, 
    onBookmark,
    selectedTransactions = new Set(),
    onTransactionSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection,
    onRefresh
}: FinancialListProps) {
    const [selectedCurrency, setSelectedCurrency] = useState(currency);
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const ITEMS_PER_PAGE = 25;
    
    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        checkbox: 48,
        bookmark: 20,
        date: 120,
        title: 260,
        category: 130,
        account: 180,
        tags: 90,
        notes: 190,
        amount: 86,
        actions: 200
    });
    
    const tableRef = useRef<HTMLTableElement>(null);
    const [resizing, setResizing] = useState<string | null>(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const handleSort = useCallback((field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    }, [sortField, sortDirection]);

    const handleMouseDown = useCallback((e: React.MouseEvent, column: string) => {
        e.preventDefault();
        setResizing(column);
        setStartX(e.pageX);
        setStartWidth(columnWidths[column as keyof typeof columnWidths]);
    }, [columnWidths]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizing) return;
        
        const diff = e.pageX - startX;
        const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px
        
        setColumnWidths(prev => ({
            ...prev,
            [resizing]: newWidth
        }));
    }, [resizing, startX, startWidth]);

    const handleMouseUp = useCallback(() => {
        setResizing(null);
    }, []);

    useEffect(() => {
        if (resizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [resizing, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        setSelectedCurrency(currency);
    }, [currency]);

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <span className="text-gray-400">↕</span>;
        }
        return sortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
    };

    const amountHeaderLabel = `Amount (${selectedCurrency.toUpperCase()})`;

    const tableSummary = useMemo(() => {
        if (transactions.length === 0) {
            return {
                totalAmount: '0.00',
                dateRangeText: '—',
                uniqueCategoryCount: 0
            };
        }

        const totalAmount = transactions.reduce(
            (sum, t) => sum + convertForDisplaySync(t.amount, t.currency, selectedCurrency),
            0
        );

        const times = transactions.map((t) => new Date(t.date).getTime());
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const minDate = new Date(minTime);
        const maxDate = new Date(maxTime);
        const startStr = formatDateNumericOnly(minDate);
        const endStr = formatDateNumericOnly(maxDate);
        const dateRangeText = startStr === endStr ? startStr : `${startStr} – ${endStr}`;

        const uniqueCategoryCount = new Set(transactions.map((t) => t.category.name)).size;

        return {
            totalAmount: AMOUNT_VALUE_FORMATTER.format(totalAmount),
            dateRangeText,
            uniqueCategoryCount
        };
    }, [transactions, selectedCurrency]);

    const sortedTransactions = useMemo(() => {
        return [...transactions].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortField) {
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'category':
                    aValue = a.category.name.toLowerCase();
                    bValue = b.category.name.toLowerCase();
                    break;
                case 'account':
                    aValue = a.account ? `${a.account.bankName} - ${a.account.accountType}` : 'Cash';
                    bValue = b.account ? `${b.account.bankName} - ${b.account.accountType}` : 'Cash';
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                    break;
                case 'date':
                    aValue = new Date(a.date);
                    bValue = new Date(b.date);
                    break;
                case 'amount':
                    aValue = convertForDisplaySync(a.amount, a.currency, selectedCurrency);
                    bValue = convertForDisplaySync(b.amount, b.currency, selectedCurrency);
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) {
                return sortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [transactions, sortField, sortDirection, selectedCurrency]);

    const handleDownloadCsv = useCallback(() => {
        const csv = buildCsvFromTransactions(
            sortedTransactions,
            selectedCurrency,
            transactionType
        );
        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8",
        });
        const link = document.createElement("a");
        const prefix =
            transactionType === "EXPENSE" ? "expenses" : "incomes";
        link.download = `${prefix}-filtered-${new Date().toISOString().split("T")[0]}.csv`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }, [sortedTransactions, selectedCurrency, transactionType]);

    const handleRefresh = useCallback(async () => {
        if (!onRefresh || isRefreshing) return;
        try {
            setIsRefreshing(true);
            await Promise.resolve(onRefresh());
        } finally {
            setIsRefreshing(false);
        }
    }, [onRefresh, isRefreshing]);

    // Paginated transactions
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return sortedTransactions.slice(startIndex, endIndex);
    }, [sortedTransactions, currentPage, ITEMS_PER_PAGE]);

    // Reset to first page when sorting changes or transaction list changes
    useEffect(() => {
        setCurrentPage(1);
    }, [sortField, sortDirection, transactions.length]);

    const isAllSelected = selectedTransactions.size === transactions.length && transactions.length > 0;
    const isPartiallySelected = selectedTransactions.size > 0 && selectedTransactions.size < transactions.length;

    const handleSelectAll = () => {
        if (onSelectAll) {
            onSelectAll(!isAllSelected);
        }
    };

    const handleBulkDelete = () => {
        if (onBulkDelete && selectedTransactions.size > 0) {
            onBulkDelete(Array.from(selectedTransactions));
        }
    };

    const transactionLabel = transactionType === 'EXPENSE' ? 'Expenses' : 'Incomes';
    const emptyIcon = transactionType === 'EXPENSE' ? '💸' : '💰';
    const emptyMessage = transactionType === 'EXPENSE' ? 'No expenses found' : 'No incomes found';
    const emptySubtext = transactionType === 'EXPENSE' ? 'Start tracking your expenses to see them here.' : 'Start tracking your income sources to see them here.';
    const amountColorClass = transactionType === 'EXPENSE' ? 'text-red-600' : 'text-green-600';

    const summaryFooterColSpan =
        8 + (showBulkActions ? 1 : 0) + (onBookmark ? 1 : 0);

    if (transactions.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">{emptyIcon}</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyMessage}</h3>
                <p className="text-gray-500">{emptySubtext}</p>
            </div>
        );
    }

    // Table View
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
                <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {transactionLabel} ({transactions.length})
                        </h2>
                    <div className="flex items-center space-x-4">
                        {/* Bulk Actions */}
                        {showBulkActions && selectedTransactions.size > 0 && (
                            <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-gray-900">
                                    {selectedTransactions.size} selected
                                </span>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                                >
                                    Delete Selected
                                </button>
                                <button
                                    onClick={onClearSelection}
                                    className="px-3 py-1.5 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                            {onRefresh && (
                                <button
                                    type="button"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    aria-busy={isRefreshing}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 shrink-0 ${isRefreshing ? "animate-spin" : ""}`}
                                        aria-hidden
                                    />
                                    Refresh
                                </button>
                            )}
                            <div className="flex items-center space-x-2">
                                <select
                                    id={`${transactionType.toLowerCase()}-display-currency`}
                                    value={selectedCurrency}
                                    onChange={(event) => setSelectedCurrency(event.target.value)}
                                    className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    {SUPPORTED_CURRENCIES.map((currencyOption) => (
                                        <option key={currencyOption} value={currencyOption}>
                                            {currencyOption}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownloadCsv}
                                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <Download className="h-4 w-4 shrink-0" aria-hidden />
                                Download CSV
                            </button>
                        </div>
                        {/* Pagination */}
                        <CompactPagination
                            currentPage={currentPage}
                            totalItems={transactions.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                        <tr>
                            {showBulkActions && (
                                <th 
                                    className="px-2 py-3 text-center relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.checkbox}px` }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = isPartiallySelected;
                                        }}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'checkbox')}
                                    />
                                </th>
                            )}
                            {onBookmark && (
                                <th 
                                    className="px-1 py-3 text-center relative"
                                    style={{ width: `${columnWidths.bookmark}px` }}
                                >
                                    {/* Empty header for bookmark column */}
                                </th>
                            )}
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                style={{ width: `${columnWidths.title}px` }}
                                onClick={() => handleSort('title')}
                            >
                                <div className="flex items-center justify-start gap-2">
                                    <span>{transactionType === 'EXPENSE' ? 'Expense' : 'Income'}</span>
                                    {getSortIcon('title')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'title')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                style={{ width: `${columnWidths.category}px` }}
                                onClick={() => handleSort('category')}
                            >
                                <div className="flex items-center justify-start gap-2">
                                    <span>Category</span>
                                    {getSortIcon('category')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'category')}
                                />
                            </th>
                            <th 
                                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                style={{ width: `${columnWidths.date}px` }}
                                onClick={() => handleSort('date')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span>Date</span>
                                    {getSortIcon('date')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'date')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                style={{ width: `${columnWidths.account}px` }}
                                onClick={() => handleSort('account')}
                            >
                                <div className="flex items-center justify-start gap-2">
                                    <span>Account</span>
                                    {getSortIcon('account')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'account')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200"
                                style={{ width: `${columnWidths.tags}px` }}
                            >
                                Tags
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'tags')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200"
                                style={{ width: `${columnWidths.notes}px` }}
                            >
                                Notes
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'notes')}
                                />
                            </th>
                            <th 
                                className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                style={{ width: `${columnWidths.amount}px` }}
                                onClick={() => handleSort('amount')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span>{amountHeaderLabel}</span>
                                    {getSortIcon('amount')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'amount')}
                                />
                            </th>
                            <th 
                                className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                                style={{ width: `${columnWidths.actions}px` }}
                            >
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedTransactions.map((transaction, index) => (
                            <FinancialRow 
                                key={transaction.id} 
                                transaction={transaction} 
                                transactionType={transactionType}
                                currency={selectedCurrency}
                                onEdit={onEdit}
                                onView={onView}
                                onDelete={onDelete}
                                onBookmark={onBookmark}
                                isSelected={selectedTransactions.has(transaction.id)}
                                onSelect={onTransactionSelect}
                                showCheckbox={showBulkActions}
                                amountColorClass={amountColorClass}
                                columnWidths={columnWidths}
                                rowIndex={index}
                            />
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-transparent">
                            <td colSpan={summaryFooterColSpan} className="p-0 border-0">
                                <div className="flex flex-col gap-0.5 py-1">
                                    <div className="h-px w-full bg-gray-300" />
                                    <div className="h-px w-full bg-gray-300" />
                                </div>
                            </td>
                        </tr>
                        <tr className="bg-transparent">
                            {showBulkActions && (
                                <td className="px-2 py-4 text-center" style={{ width: `${columnWidths.checkbox}px` }} />
                            )}
                            {onBookmark && (
                                <td className="px-1 py-4 text-center" style={{ width: `${columnWidths.bookmark}px` }} />
                            )}
                            <td className="px-6 py-4 text-left" style={{ width: `${columnWidths.title}px` }} />
                            <td className="px-6 py-4 text-sm text-gray-800 text-left" style={{ width: `${columnWidths.category}px` }}>
                                <span className="font-medium tabular-nums">{tableSummary.uniqueCategoryCount}</span>
                                <span className="text-gray-500 font-normal"> unique</span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-800 text-center" style={{ width: `${columnWidths.date}px` }}>
                                <span className="whitespace-normal break-words">{tableSummary.dateRangeText}</span>
                            </td>
                            <td className="px-6 py-4 text-left" style={{ width: `${columnWidths.account}px` }} />
                            <td className="px-6 py-4 text-center" style={{ width: `${columnWidths.tags}px` }} />
                            <td className="px-6 py-4 text-center" style={{ width: `${columnWidths.notes}px` }} />
                            <td className={`px-3 py-4 text-sm font-semibold text-center tabular-nums ${amountColorClass}`} style={{ width: `${columnWidths.amount}px` }}>
                                {tableSummary.totalAmount}
                            </td>
                            <td className="px-3 py-4 text-center" style={{ width: `${columnWidths.actions}px` }} />
                        </tr>
                        <tr className="bg-transparent">
                            <td colSpan={summaryFooterColSpan} className="p-0 border-0">
                                <div className="flex flex-col gap-0.5 py-1">
                                    <div className="h-px w-full bg-gray-300" />
                                    <div className="h-px w-full bg-gray-300" />
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalItems={transactions.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}

function FinancialRow({ 
    transaction, 
    transactionType,
    currency = "USD", 
    onEdit, 
    onView,
    onDelete,
    onBookmark,
    isSelected = false,
    onSelect,
    showCheckbox = false,
    amountColorClass,
    columnWidths,
    rowIndex
}: { 
    transaction: FinancialTransaction; 
    transactionType: TransactionType;
    currency?: string;
    onEdit?: (transaction: FinancialTransaction) => void;
    onView?: (transaction: FinancialTransaction) => void;
    onDelete?: (transaction: FinancialTransaction) => void;
    onBookmark?: (transaction: FinancialTransaction) => void;
    isSelected?: boolean;
    onSelect?: (transactionId: number, selected: boolean) => void;
    showCheckbox?: boolean;
    amountColorClass: string;
    columnWidths: {
        checkbox: number;
        bookmark: number;
        title: number;
        category: number;
        account: number;
        date: number;
        tags: number;
        notes: number;
        amount: number;
        actions: number;
    };
    rowIndex: number;
}) {
    const handleEdit = () => {
        if (onEdit) {
            onEdit(transaction);
        }
    };

    const handleView = () => {
        if (onView) {
            onView(transaction);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(transaction);
        }
    };

    const handleBookmark = () => {
        if (onBookmark) {
            onBookmark(transaction);
        }
    };

    const handleSelect = () => {
        if (onSelect) {
            onSelect(transaction.id, !isSelected);
        }
    };

    const isEvenRow = rowIndex % 2 === 0;

    // Determine background color based on state priority: selected > hover > alternating
    const getRowBackgroundClass = () => {
        if (isSelected) return 'bg-blue-50';
        return isEvenRow ? 'bg-gray-50' : 'bg-gray-80';
    };

    return (
        <tr className={`hover:bg-[#ece3f4] hover:shadow-sm transition-colors duration-150 ${getRowBackgroundClass()}`}>
            {showCheckbox && (
                <td className="px-2 py-4 text-center" style={{ width: `${columnWidths.checkbox}px` }}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mx-auto"
                    />
                </td>
            )}
            {onBookmark && (
                <td className="px-1 py-4 text-center" style={{ width: `${columnWidths.bookmark}px` }}>
                    <button 
                        onClick={handleBookmark}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${
                            transaction.isBookmarked
                                ? 'text-blue-600 hover:bg-blue-50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                        title={transaction.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                    >
                        {transaction.isBookmarked ? (
                            <Bookmark className="w-4 h-4 fill-current" />
                        ) : (
                            <Bookmark className="w-4 h-4" />
                        )}
                    </button>
                </td>
            )}
            <td className="px-6 py-4 text-left align-middle" style={{ width: `${columnWidths.title}px` }}>
                <div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                        {transaction.title}
                        {transaction.isRecurring && (
                            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                transactionType === 'EXPENSE' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                                Recurring
                            </span>
                        )}
                    </div>
                    {transaction.description && (
                        <div className="text-sm text-gray-500 break-words">
                            {transaction.description}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 text-left align-middle" style={{ width: `${columnWidths.category}px` }}>
                <div className="flex items-center justify-start gap-2">
                    <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: transaction.category.color }}
                    ></div>
                    <span className="text-sm text-gray-900 break-words">{transaction.category.name}</span>
                </div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap text-center align-middle" style={{ width: `${columnWidths.date}px` }}>
                {formatDate(transaction.date)}
            </td>
            <td className="px-6 py-4 text-sm text-gray-900 text-left align-middle" style={{ width: `${columnWidths.account}px` }}>
                {transaction.account ? (
                    <div>
                        <div className="font-medium break-words">{transaction.account.bankName}</div>
                        <div className="text-gray-500 text-xs break-words">
                            {transaction.account.holderName} ({transaction.account.accountType})
                        </div>
                    </div>
                ) : (
                    <span className="flex items-center text-gray-600">
                        Cash
                    </span>
                )}
            </td>
            <td className="px-6 py-4 text-center align-middle" style={{ width: `${columnWidths.tags}px` }}>
                <div className="flex flex-wrap gap-1 justify-center">
                    {transaction.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </td>
            <td className="px-6 py-4 text-center align-middle" style={{ width: `${columnWidths.notes}px` }}>
                {transaction.notes ? (
                    <div className="text-sm text-gray-600 break-words text-center">
                        {transaction.notes}
                    </div>
                ) : (
                    <span className="text-xs text-gray-400">No notes</span>
                )}
            </td>
            <td className={`px-3 py-4 text-sm font-medium text-center tabular-nums align-middle ${amountColorClass}`} style={{ width: `${columnWidths.amount}px` }}>
                {AMOUNT_VALUE_FORMATTER.format(convertForDisplaySync(transaction.amount, transaction.currency, currency || 'USD'))}
            </td>
            <td className="px-3 py-4 text-center text-sm font-medium align-middle" style={{ width: `${columnWidths.actions}px` }}>
                <div className="flex justify-center flex-nowrap gap-1">
                    {onView && (
                        <button 
                            type="button"
                            onClick={handleView}
                            className="inline-flex shrink-0 items-center px-2 py-1 rounded-md text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                        >
                            View
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={handleEdit}
                        className="inline-flex shrink-0 items-center px-2 py-1 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                    >
                        Edit
                    </button>
                    <button 
                        type="button"
                        onClick={handleDelete}
                        className="inline-flex shrink-0 items-center px-2 py-1 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
} 