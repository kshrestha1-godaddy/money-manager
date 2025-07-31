"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { TransactionType } from "../../utils/formUtils";
import { Pagination } from "./Pagination";
import { CompactPagination } from "./CompactPagination";

interface FinancialTransaction {
    id: number;
    title: string;
    description?: string;
    amount: number;
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
}

type SortField = 'title' | 'category' | 'account' | 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

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
    onClearSelection
}: FinancialListProps) {
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 25;
    
    // Column resizing state
    const [columnWidths, setColumnWidths] = useState({
        checkbox: 20,
        bookmark: 20,
        title: 200,
        category: 120,
        account: 192,
        date: 112,
        tags: 110,
        notes: 280,
        amount: 128,
        actions: 128
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

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <span className="text-gray-400">↕</span>;
        }
        return sortDirection === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
    };

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
    }, [transactions, sortField, sortDirection]);

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
                                    className="px-6 py-4 text-left relative border-r border-gray-200"
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
                                <div className="flex items-center justify-between">
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
                        {paginatedTransactions.map((transaction, index) => (
                            <FinancialRow 
                                key={transaction.id} 
                                transaction={transaction} 
                                transactionType={transactionType}
                                currency={currency}
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
                <td className="px-6 py-4" style={{ width: `${columnWidths.checkbox}px` }}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                </td>
            )}
            {onBookmark && (
                <td className="px-1 py-4 text-center" style={{ width: `${columnWidths.bookmark}px` }}>
                    <button 
                        onClick={handleBookmark}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${
                            transaction.isBookmarked
                                ? 'text-yellow-600 hover:bg-yellow-50'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                        title={transaction.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                    >
                        {transaction.isBookmarked ? (
                            <BookmarkCheck className="w-4 h-4" />
                        ) : (
                            <Bookmark className="w-4 h-4" />
                        )}
                    </button>
                </td>
            )}
            <td className="px-6 py-4" style={{ width: `${columnWidths.title}px` }}>
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
            <td className="px-6 py-4" style={{ width: `${columnWidths.category}px` }}>
                <div className="flex items-center">
                    <div 
                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: transaction.category.color }}
                    ></div>
                    <span className="text-sm text-gray-900 break-words">{transaction.category.name}</span>
                </div>
            </td>
            <td className="px-6 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.account}px` }}>
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
            <td className="px-6 py-4 text-sm text-gray-900" style={{ width: `${columnWidths.date}px` }}>
                {formatDate(transaction.date)}
            </td>
            <td className="px-6 py-4" style={{ width: `${columnWidths.tags}px` }}>
                <div className="flex flex-wrap gap-1">
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
            <td className="px-6 py-4" style={{ width: `${columnWidths.notes}px` }}>
                {transaction.notes ? (
                    <div className="text-sm text-gray-600 break-words">
                        {transaction.notes}
                    </div>
                ) : (
                    <span className="text-xs text-gray-400">No notes</span>
                )}
            </td>
            <td className={`px-6 py-4 text-sm font-medium text-right ${amountColorClass}`} style={{ width: `${columnWidths.amount}px` }}>
                {formatCurrency(transaction.amount, currency)}
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