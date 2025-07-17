"use client";

import { useState, useMemo, useEffect } from "react";
import { AccountInterface } from "../../types/accounts";
import { formatDate } from "../../utils/date";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";

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
    const [isMobile, setIsMobile] = useState(false);

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    // Mobile Card View
    if (isMobile) {
        return (
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Bank Accounts ({accounts.length})
                        </h2>
                    </div>
                </div>

                {/* Bulk Actions */}
                {showBulkActions && selectedAccounts.size > 0 && (
                    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-900">
                                {selectedAccounts.size} selected
                            </span>
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                                >
                                    Delete Selected
                                </button>
                                <button
                                    onClick={onClearSelection}
                                    className="px-3 py-1 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Cards */}
                <div className="divide-y divide-gray-200">
                    {sortedAccounts.map((account) => (
                        <div key={account.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-start space-x-3">
                                {/* Checkbox */}
                                {showBulkActions && (
                                    <div className="flex-shrink-0 pt-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedAccounts.has(account.id)}
                                            onChange={() => {
                                                if (onAccountSelect) {
                                                    onAccountSelect(account.id, !selectedAccounts.has(account.id));
                                                }
                                            }}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                    </div>
                                )}
                                
                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            {/* Bank Name and Nickname */}
                                            <div className="flex items-center space-x-2 mb-1">
                                                <h3 className="text-sm font-semibold text-gray-900 truncate">
                                                    {account.bankName}
                                                </h3>
                                                {account.nickname && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {account.nickname}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Account Holder */}
                                            <p className="text-sm text-gray-600 mb-2">
                                                {account.holderName} • {account.accountType}
                                            </p>
                                            
                                            {/* Account Number and Balance Row */}
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-500 font-mono">
                                                    {account.accountNumber}
                                                </span>
                                                <div className="text-lg font-bold text-green-600">
                                                    {account.balance !== undefined ? (
                                                        formatCurrency(account.balance, userCurrency)
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">No balance</span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Branch Info */}
                                            <div className="mb-2">
                                                <p className="text-sm text-gray-600">
                                                    {account.branchName}
                                                    {account.branchCode && (
                                                        <span className="text-gray-500"> • IFSC: {account.branchCode}</span>
                                                    )}
                                                </p>
                                            </div>
                                            
                                            {/* Opening Date */}
                                            <div className="mb-3">
                                                <p className="text-xs text-gray-500">
                                                    Opened: {formatDate(account.accountOpeningDate)}
                                                </p>
                                            </div>
                                            
                                            {/* Action Buttons */}
                                            <div className="flex space-x-2">
                                                {onShare && (
                                                    <button 
                                                        onClick={() => onShare(account)}
                                                        className="flex-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors text-center"
                                                    >
                                                        Share
                                                    </button>
                                                )}
                                                {onViewDetails && (
                                                    <button 
                                                        onClick={() => onViewDetails(account)}
                                                        className="flex-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors text-center"
                                                    >
                                                        View
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => onEdit && onEdit(account)}
                                                    className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors text-center"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => onDelete && onDelete(account)}
                                                    className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors text-center"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Desktop Table View
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
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {showBulkActions && (
                                <th className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = isPartiallySelected;
                                        }}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                </th>
                            )}
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('holderName')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Account Details</span>
                                    {getSortIcon('holderName')}
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('bankName')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Bank & Branch</span>
                                    {getSortIcon('bankName')}
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('accountNumber')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Account Number</span>
                                    {getSortIcon('accountNumber')}
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('accountOpeningDate')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Opening Date</span>
                                    {getSortIcon('accountOpeningDate')}
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('balance')}
                            >
                                <div className="flex items-center justify-end space-x-1">
                                    <span>Balance</span>
                                    {getSortIcon('balance')}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AccountRow({ account, currency, onEdit, onDelete, onViewDetails, onShare, isSelected = false, onSelect, showCheckbox = false }: { 
    account: AccountInterface;
    currency: string;
    onEdit?: (account: AccountInterface) => void;
    onDelete?: (account: AccountInterface) => void;
    onViewDetails?: (account: AccountInterface) => void;
    onShare?: (account: AccountInterface) => void;
    isSelected?: boolean;
    onSelect?: (accountId: number, selected: boolean) => void;
    showCheckbox?: boolean;
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

    return (
        <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
            {showCheckbox && (
                <td className="px-6 py-4 whitespace-nowrap">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                </td>
            )}
            <td className="px-6 py-4 whitespace-nowrap">
                <div>
                    <div className="text-sm font-medium text-gray-900">
                        {account.holderName}
                        {account.nickname && (
                            <span className="text-xs text-blue-600 ml-2 px-1.5 py-0.5 bg-blue-50 rounded">
                                {account.nickname}
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-gray-500">
                        {account.accountType}
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div>
                    <div className="text-sm font-medium text-gray-900">{account.bankName}</div>
                    <div className="text-sm text-gray-500">{account.branchName}</div>
                    {account.branchCode && (
                        <div className="text-xs text-gray-400">IFSC: {account.branchCode}</div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 font-mono">
                    {account.accountNumber}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(account.accountOpeningDate)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                {account.balance !== undefined ? (
                    <span className="text-green-600">
                        {formatCurrency(account.balance, currency)}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                    {onShare && (
                        <button 
                            onClick={handleShare}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-800 transition-colors"
                        >
                            Share
                        </button>
                    )}
                    {onViewDetails && (
                        <button 
                            onClick={handleViewDetails}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                        >
                            View
                        </button>
                    )}
                    {onEdit && (
                        <button 
                            onClick={handleEdit}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button 
                            onClick={handleDelete}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
} 