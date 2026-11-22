"use client";

import { useState, useMemo, useEffect, useRef, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Download, Eye } from "lucide-react";
import { AccountInterface } from "../../../types/accounts";
import { accountOpeningDay, formatAccountOpeningDate } from "../utils/accountOpeningDate";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { SUPPORTED_CURRENCIES } from "../../../utils/currencyConversion";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { getDefaultColumnWidths, getMinColumnWidth, type AccountColumnWidths } from "../../../config/tableConfig";
import { getActionButtonClasses } from "../../../config/colorConfig";
import { getAccountBalanceTotals, sumAccountWithheld } from "../utils/accountWithheld";
import { groupAccounts, type AccountGrouping } from "../utils/accountGrouping";
import { cn } from "@/lib/utils";
import { AccountChartVisibilityToggle } from "./AccountChartVisibilityToggle";

function computeAccountFreeBalance(
    account: AccountInterface,
    withheldAmounts: Record<string, number>
): number {
    return (account.balance ?? 0) - (withheldAmounts[account.id] ?? 0);
}

function csvQuoteCell(value: string | number | undefined | null): string {
    const s = String(value ?? "");
    return `"${s.replace(/"/g, '""')}"`;
}

function formatAmountCsvPlain(n: number): string {
    return (Math.round(n * 100) / 100).toFixed(2);
}

function buildAccountsTableCsv(
    rows: AccountInterface[],
    withheldAmounts: Record<string, number>,
    storedCurrency: string,
    displayCurrency: string
): string {
    const displayCode = (displayCurrency || "USD").trim().toUpperCase();
    const storedCode = (storedCurrency || "USD").trim().toUpperCase();
    const headers = [
        "Holder Name",
        "Account Type",
        "Bank Name",
        "Branch Name",
        "IFSC / Branch Code",
        "Opening Date",
        "Account Number",
        "Balance currency (stored)",
        `Balance (${storedCode})`,
        `Balance (${displayCode})`,
        `Withheld balance (${storedCode})`,
        `Withheld balance (${displayCode})`,
        `Free balance (${storedCode})`,
        `Free balance (${displayCode})`,
    ];
    const lines: string[][] = [headers];
    rows.forEach((account) => {
        const bal = account.balance ?? 0;
        const free = computeAccountFreeBalance(account, withheldAmounts);
        const balDisplay = convertForDisplaySync(bal, storedCode, displayCode);
        const freeDisplay = convertForDisplaySync(free, storedCode, displayCode);
        lines.push([
            account.holderName,
            account.accountType,
            account.bankName,
            account.branchName,
            account.branchCode ?? "",
            accountOpeningDay(account.accountOpeningDate),
            account.accountNumber,
            storedCode,
            formatAmountCsvPlain(bal),
            formatAmountCsvPlain(balDisplay),
            formatAmountCsvPlain(bal - free),
            formatAmountCsvPlain(balDisplay - freeDisplay),
            formatAmountCsvPlain(free),
            formatAmountCsvPlain(freeDisplay),
        ]);
    });
    return lines.map((line) => line.map((cell) => csvQuoteCell(cell)).join(",")).join("\r\n");
}

// Function to mask account number
const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    const maskedPart = 'X'.repeat(accountNumber.length - 4);
    const visiblePart = accountNumber.slice(-4);
    return maskedPart + visiblePart;
};

type WithheldDetails = Record<string, { id: number; name: string; targetName: string | null; amount: number }[]>;

