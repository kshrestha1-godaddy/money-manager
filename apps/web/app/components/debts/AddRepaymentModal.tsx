"use client";

import { useState, useEffect } from "react";
import { DebtInterface } from "../../types/debts";
import { AccountInterface } from "../../types/accounts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { addRepayment } from "../../actions/debts";
import { getUserAccounts } from "../../actions/accounts";
import { calculateRemainingWithInterest } from "../../utils/interestCalculation";

interface AddRepaymentModalProps {
    debt: DebtInterface | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AddRepaymentModal({ debt, isOpen, onClose, onSuccess }: AddRepaymentModalProps) {
    const { currency: userCurrency } = useCurrency();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        amount: "",
        repaymentDate: new Date().toISOString().split('T')[0], // Today's date
        notes: "",
        accountId: "",
    });

    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadAccounts();
        } else {
            // Reset form when modal closes
            setFormData({
                amount: "",
                repaymentDate: new Date().toISOString().split('T')[0],
                notes: "",
                accountId: "",
            });
            setError(null);
        }
    }, [isOpen]);

    const loadAccounts = async () => {
        try {
            setLoadingAccounts(true);
            const userAccounts = await getUserAccounts();
            if (userAccounts && !('error' in userAccounts)) {
                setAccounts(userAccounts);
                // Set the original account as default if it exists
                if (debt?.accountId) {
                    const originalAccount = userAccounts.find(account => account.id === debt.accountId);
                    if (originalAccount) {
                        setFormData(prev => ({ ...prev, accountId: debt.accountId!.toString() }));
                    }
                }
            } else {
                console.error("Error loading accounts:", userAccounts?.error);
                setAccounts([]);
            }
        } catch (error) {
            console.error("Error loading accounts:", error);
            setAccounts([]);
        } finally {
            setLoadingAccounts(false);
        }
    };

    if (!isOpen || !debt) return null;

    // Calculate remaining amount including interest
    const totalRepayments = debt.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
    const remainingWithInterest = calculateRemainingWithInterest(
        debt.amount,
        debt.interestRate,
        debt.lentDate,
        debt.dueDate,
        debt.repayments || [],
        new Date(),
        debt.status
    );
    const remainingAmount = remainingWithInterest.remainingAmount;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const amount = parseFloat(formData.amount);
            
            // Validation
            if (isNaN(amount) || amount <= 0) {
                throw new Error("Please enter a valid amount");
            }

            if (!isFinite(amount)) {
                throw new Error("Please enter a valid number");
            }

            // Check for reasonable decimal places (max 2)
            const amountStr = amount.toString();
            if (amountStr.includes('.')) {
                const decimalPart = amountStr.split('.')[1];
                if (decimalPart && decimalPart.length > 2) {
                    throw new Error("Amount cannot have more than 2 decimal places");
                }
            }

            // Check for maximum amount (prevent extremely large numbers)
            if (amount > 999999999.99) {
                throw new Error("Amount is too large");
            }

            // Round both amounts to 2 decimal places for proper comparison
            const roundedAmount = Math.round(amount * 100) / 100;
            const roundedRemaining = Math.round(remainingAmount * 100) / 100;
            
            if (roundedAmount > roundedRemaining) {
                throw new Error(`Repayment amount cannot exceed remaining debt of ${formatCurrency(roundedRemaining, userCurrency)}`);
            }

            if (!formData.repaymentDate) {
                throw new Error("Please select a repayment date");
            }

            if (!formData.accountId) {
                throw new Error("Please select an account to receive the repayment");
            }

            // Call the addRepayment action
            await addRepayment(
                debt.id, 
                amount, 
                formData.notes || undefined,
                formData.accountId ? parseInt(formData.accountId) : undefined
            );

            // Reset form
            setFormData({
                amount: "",
                repaymentDate: new Date().toISOString().split('T')[0],
                notes: "",
                accountId: "",
            });

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error("Error adding repayment:", err);
            setError(err instanceof Error ? err.message : "Failed to add repayment");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only numbers and decimal point, with max 2 decimal places
        if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
            setFormData(prev => ({ ...prev, amount: value }));
        }
    };

    const setFullAmount = () => {
        // Round to 2 decimal places to avoid floating-point precision issues
        const roundedAmount = Math.round(remainingAmount * 100) / 100;
        setFormData(prev => ({ ...prev, amount: roundedAmount.toFixed(2) }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Add Repayment</h2>
                            <p className="text-sm text-gray-600">Recording payment from {debt.borrowerName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Debt Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Original Amount:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(debt.amount, userCurrency)}</span>
                        </div>
                        {remainingWithInterest.interestAmount > 0 && (
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-gray-600">Interest ({debt.interestRate}%):</span>
                                <span className="font-medium text-orange-600">{formatCurrency(remainingWithInterest.interestAmount, userCurrency)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Total Amount{remainingWithInterest.interestAmount > 0 ? ' (with Interest)' : ''}:</span>
                            <span className="font-medium text-gray-900">{formatCurrency(remainingWithInterest.totalWithInterest, userCurrency)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Total Repaid:</span>
                            <span className="font-medium text-green-600">{formatCurrency(totalRepayments, userCurrency)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Remaining:</span>
                            <span className="font-semibold text-red-600">{formatCurrency(remainingAmount, userCurrency)}</span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Amount */}
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                                Repayment Amount *
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="amount"
                                    value={formData.amount}
                                    onChange={handleAmountChange}
                                    placeholder="0.00"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    required
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <span className="text-sm text-gray-500">{userCurrency}</span>
                                </div>
                            </div>
                            <div className="flex justify-between mt-1">
                                <p className="text-xs text-gray-500">
                                    Maximum: {formatCurrency(remainingAmount, userCurrency)}
                                </p>
                                <button
                                    type="button"
                                    onClick={setFullAmount}
                                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                                >
                                    Pay Full Amount
                                </button>
                            </div>
                        </div>

                        {/* Repayment Date */}
                        <div>
                            <label htmlFor="repaymentDate" className="block text-sm font-medium text-gray-700 mb-1">
                                Repayment Date *
                            </label>
                            <input
                                type="date"
                                id="repaymentDate"
                                value={formData.repaymentDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, repaymentDate: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                required
                            />
                        </div>

                        {/* Bank Account Selection */}
                        <div>
                            <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-1">
                                Deposit to Account *
                            </label>
                            <select
                                id="accountId"
                                value={formData.accountId}
                                onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                disabled={loadingAccounts}
                                required
                            >
                                <option value="">Select account to receive repayment</option>
                                {accounts.map((account) => {
                                    const isOriginalAccount = debt.accountId === account.id;
                                    return (
                                        <option key={account.id} value={account.id}>
                                            {account.bankName} - {account.accountNumber} ({account.balance !== undefined ? `Balance: ${formatCurrency(account.balance, userCurrency)}` : 'No balance info'}){isOriginalAccount ? ' - Original Account' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            {loadingAccounts && (
                                <p className="text-sm text-gray-500 mt-1">Loading accounts...</p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                                Choose which account should receive this repayment
                            </p>
                        </div>

                        {/* Notes */}
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                                Notes (Optional)
                            </label>
                            <textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Any additional notes about this repayment..."
                                rows={3}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Adding...
                                    </div>
                                ) : (
                                    "Add Repayment"
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Info */}
                    <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                        <div className="flex">
                            <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="text-sm text-blue-700 font-medium">Repayment Info</p>
                                <p className="text-xs text-blue-600 mt-1">
                                    This will be recorded as a payment from {debt.borrowerName}. The repayment amount will be added to the selected account's balance, and the debt status will be automatically updated.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 