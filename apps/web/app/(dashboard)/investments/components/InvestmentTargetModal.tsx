"use client";

import React, { useState, useEffect, useCallback } from "react";
import { InvestmentTarget, InvestmentTargetFormData } from "../../../types/investments";
import { X, Target, Calendar } from "lucide-react";
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
    { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit' },
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
        case 'FIXED_DEPOSIT': return 'Fixed Deposit';
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

interface InvestmentTargetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: InvestmentTargetFormData) => Promise<void>;
    onUpdate?: (id: number, data: Partial<InvestmentTargetFormData>) => Promise<void>;
    onDelete?: (id: number) => Promise<void>;
    existingTarget?: InvestmentTarget | null;
    mode: 'create' | 'edit';
    existingTargetTypes?: string[];
    currency?: string;
}

export function InvestmentTargetModal({
    isOpen,
    onClose,
    onSave,
    onUpdate,
    onDelete,
    existingTarget,
    mode,
    existingTargetTypes = [],
    currency = "USD"
}: InvestmentTargetModalProps) {
    const [formData, setFormData] = useState<InvestmentTargetFormData>({
        investmentType: 'STOCKS',
        targetAmount: 0,
        targetCompletionDate: undefined,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>("");

    // Memoize available types calculation
    const availableTypes = React.useMemo(() => 
        mode === 'create' 
            ? INVESTMENT_TYPES.filter(type => !existingTargetTypes.includes(type.value))
            : INVESTMENT_TYPES,
        [mode, existingTargetTypes]
    );

    // Reset form when modal opens/closes or existing target changes
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && existingTarget) {
                setFormData({
                    investmentType: existingTarget.investmentType,
                    targetAmount: parseFloat(existingTarget.targetAmount.toString()),
                    targetCompletionDate: existingTarget.targetCompletionDate || undefined,
                });
            } else {
                // For create mode, find the first available type
                const availableTypes = INVESTMENT_TYPES.filter(type => !existingTargetTypes.includes(type.value));
                const defaultType = availableTypes.length > 0 ? availableTypes[0]?.value || 'STOCKS' : 'STOCKS';
                setFormData({
                    investmentType: defaultType as any,
                    targetAmount: 0,
                    targetCompletionDate: undefined,
                });
            }
            setError("");
        }
    }, [isOpen, existingTarget, mode, existingTargetTypes]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.targetAmount <= 0) {
            setError("Target amount must be greater than 0");
            return;
        }

        if (mode === 'create' && existingTargetTypes.includes(formData.investmentType)) {
            setError(`A target for ${getInvestmentTypeLabel(formData.investmentType)} already exists. Please edit the existing target instead.`);
            return;
        }

        setIsLoading(true);
        try {
            if (mode === 'edit' && existingTarget && onUpdate) {
                await onUpdate(existingTarget.id, formData);
            } else {
                await onSave(formData);
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
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        <Target className="w-5 h-5 text-blue-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            {mode === 'edit' ? 'Edit Investment Target' : 'Set Investment Target'}
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

                    <div className="space-y-4">
                        {/* Investment Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Investment Type
                            </label>
                            <select
                                value={formData.investmentType}
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    investmentType: e.target.value as any 
                                }))}
                                disabled={mode === 'edit' || isLoading}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                required
                            >
                                {availableTypes.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                            {mode === 'create' && availableTypes.length === 0 && (
                                <p className="mt-1 text-sm text-gray-500">
                                    All investment types already have targets set.
                                </p>
                            )}
                        </div>

                        {/* Target Amount */}
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

                        {/* Target Completion Date */}
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
                                    min={new Date().toISOString().split('T')[0]} // Prevent past dates
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Set a target date to track your progress and get deadline reminders
                            </p>
                        </div>
                    </div>

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
                                disabled={isLoading || (mode === 'create' && availableTypes.length === 0)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    mode === 'edit' ? 'Update Target' : 'Set Target'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}