interface AccountTableProps {
    accounts: AccountInterface[];
    selectedCurrency: string;
    setSelectedCurrency: (currency: string) => void;
    onEdit?: (account: AccountInterface) => void;
    onDelete?: (account: AccountInterface) => void;
    onViewDetails?: (account: AccountInterface) => void;
    onShare?: (account: AccountInterface) => void;
    selectedAccounts?: Set<number>;
    onAccountSelect?: (accountId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: () => void;
    isDeleting?: boolean;
    onClearSelection?: () => void;
    headerActions?: React.ReactNode;
    withheldDetails?: WithheldDetails;
}

type SortField = 'holderName' | 'bankName' | 'accountNumber' | 'accountOpeningDate' | 'balance' | 'freeBalance' | 'withheldBalance';
type SortDirection = 'asc' | 'desc';

export function AccountTable({
    accounts,
    selectedCurrency,
    setSelectedCurrency,
    onEdit,
    onDelete,
    onViewDetails,
    onShare,
    selectedAccounts = new Set(),
    onAccountSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    isDeleting = false,
    onClearSelection,
    headerActions,
    withheldDetails = {}
}: AccountTableProps) {
    const withheldAmounts = useMemo(() => sumAccountWithheld(withheldDetails), [withheldDetails]);
    const { currency: userCurrency } = useCurrency();
    const [grouping, setGrouping] = useState<AccountGrouping>("nickname");
    const [sortField, setSortField] = useState<SortField>('bankName');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const [visibleAccountNumber, setVisibleAccountNumber] = useState<number | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Column resizing state - optimized for better space utilization
    const [columnWidths, setColumnWidths] = useState<AccountColumnWidths>(
        getDefaultColumnWidths('accounts')
    );

    const tableRef = useRef<HTMLTableElement>(null);
    const [resizing, setResizing] = useState<string | null>(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const toggleAccountNumberVisibility = (accountId: number) => {
        if (hideTimer.current !== null) clearTimeout(hideTimer.current);
        if (visibleAccountNumber === accountId) {
            hideTimer.current = null;
            setVisibleAccountNumber(null);
            return;
        }

        setVisibleAccountNumber(accountId);
        hideTimer.current = setTimeout(() => {
            hideTimer.current = null;
            setVisibleAccountNumber(null);
        }, 3000);
    };

    useEffect(() => () => {
        if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    }, []);

    // Resizing handlers
    const handleMouseDown = useCallback((e: React.MouseEvent, column: string) => {
        e.preventDefault();
        e.stopPropagation();
        setResizing(column);
        setStartX(e.pageX);
        setStartWidth(columnWidths[column as keyof typeof columnWidths]);
    }, [columnWidths]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizing) return;

        const diff = e.pageX - startX;
        const newWidth = Math.max(getMinColumnWidth(), startWidth + diff);

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

    const columnTotals = useMemo(() => {
        const { balance, withheld, free } = getAccountBalanceTotals(accounts, withheldAmounts);
        return { totalBalance: balance, totalWithheld: withheld, totalFreeBalance: free };
    }, [accounts, withheldAmounts]);

    const displayTotalBalance = convertForDisplaySync(
        columnTotals.totalBalance,
        userCurrency,
        selectedCurrency
    );
    const displayTotalFreeBalance = convertForDisplaySync(
        columnTotals.totalFreeBalance,
        userCurrency,
        selectedCurrency
    );

    const sortedAccounts = useMemo(() => {
        const sorted = [...accounts].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortField) {
                case 'holderName':
                    aValue = a.holderName.toLowerCase();
                    bValue = b.holderName.toLowerCase();
                    break;
                case 'bankName':
                    aValue = a.bankName.toLowerCase();
                    bValue = b.bankName.toLowerCase();
                    break;
                case 'accountNumber':
                    aValue = a.accountNumber.toLowerCase();
                    bValue = b.accountNumber.toLowerCase();
                    break;
                case 'accountOpeningDate':
                    aValue = new Date(a.accountOpeningDate).getTime();
                    bValue = new Date(b.accountOpeningDate).getTime();
                    break;
                case 'balance':
                    aValue = convertForDisplaySync(a.balance || 0, userCurrency, selectedCurrency);
                    bValue = convertForDisplaySync(b.balance || 0, userCurrency, selectedCurrency);
                    break;
                case 'withheldBalance':
                    aValue = withheldAmounts[a.id] ?? 0;
                    bValue = withheldAmounts[b.id] ?? 0;
                    break;
                case 'freeBalance':
                    aValue = convertForDisplaySync(
                        computeAccountFreeBalance(a, withheldAmounts),
                        userCurrency,
                        selectedCurrency
                    );
                    bValue = convertForDisplaySync(
                        computeAccountFreeBalance(b, withheldAmounts),
                        userCurrency,
                        selectedCurrency
                    );
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

        return sorted;
    }, [accounts, sortField, sortDirection, withheldAmounts, userCurrency, selectedCurrency]);

    const accountGroups = useMemo(
        () => groupAccounts(sortedAccounts, grouping, withheldDetails),
        [sortedAccounts, grouping, withheldDetails]
    );

    const handleDownloadCsv = useCallback(() => {
        const csv = buildAccountsTableCsv(
            accountGroups.flatMap((group) => group.accounts),
            withheldAmounts,
            userCurrency,
            selectedCurrency
        );
        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8",
        });
        const link = document.createElement("a");
        link.download = `bank-accounts-${new Date().toISOString().split("T")[0]}.csv`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }, [accountGroups, accounts, withheldAmounts, userCurrency, selectedCurrency]);

