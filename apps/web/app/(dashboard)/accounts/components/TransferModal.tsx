"use client";

import { useState } from "react";
import { AccountInterface } from "../../../types/accounts";
import { useCurrency } from "../../../providers/CurrencyProvider";

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransfer: (transfer: TransferData) => Promise<void>;
    accounts: AccountInterface[];
}

export interface TransferData {
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    notes?: string;
}

export function TransferModal({ isOpen, onClose, onTransfer, accounts }: TransferModalProps) {
    const { currency: userCurrency } = useCurrency();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState<TransferData>({
        fromAccountId: 0,
        toAccountId: 0,
        amount: 0,
        notes: "",
    });

    const [errors, setErrors] = useState<{[key: string]: string}>({});

    const validateForm = () => {
        const newErrors: {[key: string]: string} = {};

        if (!formData.fromAccountId || formData.fromAccountId === 0) {
            newErrors.fromAccountId = "Please select a source account";
        }
        if (!formData.toAccountId || formData.toAccountId === 0) {
            newErrors.toAccountId = "Please select a destination account";
        }
        if (formData.fromAccountId === formData.toAccountId) {
            newErrors.toAccountId = "Source and destination accounts cannot be the same";
        }
        if (!formData.amount || formData.amount <= 0) {
            newErrors.amount = "Amount must be greater than 0";
        }
        
        // Check if source account has sufficient balance
        const sourceAccount = accounts.find(acc => acc.id === formData.fromAccountId);
        if (sourceAccount && sourceAccount.balance !== undefined && formData.amount > sourceAccount.balance) {
            newErrors.amount = `Insufficient balance. Available: ${sourceAccount.balance} ${userCurrency}`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onTransfer(formData);
            resetForm();
            onClose();
        } catch (error) {
            console.error("Transfer failed:", error);
            // Error handling is done in the parent component
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            fromAccountId: 0,
            toAccountId: 0,
            amount: 0,
            notes: "",
        });
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Get available accounts that have balances
    const availableFromAccounts = accounts.filter(acc => acc.balance !== undefined && acc.balance > 0);
    const availableToAccounts = accounts.filter(acc => acc.id !== formData.fromAccountId);

    const sourceAccount = accounts.find(acc => acc.id === formData.fromAccountId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Self Transfer of Money</h2>
                            <p className="text-sm text-gray-600 mt-1">Transfer funds between your accounts</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-6">
                    {/* Transfer Direction Visual */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center space-x-4 p-4 bg-blue-50 rounded-lg">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                </div>
                                <span className="text-xs text-gray-600">From</span>
                            </div>
                            
                            <div className="flex-1 border-t-2 border-dashed border-blue-300"></div>
                            
                            <div className="text-center">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                </div>
                                <span className="text-xs text-gray-600">To</span>
                            </div>
                        </div>
                    </div>

                    {/* Source Account */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            From Account <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.fromAccountId}
                            onChange={(e) => {
                                const accountId = parseInt(e.target.value);
                                setFormData(prev => ({ ...prev, fromAccountId: accountId, toAccountId: accountId === prev.toAccountId ? 0 : prev.toAccountId }));
                            }}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                errors.fromAccountId ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                        >
                            <option value={0}>Select source account...</option>
                            {availableFromAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.bankName} - {account.accountNumber.slice(-4)} 
                                    {account.nickname && ` (${account.nickname})`} 
                                    - Balance: {account.balance} {userCurrency}
                                </option>
                            ))}
                        </select>
                        {errors.fromAccountId && <p className="mt-1 text-sm text-red-600">{errors.fromAccountId}</p>}
                    </div>

                    {/* Destination Account */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            To Account <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.toAccountId}
                            onChange={(e) => setFormData(prev => ({ ...prev, toAccountId: parseInt(e.target.value) }))}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                errors.toAccountId ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                            disabled={!formData.fromAccountId}
                        >
                            <option value={0}>Select destination account...</option>
                            {availableToAccounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.bankName} - {account.accountNumber.slice(-4)} 
                                    {account.nickname && ` (${account.nickname})`}
                                    {account.balance !== undefined && ` - Balance: ${account.balance} ${userCurrency}`}
                                </option>
                            ))}
                        </select>
                        {errors.toAccountId && <p className="mt-1 text-sm text-red-600">{errors.toAccountId}</p>}
                    </div>

                    {/* Transfer Amount */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Transfer Amount ({userCurrency}) <span className="text-red-500">*</span>
                        </label>
                        {sourceAccount && sourceAccount.balance !== undefined && (
                            <div className="text-sm text-gray-600 mb-2">
                                Available balance: {sourceAccount.balance} {userCurrency}
                            </div>
                        )}
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={formData.amount || ''}
                                onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    // Cap to 2 decimal places
                                    const cappedValue = Math.round(value * 100) / 100;
                                    setFormData(prev => ({ ...prev, amount: cappedValue }));
                                }}
                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                    errors.amount ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                }`}
                                placeholder="Enter amount to transfer"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">{userCurrency}</span>
                            </div>
                        </div>
                        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                        
                        {/* Quick amount buttons */}
                        {sourceAccount && sourceAccount.balance !== undefined && sourceAccount.balance > 0 && (
                            <div className="mt-3">
                                <div className="text-sm text-gray-600 mb-2">Quick select:</div>
                                <div className="flex flex-wrap gap-2">
                                    {[25, 50, 75, 100].map((percent) => {
                                        const amount = (sourceAccount.balance! * percent) / 100;
                                        // Cap to 2 decimal places
                                        const cappedAmount = Math.round(amount * 100) / 100;
                                        if (cappedAmount > 0) {
                                            return (
                                                <button
                                                    key={percent}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, amount: cappedAmount }))}
                                                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                                                >
                                                    {percent}% ({cappedAmount.toFixed(2)})
                                                </button>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400"
                            placeholder="Add any notes about this transfer..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-6 py-3 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-all"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Processing...' : 'Transfer Money'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
