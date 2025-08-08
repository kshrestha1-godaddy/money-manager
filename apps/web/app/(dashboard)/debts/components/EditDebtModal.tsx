"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/button";
import { DebtInterface } from "../../../types/debts";
import { AccountInterface } from "../../../types/accounts";
import { getUserAccounts } from "../../accounts/actions/accounts";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../providers/CurrencyProvider";

interface EditDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: (id: number, debt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) => void;
    debt: DebtInterface | null;
}

export function EditDebtModal({ isOpen, onClose, onEdit, debt }: EditDebtModalProps) {
    const { currency: userCurrency } = useCurrency();
    
    const [formData, setFormData] = useState({
        borrowerName: "",
        borrowerContact: "",
        borrowerEmail: "",
        amount: 0,
        interestRate: 0,
        dueDate: "",
        lentDate: "",
        status: "ACTIVE" as 'ACTIVE' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' | 'DEFAULTED',
        purpose: "",
        notes: "",
        accountId: "",
    });

    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

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

    useEffect(() => {
        if (debt) {
            setFormData({
                borrowerName: debt.borrowerName,
                borrowerContact: (debt.borrowerContact ?? "") as string,
                borrowerEmail: (debt.borrowerEmail ?? "") as string,
                amount: debt.amount,
                interestRate: debt.interestRate,
                dueDate: debt.dueDate ? new Date(debt.dueDate).toISOString().split('T')[0] || "" : "",
                lentDate: new Date(debt.lentDate).toISOString().split('T')[0] || "",
                status: debt.status as 'ACTIVE' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' | 'DEFAULTED',
                purpose: debt.purpose ?? "",
                notes: debt.notes ?? "",
                accountId: debt.accountId?.toString() ?? "",
            });
        }
    }, [debt]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!debt) return;

        // Validate account balance if account is selected and amount is changing
        if (formData.accountId) {
            const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
            if (selectedAccount && selectedAccount.balance !== undefined) {
                // If changing to a different account, check if the new account has sufficient balance
                if (parseInt(formData.accountId) !== debt.accountId && formData.amount > selectedAccount.balance) {
                    alert(`Cannot move debt of ${formatCurrency(formData.amount, userCurrency)} to this account. Account balance is only ${formatCurrency(selectedAccount.balance, userCurrency)}.`);
                    return;
                }
                // If increasing the amount on the same account, check if there's sufficient balance for the increase
                if (parseInt(formData.accountId) === debt.accountId && formData.amount > debt.amount) {
                    const amountIncrease = formData.amount - debt.amount;
                    if (amountIncrease > selectedAccount.balance) {
                        alert(`Cannot increase debt by ${formatCurrency(amountIncrease, userCurrency)}. Account balance is only ${formatCurrency(selectedAccount.balance, userCurrency)}.`);
                        return;
                    }
                }
            }
        }
        
        const processedData = {
            borrowerName: formData.borrowerName,
            borrowerContact: formData.borrowerContact || undefined,
            borrowerEmail: formData.borrowerEmail || undefined,
            amount: formData.amount,
            interestRate: formData.interestRate,
            lentDate: new Date(formData.lentDate),
            dueDate: (formData.dueDate && formData.dueDate.trim() !== "") ? new Date(formData.dueDate as string) : undefined,
            status: formData.status,
            purpose: formData.purpose || undefined,
            notes: formData.notes || undefined,
            accountId: formData.accountId ? parseInt(formData.accountId) : undefined,
        };

        onEdit(debt.id, processedData);
        onClose();
    };

    const handleClose = () => {
        onClose();
    };

    if (!isOpen || !debt) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Edit Debt</h2>
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
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
                                Changing the account will adjust balances accordingly
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
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Update Debt
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 