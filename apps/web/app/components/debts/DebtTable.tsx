"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { DebtInterface } from "../../types/debts";
import { formatDate } from "../../utils/date";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { calculateInterest, calculateRemainingWithInterest } from "../../utils/interestCalculation";
import { getDefaultColumnWidths, getMinColumnWidth, type DebtColumnWidths } from "../../config/tableConfig";
import { COLORS, getActionButtonClasses, getStatusClasses } from "../../config/colorConfig";

type SortField = 'borrowerName' | 'amount' | 'dueDate' | 'lentDate' | 'remaining';
type SortDirection = 'asc' | 'desc';

interface DebtTableProps {
    debts: DebtInterface[];
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
    const { currency: userCurrency } = useCurrency();
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
                    aValue = a.amount;
                    bValue = b.amount;
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
                    aValue = aRemainingCalc.remainingAmount;
                    bValue = bRemainingCalc.remainingAmount;
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
    }, [debts, sortField, sortDirection]);

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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No debts found</h3>
                <p className="text-gray-500">Start by adding your first debt record.</p>
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
                                        className="px-6 py-3 text-left relative border-r border-gray-200"
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
                                    <div className="flex items-center space-x-1">
                                        <span>Borrower Details</span>
                                        {getSortIcon('borrowerName')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'borrowerDetails')}
                                    />
                                </th>
                                <th 
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.amountStatus}px` }}
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>Amount & Status</span>
                                        {getSortIcon('amount')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'amountStatus')}
                                    />
                                </th>
                                <th 
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.interestProgress}px` }}
                                >
                                    Interest & Progress
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'interestProgress')}
                                    />
                                </th>
                                <th 
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.dates}px` }}
                                    onClick={() => handleSort('dueDate')}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>Dates</span>
                                        {getSortIcon('dueDate')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'dates')}
                                    />
                                </th>
                                <th 
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                    style={{ width: `${columnWidths.remaining}px` }}
                                    onClick={() => handleSort('remaining')}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>Remaining</span>
                                        {getSortIcon('remaining')}
                                    </div>
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'remaining')}
                                    />
                                </th>
                                <th 
                                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
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
                                    currency={userCurrency}
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
                    </table>
                </div>
        </div>
    );
}


function DebtRow({ 
    debt, 
    currency, 
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
    currency: string;
    onEdit?: (debt: DebtInterface) => void;
    onDelete?: (debt: DebtInterface) => void;
    onViewDetails?: (debt: DebtInterface) => void;
    onAddRepayment?: (debt: DebtInterface) => void;
    isSelected?: boolean;
    onSelect?: (debtId: number, selected: boolean) => void;
    showCheckbox?: boolean;
    columnWidths: DebtColumnWidths;
}) {
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
    const progressPercentage = (totalRepayments / remainingCalc.totalWithInterest) * 100;

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
                <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.checkbox}px` }}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                </td>
            )}
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.borrowerDetails}px` }}>
                <div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                        {debt.borrowerName}
                    </div>
                    <div className="text-sm text-gray-500 break-words">
                        {debt.purpose || 'Personal Loan'}
                    </div>
                    {debt.borrowerContact && (
                        <div className="text-xs text-gray-400 break-words">{debt.borrowerContact}</div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.amountStatus}px` }}>
                <div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                        {formatCurrency(debt.amount, currency)}
                    </div>
                    {interestCalc.interestAmount > 0 && (
                        <div className="text-xs text-gray-600 break-words">
                            + {formatCurrency(interestCalc.interestAmount, currency)} total interest
                        </div>
                    )}
                    {interestCalc.interestAmount > 0 && (
                        <div className="text-xs font-medium text-blue-600 break-words">
                            = {formatCurrency(interestCalc.totalAmountWithInterest, currency)} total
                        </div>
                    )}
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(debt.status)} mt-1`}>
                        {debt.status.replace('_', ' ')}
                    </span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.interestProgress}px` }}>
                <div>
                    <div className="text-sm text-gray-900">
                        {debt.interestRate}% interest
                        {interestCalc.interestAmount > 0 && (
                            <span className="text-xs text-gray-500 ml-1">
                                ({debt.dueDate ? interestCalc.daysTotal : interestCalc.daysElapsed} days {debt.dueDate ? 'term' : 'elapsed'})
                            </span>
                        )}
                    </div>
                    {interestCalc.interestAmount > 0 && (
                        <div className="text-xs text-orange-600 font-medium break-words">
                            Total Interest: {formatCurrency(interestCalc.interestAmount, currency)}
                        </div>
                    )}
                    <div className="text-xs text-gray-500 mb-1">
                        {progressPercentage.toFixed(1)}% repaid
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                            className="bg-green-600 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.dates}px` }}>
                <div>
                    <div className="text-sm text-gray-900 break-words">
                        Lent: {formatDate(debt.lentDate)}
                    </div>
                    <div className={`text-sm break-words ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        Due: {debt.dueDate ? formatDate(debt.dueDate) : 'No due date'}
                    </div>
                    {debt.dueDate && (
                        <div className="text-xs text-gray-500 mt-1 break-words">
                            {interestCalc.daysTotal} days term
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.remaining}px` }}>
                <div className={`text-sm font-medium break-words ${remainingCalc.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(remainingCalc.remainingAmount, currency)}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" style={{ width: `${columnWidths.actions}px` }}>
                <div className="flex justify-end space-x-1">
                    {onViewDetails && (
                        <button 
                            onClick={handleViewDetails}
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                        >
                            View
                        </button>
                    )}
                    {onAddRepayment && remainingCalc.remainingAmount > 0 && (
                        <button 
                            onClick={handleAddRepayment}
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-800 transition-colors"
                        >
                            Repay
                        </button>
                    )}
                    {onEdit && (
                        <button 
                            onClick={handleEdit}
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            onClick={handleDelete}
                            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
} 