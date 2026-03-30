"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { InvestmentInterface } from "../../../types/investments";
import {
    getInvestmentTypeBadgeClassName,
    getInvestmentTypeLabel,
    isDepositStyleType,
    isProvidentOrSafeType,
    normalizeInvestmentType,
} from "../utils/investmentTypeUi";
import { formatCurrency } from "../../../utils/currency";
import { formatDateYearMonthDay } from "../../../utils/date";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { getDefaultColumnWidths, getMinColumnWidth, type InvestmentColumnWidths } from "../../../config/tableConfig";
import { getActionButtonClasses } from "../../../config/colorConfig";
import { cn } from "@/lib/utils";
import { investmentTargetCompletionSortKey } from "../utils/investmentTargetSort";

/** True when this position is marked withheld from a linked account. */
function isInvestmentAmountWithheld(inv: InvestmentInterface): boolean {
    return Boolean(inv.deductFromAccount && inv.accountId);
}

function formatLinkedTargetDisplay(inv: InvestmentInterface): string | null {
    if (!inv.investmentTarget) return null;
    const id = inv.investmentTarget.id;
    const nick = inv.investmentTarget.nickname?.trim();
    const label =
        nick || getInvestmentTypeLabel(normalizeInvestmentType(inv.investmentTarget.investmentType));
    return `[${id}] ${label}`;
}

