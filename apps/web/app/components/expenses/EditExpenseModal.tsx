"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/button";
import { Expense, Category } from "../../types/financial";
import { AccountInterface } from "../../types/accounts";
import { ExpenseForm } from "./ExpenseForm";
import { useCurrency } from "../../providers/CurrencyProvider";
import { getUserDualCurrency } from "../../utils/currency";
import { 
    BaseFormData, 
    initializeFormData,
    validateFormData,
    transformFormData,
    extractFormData,
    showValidationErrors
} from "../../utils/formUtils";

interface EditExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: (id: number, expense: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    categories: Category[];
    accounts: AccountInterface[];
    expense: Expense | null;
}

export function EditExpenseModal({ isOpen, onClose, onEdit, categories, accounts, expense }: EditExpenseModalProps) {
    const { currency } = useCurrency();
    const defaultCurrency = getUserDualCurrency(currency);
    const [formData, setFormData] = useState<BaseFormData>(initializeFormData(true, defaultCurrency));
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (expense) {
            setFormData(extractFormData(expense));
        }
    }, [expense]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!expense) return;

        const validation = validateFormData(formData, categories, accounts);
        if (!validation.isValid) {
            showValidationErrors(validation.errors);
            return;
        }

        setIsSubmitting(true);
        try {
            const updatedExpense = transformFormData(formData, categories, accounts, currency);
            onEdit(expense.id, updatedExpense);
            onClose();
        } catch (error) {
            console.error('Error updating expense:', error);
            alert('Failed to update expense. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (expense) {
            setFormData(extractFormData(expense));
        }
        onClose();
    };

    if (!isOpen || !expense) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Edit Expense</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <ExpenseForm 
                        formData={formData}
                        onFormDataChange={setFormData}
                        categories={categories}
                        accounts={accounts}
                        disabled={isSubmitting}
                    />

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                        >
                            {isSubmitting ? 'Updating...' : 'Update Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 