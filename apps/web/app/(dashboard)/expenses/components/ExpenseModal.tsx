"use client";

import { useState, useEffect } from "react";
import { Expense, Category } from "../../../types/financial";
import { AccountInterface } from "../../../types/accounts";
import { ExpenseForm } from "./ExpenseForm";
import { 
    BaseFormData, 
    initializeFormData,
    validateFormData,
    transformFormData,
    extractFormData,
    showValidationErrors,
    buttonClasses,
    modalOverlayClasses,
    modalContentClasses
 } from "../../../utils/formUtils";

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (expense: any) => void;
    categories: Category[];
    accounts: AccountInterface[];
    expense?: Expense | null;
    mode: 'add' | 'edit';
}

export function ExpenseModal({ 
    isOpen, 
    onClose, 
    onSubmit, 
    categories, 
    accounts, 
    expense, 
    mode 
}: ExpenseModalProps) {
    const [formData, setFormData] = useState<BaseFormData>(initializeFormData());
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (mode === 'edit' && expense) {
            setFormData(extractFormData(expense));
        } else if (mode === 'add') {
            setFormData(initializeFormData());
        }
    }, [expense, mode, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (mode === 'edit' && !expense) return;

        const validation = validateFormData(formData, categories, accounts);
        if (!validation.isValid) {
            showValidationErrors(validation.errors);
            return;
        }

        setIsSubmitting(true);
        try {
            const transformedData = transformFormData(formData, categories, accounts);
            
            if (mode === 'edit' && expense) {
                onSubmit({ id: expense.id, data: transformedData });
            } else {
                onSubmit(transformedData);
            }
            
            handleClose();
        } catch (error) {
            console.error(`Error ${mode === 'add' ? 'creating' : 'updating'} expense:`, error);
            alert(`Failed to ${mode === 'add' ? 'create' : 'update'} expense. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (mode === 'edit' && expense) {
            setFormData(extractFormData(expense));
        } else {
            setFormData(initializeFormData());
        }
        onClose();
    };

    if (!isOpen) return null;

    const title = mode === 'add' ? 'Add New Expense' : 'Edit Expense';
    const submitText = mode === 'add' ? 'Add Expense' : 'Update Expense';
    const submittingText = mode === 'add' ? 'Adding...' : 'Updating...';

    return (
        <div className={modalOverlayClasses}>
            <div className={modalContentClasses}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
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
                            className={buttonClasses.secondary}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className={buttonClasses.primary}
                        >
                            {isSubmitting ? submittingText : submitText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 