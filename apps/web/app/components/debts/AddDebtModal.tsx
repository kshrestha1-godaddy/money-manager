"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@repo/ui/button";
import { DebtInterface } from "../../types/debts";
import { AccountInterface } from "../../types/accounts";
import { getUserAccounts } from "../../actions/accounts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { validateDebtForm, sanitizeFormData, DebtFormData, ValidationError } from "../../utils/debtValidation";

interface AddDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (debt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) => void;
}

function getCurrentDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function AddDebtModal({ isOpen, onClose, onAdd }: AddDebtModalProps) {
    const { currency: userCurrency } = useCurrency();
    
    const [formData, setFormData] = useState({
        borrowerName: "",
        borrowerContact: "",
        borrowerEmail: "",
        amount: 0,
        interestRate: 0,
        dueDate: "",
        lentDate: getCurrentDateString(),
        status: "ACTIVE" as const,
        purpose: "",
        notes: "",
        accountId: "",
    });

    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadAccounts();
        }
    }, [isOpen]);

    const loadAccounts = async () => {
        try {
            setLoadingAccounts(true);
            const userAccounts = await getUserAccounts();
            if (userAccounts && !('error' in userAccounts)) {
                setAccounts(userAccounts);
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

    const getFieldError = (fieldName: string): string | undefined => {
        return validationErrors.find(error => error.field === fieldName)?.message;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setValidationErrors([]);
        
        // Basic validation
        if (!formData.borrowerName.trim()) {
            setValidationErrors([{ field: 'borrowerName', message: 'Borrower name is required' }]);
            setIsSubmitting(false);
            return;
        }
        
        if (!formData.amount || formData.amount <= 0) {
            setValidationErrors([{ field: 'amount', message: 'Amount must be greater than 0' }]);
            setIsSubmitting(false);
            return;
        }

        // Validate account balance if account is selected
        if (formData.accountId) {
            const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
            if (selectedAccount && selectedAccount.balance !== undefined) {
                if (formData.amount > selectedAccount.balance) {
                    setValidationErrors([{
                        field: 'amount',
                        message: `Cannot add debt of ${formatCurrency(formData.amount, userCurrency)}. Account balance is only ${formatCurrency(selectedAccount.balance, userCurrency)}.`
                    }]);
                    setIsSubmitting(false);
                    return;
                }
            }
        }

        try {
            // Sanitize and process form data
            const sanitizedData = sanitizeFormData(formData);
            
            // Process dates properly
            let dueDate: Date | undefined = undefined;
            if (sanitizedData.dueDate && sanitizedData.dueDate.trim() !== "") {
                dueDate = new Date(sanitizedData.dueDate);
            }

            const processedData = {
                borrowerName: sanitizedData.borrowerName,
                borrowerContact: sanitizedData.borrowerContact || undefined,
                borrowerEmail: sanitizedData.borrowerEmail || undefined,
                amount: sanitizedData.amount,
                interestRate: sanitizedData.interestRate,
                lentDate: new Date(sanitizedData.lentDate),
                dueDate: dueDate,
                status: sanitizedData.status,
                purpose: sanitizedData.purpose || undefined, 
                notes: sanitizedData.notes || undefined,
                accountId: sanitizedData.accountId ? parseInt(sanitizedData.accountId) : undefined,
            };

            await onAdd(processedData);
            resetForm();
        } catch (error) {
            console.error("Error in form submission:", error);
            setValidationErrors([{
                field: 'general',
                message: error instanceof Error ? error.message : 'An unexpected error occurred'
            }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            borrowerName: "",
            borrowerContact: "",
            borrowerEmail: "",
            amount: 0,
            interestRate: 0,
            dueDate: "",
            lentDate: getCurrentDateString(),
            status: "ACTIVE" as const,
            purpose: "",
            notes: "",
            accountId: "",
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Add New Debt</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Borrower Name *
                            </label>
                            <input
                                type="text"
                                value={formData.borrowerName}
                                onChange={(e) => setFormData(prev => ({ ...prev, borrowerName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                                    formData.accountId && formData.amount > 0 && (() => {
                                        const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
                                        return selectedAccount && selectedAccount.balance !== undefined && formData.amount > selectedAccount.balance;
                                    })()
                                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                }`}
                                required
                            />
                            {formData.accountId && formData.amount > 0 && (() => {
                                const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
                                if (selectedAccount && selectedAccount.balance !== undefined && formData.amount > selectedAccount.balance) {
                                    return (
                                        <p className="text-sm text-red-600 mt-1">
                                            Insufficient balance. Available: {formatCurrency(selectedAccount.balance, userCurrency)}
                                        </p>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bank Account
                            </label>
                            <select
                                value={formData.accountId}
                                onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loadingAccounts}
                            >
                                <option value="">Select account (optional)</option>
                                {accounts.map((account) => (
                                    <option key={account.id} value={account.id}>
                                        {account.bankName} - {account.accountNumber} ({account.balance !== undefined ? `Balance: ${formatCurrency(account.balance, userCurrency)}` : 'No balance info'})
                                    </option>
                                ))}
                            </select>
                            {loadingAccounts && (
                                <p className="text-sm text-gray-500 mt-1">Loading accounts...</p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                                If selected, the debt amount will be deducted from this account's balance
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Interest Rate (%)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.interestRate}
                                onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Lent Date *
                            </label>
                            <input
                                type="date"
                                value={formData.lentDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, lentDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="PARTIALLY_PAID">Partially Paid</option>
                                <option value="FULLY_PAID">Fully Paid</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="DEFAULTED">Defaulted</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Borrower Contact
                            </label>
                            <input
                                type="tel"
                                value={formData.borrowerContact}
                                onChange={(e) => setFormData(prev => ({ ...prev, borrowerContact: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Borrower Email
                            </label>
                            <input
                                type="email"
                                value={formData.borrowerEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, borrowerEmail: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="email@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Purpose
                        </label>
                        <input
                            type="text"
                            value={formData.purpose}
                            onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Personal loan, Business loan, Emergency"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Additional notes about this debt..."
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={(() => {
                                if (formData.accountId && formData.amount > 0) {
                                    const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
                                    return selectedAccount && selectedAccount.balance !== undefined && formData.amount > selectedAccount.balance;
                                }
                                return false;
                            })()}
                            className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 ${
                                (() => {
                                    if (formData.accountId && formData.amount > 0) {
                                        const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
                                        if (selectedAccount && selectedAccount.balance !== undefined && formData.amount > selectedAccount.balance) {
                                            return 'bg-gray-400 text-white cursor-not-allowed';
                                        }
                                    }
                                    return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
                                })()
                            }`}
                        >
                            Add Debt
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}