    const balanceHeaderLabel = `Balance (${selectedCurrency.toUpperCase()})`;
    const freeBalanceHeaderLabel = `Free balance (${selectedCurrency.toUpperCase()})`;

    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleSelectAll = () => {
        const allSelected = selectedAccounts.size === accounts.length;
        if (onSelectAll) {
            onSelectAll(!allSelected);
        }
    };

    const handleBulkDelete = () => {
        if (onBulkDelete && !isDeleting && selectedAccounts.size > 0 &&
            window.confirm(`Delete ${selectedAccounts.size} selected account(s)? This cannot be undone.`)) {
            onBulkDelete();
        }
    };

    const isAllSelected = selectedAccounts.size === accounts.length && accounts.length > 0;
    const isPartiallySelected = selectedAccounts.size > 0 && selectedAccounts.size < accounts.length;

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }

        if (sortDirection === 'asc') {
            return (
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            );
        } else {
            return (
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            );
        }
    };

    if (accounts.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">🏦</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts found</h3>
                <p className="text-gray-500">Start by adding your first bank account.</p>
            </div>
        );
    }

    // Table View
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Bank Accounts ({accounts.length})
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 justify-end">
                        {showBulkActions && selectedAccounts.size > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={onClearSelection}
                                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                                >
                                    Clear Selection
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBulkDelete}
                                    disabled={isDeleting}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                >
                                    {isDeleting ? "Deleting…" : `Delete Selected (${selectedAccounts.size})`}
                                </button>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                            <label htmlFor="accounts-grouping" className="text-sm text-gray-500">Group by</label>
                            <div className="relative">
                            <select
                                id="accounts-grouping"
                                value={grouping}
                                onChange={(event) => setGrouping(event.target.value as AccountGrouping)}
                                className="h-9 appearance-none rounded-md border border-gray-300 bg-white pl-3 pr-9 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="nickname">Nickname</option>
                                <option value="accountType">Account type</option>
                                <option value="withheld">Withheld or not</option>
                                <option value="none">No grouping</option>
                            </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                            </div>
                            <div className="relative">
                            <select
                                id="accounts-display-currency"
                                aria-label="Table display currency"
                                value={selectedCurrency}
                                onChange={(event) => setSelectedCurrency(event.target.value)}
                                className="h-9 appearance-none rounded-md border border-gray-300 bg-white pl-3 pr-9 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                {SUPPORTED_CURRENCIES.map((currencyOption) => (
                                    <option key={currencyOption} value={currencyOption}>
                                        {currencyOption}
                                    </option>
                                ))}
                            </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                            </div>
                            <button
                                type="button"
                                onClick={handleDownloadCsv}
                                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <Download className="h-4 w-4 shrink-0" aria-hidden />
                                Download balances CSV
                            </button>
                        </div>
                        {headerActions}
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table ref={tableRef} className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                        <tr>
                            {showBulkActions && (
                                <th
                                    className="px-2 py-3 text-center relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.checkbox}px` }}
                                >
                                    <input
                                        type="checkbox"
                                        aria-label="Select all matching accounts"
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
                            <th scope="col" className="w-9 px-1 py-2 text-center text-gray-500" title="Balance chart visibility">
                                <Eye className="mx-auto h-4 w-4" aria-hidden="true" />
                                <span className="sr-only">Chart visibility</span>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                style={{ width: `${columnWidths.accountDetails}px` }}
                                aria-sort={sortField === 'holderName' ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
                                scope="col"
                            >
                                <button type="button" className="flex w-full items-center justify-start gap-2" onClick={() => handleSort('holderName')}>
                                    <span>Account Details</span>
                                    {getSortIcon('holderName')}
                                </button>
                                <div
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'accountDetails')}
                                />
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                style={{ width: `${columnWidths.bankBranch}px` }}
                                aria-sort={sortField === 'bankName' ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
                                scope="col"
                            >
                                <button type="button" className="flex w-full items-center justify-start gap-2" onClick={() => handleSort('bankName')}>
                                    <span>Bank & Branch</span>
                                    {getSortIcon('bankName')}
                                </button>
                                <div
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'bankBranch')}
                                />
                            </th>
                            <th
                                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                style={{ width: `${columnWidths.openingDate}px` }}
                                aria-sort={sortField === 'accountOpeningDate' ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
                                scope="col"
                            >
                                <button type="button" className="flex w-full items-center justify-center gap-2" onClick={() => handleSort('accountOpeningDate')}>
                                    <span>Opening Date</span>
                                    {getSortIcon('accountOpeningDate')}
                                </button>
                                <div
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'openingDate')}
                                />
                            </th>
                            <th
                                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                style={{ width: `${columnWidths.accountNumber}px` }}
                                aria-sort={sortField === 'accountNumber' ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
                                scope="col"
                            >
                                <button type="button" className="flex w-full items-center justify-center gap-2" onClick={() => handleSort('accountNumber')}>
                                    <span>Account Number</span>
                                    {getSortIcon('accountNumber')}
                                </button>
                                <div
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'accountNumber')}
                                />
                            </th>
                            <th
                                className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                style={{ width: `${columnWidths.balance}px` }}
                                aria-sort={sortField === 'balance' ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
                                scope="col"
                            >
                                <button type="button" className="flex w-full items-center justify-center gap-2" onClick={() => handleSort('balance')}>
                                    <span>{balanceHeaderLabel}</span>
                                    {getSortIcon('balance')}
                                </button>
                                <div
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'balance')}
                                />
                            </th>
                            <th
                                className="relative px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                style={{ width: `${columnWidths.withheldBalance}px` }}
                                aria-sort={sortField === 'withheldBalance' ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
                                scope="col"
                                title="Purchase amounts of investments marked withheld from this account"
                            >
                                <button type="button" className="flex w-full items-center justify-center gap-1" onClick={() => handleSort('withheldBalance')}>
                                    <span>Withheld ({selectedCurrency.toUpperCase()})</span>
                                    {getSortIcon('withheldBalance')}
                                </button>
                                <div className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500" onMouseDown={(e) => handleMouseDown(e, 'withheldBalance')} />
                            </th>
                            <th
                                className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                style={{ width: `${columnWidths.freeBalance}px` }}
                                aria-sort={sortField === 'freeBalance' ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
                                scope="col"
                            >
                                <button type="button" className="flex w-full items-center justify-center gap-2" onClick={() => handleSort('freeBalance')}>
                                    <span>{freeBalanceHeaderLabel}</span>
                                    {getSortIcon('freeBalance')}
                                </button>
                                <div
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'freeBalance')}
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
                    {accountGroups.map((group) => {
                        const balance = group.accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);
                        const withheld = group.accounts.reduce((sum, account) => sum + (withheldAmounts[account.id] ?? 0), 0);
                        const displayAmount = (amount: number) => formatCurrency(convertForDisplaySync(amount, userCurrency, selectedCurrency), selectedCurrency);
                        return (
                    <tbody key={group.key} className="bg-white divide-y divide-gray-200">
                        {grouping !== "none" && (
                            <tr className="bg-gray-50/80 [&>th]:border-y [&>td]:border-y [&>th]:border-gray-300 [&>td]:border-gray-300">
                                <th scope="rowgroup" colSpan={showBulkActions ? 6 : 5} className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                                    {group.label} <span className="ml-2 font-normal text-gray-400">({group.accounts.length})</span>
                                </th>
                                <td className="px-3 py-3 text-center text-xs font-medium text-gray-500 tabular-nums">{displayAmount(balance)}</td>
                                <td className="px-3 py-3 text-center text-xs font-medium text-gray-500 tabular-nums">{displayAmount(withheld)}</td>
                                <td className="px-3 py-3 text-center text-xs font-medium text-gray-500 tabular-nums">{displayAmount(balance - withheld)}</td>
                                <td />
                            </tr>
                        )}
                        {group.accounts.map((account) => (
                            <AccountRow
                                key={account.id}
                                account={account}
                                userCurrency={userCurrency}
                                displayCurrency={selectedCurrency}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onViewDetails={onViewDetails}
                                onShare={onShare}
                                isSelected={selectedAccounts.has(account.id)}
                                onSelect={onAccountSelect}
                                showCheckbox={showBulkActions}
                                columnWidths={columnWidths}
                                accountNumberVisible={visibleAccountNumber === account.id}
                                toggleAccountNumberVisibility={toggleAccountNumberVisibility}
                                withheldAmounts={withheldAmounts}
                                withheldDetails={withheldDetails}
                            />
                        ))}
                    </tbody>
                        );
                    })}
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                            {showBulkActions && (
                                <td
                                    className="px-2 py-3"
                                    style={{ width: `${columnWidths.checkbox}px` }}
                                />
                            )}
                            <td className="w-9 px-1 py-2" />
                            <td
                                colSpan={4}
                                className="px-6 py-3 text-right text-sm font-semibold text-gray-900"
                            >
                                Total
                            </td>
                            <td
                                className="px-3 py-3 whitespace-nowrap text-sm font-semibold text-center tabular-nums"
                                style={{ width: `${columnWidths.balance}px` }}
                            >
                                <span
                                    className={
                                        displayTotalBalance >= 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                    }
                                >
                                    {formatCurrency(displayTotalBalance, selectedCurrency)}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-center text-sm font-semibold text-gray-600 tabular-nums" style={{ width: `${columnWidths.withheldBalance}px` }}>
                                {formatCurrency(displayTotalBalance - displayTotalFreeBalance, selectedCurrency)}
                            </td>
                            <td
                                className="px-3 py-3 whitespace-nowrap text-sm font-semibold text-center tabular-nums"
                                style={{ width: `${columnWidths.freeBalance}px` }}
                            >
                                <span
                                    className={
                                        displayTotalFreeBalance >= 0
                                            ? "text-blue-600"
                                            : "text-red-600"
                                    }
                                >
                                    {formatCurrency(displayTotalFreeBalance, selectedCurrency)}
                                </span>
                            </td>
                            <td
                                className="px-3 py-3"
                                style={{ width: `${columnWidths.actions}px` }}
                            />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

