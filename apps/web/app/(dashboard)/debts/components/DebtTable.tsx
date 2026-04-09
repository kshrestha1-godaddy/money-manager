"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { DebtInterface } from "../../../types/debts";
import { formatDate } from "../../../utils/date";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import {
    calculateInterest,
    calculateRemainingWithInterest,
} from "../../../utils/interestCalculation";
import { getDefaultColumnWidths, getMinColumnWidth, type DebtColumnWidths } from "../../../config/tableConfig";
import { getDebtDisplayStatus } from "../../../utils/debtClassification";

type SortField = 'borrowerName' | 'amount' | 'interest' | 'total' | 'dueDate' | 'lentDate' | 'remaining';
type SortDirection = 'asc' | 'desc';

interface DebtTableProps {
    debts: DebtInterface[];
    /** Amounts are stored in this currency (typically user profile currency). */
    baseCurrency: string;
    /** Selected display currency for the table (may differ from base). */
    displayCurrency: string;
    onEdit?: (debt: DebtInterface) => void;
    onDelete?: (debt: DebtInterface) => void;
    onViewDetails?: (debt: DebtInterface) => void;
    onAddRepayment?: (debt: DebtInterface) => void;
    selectedDebts?: Set<number>;
    onDebtSelect?: (debtId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: () => void;
    onClearSelection?: () => void;
}

export function DebtTable({ 
    debts,
    baseCurrency,
    displayCurrency,
    onEdit, 
    onDelete, 
    onViewDetails, 
    onAddRepayment,
    selectedDebts = new Set(),
    onDebtSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection 
}: DebtTableProps) {
    const [sortField, setSortField] = useState<SortField>('dueDate');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    
    // Column resizing state - optimized for better space utilization
    const [columnWidths, setColumnWidths] = useState<DebtColumnWidths>(
        getDefaultColumnWidths('debts')
    );
    
    const tableRef = useRef<HTMLTableElement>(null);
    const [resizing, setResizing] = useState<string | null>(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);


    const handleSelectAll = () => {
        const allSelected = debts.every(debt => selectedDebts.has(debt.id));
        if (onSelectAll) {
            onSelectAll(!allSelected);
        }
    };

    // Resizing handlers
    const handleMouseDown = useCallback((e: React.MouseEvent, column: string) => {
        e.preventDefault();
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

    const isAllSelected = debts.length > 0 && debts.every(debt => selectedDebts.has(debt.id));
    const isPartiallySelected = debts.some(debt => selectedDebts.has(debt.id)) && !isAllSelected;
    const hasSelectionInSection = debts.some(debt => selectedDebts.has(debt.id));

    const sortedDebts = useMemo(() => {
        const sorted = [...debts].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortField) {
                case 'borrowerName':
                    aValue = a.borrowerName.toLowerCase();
                    bValue = b.borrowerName.toLowerCase();
                    break;
                case 'amount':
                    aValue = convertForDisplaySync(a.amount, baseCurrency, displayCurrency);
                    bValue = convertForDisplaySync(b.amount, baseCurrency, displayCurrency);
                    break;
                case 'interest':
                    aValue = convertForDisplaySync(
                        calculateInterest(a.amount, a.interestRate, a.lentDate, a.dueDate).interestAmount,
                        baseCurrency,
                        displayCurrency
                    );
                    bValue = convertForDisplaySync(
                        calculateInterest(b.amount, b.interestRate, b.lentDate, b.dueDate).interestAmount,
                        baseCurrency,
                        displayCurrency
                    );
                    break;
                case 'total':
                    aValue = convertForDisplaySync(
                        calculateInterest(a.amount, a.interestRate, a.lentDate, a.dueDate).totalAmountWithInterest,
                        baseCurrency,
                        displayCurrency
                    );
                    bValue = convertForDisplaySync(
                        calculateInterest(b.amount, b.interestRate, b.lentDate, b.dueDate).totalAmountWithInterest,
                        baseCurrency,
                        displayCurrency
                    );
                    break;
                case 'dueDate':
                    // Handle null/undefined due dates by putting them at the end
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return sortDirection === 'asc' ? 1 : -1;
                    if (!b.dueDate) return sortDirection === 'asc' ? -1 : 1;
                    
                    // Ensure we're working with Date objects
                    const aDate = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate);
                    const bDate = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate);
                    aValue = aDate.getTime();
                    bValue = bDate.getTime();
                    break;
                case 'lentDate':
                    // Ensure we're working with Date objects
                    const aLentDate = a.lentDate instanceof Date ? a.lentDate : new Date(a.lentDate);
                    const bLentDate = b.lentDate instanceof Date ? b.lentDate : new Date(b.lentDate);
                    aValue = aLentDate.getTime();
                    bValue = bLentDate.getTime();
                    break;
                case 'remaining':
                    const aRemainingCalc = calculateRemainingWithInterest(a.amount, a.interestRate, a.lentDate, a.dueDate, a.repayments || [], new Date(), a.status);
                    const bRemainingCalc = calculateRemainingWithInterest(b.amount, b.interestRate, b.lentDate, b.dueDate, b.repayments || [], new Date(), b.status);
                    aValue = convertForDisplaySync(aRemainingCalc.remainingAmount, baseCurrency, displayCurrency);
                    bValue = convertForDisplaySync(bRemainingCalc.remainingAmount, baseCurrency, displayCurrency);
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
    }, [debts, sortField, sortDirection, baseCurrency, displayCurrency]);

    const tableFooterSummary = useMemo(() => {
        if (sortedDebts.length === 0) {
            return {
                totalPrincipal: 0,
                totalInterest: 0,
                totalWithInterest: 0,
                totalRemaining: 0,
                debtCount: 0,
                lentRangeText: "—",
                dueRangeText: null as string | null,
            };
        }

        let totalPrincipal = 0;
        let totalInterest = 0;
        let totalWithInterest = 0;
        let totalRemaining = 0;
        const lentTimes: number[] = [];
        const dueTimes: number[] = [];
        const now = new Date();

        for (const debt of sortedDebts) {
            const interestCalc = calculateInterest(
                debt.amount,
                debt.interestRate,
                debt.lentDate instanceof Date ? debt.lentDate : new Date(debt.lentDate),
                debt.dueDate
                    ? debt.dueDate instanceof Date
                        ? debt.dueDate
                        : new Date(debt.dueDate)
                    : undefined,
                now
            );
            const remainingCalc = calculateRemainingWithInterest(
                debt.amount,
                debt.interestRate,
                debt.lentDate instanceof Date ? debt.lentDate : new Date(debt.lentDate),
                debt.dueDate
                    ? debt.dueDate instanceof Date
                        ? debt.dueDate
                        : new Date(debt.dueDate)
                    : undefined,
                debt.repayments || [],
                now,
                debt.status
            );

            totalPrincipal += debt.amount;
            totalInterest += interestCalc.interestAmount;
            totalWithInterest += interestCalc.totalAmountWithInterest;
            totalRemaining += remainingCalc.remainingAmount;

            const lent = debt.lentDate instanceof Date ? debt.lentDate : new Date(debt.lentDate);
            lentTimes.push(lent.getTime());
            if (debt.dueDate) {
                const due = debt.dueDate instanceof Date ? debt.dueDate : new Date(debt.dueDate);
                dueTimes.push(due.getTime());
            }
        }

        const minLent = lentTimes.length ? new Date(Math.min(...lentTimes)) : null;
        const maxLent = lentTimes.length ? new Date(Math.max(...lentTimes)) : null;
        const minDue = dueTimes.length ? new Date(Math.min(...dueTimes)) : null;
        const maxDue = dueTimes.length ? new Date(Math.max(...dueTimes)) : null;

        let lentRangeText = "—";
        if (minLent && maxLent) {
            const a = formatDate(minLent);
            const b = formatDate(maxLent);
            lentRangeText = a === b ? a : `${a} – ${b}`;
        }

        let dueRangeText: string | null = null;
        if (minDue && maxDue) {
            const a = formatDate(minDue);
            const b = formatDate(maxDue);
            dueRangeText = a === b ? a : `${a} – ${b}`;
        }

        return {
            totalPrincipal,
            totalInterest,
            totalWithInterest,
            totalRemaining,
            debtCount: sortedDebts.length,
            lentRangeText,
            dueRangeText,
        };
    }, [sortedDebts]);

    const displayPrincipal = convertForDisplaySync(
        tableFooterSummary.totalPrincipal,
        baseCurrency,
        displayCurrency
    );
    const displayInterest = convertForDisplaySync(
        tableFooterSummary.totalInterest,
        baseCurrency,
        displayCurrency
    );
    const displayWithInterest = convertForDisplaySync(
        tableFooterSummary.totalWithInterest,
        baseCurrency,
        displayCurrency
    );
    const displayRemaining = convertForDisplaySync(
        tableFooterSummary.totalRemaining,
        baseCurrency,
        displayCurrency
    );

    const summaryFooterColSpan = 8 + (showBulkActions ? 1 : 0);

    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

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

    if (debts.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">💰</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No lendings found</h3>
                <p className="text-gray-500">Start by adding your first lending record.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                                <th 
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.borrowerDetails}px` }}
                                    onClick={() => handleSort('borrowerName')}
                                >
                                    <div className="flex items-center justify-start gap-2">
                                        <span>Borrower Details</span>
                                        {getSortIcon('borrowerName')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'borrowerDetails')}
                                    />
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.lentDate}px` }}
                                    onClick={() => handleSort('lentDate')}
                                >
                                    <div className="flex items-center justify-start gap-2">
                                        <span>Lent Date</span>
                                        {getSortIcon('lentDate')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'lentDate')}
                                    />
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.dueDate}px` }}
                                    onClick={() => handleSort('dueDate')}
                                >
                                    <div className="flex items-center justify-start gap-2">
                                        <span>Due Date</span>
                                        {getSortIcon('dueDate')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'dueDate')}
                                    />
                                </th>
                                <th 
                                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.principal}px` }}
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Principal ({displayCurrency.toUpperCase()})</span>
                                        {getSortIcon('amount')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'principal')}
                                    />
                                </th>
                                <th 
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.interest}px` }}
                                    onClick={() => handleSort('interest')}
                                >
                                    <div className="flex items-center justify-start gap-2">
                                        <span>Interest ({displayCurrency.toUpperCase()})</span>
                                        {getSortIcon('interest')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'interest')}
                                    />
                                </th>
                                <th 
                                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.total}px` }}
                                    onClick={() => handleSort('total')}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span>Total ({displayCurrency.toUpperCase()})</span>
                                        {getSortIcon('total')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'total')}
                                    />
                                </th>
                                <th 
                                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.remaining}px` }}
                                    onClick={() => handleSort('remaining')}
                                >
                                    <div className="flex items-center justify-start gap-2">
                                        <span>Remaining ({displayCurrency.toUpperCase()})</span>
                                        {getSortIcon('remaining')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'remaining')}
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
                            {sortedDebts.map((debt) => (
                                <DebtRow 
                                    key={debt.id} 
                                    debt={debt}
                                    baseCurrency={baseCurrency}
                                    displayCurrency={displayCurrency}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onViewDetails={onViewDetails}
                                    onAddRepayment={onAddRepayment}
                                    isSelected={selectedDebts.has(debt.id)}
                                    onSelect={onDebtSelect}
                                    showCheckbox={showBulkActions}
                                    columnWidths={columnWidths}
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
                            <tr className="bg-gray-50/80">
                                {showBulkActions && (
                                    <td
                                        className="px-2 py-4 text-center"
                                        style={{ width: `${columnWidths.checkbox}px` }}
                                    />
                                )}
                                <td
                                    className="px-6 py-4 text-left text-sm font-semibold text-gray-900"
                                    style={{ width: `${columnWidths.borrowerDetails}px` }}
                                >
                                    Total
                                    <div className="text-xs font-normal text-gray-500 mt-0.5">
                                        {tableFooterSummary.debtCount}{" "}
                                        {tableFooterSummary.debtCount === 1 ? "loan" : "loans"}
                                    </div>
                                </td>
                                <td
                                    className="px-4 py-4 text-left text-sm text-gray-800"
                                    style={{ width: `${columnWidths.lentDate}px` }}
                                >
                                    <span className="tabular-nums">{tableFooterSummary.lentRangeText}</span>
                                </td>
                                <td
                                    className="px-4 py-4 text-left text-sm text-gray-800"
                                    style={{ width: `${columnWidths.dueDate}px` }}
                                >
                                    <span className="tabular-nums">{tableFooterSummary.dueRangeText ?? "—"}</span>
                                </td>
                                <td
                                    className="px-4 py-4 align-top text-center"
                                    style={{ width: `${columnWidths.principal}px` }}
                                >
                                    <span className="text-sm font-semibold text-gray-900 tabular-nums">
                                        {formatCurrency(displayPrincipal, displayCurrency)}
                                    </span>
                                </td>
                                <td
                                    className="px-4 py-4 text-left text-sm text-gray-900"
                                    style={{ width: `${columnWidths.interest}px` }}
                                >
                                    <span className="font-semibold tabular-nums text-orange-600">
                                        {formatCurrency(displayInterest, displayCurrency)}
                                    </span>
                                </td>
                                <td
                                    className="px-3 py-4 text-center text-sm text-blue-700"
                                    style={{ width: `${columnWidths.total}px` }}
                                >
                                    <span className="font-semibold tabular-nums">
                                        {formatCurrency(displayWithInterest, displayCurrency)}
                                    </span>
                                </td>
                                <td
                                    className="px-3 py-4 text-left text-sm font-semibold tabular-nums"
                                    style={{ width: `${columnWidths.remaining}px` }}
                                >
                                    <span
                                        className={
                                            tableFooterSummary.totalRemaining > 0
                                                ? "text-red-600"
                                                : "text-green-600"
                                        }
                                    >
                                        {formatCurrency(displayRemaining, displayCurrency)}
                                    </span>
                                </td>
                                <td
                                    className="px-3 py-4 text-center"
                                    style={{ width: `${columnWidths.actions}px` }}
                                />
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
        </div>
    );
}


function DebtRow({ 
    debt, 
    baseCurrency,
    displayCurrency,
    onEdit, 
    onDelete, 
    onViewDetails, 
    onAddRepayment,
    isSelected = false,
    onSelect,
    showCheckbox = false,
    columnWidths
}: { 
    debt: DebtInterface;
    baseCurrency: string;
    displayCurrency: string;
    onEdit?: (debt: DebtInterface) => void;
    onDelete?: (debt: DebtInterface) => void;
    onViewDetails?: (debt: DebtInterface) => void;
    onAddRepayment?: (debt: DebtInterface) => void;
    isSelected?: boolean;
    onSelect?: (debtId: number, selected: boolean) => void;
    showCheckbox?: boolean;
    columnWidths: DebtColumnWidths;
}) {
    function displayMoney(amount: number) {
        return formatCurrency(
            convertForDisplaySync(amount, baseCurrency, displayCurrency),
            displayCurrency
        );
    }

    const effectiveStatus = getDebtDisplayStatus(debt);

    // Calculate interest and remaining amounts
    const interestCalc = calculateInterest(debt.amount, debt.interestRate, debt.lentDate, debt.dueDate);
    const remainingCalc = calculateRemainingWithInterest(
        debt.amount, 
        debt.interestRate, 
        debt.lentDate, 
        debt.dueDate, 
        debt.repayments || [],
        new Date(),
        debt.status
    );
    
    const totalRepayments = debt.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
    const progressPercentage = remainingCalc.totalWithInterest > 0
        ? (totalRepayments / remainingCalc.totalWithInterest) * 100
        : 0;

    // Check if debt is overdue
    const isOverdue = debt.dueDate && new Date() > debt.dueDate && remainingCalc.remainingAmount > 0;

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'text-blue-600 bg-blue-50';
            case 'PARTIALLY_PAID':
                return 'text-yellow-600 bg-yellow-50';
            case 'FULLY_PAID':
                return 'text-green-600 bg-green-50';
            case 'OVERDUE':
                return 'text-red-600 bg-red-50';
            case 'DEFAULTED':
                return 'text-gray-600 bg-gray-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit(debt);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(debt);
        }
    };

    const handleViewDetails = () => {
        if (onViewDetails) {
            onViewDetails(debt);
        }
    };

    const handleAddRepayment = () => {
        if (onAddRepayment) {
            onAddRepayment(debt);
        }
    };

    const handleSelect = () => {
        if (onSelect) {
            onSelect(debt.id, !isSelected);
        }
    };

    return (
        <tr className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''} ${isSelected ? 'bg-blue-50' : ''}`}>
            {showCheckbox && (
                <td className="px-2 py-4 text-center whitespace-nowrap" style={{ width: `${columnWidths.checkbox}px` }}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mx-auto"
                    />
                </td>
            )}
            <td className="px-6 py-4 text-left align-middle" style={{ width: `${columnWidths.borrowerDetails}px` }}>
                <div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                        {debt.borrowerName}
                    </div>
                    <div className="text-sm text-gray-500 break-words">
                        {debt.purpose || 'Personal Loan'}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(effectiveStatus)} mt-1`}>
                        {effectiveStatus.replace('_', ' ')}
                    </span>
                    {debt.borrowerContact && (
                        <div className="text-xs text-gray-400 break-words">{debt.borrowerContact}</div>
                    )}
                </div>
            </td>
            <td className="px-4 py-4 align-middle text-left" style={{ width: `${columnWidths.lentDate}px` }}>
                <div className="text-sm text-gray-900 break-words">
                    {formatDate(debt.lentDate)}
                </div>
            </td>
            <td className="px-4 py-4 align-middle text-left" style={{ width: `${columnWidths.dueDate}px` }}>
                <div className={`text-sm break-words ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {debt.dueDate ? formatDate(debt.dueDate) : 'No due date'}
                </div>
                {debt.dueDate && (
                    <div className="text-xs text-gray-500 mt-1 break-words">
                        {interestCalc.daysTotal} days term
                    </div>
                )}
            </td>
            <td className="px-4 py-4 align-middle text-center" style={{ width: `${columnWidths.principal}px` }}>
                <div className="flex flex-col items-center text-center">
                    <div className="text-sm font-medium text-gray-900 break-words">
                        {displayMoney(debt.amount)}
                    </div>
                </div>
            </td>
            <td className="px-4 py-4 align-middle text-left" style={{ width: `${columnWidths.interest}px` }}>
                <div className="w-full min-w-0 flex flex-col text-left">
                    <div className="text-sm font-semibold text-orange-600 tabular-nums">
                        {displayMoney(interestCalc.interestAmount)}
                    </div>
                    <div className="text-xs text-gray-700 mt-0.5">
                        {debt.interestRate}% interest
                        <span className="text-gray-500 ml-1">
                            ({debt.dueDate ? interestCalc.daysTotal : interestCalc.daysElapsed} days {debt.dueDate ? 'term' : 'elapsed'})
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 break-words">
                        = {displayMoney(debt.amount)} × {(debt.interestRate / 100).toFixed(4)} × {((debt.dueDate ? interestCalc.daysTotal : interestCalc.daysElapsed) / 365).toFixed(4)}
                    </div>
                </div>
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-center tabular-nums align-middle text-blue-700" style={{ width: `${columnWidths.total}px` }}>
                {displayMoney(interestCalc.totalAmountWithInterest)}
            </td>
            <td className="px-3 py-4 text-sm font-medium text-left tabular-nums align-middle" style={{ width: `${columnWidths.remaining}px` }}>
                <div className="flex w-full flex-col justify-center gap-1">
                    <div className="flex w-full items-center justify-between gap-2">
                        <span className={remainingCalc.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                            {displayMoney(remainingCalc.remainingAmount)}
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                            {progressPercentage.toFixed(1)}% repaid
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                            className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium align-middle" style={{ width: `${columnWidths.actions}px` }}>
                <div className="flex justify-center flex-nowrap gap-1">
                    {onViewDetails && (
                        <button 
                            type="button"
                            onClick={handleViewDetails}
                            className="inline-flex shrink-0 items-center px-2 py-1 rounded-md text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                        >
                            View
                        </button>
                    )}
                    {onAddRepayment && remainingCalc.remainingAmount > 0 && (
                        <button 
                            type="button"
                            onClick={handleAddRepayment}
                            className="inline-flex shrink-0 items-center px-2 py-1 rounded-md text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-800 transition-colors"
                        >
                            Repay
                        </button>
                    )}
                    {onEdit && (
                        <button 
                            type="button"
                            onClick={handleEdit}
                            className="inline-flex shrink-0 items-center px-2 py-1 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            type="button"
                            onClick={handleDelete}
                            className="inline-flex shrink-0 items-center px-2 py-1 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
} 