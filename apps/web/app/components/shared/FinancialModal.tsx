"use client";

import { useState, useEffect } from "react";
import { Category } from "../../types/financial";
import { AccountInterface } from "../../types/accounts";
import { CategoryWithFrequencyData } from "../../utils/categoryFrequency";
import { FinancialForm } from "./FinancialForm";
import { useDisplayCurrency } from "../../hooks/useDisplayCurrency";
import { getUserSupportedCurrency } from "../../utils/currency";
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
    onSubmit: (data: any) => void | Promise<unknown>;
    categories: CategoryWithFrequencyData[];
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
    const { accountCurrency } = useDisplayCurrency();
    const defaultCurrency = getUserSupportedCurrency(accountCurrency);
    const [formData, setFormData] = useState<BaseFormData>(initializeFormData(true, defaultCurrency));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const placeholders = getTransactionPlaceholders(transactionType);

    useEffect(() => {
        if (mode === 'edit' && transaction) {
            setFormData(extractFormData(transaction));
        } else if (mode === 'add') {
            const currentDefaultCurrency = getUserSupportedCurrency(accountCurrency);
            setFormData(initializeFormData(true, currentDefaultCurrency));
        }
    }, [transaction, mode, isOpen, accountCurrency]);

    useEffect(() => {
        if (isOpen && mode === 'add') {
            const currentDefaultCurrency = getUserSupportedCurrency(accountCurrency);
            setFormData(prev => ({
                ...prev,
                amountCurrency: currentDefaultCurrency
            }));
        }
    }, [accountCurrency, isOpen, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isSubmitting || (mode === 'edit' && !transaction)) return;

        const validation = validateFormData(formData, categories, accounts);
        if (!validation.isValid) {
            showValidationErrors(validation.errors);
            return;
        }

        setIsSubmitting(true);
        setSaveError(null);
        try {
            const transformedData = transformFormData(formData, categories, accounts, accountCurrency);
            
            if (mode === 'edit' && transaction) {
                await onSubmit({ id: transaction.id, data: transformedData });
            } else {
                await onSubmit(transformedData);
            }
            
            handleClose();
        } catch (error) {
            console.error(`Error ${mode === 'add' ? 'creating' : 'updating'} ${transactionType.toLowerCase()}:`, error);
            setSaveError(error instanceof Error ? error.message : `Couldn’t save the ${transactionType.toLowerCase()}.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSaveError(null);
        if (mode === 'edit' && transaction) {
            setFormData(extractFormData(transaction));
        } else {
            const currentDefaultCurrency = getUserSupportedCurrency(accountCurrency);
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
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {saveError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
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