interface InvestmentTableProps {
    investments: InvestmentInterface[];
    onEdit: (investment: InvestmentInterface) => void;
    onDelete: (investment: InvestmentInterface) => void;
    onViewDetails: (investment: InvestmentInterface) => void;
    selectedInvestments?: Set<number>;
    onInvestmentSelect?: (investmentId: number, selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: () => void;
    onClearSelection?: () => void;
}

type SortField =
    | 'name'
    | 'targetCompletion'
    | 'type'
    | 'bank'
    | 'quantity'
    | 'purchasePrice'
    | 'currentPrice'
    | 'totalValue'
    | 'isWithheld'
    | 'gain'
    | 'purchaseDate';
type SortOrder = 'asc' | 'desc';

export function InvestmentTable({ 
    investments, 
    onEdit, 
    onDelete, 
    onViewDetails,
    selectedInvestments = new Set(),
    onInvestmentSelect,
    showBulkActions = true,
    onBulkDelete,
    onClearSelection 
}: InvestmentTableProps) {
    const [sortField, setSortField] = useState<SortField>('targetCompletion');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
    const { currency: userCurrency } = useCurrency();

    // Column resizing state - optimized for better space utilization
    const [columnWidths, setColumnWidths] = useState<InvestmentColumnWidths>(
        getDefaultColumnWidths('investments')
    );
    
    const tableRef = useRef<HTMLTableElement>(null);
    const [resizing, setResizing] = useState<string | null>(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
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

    const handleSelectAll = () => {
        if (!onInvestmentSelect) return;
        
        const currentTableInvestmentIds = investments.map(inv => inv.id);
        const allCurrentSelected = currentTableInvestmentIds.every(id => selectedInvestments.has(id));
        
        // Toggle selection for only the investments in this table
        currentTableInvestmentIds.forEach(id => {
            onInvestmentSelect(id, !allCurrentSelected);
        });
    };

    const isAllSelected = investments.length > 0 && investments.every(inv => selectedInvestments.has(inv.id));
    const isPartiallySelected = investments.some(inv => selectedInvestments.has(inv.id)) && !isAllSelected;

    const sortedInvestments = [...investments].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'targetCompletion':
                aValue = investmentTargetCompletionSortKey(a);
                bValue = investmentTargetCompletionSortKey(b);
                break;
            case 'type':
                aValue = a.type;
                bValue = b.type;
                break;
            case 'bank':
                aValue = a.account?.bankName?.toLowerCase() || '';
                bValue = b.account?.bankName?.toLowerCase() || '';
                break;
            case 'quantity':
                aValue = a.quantity;
                bValue = b.quantity;
                break;
            case 'purchasePrice':
                aValue = a.purchasePrice;
                bValue = b.purchasePrice;
                break;
            case 'currentPrice':
                aValue = a.currentPrice;
                bValue = b.currentPrice;
                break;
            case 'totalValue':
                aValue = a.quantity * a.currentPrice;
                bValue = b.quantity * b.currentPrice;
                break;
            case 'isWithheld':
                aValue = isInvestmentAmountWithheld(a) ? 1 : 0;
                bValue = isInvestmentAmountWithheld(b) ? 1 : 0;
                break;
            case 'gain':
                aValue = (a.currentPrice - a.purchasePrice) * a.quantity;
                bValue = (b.currentPrice - b.purchasePrice) * b.quantity;
                break;
            case 'purchaseDate':
                aValue = new Date(a.purchaseDate).getTime();
                bValue = new Date(b.purchaseDate).getTime();
                break;
            default:
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const tableFooterSummary = useMemo(() => {
        if (sortedInvestments.length === 0) {
            return {
                totalCost: 0,
                totalValue: 0,
                totalGain: 0,
                gainPct: 0,
                positionCount: 0,
                totalWithheldAmount: 0,
                withheldPositionCount: 0,
            };
        }
        let totalCost = 0;
        let totalValue = 0;
        let totalWithheldAmount = 0;
        let withheldPositionCount = 0;
        for (const inv of sortedInvestments) {
            totalCost += inv.quantity * inv.purchasePrice;
            totalValue += inv.quantity * inv.currentPrice;
            if (isInvestmentAmountWithheld(inv)) {
                totalWithheldAmount += inv.quantity * inv.purchasePrice;
                withheldPositionCount += 1;
            }
        }
        const totalGain = totalValue - totalCost;
        const gainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
        return {
            totalCost,
            totalValue,
            totalGain,
            gainPct,
            positionCount: sortedInvestments.length,
            totalWithheldAmount,
            withheldPositionCount,
        };
    }, [sortedInvestments]);

    const summaryFooterColSpan =
        12 + (showBulkActions ? 1 : 0);

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return '⇅';
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    const getGainColor = (gain: number) => {
        if (gain > 0) return 'text-green-600';
        if (gain < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getGainPercentage = (investment: InvestmentInterface) => {
        const gain = (investment.currentPrice - investment.purchasePrice) / investment.purchasePrice * 100;
        return gain.toFixed(2);
    };

    return (
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
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.investment}px` }}
                            onClick={() => handleSort('name')}
                        >
                            <div className="flex items-center justify-start gap-2">
                                <span>Investment</span>
                                {getSortIcon('name')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'investment')}
                            />
                        </th>
                        <th 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.target}px` }}
                            onClick={() => handleSort('targetCompletion')}
                        >
                            <div className="flex items-center justify-start gap-2">
                                <span>Target (goal %)</span>
                                {getSortIcon('targetCompletion')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'target')}
                            />
                        </th>
                        <th 
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.type}px` }}
                            onClick={() => handleSort('type')}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>Type</span>
                                {getSortIcon('type')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'type')}
                            />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.bank}px` }}
                            onClick={() => handleSort('bank')}
                        >
                            <div className="flex items-center justify-start gap-2">
                                <span>Bank</span>
                                {getSortIcon('bank')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'bank')}
                            />
                        </th>
                        <th 
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.purchaseDate}px` }}
                            onClick={() => handleSort('purchaseDate')}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>Purchase Date</span>
                                {getSortIcon('purchaseDate')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'purchaseDate')}
                            />
                        </th>
                        <th 
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.quantityInterest}px` }}
                            onClick={() => handleSort('quantity')}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>Quantity/Interest</span>
                                {getSortIcon('quantity')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'quantityInterest')}
                            />
                        </th>
                        <th 
                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.purchasePrincipal}px` }}
                            onClick={() => handleSort('purchasePrice')}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>Purchase/Principal</span>
                                {getSortIcon('purchasePrice')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'purchasePrincipal')}
                            />
                        </th>
                        <th 
                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.currentValue}px` }}
                            onClick={() => handleSort('currentPrice')}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>Current Value</span>
                                {getSortIcon('currentPrice')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'currentValue')}
                            />
                        </th>
                        <th 
                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.totalValue}px` }}
                            onClick={() => handleSort('totalValue')}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>Total Value</span>
                                {getSortIcon('totalValue')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'totalValue')}
                            />
                        </th>
                        <th 
                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.isWithheld}px` }}
                            onClick={() => handleSort('isWithheld')}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>Is Withheld</span>
                                {getSortIcon('isWithheld')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'isWithheld')}
                            />
                        </th>
                        <th 
                            className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.gainLoss}px` }}
                            onClick={() => handleSort('gain')}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <span>Gain/Loss</span>
                                {getSortIcon('gain')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'gainLoss')}
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
                    {sortedInvestments.map((investment) => {
                        const totalValue = investment.quantity * investment.currentPrice;
                        const totalCost = investment.quantity * investment.purchasePrice;
                        const gain = totalValue - totalCost;
                        const gainPercentage = getGainPercentage(investment);

                        return (
                            <InvestmentRow
                                key={investment.id}
                                investment={investment}
                                currency={userCurrency}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onViewDetails={onViewDetails}
                                isSelected={selectedInvestments.has(investment.id)}
                                onSelect={onInvestmentSelect}
                                showCheckbox={showBulkActions}
                                totalValue={totalValue}
                                gain={gain}
                                gainPercentage={gainPercentage}
                                getGainColor={getGainColor}
                                columnWidths={columnWidths}
                            />
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-transparent">
                        <td colSpan={summaryFooterColSpan} className="p-0 border-0">
                            <div className="flex flex-col gap-0.5 py-1">
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
                            style={{ width: `${columnWidths.investment}px` }}
                        >
                            Total
                        </td>
                        <td
                            className="px-4 py-4"
                            style={{ width: `${columnWidths.target}px` }}
                        />
                        <td
                            className="px-4 py-4"
                            style={{ width: `${columnWidths.type}px` }}
                        />
                        <td
                            className="px-6 py-4"
                            style={{ width: `${columnWidths.bank}px` }}
                        />
                        <td
                            className="px-4 py-4"
                            style={{ width: `${columnWidths.purchaseDate}px` }}
                        />
                        <td
                            className="px-4 py-4 text-center text-sm text-gray-800 tabular-nums"
                            style={{ width: `${columnWidths.quantityInterest}px` }}
                        >
                            <span className="font-medium">{tableFooterSummary.positionCount}</span>
                            <span className="text-gray-500 font-normal">
                                {" "}
                                {tableFooterSummary.positionCount === 1 ? "position" : "positions"}
                            </span>
                        </td>
                        <td
                            className="px-3 py-4 text-center text-sm font-semibold text-gray-900 tabular-nums"
                            style={{ width: `${columnWidths.purchasePrincipal}px` }}
                        >
                            {formatCurrency(tableFooterSummary.totalCost, userCurrency)}
                        </td>
                        <td
                            className="px-3 py-4 text-center text-sm text-gray-400"
                            style={{ width: `${columnWidths.currentValue}px` }}
                        >
                            —
                        </td>
                        <td
                            className="px-3 py-4 text-center text-sm font-semibold text-gray-900 tabular-nums"
                            style={{ width: `${columnWidths.totalValue}px` }}
                        >
                            {formatCurrency(tableFooterSummary.totalValue, userCurrency)}
                        </td>
                        <td
                            className="px-3 py-4 text-center text-sm font-semibold text-gray-900 tabular-nums"
                            style={{ width: `${columnWidths.isWithheld}px` }}
                        >
                            <div className="flex flex-col items-center gap-0.5">
                                <span>
                                    {formatCurrency(tableFooterSummary.totalWithheldAmount, userCurrency)}
                                </span>
                                {tableFooterSummary.withheldPositionCount > 0 && (
                                    <span className="text-xs font-normal text-gray-500">
                                        {tableFooterSummary.withheldPositionCount}{" "}
                                        {tableFooterSummary.withheldPositionCount === 1
                                            ? "position"
                                            : "positions"}
                                    </span>
                                )}
                            </div>
                        </td>
                        <td
                            className="px-3 py-4 text-center text-sm tabular-nums"
                            style={{ width: `${columnWidths.gainLoss}px` }}
                        >
                            <div className="space-y-1">
                                <div
                                    className={`font-semibold break-words ${getGainColor(tableFooterSummary.totalGain)}`}
                                >
                                    {formatCurrency(tableFooterSummary.totalGain, userCurrency)}
                                </div>
                                <div
                                    className={`text-xs break-words ${getGainColor(tableFooterSummary.totalGain)}`}
                                >
                                    ({tableFooterSummary.gainPct >= 0 ? "+" : ""}
                                    {tableFooterSummary.gainPct.toFixed(2)}%)
                                </div>
                            </div>
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
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

function InvestmentRow({ 
    investment, 
    currency, 
    onEdit, 
    onDelete, 
    onViewDetails, 
    isSelected = false, 
    onSelect, 
    showCheckbox = false,
    totalValue,
    gain,
    gainPercentage,
    getGainColor,
    columnWidths
}: { 
    investment: InvestmentInterface;
    currency: string;
    onEdit: (investment: InvestmentInterface) => void;
    onDelete: (investment: InvestmentInterface) => void;
    onViewDetails: (investment: InvestmentInterface) => void;
    isSelected?: boolean;
    onSelect?: (investmentId: number, selected: boolean) => void;
    showCheckbox?: boolean;
    totalValue: number;
    gain: number;
    gainPercentage: string;
    getGainColor: (gain: number) => string;
    columnWidths: InvestmentColumnWidths;
}) {
    const invType = normalizeInvestmentType(investment.type);
    const showInterestOrMaturityColumn = isDepositStyleType(invType) || isProvidentOrSafeType(invType);
    const targetLabel = formatLinkedTargetDisplay(investment);
    const isWithheld = isInvestmentAmountWithheld(investment);

    const handleSelect = () => {
        if (onSelect) {
            onSelect(investment.id, !isSelected);
        }
    };

    return (
        <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
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
            <td className="px-6 py-4 text-left align-top" style={{ width: `${columnWidths.investment}px` }}>
                <div>
                    <div className="text-sm font-medium text-gray-900 break-words leading-tight">
                        {investment.name}
                    </div>
                    {investment.symbol && (
                        <div className="text-sm text-gray-500 break-words leading-tight">
                            {investment.symbol}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-4 py-4 text-left align-top" style={{ width: `${columnWidths.target}px` }}>
                {targetLabel ? (
                    <div className="text-sm text-purple-900 break-words leading-tight">{targetLabel}</div>
                ) : (
                    <span className="text-sm text-gray-400">—</span>
                )}
            </td>
            <td className="px-4 py-4 align-top" style={{ width: `${columnWidths.type}px` }}>
                <div className="flex justify-center">
                    <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${getInvestmentTypeBadgeClassName(invType)}`}
                    >
                        {getInvestmentTypeLabel(invType)}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4 text-left align-top" style={{ width: `${columnWidths.bank}px` }}>
                <div className="text-sm text-gray-900 break-words">
                    {investment.account?.bankName ? (
                        investment.account.bankName
                    ) : (
                        <span className="text-gray-400">—</span>
                    )}
                </div>
                {investment.account?.holderName && (
                    <div className="text-xs text-gray-500 break-words leading-tight">
                        {investment.account.holderName}
                    </div>
                )}
            </td>
            <td className="px-4 py-4 text-sm text-gray-900 text-center align-top whitespace-nowrap" style={{ width: `${columnWidths.purchaseDate}px` }}>
                <div className="font-medium">{formatDateYearMonthDay(investment.purchaseDate)}</div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-900 text-center align-top" style={{ width: `${columnWidths.quantityInterest}px` }}>
                {showInterestOrMaturityColumn ? (
                    <div className="flex flex-col items-center space-y-1">
                        {investment.interestRate && (
                            <div className="font-medium">{investment.interestRate}% p.a.</div>
                        )}
                        {!investment.interestRate && !investment.maturityDate && isDepositStyleType(invType) && (
                            <div className="text-gray-500">No rate set</div>
                        )}
                        {!investment.interestRate && !investment.maturityDate && isProvidentOrSafeType(invType) && (
                            <div className="text-gray-500">-</div>
                        )}
                    </div>
                ) : (
                    <div className="font-medium tabular-nums">{investment.quantity}</div>
                )}
            </td>
            <td className="px-3 py-4 text-sm text-gray-900 text-center tabular-nums align-top" style={{ width: `${columnWidths.purchasePrincipal}px` }}>
                <div className="break-words font-medium">{formatCurrency(investment.purchasePrice, currency)}</div>
            </td>
            <td className="px-3 py-4 text-sm text-gray-900 text-center tabular-nums align-top" style={{ width: `${columnWidths.currentValue}px` }}>
                <div className="break-words font-medium">{formatCurrency(investment.currentPrice, currency)}</div>
            </td>
            <td className="px-3 py-4 text-sm font-medium text-gray-900 text-center tabular-nums align-top" style={{ width: `${columnWidths.totalValue}px` }}>
                <div className="break-words">{formatCurrency(totalValue, currency)}</div>
            </td>
            <td className="px-3 py-4 text-sm text-center align-top" style={{ width: `${columnWidths.isWithheld}px` }}>
                {isWithheld ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Yes
                    </span>
                ) : (
                    <span className="text-sm text-gray-500">No</span>
                )}
            </td>
            <td className="px-3 py-4 text-sm text-center tabular-nums align-top" style={{ width: `${columnWidths.gainLoss}px` }}>
                <div className="space-y-1">
                    <div className={`font-medium break-words ${getGainColor(gain)}`}>
                        {formatCurrency(gain, currency)}
                    </div>
                    <div className={`text-xs break-words ${getGainColor(gain)}`}>
                        ({gainPercentage}%)
                    </div>
                </div>
            </td>
            <td className="px-3 py-4 whitespace-nowrap text-center text-sm font-medium align-top" style={{ width: `${columnWidths.actions}px` }}>
                <div className="flex justify-center flex-nowrap gap-1">
                    <button 
                        type="button"
                        onClick={() => onViewDetails(investment)}
                        className={cn(
                            getActionButtonClasses('view', 'investments'),
                            'shrink-0 px-2 py-1 text-xs'
                        )}
                    >
                        View
                    </button>
                    <button 
                        type="button"
                        onClick={() => onEdit(investment)}
                        className={cn(
                            getActionButtonClasses('edit', 'investments'),
                            'shrink-0 px-2 py-1 text-xs'
                        )}
                    >
                        Edit
                    </button>
                    <button 
                        type="button"
                        onClick={() => onDelete(investment)}
                        className={cn(
                            getActionButtonClasses('delete', 'investments'),
                            'shrink-0 px-2 py-1 text-xs'
                        )}
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
} 