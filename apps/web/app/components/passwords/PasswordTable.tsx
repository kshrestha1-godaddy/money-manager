"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { PasswordInterface } from "../../types/passwords";
import { formatDate } from "../../utils/date";
import { decryptPasswordValue } from "../../actions/passwords";

// Add ViewPasswordModal component
interface ViewPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    password: PasswordInterface;
}

function ViewPasswordModal({ isOpen, onClose, password }: ViewPasswordModalProps) {
    const [secretKey, setSecretKey] = useState("");
    const [decryptedPassword, setDecryptedPassword] = useState("");
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [decryptError, setDecryptError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [copySuccess, setCopySuccess] = useState<string | null>(null);

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
            setShowPassword(true);
            setDecryptError("");
        } catch (error) {
            setDecryptError("Failed to decrypt. Check your secret key.");
            console.error("Decryption error:", error);
        } finally {
            setIsDecrypting(false);
        }
    };

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(`${type} copied!`);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center">
                            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">{password.websiteName}</h3>
                                <p className="text-sm text-gray-500">{password.websiteUrl}</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-500 focus:outline-none"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                    {copySuccess && (
                        <div className="mb-4 bg-green-50 text-green-700 px-4 py-2 rounded-md flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {copySuccess}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                                Website Details
                            </h4>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Website Name</label>
                                    <div className="text-gray-900 font-medium">{password.websiteName}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">URL</label>
                                    <div className="flex items-center">
                                        <a 
                                            href={password.websiteUrl.startsWith('http') ? password.websiteUrl : `https://${password.websiteUrl}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline break-all mr-2"
                                        >
                                            {password.websiteUrl}
                                        </a>
                                        <button 
                                            onClick={() => copyToClipboard(password.websiteUrl, "URL")}
                                            className="text-gray-400 hover:text-gray-600"
                                            title="Copy URL"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                                    <div className="text-gray-900">
                                        {password.category ? (
                                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                                {password.category}
                                            </span>
                                        ) : "-"}
                                    </div>
                                </div>
                                {password.tags && password.tags.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500 mb-1">Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {password.tags.map((tag, index) => (
                                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Login Details
                            </h4>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                                    <div className="flex items-center">
                                        <span className="text-gray-900 font-medium mr-2">{password.username}</span>
                                        <button 
                                            onClick={() => copyToClipboard(password.username, "Username")}
                                            className="text-gray-400 hover:text-gray-600"
                                            title="Copy username"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Password</label>
                                    {showPassword && decryptedPassword ? (
                                        <div className="flex items-center">
                                            <span className="font-mono text-gray-900 mr-2 bg-gray-100 px-2 py-1 rounded">{decryptedPassword}</span>
                                            <button 
                                                onClick={() => copyToClipboard(decryptedPassword, "Password")}
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
                                                className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                            >
                                                Hide
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center">
                                                <span className="text-gray-600 mr-2">••••••••••••</span>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                <input
                                                    type="password"
                                                    value={secretKey}
                                                    onChange={(e) => setSecretKey(e.target.value)}
                                                    placeholder="Enter secret key"
                                                    className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-500 w-full sm:w-auto"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleDecrypt();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={handleDecrypt}
                                                    disabled={isDecrypting}
                                                    className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:bg-gray-400"
                                                >
                                                    {isDecrypting ? "Decrypting..." : "Decrypt"}
                                                </button>
                                            </div>
                                            {decryptError && (
                                                <p className="text-xs text-red-500">{decryptError}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {password.notes && (
                        <div className="mt-8">
                            <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Notes
                            </h4>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-800 whitespace-pre-wrap">
                                {password.notes}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            <div>Created: {formatDate(password.createdAt)}</div>
                            <div>Updated: {formatDate(password.updatedAt)}</div>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

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

type SortField = 'websiteName' | 'websiteUrl' | 'username' | 'createdAt' | 'category' | 'notes';
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
    const [viewingPassword, setViewingPassword] = useState<PasswordInterface | null>(null);
    
    // Add column resizing state
    const [columnWidths, setColumnWidths] = useState({
        checkbox: 64,
        website: 300,
        username: 200,
        password: 150,
        category: 150,
        notes: 200,
        date: 150,
        actions: 150
    });
    
    const tableRef = useRef<HTMLTableElement>(null);
    const [resizing, setResizing] = useState<string | null>(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

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
                case 'notes':
                    aValue = (a.notes || '').toLowerCase();
                    bValue = (b.notes || '').toLowerCase();
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

    // Add resizer component
    const Resizer = ({ column }: { column: string }) => (
        <div
            className="absolute top-0 right-0 h-full w-2 bg-gray-300 opacity-0 hover:opacity-100 cursor-col-resize"
            onMouseDown={(e) => handleMouseDown(e, column)}
        />
    );

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
                <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {showBulkActions && (
                                <th className="px-6 py-3 text-left relative" style={{ width: `${columnWidths.checkbox}px` }}>
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = isPartiallySelected;
                                        }}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <Resizer column="checkbox" />
                                </th>
                            )}
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative"
                                onClick={() => handleSort('websiteName')}
                                style={{ width: `${columnWidths.website}px` }}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Website</span>
                                    {getSortIcon('websiteName')}
                                </div>
                                <Resizer column="website" />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative"
                                onClick={() => handleSort('username')}
                                style={{ width: `${columnWidths.username}px` }}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Username</span>
                                    {getSortIcon('username')}
                                </div>
                                <Resizer column="username" />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                                style={{ width: `${columnWidths.password}px` }}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Password</span>
                                </div>
                                <Resizer column="password" />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative"
                                onClick={() => handleSort('category')}
                                style={{ width: `${columnWidths.category}px` }}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Category</span>
                                    {getSortIcon('category')}
                                </div>
                                <Resizer column="category" />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative"
                                onClick={() => handleSort('notes')}
                                style={{ width: `${columnWidths.notes}px` }}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Notes</span>
                                    {getSortIcon('notes')}
                                </div>
                                <Resizer column="notes" />
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none relative"
                                onClick={() => handleSort('createdAt')}
                                style={{ width: `${columnWidths.date}px` }}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Added Date</span>
                                    {getSortIcon('createdAt')}
                                </div>
                                <Resizer column="date" />
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                                style={{ width: `${columnWidths.actions}px` }}
                            >
                                Actions
                                <Resizer column="actions" />
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
                                onView={() => setViewingPassword(password)}
                                columnWidths={columnWidths}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* ViewPasswordModal */}
            {viewingPassword && (
                <ViewPasswordModal
                    isOpen={!!viewingPassword}
                    onClose={() => setViewingPassword(null)}
                    password={viewingPassword}
                />
            )}
        </div>
    );
}

function PasswordRow({ 
    password, 
    onEdit, 
    onDelete, 
    isSelected = false, 
    onSelect, 
    showCheckbox = false,
    onView,
    columnWidths
}: { 
    password: PasswordInterface;
    onEdit?: (password: PasswordInterface) => void;
    onDelete?: (password: PasswordInterface) => void;
    isSelected?: boolean;
    onSelect?: (passwordId: number, selected: boolean) => void;
    showCheckbox?: boolean;
    onView: () => void;
    columnWidths: {
        checkbox: number;
        website: number;
        username: number;
        password: number;
        category: number;
        notes: number;
        date: number;
        actions: number;
    };
}) {
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
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
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.website}px` }}>
                <div>
                    <div className="text-sm font-medium text-gray-900">
                        {password.websiteName}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">
                        {password.websiteUrl}
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.username}px` }}>
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
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.password}px` }}>
                <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">••••••••••••</span>
                </div>
            </td>
            
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.category}px` }}>
                {password.category ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                        {password.category}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-4" style={{ width: `${columnWidths.notes}px` }}>
                {password.notes ? (
                    <div className="max-w-[200px] text-sm text-gray-600">
                        <div className="truncate" title={password.notes}>
                            {password.notes}
                        </div>
                    </div>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" style={{ width: `${columnWidths.date}px` }}>
                {formatDate(password.createdAt)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" style={{ width: `${columnWidths.actions}px` }}>
                <div className="flex justify-end space-x-2">
                    <button 
                        onClick={onView}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                    >
                        View
                    </button>
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