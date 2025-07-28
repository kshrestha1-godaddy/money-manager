"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AccountInterface } from "../../types/accounts";
import { formatDate } from "../../utils/date";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { getDefaultColumnWidths, getMinColumnWidth, type AccountColumnWidths } from "../../config/tableConfig";
import { COLORS, getActionButtonClasses } from "../../config/colorConfig";

// Function to mask account number
const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    const maskedPart = 'X'.repeat(accountNumber.length - 4);
    const visiblePart = accountNumber.slice(-4);
    return maskedPart + visiblePart;
};

interface AccountTableProps {
    accounts: AccountInterface[];
    onEdit?: (account: AccountInterface) => void;
    onDelete?: (account: AccountInterface) => void;
    onViewDetails?: (account: AccountInterface) => void;
    onShare?: (account: AccountInterface) => void;
    selectedAccounts?: Set<number>;
    onAccountSelect?: (accountId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: () => void;
    onClearSelection?: () => void;
}

type SortField = 'holderName' | 'bankName' | 'accountNumber' | 'accountOpeningDate' | 'balance';
type SortDirection = 'asc' | 'desc';

export function AccountTable({ 
    accounts, 
    onEdit, 
    onDelete, 
    onViewDetails,
    onShare,
    selectedAccounts = new Set(),
    onAccountSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection 
}: AccountTableProps) {
    const { currency: userCurrency } = useCurrency();
    const [sortField, setSortField] = useState<SortField>('bankName');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    
    // Track which account numbers are visible
    const [visibleAccountNumbers, setVisibleAccountNumbers] = useState<Set<number>>(new Set());
    // Track timers for auto-hiding account numbers
    const [hideTimers, setHideTimers] = useState<Map<number, NodeJS.Timeout>>(new Map());

    // Column resizing state - optimized for better space utilization
    const [columnWidths, setColumnWidths] = useState<AccountColumnWidths>(
        getDefaultColumnWidths('accounts')
    );
    
    const tableRef = useRef<HTMLTableElement>(null);
    const [resizing, setResizing] = useState<string | null>(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Toggle account number visibility
    const toggleAccountNumberVisibility = (accountId: number) => {
        setVisibleAccountNumbers(prev => {
            const newSet = new Set(prev);
            
                // Clear ALL existing timers and hide all other account numbers
            hideTimers.forEach((timer, id) => {
                clearTimeout(timer);
                if (id !== accountId) {
                    newSet.delete(id);
                }
            });
            
            // Clear the timers map
            setHideTimers(new Map());
            
            if (newSet.has(accountId)) {
                // Hide the current account number
                newSet.delete(accountId);
            } else {
                // Show only this account number and set timer to hide after 3 seconds
                newSet.add(accountId);
                const timer = setTimeout(() => {
                    setVisibleAccountNumbers(current => {
                        const updated = new Set(current);
                        updated.delete(accountId);
                        return updated;
                    });
                    setHideTimers(currentTimers => {
                        const newTimers = new Map(currentTimers);
                        newTimers.delete(accountId);
                        return newTimers;
                    });
                }, 3000);
                
                setHideTimers(new Map([[accountId, timer]]));
            }
            return newSet;
        });
    };

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            hideTimers.forEach(timer => clearTimeout(timer));
        };
    }, [hideTimers]);

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
                    aValue = a.balance || 0;
                    bValue = b.balance || 0;
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
    }, [accounts, sortField, sortDirection]);

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
        if (onBulkDelete && selectedAccounts.size > 0) {
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
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Bank Accounts ({accounts.length})
                    </h2>
                    {showBulkActions && selectedAccounts.size > 0 && (
                        <div className="flex space-x-2">
                            <button
                                onClick={onClearSelection}
                                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                            >
                                Clear Selection
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                            >
                                Delete Selected ({selectedAccounts.size})
                            </button>
                        </div>
                    )}
                </div>
            </div>
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
                                style={{ width: `${columnWidths.accountDetails}px` }}
                                onClick={() => handleSort('holderName')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Account Details</span>
                                    {getSortIcon('holderName')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'accountDetails')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                style={{ width: `${columnWidths.bankBranch}px` }}
                                onClick={() => handleSort('bankName')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Bank & Branch</span>
                                    {getSortIcon('bankName')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'bankBranch')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                style={{ width: `${columnWidths.accountNumber}px` }}
                                onClick={() => handleSort('accountNumber')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Account Number</span>
                                    {getSortIcon('accountNumber')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'accountNumber')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                style={{ width: `${columnWidths.openingDate}px` }}
                                onClick={() => handleSort('accountOpeningDate')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Opening Date</span>
                                    {getSortIcon('accountOpeningDate')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'openingDate')}
                                />
                            </th>
                            <th 
                                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative border-r border-gray-200"
                                style={{ width: `${columnWidths.balance}px` }}
                                onClick={() => handleSort('balance')}
                            >
                                <div className="flex items-center justify-end space-x-1">
                                    <span>Balance</span>
                                    {getSortIcon('balance')}
                                </div>
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'balance')}
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
                        {sortedAccounts.map((account) => (
                            <AccountRow 
                                key={account.id} 
                                account={account}
                                currency={userCurrency}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onViewDetails={onViewDetails}
                                onShare={onShare}
                                isSelected={selectedAccounts.has(account.id)}
                                onSelect={onAccountSelect}
                                showCheckbox={showBulkActions}
                                columnWidths={columnWidths}
                                visibleAccountNumbers={visibleAccountNumbers}
                                toggleAccountNumberVisibility={toggleAccountNumberVisibility}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AccountRow({ account, currency, onEdit, onDelete, onViewDetails, onShare, isSelected = false, onSelect, showCheckbox = false, columnWidths, visibleAccountNumbers, toggleAccountNumberVisibility }: { 
    account: AccountInterface;
    currency: string;
    onEdit?: (account: AccountInterface) => void;
    onDelete?: (account: AccountInterface) => void;
    onViewDetails?: (account: AccountInterface) => void;
    onShare?: (account: AccountInterface) => void;
    isSelected?: boolean;
    onSelect?: (accountId: number, selected: boolean) => void;
    showCheckbox?: boolean;
    columnWidths: AccountColumnWidths;
    visibleAccountNumbers: Set<number>;
    toggleAccountNumberVisibility: (accountId: number) => void;
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

    const isAccountNumberVisible = visibleAccountNumbers.has(account.id);

    return (
        <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
            {showCheckbox && (
                <td 
                    className="px-6 py-4 whitespace-nowrap truncate"
                    style={{ width: `${columnWidths.checkbox}px` }}
                >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                </td>
            )}
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
                className="px-6 py-4 whitespace-nowrap"
                style={{ width: `${columnWidths.accountNumber}px` }}
            >
                <div className="flex items-center space-between">
                    <div className="text-sm text-gray-900 font-mono truncate">
                        {isAccountNumberVisible ? account.accountNumber : maskAccountNumber(account.accountNumber)}
                    </div>
                    <button
                        onClick={() => toggleAccountNumberVisibility(account.id)}
                        className="ml-2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all duration-200"
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
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 truncate"
                style={{ width: `${columnWidths.openingDate}px` }}
            >
                {formatDate(account.accountOpeningDate)}
            </td>
            <td 
                className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right truncate"
                style={{ width: `${columnWidths.balance}px` }}
            >
                {account.balance !== undefined ? (
                    <span className="text-green-600">
                        {formatCurrency(account.balance, currency)}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td 
                className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                style={{ width: `${columnWidths.actions}px` }}
            >
                <div className="flex justify-end space-x-2">
                    {onShare && (
                        <button 
                            onClick={handleShare}
                            className={getActionButtonClasses('share', 'accounts')}
                        >
                            Share
                        </button>
                    )}
                    {onViewDetails && (
                        <button 
                            onClick={handleViewDetails}
                            className={getActionButtonClasses('view', 'accounts')}
                        >
                            View
                        </button>
                    )}
                    {onEdit && (
                        <button 
                            onClick={handleEdit}
                            className={getActionButtonClasses('edit', 'accounts')}
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            onClick={handleDelete}
                            className={getActionButtonClasses('delete', 'accounts')}
                        >
                            Delete
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
} 