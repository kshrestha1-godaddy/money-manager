"use client";

import { useState, useMemo } from "react";
import { AccountInterface } from "../../types/accounts";
import { formatDate } from "../../utils/date";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";

interface AccountTableProps {
    accounts: AccountInterface[];
    onEdit?: (account: AccountInterface) => void;
    onDelete?: (account: AccountInterface) => void;
    onViewDetails?: (account: AccountInterface) => void;
}

type SortField = 'holderName' | 'bankName' | 'accountNumber' | 'accountOpeningDate' | 'balance';
type SortDirection = 'asc' | 'desc';

export function AccountTable({ accounts, onEdit, onDelete, onViewDetails }: AccountTableProps) {
    const { currency: userCurrency } = useCurrency();
    const [sortField, setSortField] = useState<SortField>('bankName');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                    Bank Accounts ({accounts.length})
                </h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
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
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AccountRow({ account, currency, onEdit, onDelete, onViewDetails }: { 
    account: AccountInterface;
    currency: string;
    onEdit?: (account: AccountInterface) => void;
    onDelete?: (account: AccountInterface) => void;
    onViewDetails?: (account: AccountInterface) => void;
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

    return (
        <tr className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
                <div>
                    <div className="text-sm font-medium text-gray-900">
                        {account.holderName}
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