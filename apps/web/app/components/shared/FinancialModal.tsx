"use client";

import { useState, useEffect } from "react";
import { Category } from "../../types/financial";
import { AccountInterface } from "../../types/accounts";
import { FinancialForm } from "./FinancialForm";
import { useCurrency } from "../../providers/CurrencyProvider";
import { getUserDualCurrency } from "../../utils/currency";
import { 
    BaseFormData, 
    TransactionType,
    initializeFormData,
    validateFormData,
    transformFormData,
    extractFormData,
    showValidationErrors,
    getTransactionPlaceholders,
    buttonClasses,
    modalOverlayClasses,
    modalContentClasses
} from "../../utils/formUtils";

interface FinancialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    categories: Category[];
    accounts: AccountInterface[];
    transactionType: TransactionType;
    transaction?: any;
    mode: 'add' | 'edit';
}

export function FinancialModal({ 
    isOpen, 
    onClose, 
    onSubmit, 
    categories, 
    accounts, 
    transactionType,
    transaction, 
    mode 
}: FinancialModalProps) {
    const { currency: userCurrency } = useCurrency();
    const defaultCurrency = getUserDualCurrency(userCurrency);
    const [formData, setFormData] = useState<BaseFormData>(initializeFormData(true, defaultCurrency));
    const [isSubmitting, setIsSubmitting] = useState(false);

    const placeholders = getTransactionPlaceholders(transactionType);

    useEffect(() => {
        if (mode === 'edit' && transaction) {
            setFormData(extractFormData(transaction));
        } else if (mode === 'add') {
            const currentDefaultCurrency = getUserDualCurrency(userCurrency);
            setFormData(initializeFormData(true, currentDefaultCurrency));
        }
    }, [transaction, mode, isOpen, userCurrency]);

    // Additional effect to update currency when user changes it in navbar
    useEffect(() => {
        if (isOpen && mode === 'add') {
            const currentDefaultCurrency = getUserDualCurrency(userCurrency);
            setFormData(prev => ({
                ...prev,
                amountCurrency: currentDefaultCurrency
            }));
        }
    }, [userCurrency, isOpen, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (mode === 'edit' && !transaction) return;

        const validation = validateFormData(formData, categories, accounts);
        if (!validation.isValid) {
            showValidationErrors(validation.errors);
            return;
        }

        setIsSubmitting(true);
        try {
            const transformedData = transformFormData(formData, categories, accounts, userCurrency);
            
            if (mode === 'edit' && transaction) {
                onSubmit({ id: transaction.id, data: transformedData });
            } else {
                onSubmit(transformedData);
            }
            
            handleClose();
        } catch (error) {
            console.error(`Error ${mode === 'add' ? 'creating' : 'updating'} ${transactionType.toLowerCase()}:`, error);
            alert(`Failed to ${mode === 'add' ? 'create' : 'update'} ${transactionType.toLowerCase()}. Please try again.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (mode === 'edit' && transaction) {
            setFormData(extractFormData(transaction));
        } else {
            const currentDefaultCurrency = getUserDualCurrency(userCurrency);
            setFormData(initializeFormData(true, currentDefaultCurrency));
        }
        onClose();
    };

    if (!isOpen) return null;

    const title = mode === 'add' ? placeholders.modalTitle.add : placeholders.modalTitle.edit;
    const submitText = mode === 'add' ? placeholders.submitText.add : placeholders.submitText.edit;
    const submittingText = mode === 'add' ? placeholders.submittingText.add : placeholders.submittingText.edit;

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
                    <FinancialForm 
                        formData={formData}
                        onFormDataChange={setFormData}
                        categories={categories}
                        accounts={accounts}
                        transactionType={transactionType}
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