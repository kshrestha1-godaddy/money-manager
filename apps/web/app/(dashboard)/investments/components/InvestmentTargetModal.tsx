"use client";

import React, { useState, useEffect, useCallback } from "react";
import { InvestmentTarget, InvestmentTargetFormData } from "../../../types/investments";
import { X, Target, Calendar, Plus, Trash2 } from "lucide-react";
import { getCurrencySymbol } from "../../../utils/currency";

// Utility function to format date for input field (yyyy-mm-dd)
const formatDateForInput = (date: Date | undefined | null): string => {
    if (!date) return "";
    return new Date(date).toISOString().split('T')[0];
};

// Utility function to parse date from input field
const parseDateFromInput = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    return new Date(dateString);
};

// Shared constants for investment components
export const INVESTMENT_TYPES = [
    { value: 'STOCKS', label: 'Stocks' },
    { value: 'CRYPTO', label: 'Cryptocurrency' },
    { value: 'MUTUAL_FUNDS', label: 'Mutual Funds' },
    { value: 'BONDS', label: 'Bonds' },
    { value: 'REAL_ESTATE', label: 'Real Estate' },
    { value: 'GOLD', label: 'Gold' },
    { value: 'SILVER', label: 'Silver' },
    { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit' },
    { value: 'EMERGENCY_FUND', label: 'Emergency Fund' },
    { value: 'MARRIAGE', label: 'Marriage' },
    { value: 'VACATION', label: 'Vacation' },
    { value: 'PROVIDENT_FUNDS', label: 'Provident Funds' },
    { value: 'SAFE_KEEPINGS', label: 'Safe Keepings' },
    { value: 'OTHER', label: 'Other' },
] as const;

export const formatInvestmentType = (type: string): string => {
    switch (type) {
        case 'STOCKS': return 'Stocks';
        case 'CRYPTO': return 'Cryptocurrency';
        case 'MUTUAL_FUNDS': return 'Mutual Funds';
        case 'BONDS': return 'Bonds';
        case 'REAL_ESTATE': return 'Real Estate';
        case 'GOLD': return 'Gold';
        case 'SILVER': return 'Silver';
        case 'FIXED_DEPOSIT': return 'Fixed Deposit';
        case 'EMERGENCY_FUND': return 'Emergency Fund';
        case 'MARRIAGE': return 'Marriage';
        case 'VACATION': return 'Vacation';
        case 'PROVIDENT_FUNDS': return 'Provident Funds';
        case 'SAFE_KEEPINGS': return 'Safe Keepings';
        case 'OTHER': return 'Other';
        default: return type;
    }
};

// Type guards and utilities
export type InvestmentType = typeof INVESTMENT_TYPES[number]['value'];

export const getInvestmentTypeLabel = (value: string): string => {
    return INVESTMENT_TYPES.find(type => type.value === value)?.label || value;
};

interface InvestmentTargetCreateRow {
    key: string;
    investmentType: InvestmentTargetFormData['investmentType'];
    targetAmount: number;
    nickname: string;
    targetCompletionDate?: Date;
}

function newCreateRowKey(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Safety cap on rows per submit (each row can repeat the same category if needed). */
const MAX_CREATE_TARGET_ROWS = 50;

interface InvestmentTargetModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Create: one submit can add several targets; types may repeat across goals. */
    onCreate: (items: InvestmentTargetFormData[]) => Promise<void>;
    onUpdate?: (id: number, data: Partial<InvestmentTargetFormData>) => Promise<void>;
    onDelete?: (id: number) => Promise<void>;
    existingTarget?: InvestmentTarget | null;
    mode: 'create' | 'edit';
    currency?: string;
}

export function InvestmentTargetModal({
    isOpen,
    onClose,
    onCreate,
    onUpdate,
    onDelete,
    existingTarget,
    mode,
    currency = "USD"
}: InvestmentTargetModalProps) {
    const [formData, setFormData] = useState<InvestmentTargetFormData>({
        investmentType: 'STOCKS',
        targetAmount: 0,
        targetCompletionDate: undefined,
        nickname: '',
    });
    const [createRows, setCreateRows] = useState<InvestmentTargetCreateRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>("");

    // Reset form when modal opens/closes or existing target changes
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && existingTarget) {
                setFormData({
                    investmentType: existingTarget.investmentType,
                    targetAmount: parseFloat(existingTarget.targetAmount.toString()),
                    targetCompletionDate: existingTarget.targetCompletionDate || undefined,
                    nickname: existingTarget.nickname || '',
                });
            } else if (mode === 'create') {
                setCreateRows([
                    {
                        key: newCreateRowKey(),
                        investmentType: 'STOCKS',
                        targetAmount: 0,
                        nickname: '',
                        targetCompletionDate: undefined,
                    },
                ]);
            }
            setError("");
        }
    }, [isOpen, existingTarget, mode]);

    const addCreateRow = useCallback(() => {
        setCreateRows((prev) => {
            if (prev.length >= MAX_CREATE_TARGET_ROWS) return prev;
            return [
                ...prev,
                {
                    key: newCreateRowKey(),
                    investmentType: 'STOCKS',
                    targetAmount: 0,
                    nickname: '',
                    targetCompletionDate: undefined,
                },
            ];
        });
    }, []);

    const removeCreateRow = useCallback((key: string) => {
        setCreateRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
    }, []);

    const updateCreateRow = useCallback(
        (key: string, patch: Partial<Omit<InvestmentTargetCreateRow, "key">>) => {
            setCreateRows((prev) =>
                prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
            );
        },
        []
    );

    const canAddAnotherRow =
        mode === 'create' && createRows.length > 0 && createRows.length < MAX_CREATE_TARGET_ROWS;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (mode === 'create') {
            if (createRows.length === 0) {
                setError("Add at least one target row.");
                return;
            }
            const items: InvestmentTargetFormData[] = createRows
                .filter((r) => r.targetAmount > 0)
                .map((r) => ({
                    investmentType: r.investmentType,
                    targetAmount: r.targetAmount,
                    nickname: r.nickname.trim() || undefined,
                    targetCompletionDate: r.targetCompletionDate,
                }));
            if (items.length === 0) {
                setError("Enter a target amount greater than 0 for at least one type.");
                return;
            }

            setIsLoading(true);
            try {
                await onCreate(items);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save targets");
            } finally {
                setIsLoading(false);
            }
            return;
        }

        if (formData.targetAmount <= 0) {
            setError("Target amount must be greater than 0");
            return;
        }

        setIsLoading(true);
        try {
            if (mode === 'edit' && existingTarget && onUpdate) {
                await onUpdate(existingTarget.id, formData);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save target");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = useCallback(async () => {
        if (!existingTarget || !onDelete) return;
        
        setIsLoading(true);
        try {
            await onDelete(existingTarget.id);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete target");
        } finally {
            setIsLoading(false);
        }
    }, [existingTarget, onDelete, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className={`relative bg-white rounded-2xl shadow-xl w-full mx-4 ${mode === 'create' ? 'max-w-2xl' : 'max-w-md'}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        <Target className="w-5 h-5 text-blue-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            {mode === 'edit' ? 'Edit Investment Target' : 'Set investment targets'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {mode === 'create' ? (
                        <div className="space-y-4 max-h-[min(70vh,520px)] overflow-y-auto pr-1">
                            <p className="text-sm text-gray-600">
                                Each goal is a separate target; you can use the same category more than once (e.g. two &quot;Stocks&quot; goals with different nicknames). Link investments to a target when you add or edit them. Set an amount for each row you want to create; rows left at 0 are skipped.
                            </p>
                            {createRows.map((row, index) => (
                                        <div
                                            key={row.key}
                                            className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-semibold text-gray-800">
                                                    Target {index + 1}
                                                </span>
                                                {createRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeCreateRow(row.key)}
                                                        disabled={isLoading}
                                                        className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Investment type *
                                                </label>
                                                <select
                                                    value={row.investmentType}
                                                    onChange={(e) =>
                                                        updateCreateRow(row.key, {
                                                            investmentType: e.target
                                                                .value as InvestmentTargetFormData['investmentType'],
                                                        })
                                                    }
                                                    disabled={isLoading}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                                    required
                                                >
                                                    {INVESTMENT_TYPES.map((type) => (
                                                        <option key={type.value} value={type.value}>
                                                            {type.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Nickname (optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={row.nickname}
                                                    onChange={(e) =>
                                                        updateCreateRow(row.key, { nickname: e.target.value })
                                                    }
                                                    disabled={isLoading}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                                    placeholder="e.g. Retirement fund"
                                                    maxLength={50}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Target amount *
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                                                        {getCurrencySymbol(currency)}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={row.targetAmount || ''}
                                                        onChange={(e) =>
                                                            updateCreateRow(row.key, {
                                                                targetAmount: parseFloat(e.target.value) || 0,
                                                            })
                                                        }
                                                        disabled={isLoading}
                                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Target completion date (optional)
                                                </label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="date"
                                                        value={formatDateForInput(row.targetCompletionDate)}
                                                        onChange={(e) =>
                                                            updateCreateRow(row.key, {
                                                                targetCompletionDate: parseDateFromInput(
                                                                    e.target.value
                                                                ),
                                                            })
                                                        }
                                                        disabled={isLoading}
                                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                                        min={new Date().toISOString().split('T')[0]}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            {canAddAnotherRow && (
                                <button
                                    type="button"
                                    onClick={addCreateRow}
                                    disabled={isLoading}
                                    className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add another target
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Investment Type
                                </label>
                                <select
                                    value={formData.investmentType}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        investmentType: e.target.value as InvestmentTargetFormData['investmentType']
                                    }))}
                                    disabled={isLoading}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                    required
                                >
                                    {INVESTMENT_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nickname (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.nickname || ''}
                                    onChange={(e) => setFormData(prev => ({ 
                                        ...prev, 
                                        nickname: e.target.value 
                                    }))}
                                    disabled={isLoading}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                    placeholder="e.g., Retirement Fund, Emergency Savings"
                                    maxLength={50}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Give your investment target a memorable name
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Target Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                                        {getCurrencySymbol(currency)}
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.targetAmount}
                                        onChange={(e) => setFormData(prev => ({ 
                                            ...prev, 
                                            targetAmount: parseFloat(e.target.value) || 0 
                                        }))}
                                        disabled={isLoading}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                        placeholder="Enter target amount"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Target Completion Date (Optional)
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        value={formatDateForInput(formData.targetCompletionDate)}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            targetCompletionDate: parseDateFromInput(e.target.value)
                                        }))}
                                        disabled={isLoading}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    Set a target date to track your progress and get deadline reminders
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                        <div>
                            {mode === 'edit' && onDelete && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-red-600 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || (mode === 'create' && createRows.length === 0)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Saving...
                                    </>
                                ) : mode === 'edit' ? (
                                    'Update Target'
                                ) : (
                                    'Create target(s)'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}