"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Expense } from "../../types/financial";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { Pagination } from "../shared/Pagination";
import { CompactPagination } from "../shared/CompactPagination";

interface ExpenseListProps {
    expenses: Expense[];
    currency?: string;
    onEdit?: (expense: Expense) => void;
    onView?: (expense: Expense) => void;
    onDelete?: (expense: Expense) => void;
    selectedExpenses?: Set<number>;
    onExpenseSelect?: (expenseId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: () => void;
    onClearSelection?: () => void;
}

type SortField = 'title' | 'category' | 'account' | 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

export function ExpenseList({ 
    expenses, 
    currency = "USD", 
    onEdit, 
    onView,
    onDelete, 
    selectedExpenses = new Set(),
    onExpenseSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection
}: ExpenseListProps) {
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        checkbox: 80,
        title: 250,
        category: 150,
        account: 200,
        date: 120,
        tags: 150,
        notes: 200,
        amount: 120,
        actions: 150
    });
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

    // Add global mouse events for resizing
    useEffect(() => {
        if (resizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, handleMouseMove, handleMouseUp]);

    const getSortIcon = useCallback((field: SortField) => {
        if (sortField !== field) {
            return <span className="text-gray-400" aria-label="Sort">↕</span>;
        }
        return sortDirection === 'asc' ? 
            <span className="text-blue-600" aria-label="Sorted ascending">↑</span> : 
            <span className="text-blue-600" aria-label="Sorted descending">↓</span>;
    }, [sortField, sortDirection]);

    const sortedExpenses = useMemo(() => {
        return [...expenses].sort((a, b) => {
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
                    aValue = a.account ? `${a.account.bankName} - ${a.account.accountType}` : '';
                    bValue = b.account ? `${b.account.bankName} - ${b.account.accountType}` : '';
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                    break;
                case 'date':
                    aValue = new Date(a.date);
                    bValue = new Date(b.date);
                    break;
                case 'amount':
                    aValue = a.amount;
                    bValue = b.amount;
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
    }, [expenses, sortField, sortDirection]);

    // Paginated expenses
    const paginatedExpenses = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return sortedExpenses.slice(startIndex, endIndex);
    }, [sortedExpenses, currentPage, ITEMS_PER_PAGE]);

    // Reset to first page when sorting changes or expenses list changes
    useEffect(() => {
        setCurrentPage(1);
    }, [sortField, sortDirection, expenses.length]);

    const handleSelectAllClick = useCallback(() => {
        const allSelected = selectedExpenses.size === expenses.length;
        if (onSelectAll) {
            onSelectAll(!allSelected);
        }
    }, [selectedExpenses, expenses.length, onSelectAll]);

    const isAllSelected = useMemo(() => 
        selectedExpenses.size === expenses.length && expenses.length > 0,
        [selectedExpenses.size, expenses.length]
    );
    
    const isPartiallySelected = useMemo(() => 
        selectedExpenses.size > 0 && selectedExpenses.size < expenses.length,
        [selectedExpenses.size, expenses.length]
    );

    if (expenses.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">💸</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                <p className="text-gray-500">Start tracking your expenses by adding your first transaction.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <div className="flex justify-between w-full space-x-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Expenses ({expenses.length})
                        </h2>
                        <CompactPagination
                            currentPage={currentPage}
                            totalItems={expenses.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                    {showBulkActions && selectedExpenses.size > 0 && (
                        <div className="flex space-x-2">
                            <button
                                onClick={onClearSelection}
                                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                            >
                                Clear Selection
                            </button>
                            <button
                                onClick={onBulkDelete}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                            >
                                Delete Selected ({selectedExpenses.size})
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
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
                                        onChange={handleSelectAllClick}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <div 
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                        onMouseDown={(e) => handleMouseDown(e, 'checkbox')}
                                    />
                                </th>
                            )}
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                style={{ width: `${columnWidths.title}px` }}
                                onClick={() => handleSort('title')}
                            >
                                <div className="flex items-center justify-between">
                                    <span>Expense</span>
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
                                <div className="flex items-center justify-between">
                                    <span>Category</span>
                                    {getSortIcon('category')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'category')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                style={{ width: `${columnWidths.account}px` }}
                                onClick={() => handleSort('account')}
                            >
                                <div className="flex items-center justify-between">
                                    <span>Account</span>
                                    {getSortIcon('account')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'account')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                style={{ width: `${columnWidths.date}px` }}
                                onClick={() => handleSort('date')}
                            >
                                <div className="flex items-center justify-between">
                                    <span>Date</span>
                                    {getSortIcon('date')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'date')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200"
                                style={{ width: `${columnWidths.tags}px` }}
                            >
                                Tags
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'tags')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative border-r border-gray-200"
                                style={{ width: `${columnWidths.notes}px` }}
                            >
                                Notes
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'notes')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                style={{ width: `${columnWidths.amount}px` }}
                                onClick={() => handleSort('amount')}
                            >
                                <div className="flex items-center justify-between">
                                    <span>Amount</span>
                                    {getSortIcon('amount')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'amount')}
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
                        {paginatedExpenses.map((expense) => (
                            <ExpenseRow 
                                key={expense.id} 
                                expense={expense} 
                                currency={currency}
                                onEdit={onEdit}
                                onView={onView}
                                onDelete={onDelete}
                                isSelected={selectedExpenses.has(expense.id)}
                                onSelect={onExpenseSelect}
                                showCheckbox={showBulkActions}
                                columnWidths={columnWidths}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalItems={expenses.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}

function ExpenseRow({ 
    expense, 
    currency = "USD", 
    onEdit, 
    onView,
    onDelete,
    isSelected = false,
    onSelect,
    showCheckbox = false,
    columnWidths
}: { 
    expense: Expense; 
    currency?: string;
    onEdit?: (expense: Expense) => void;
    onView?: (expense: Expense) => void;
    onDelete?: (expense: Expense) => void;
    isSelected?: boolean;
    onSelect?: (expenseId: number, selected: boolean) => void;
    showCheckbox?: boolean;
    columnWidths: {
        checkbox: number;
        title: number;
        category: number;
        account: number;
        date: number;
        tags: number;
        notes: number;
        amount: number;
        actions: number;
    };
}) {
    const handleEdit = () => {
        if (onEdit) {
            onEdit(expense);
        }
    };

    const handleView = () => {
        if (onView) {
            onView(expense);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(expense);
        }
    };

    const handleSelect = () => {
        if (onSelect) {
            onSelect(expense.id, !isSelected);
        }
    };

    return (
        <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
            {showCheckbox && (
                <td className="px-6 py-4" style={{ width: `${columnWidths.checkbox}px` }}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                </td>
            )}
            <td className="px-6 py-4" style={{ width: `${columnWidths.title}px` }}>
                <div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                        {expense.title}
                        {expense.isRecurring && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Recurring
                            </span>
                        )}
                    </div>
                    {expense.description && (
                        <div className="text-sm text-gray-500 break-words">
                            {expense.description}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4" style={{ width: `${columnWidths.category}px` }}>
                <div className="flex items-center">
                    <div 
                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: expense.category.color }}
                    ></div>
                    <span className="text-sm text-gray-900 break-words">{expense.category.name}</span>
                </div>
            </td>
            <td className="px-6 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.account}px` }}>
                <div className="break-words">
                    {expense.account ? `${expense.account.bankName} - ${expense.account.accountType}` : '-'}
                </div>
            </td>
            <td className="px-6 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.date}px` }}>
                {formatDate(expense.date)}
            </td>
            <td className="px-6 py-4" style={{ width: `${columnWidths.tags}px` }}>
                <div className="flex flex-wrap gap-1">
                    {expense.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </td>
            <td className="px-6 py-4" style={{ width: `${columnWidths.notes}px` }}>
                {expense.notes ? (
                    <div className="text-sm text-gray-600 break-words">
                        {expense.notes}
                    </div>
                ) : (
                    <span className="text-xs text-gray-400">No notes</span>
                )}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-right text-red-600" style={{ width: `${columnWidths.amount}px` }}>
                {formatCurrency(expense.amount, currency)}
            </td>
            <td className="px-6 py-4 text-right text-sm font-medium" style={{ width: `${columnWidths.actions}px` }}>
                <div className="flex justify-end space-x-2">
                    {onView && (
                        <button 
                            onClick={handleView}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                        >
                            View
                        </button>
                    )}
                    <button 
                        onClick={handleEdit}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
} 