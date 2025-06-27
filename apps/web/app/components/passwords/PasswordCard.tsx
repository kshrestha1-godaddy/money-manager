"use client";

import React, { useState } from "react";
import { PasswordInterface } from "../../types/passwords";
import { decryptPasswordValue } from "../../actions/passwords";

export function PasswordCard({ 
    password, 
    onEdit, 
    onDelete, 
    isSelected = false,
    onSelect,
    showCheckbox = false 
}: { 
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

    const handleSelect = () => {
        if (onSelect) {
            onSelect(password.id, !isSelected);
        }
    };

    const handleTogglePassword = async () => {
        if (showPassword) {
            setShowPassword(false);
            setDecryptedPassword("");
        } else {
            setShowPassword(true);
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

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow ${isSelected ? 'bg-gray-50 border-gray-300' : ''}`}>
            {/* Checkbox for bulk selection */}
            {showCheckbox && (
                <div className="flex justify-end mb-2">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                    />
                </div>
            )}
            
            {/* Header with favicon and title */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0">
                        {password.favicon ? (
                            <img 
                                src={password.favicon} 
                                alt={`${password.websiteName} favicon`}
                                className="w-6 h-6 rounded"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">{password.websiteName}</h3>
                        <p className="text-sm text-gray-600 truncate">
                            {password.description}
                        </p>
                    </div>
                </div>
                
                {password.category && (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full flex-shrink-0">
                        {password.category}
                    </span>
                )}
            </div>

            {/* Username */}
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Username:</span>
                    <div className="flex items-center">
                        <span className="text-sm text-gray-600 mr-2">{password.username}</span>
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
                </div>
            </div>

            {/* Password */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Password:</span>
                    <button 
                        onClick={handleTogglePassword}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                        {showPassword ? "Hide" : "Show"}
                    </button>
                </div>
                
                {showPassword ? (
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        {decryptedPassword ? (
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-sm">{decryptedPassword}</span>
                                <button 
                                    onClick={() => copyToClipboard(decryptedPassword)}
                                    className="text-gray-400 hover:text-gray-600"
                                    title="Copy password"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex mb-2">
                                    <input
                                        type="password"
                                        value={secretKey}
                                        onChange={(e) => setSecretKey(e.target.value)}
                                        placeholder="Enter secret key"
                                        className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-l focus:outline-none focus:ring-1 focus:ring-gray-500"
                                    />
                                    <button
                                        onClick={handleDecrypt}
                                        disabled={isDecrypting}
                                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded-r hover:bg-gray-700 disabled:bg-gray-400"
                                    >
                                        {isDecrypting ? "Decrypting..." : "Decrypt"}
                                    </button>
                                </div>
                                {decryptError && (
                                    <p className="text-xs text-red-500 mt-1">{decryptError}</p>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center">
                        <span className="text-sm text-gray-600">••••••••••••</span>
                    </div>
                )}
            </div>

            {/* Notes */}
            {password.notes && (
                <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700">Notes:</span>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{password.notes}</p>
                </div>
            )}

            {/* Tags */}
            {password.tags && password.tags.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                        {password.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                {tag}
                            </span>
                        ))}
                        {password.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                                +{password.tags.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Footer with date and actions */}
            <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-gray-500">
                    Added {formatDate(password.createdAt)}
                </div>
                
                <div className="flex space-x-2">
                    {onEdit && (
                        <button
                            onClick={() => onEdit(password)}
                            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    
                    {onDelete && (
                        <button
                            onClick={() => onDelete(password)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function PasswordGrid({ 
    passwords, 
    onEdit, 
    onDelete, 
    selectedPasswords = new Set(),
    onPasswordSelect,
    showBulkActions = false 
}: { 
    passwords: PasswordInterface[];
    onEdit?: (password: PasswordInterface) => void;
    onDelete?: (password: PasswordInterface) => void;
    selectedPasswords?: Set<number>;
    onPasswordSelect?: (passwordId: number, selected: boolean) => void;
    showBulkActions?: boolean;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-full w-full">
            {passwords.map((password) => (
                <PasswordCard 
                    key={password.id} 
                    password={password} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                    isSelected={selectedPasswords.has(password.id)}
                    onSelect={onPasswordSelect}
                    showCheckbox={showBulkActions}
                />
            ))}
        </div>
    );
} 