function AccountRow({ account, userCurrency, displayCurrency, onEdit, onDelete, onViewDetails, onShare, isSelected = false, onSelect, showCheckbox = false, columnWidths, accountNumberVisible, toggleAccountNumberVisibility, withheldAmounts = {}, withheldDetails = {} }: {
    account: AccountInterface;
    userCurrency: string;
    displayCurrency: string;
    onEdit?: (account: AccountInterface) => void;
    onDelete?: (account: AccountInterface) => void;
    onViewDetails?: (account: AccountInterface) => void;
    onShare?: (account: AccountInterface) => void;
    isSelected?: boolean;
    onSelect?: (accountId: number, selected: boolean) => void;
    showCheckbox?: boolean;
    columnWidths: AccountColumnWidths;
    accountNumberVisible: boolean;
    toggleAccountNumberVisibility: (accountId: number) => void;
    withheldAmounts?: Record<string, number>;
    withheldDetails?: WithheldDetails;
}) {
    const handleEdit = () => {
        if (onEdit) {
            onEdit(account);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(account);
        }
    };

    const handleViewDetails = () => {
        if (onViewDetails) {
            onViewDetails(account);
        }
    };

    const handleShare = () => {
        if (onShare) {
            onShare(account);
        }
    };

    const handleSelect = () => {
        if (onSelect) {
            onSelect(account.id, !isSelected);
        }
    };

    const isAccountNumberVisible = accountNumberVisible;

    const accountFreeBalance = computeAccountFreeBalance(account, withheldAmounts);
    const displayBalance = convertForDisplaySync(account.balance ?? 0, userCurrency, displayCurrency);
    const displayFreeBalance = convertForDisplaySync(accountFreeBalance, userCurrency, displayCurrency);

    return (
        <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
            {showCheckbox && (
                <td
                    className="px-2 py-4 text-center whitespace-nowrap"
                    style={{ width: `${columnWidths.checkbox}px` }}
                >
                    <input
                        type="checkbox"
                        aria-label={`Select ${account.holderName} at ${account.bankName}`}
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mx-auto"
                    />
                </td>
            )}
            <td className="w-9 px-1 py-2 text-center">
                <AccountChartVisibilityToggle account={account} />
            </td>
            <td
                className="px-6 py-4 whitespace-nowrap truncate"
                style={{ width: `${columnWidths.accountDetails}px` }}
            >
                <div>
                    <div className="text-sm font-medium text-gray-900 truncate">
                        {account.holderName}
                        {account.nickname && (
                            <span className="text-xs text-blue-600 ml-2 px-1.5 py-0.5 bg-blue-50 rounded">
                                {account.nickname}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                        {account.accountType}
                    </div>
                </div>
            </td>
            <td
                className="px-6 py-4 whitespace-nowrap truncate"
                style={{ width: `${columnWidths.bankBranch}px` }}
            >
                <div>
                    <div className="text-sm font-medium text-gray-900 truncate">{account.bankName}</div>
                    <div className="text-sm text-gray-500 truncate">{account.branchName}</div>
                    {account.branchCode && (
                        <div className="text-xs text-gray-400 truncate">IFSC: {account.branchCode}</div>
                    )}
                </div>
            </td>
            <td
                className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center truncate"
                style={{ width: `${columnWidths.openingDate}px` }}
            >
                {formatAccountOpeningDate(account.accountOpeningDate)}
            </td>
            <td
                className="px-4 py-4 whitespace-nowrap"
                style={{ width: `${columnWidths.accountNumber}px` }}
            >
                <div className="flex items-center justify-center gap-2">
                    <div className="text-sm text-gray-900 font-mono truncate min-w-0">
                        {isAccountNumberVisible ? account.accountNumber : maskAccountNumber(account.accountNumber)}
                    </div>
                    <button
                        type="button"
                        onClick={() => toggleAccountNumberVisibility(account.id)}
                        className="shrink-0 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
                        title={isAccountNumberVisible ? 'Hide account number (auto-hides in 5s)' : 'Show account number'}
                    >
                        {isAccountNumberVisible ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        )}
                    </button>
                </div>
            </td>
            <td
                className="px-3 py-4 whitespace-nowrap text-sm font-medium text-center tabular-nums truncate"
                style={{ width: `${columnWidths.balance}px` }}
            >
                {account.balance !== undefined ? (
                    <span className={displayBalance >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(displayBalance, displayCurrency)}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-3 py-4 text-sm text-gray-600" style={{ width: `${columnWidths.withheldBalance}px` }}>
                <WithheldTooltip
                    items={withheldDetails[account.id] ?? []}
                    userCurrency={userCurrency}
                    displayCurrency={displayCurrency}
                />
            </td>
            <td
                className="px-3 py-4 whitespace-nowrap text-sm font-medium text-center tabular-nums truncate"
                style={{ width: `${columnWidths.freeBalance}px` }}
            >
                {account.balance !== undefined ? (
                    <span className={displayFreeBalance >= 0 ? "text-blue-600" : "text-red-600"}>
                        {formatCurrency(displayFreeBalance, displayCurrency)}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td
                className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium"
                style={{ width: `${columnWidths.actions}px` }}
            >
                <div className="flex justify-center flex-nowrap gap-1">
                    {onShare && (
                        <button
                            type="button"
                            onClick={handleShare}
                            className={cn(
                                getActionButtonClasses('share', 'accounts'),
                                'shrink-0 px-2 py-1 text-xs'
                            )}
                        >
                            Share
                        </button>
                    )}
                    {onViewDetails && (
                        <button
                            type="button"
                            onClick={handleViewDetails}
                            className={cn(
                                getActionButtonClasses('view', 'accounts'),
                                'shrink-0 px-2 py-1 text-xs'
                            )}
                        >
                            View
                        </button>
                    )}
                    {onEdit && (
                        <button
                            type="button"
                            onClick={handleEdit}
                            className={cn(
                                getActionButtonClasses('edit', 'accounts'),
                                'shrink-0 px-2 py-1 text-xs'
                            )}
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className={cn(
                                getActionButtonClasses('delete', 'accounts'),
                                'shrink-0 px-2 py-1 text-xs'
                            )}
                        >
                            Delete
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}
function WithheldTooltip({ items, userCurrency, displayCurrency }: {
    items: WithheldDetails[string];
    userCurrency: string;
    displayCurrency: string;
}) {
    const id = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [position, setPosition] = useState<{ top: number; left: number; above: boolean } | null>(null);
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const displayAmount = (amount: number) => formatCurrency(
        convertForDisplaySync(amount, userCurrency, displayCurrency), displayCurrency
    );
    const cancelClose = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    };
    const open = () => {
        cancelClose();
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const above = window.innerHeight - rect.bottom < 320;
        setPosition({
            top: above ? rect.top - 8 : rect.bottom + 8,
            left: Math.max(12, Math.min(rect.left + rect.width / 2 - 180, window.innerWidth - 372)),
            above,
        });
    };
    const scheduleClose = () => {
        cancelClose();
        closeTimer.current = setTimeout(() => setPosition(null), 150);
    };
    useEffect(() => () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
    }, []);
    useEffect(() => {
        if (!position) return;
        const close = () => setPosition(null);
        const onScroll = (event: Event) => {
            if (event.target instanceof Element && event.target.closest('[data-withheld-tooltip]')) return;
            close();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", close);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", close);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [position]);

    if (!items.length) return <span className="block text-center text-gray-400 tabular-nums">—</span>;

    return (
        <div className="text-center">
            <button
                ref={triggerRef}
                type="button"
                aria-describedby={position ? id : undefined}
                aria-label={`${displayAmount(total)} withheld in ${items.length} ${items.length === 1 ? "investment" : "investments"}. Show details`}
                onMouseEnter={open}
                onMouseLeave={scheduleClose}
                onFocus={open}
                onBlur={scheduleClose}
                onClick={open}
                className="rounded-sm border-b border-dotted border-gray-400 font-medium tabular-nums text-gray-700 hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4"
            >
                <span className="mr-1 text-gray-500">({items.length})</span>
                {displayAmount(total)}
            </button>
            {position && createPortal(
                <div
                    id={id}
                    role="tooltip"
                    data-withheld-tooltip
                    tabIndex={0}
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                    onFocus={cancelClose}
                    onBlur={scheduleClose}
                    className="fixed z-[100] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-gray-200 bg-white text-sm text-gray-700 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    style={{ top: position.top, left: position.left, transform: position.above ? "translateY(-100%)" : undefined }}
                >
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <span className="font-medium text-gray-900">Withheld investments</span>
                        <span className="text-xs text-gray-500">{items.length}</span>
                    </div>
                    <ul className="max-h-[min(240px,40vh)] overflow-y-auto overscroll-contain divide-y divide-gray-100 px-4">
                        {items.map((item) => (
                            <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                                <div className="min-w-0 break-words">
                                    <div>{item.name}</div>
                                    <div className="mt-1 text-xs text-gray-500">Target: {item.targetName ?? "No target"}</div>
                                </div>
                                <span className="shrink-0 font-medium tabular-nums text-gray-900">{displayAmount(item.amount)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="flex justify-between border-t border-gray-100 bg-gray-50 px-4 py-3 font-medium text-gray-900">
                        <span>Total withheld</span><span className="tabular-nums">{displayAmount(total)}</span>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}
