"use client";

import { useState, useMemo } from "react";
import { PasswordInterface } from "../../types/passwords";
import { formatDate } from "../../utils/date";
import { decryptPasswordValue } from "../../actions/passwords";

interface PasswordTableProps {
    passwords: PasswordInterface[];
    onEdit?: (password: PasswordInterface) => void;
    onDelete?: (password: PasswordInterface) => void;
    selectedPasswords?: Set<number>;
    onPasswordSelect?: (passwordId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: () => void;
    onClearSelection?: () => void;
}

type SortField = 'websiteName' | 'websiteUrl' | 'username' | 'createdAt' | 'category';
type SortDirection = 'asc' | 'desc';

export function PasswordTable({ 
    passwords, 
    onEdit, 
    onDelete,
    selectedPasswords = new Set(),
    onPasswordSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection 
}: PasswordTableProps) {
    const [sortField, setSortField] = useState<SortField>('websiteName');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const sortedPasswords = useMemo(() => {
        const sorted = [...passwords].sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortField) {
                case 'websiteName':
                    aValue = a.websiteName.toLowerCase();
                    bValue = b.websiteName.toLowerCase();
                    break;
                case 'websiteUrl':
                    aValue = a.websiteUrl.toLowerCase();
                    bValue = b.websiteUrl.toLowerCase();
                    break;
                case 'username':
                    aValue = a.username.toLowerCase();
                    bValue = b.username.toLowerCase();
                    break;
                case 'createdAt':
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                    break;
                case 'category':
                    aValue = (a.category || '').toLowerCase();
                    bValue = (b.category || '').toLowerCase();
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
    }, [passwords, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleSelectAll = () => {
        const allSelected = selectedPasswords.size === passwords.length;
        if (onSelectAll) {
            onSelectAll(!allSelected);
        }
    };

    const isAllSelected = selectedPasswords.size === passwords.length && passwords.length > 0;
    const isPartiallySelected = selectedPasswords.size > 0 && selectedPasswords.size < passwords.length;

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

    if (passwords.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">🔒</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No passwords found</h3>
                <p className="text-gray-500">Start by adding your first password.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Saved Passwords ({passwords.length})
                    </h2>
                    {showBulkActions && selectedPasswords.size > 0 && (
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
                                Delete Selected ({selectedPasswords.size})
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
                                onClick={() => handleSort('websiteName')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Website</span>
                                    {getSortIcon('websiteName')}
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('username')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Username</span>
                                    {getSortIcon('username')}
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Password</span>
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('category')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Category</span>
                                    {getSortIcon('category')}
                                </div>
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                onClick={() => handleSort('createdAt')}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Added Date</span>
                                    {getSortIcon('createdAt')}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedPasswords.map((password) => (
                            <PasswordRow 
                                key={password.id} 
                                password={password}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                isSelected={selectedPasswords.has(password.id)}
                                onSelect={onPasswordSelect}
                                showCheckbox={showBulkActions}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PasswordRow({ password, onEdit, onDelete, isSelected = false, onSelect, showCheckbox = false }: { 
    password: PasswordInterface;
    onEdit?: (password: PasswordInterface) => void;
    onDelete?: (password: PasswordInterface) => void;
    isSelected?: boolean;
    onSelect?: (passwordId: number, selected: boolean) => void;
    showCheckbox?: boolean;
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [secretKey, setSecretKey] = useState("");
    const [decryptedPassword, setDecryptedPassword] = useState("");
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [decryptError, setDecryptError] = useState("");

    const handleEdit = () => {
        if (onEdit) {
            onEdit(password);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(password);
        }
    };

    const handleSelect = () => {
        if (onSelect) {
            onSelect(password.id, !isSelected);
        }
    };

    const handleDecrypt = async () => {
        if (!secretKey.trim()) {
            setDecryptError("Secret key is required");
            return;
        }

        setIsDecrypting(true);
        setDecryptError("");

        try {
            const decrypted = await decryptPasswordValue({
                passwordHash: password.passwordHash,
                secretKey
            });
            setDecryptedPassword(decrypted);
            setDecryptError("");
        } catch (error) {
            setDecryptError("Failed to decrypt. Check your secret key.");
            console.error("Decryption error:", error);
        } finally {
            setIsDecrypting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
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
                        {password.websiteName}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {password.websiteUrl}
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <span className="text-sm text-gray-900 mr-2">{password.username}</span>
                    <button 
                        onClick={() => copyToClipboard(password.username)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy username"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {showPassword ? (
                    <div className="max-w-[200px]">
                        {decryptedPassword ? (
                            <div className="flex items-center">
                                <span className="font-mono text-sm text-gray-900 mr-2">{decryptedPassword}</span>
                                <button 
                                    onClick={() => copyToClipboard(decryptedPassword)}
                                    className="text-gray-400 hover:text-gray-600 mr-2"
                                    title="Copy password"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPassword(false);
                                        setDecryptedPassword("");
                                        setSecretKey("");
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                    Hide
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="password"
                                    value={secretKey}
                                    onChange={(e) => setSecretKey(e.target.value)}
                                    placeholder="Enter secret key"
                                    className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500"
                                />
                                <button
                                    onClick={handleDecrypt}
                                    disabled={isDecrypting}
                                    className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:bg-gray-400"
                                >
                                    {isDecrypting ? "..." : "Decrypt"}
                                </button>
                                {decryptError && (
                                    <span className="text-xs text-red-500">{decryptError}</span>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">••••••••••••</span>
                        <button 
                            onClick={() => setShowPassword(true)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            Show
                        </button>
                    </div>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {password.category ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                        {password.category}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(password.createdAt)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
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