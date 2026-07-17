"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Expense } from "../../../types/financial";
import { AccountInterface } from "../../../types/accounts";
import { CategoryWithFrequencyData } from "../../../utils/categoryFrequency";
import { ExpenseForm } from "./ExpenseForm";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { formatCurrency, getUserDualCurrency } from "../../../utils/currency";
import {
    getTopFrequentExpenseSuggestions,
    applySuggestionToFormData,
    ExpenseSuggestion,
} from "../../../utils/expenseSuggestions";
import { 
    BaseFormData, 
    initializeFormData,
    validateFormData,
    transformFormData,
    showValidationErrors
 } from "../../../utils/formUtils";

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
    categories: CategoryWithFrequencyData[];
    accounts: AccountInterface[];
    expenses?: Expense[];
}

const SUGGESTION_LOOKBACK_MONTHS = 3;

function formatSuggestionDate(date: Date): string {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

export function AddExpenseModal({
    isOpen,
    onClose,
    onAdd,
    categories,
    accounts,
    expenses = [],
}: AddExpenseModalProps) {
    const { currency: userCurrency } = useCurrency();
    const defaultCurrency = getUserDualCurrency(userCurrency);
    const [formData, setFormData] = useState<BaseFormData>(initializeFormData(true, defaultCurrency));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

    const validCategoryIds = useMemo(
        () => new Set(categories.map((category) => category.id)),
        [categories]
    );

    const suggestions = useMemo(() => {
        if (!isOpen) return [];
        return getTopFrequentExpenseSuggestions(expenses, {
            months: SUGGESTION_LOOKBACK_MONTHS,
            validCategoryIds,
        });
    }, [expenses, isOpen, validCategoryIds]);

    useEffect(() => {
        if (isOpen) {
            const currentDefaultCurrency = getUserDualCurrency(userCurrency);
            setFormData(prev => ({
                ...prev,
                amountCurrency: currentDefaultCurrency
            }));
        } else {
            setIsSuggestionsOpen(false);
        }
    }, [userCurrency, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const validation = validateFormData(formData, categories, accounts);
        if (!validation.isValid) {
            showValidationErrors(validation.errors);
            return;
        }

        setIsSubmitting(true);
        try {
            const expense = transformFormData(formData, categories, accounts, userCurrency);
            onAdd(expense as Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>);
            
            const resetDefaultCurrency = getUserDualCurrency(userCurrency);
            setFormData(initializeFormData(true, resetDefaultCurrency));
            onClose();
        } catch (error) {
            console.error('Error creating expense:', error);
            alert('Failed to create expense. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData(initializeFormData());
        setIsSuggestionsOpen(false);
        onClose();
    };

    const handleSelectSuggestion = (suggestion: ExpenseSuggestion) => {
        setFormData((prev) => applySuggestionToFormData(prev, suggestion));
        setIsSuggestionsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 gap-3">
                    <h2 className="text-xl font-semibold text-gray-900">Add New Expense</h2>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsSuggestionsOpen((open) => !open)}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                            Suggest frequent
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                            aria-label="Close modal"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {isSuggestionsOpen && (
                    <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-indigo-700">
                            Top frequent expenses (last {SUGGESTION_LOOKBACK_MONTHS} months)
                        </p>
                        {suggestions.length === 0 ? (
                            <p className="text-sm text-gray-600">
                                No recurring patterns yet — add a few similar expenses first.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {suggestions.map((suggestion) => (
                                    <li key={suggestion.fingerprint}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectSuggestion(suggestion)}
                                            disabled={isSubmitting}
                                            className="w-full rounded-md border border-white bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {suggestion.displayTitle}
                                                </span>
                                                <span className="shrink-0 text-xs font-medium text-indigo-700">
                                                    {suggestion.occurrenceCount}× in {SUGGESTION_LOOKBACK_MONTHS} months
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-600">
                                                {suggestion.category.name}
                                                {" · "}
                                                {formatCurrency(suggestion.medianAmount, suggestion.currency)} median
                                                {" · "}
                                                last: {formatSuggestionDate(suggestion.lastUsed)}
                                            </p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

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
                            {isSubmitting ? 'Adding...' : 'Add Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
