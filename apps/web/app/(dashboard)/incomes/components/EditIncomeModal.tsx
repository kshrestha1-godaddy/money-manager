"use client";

import { FinancialModal } from "../../../components/shared/FinancialModal";
import type { Income } from "../../../types/financial";
import { AccountInterface } from "../../../types/accounts";
import { CategoryWithFrequencyData } from "../../../utils/categoryFrequency";

interface EditIncomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: (id: number, income: Partial<Omit<Income, 'id' | 'createdAt' | 'updatedAt'>>) => void | Promise<unknown>;
    categories: CategoryWithFrequencyData[];
    accounts: AccountInterface[];
    income: Income | null;
}

export function EditIncomeModal({ isOpen, onClose, onEdit, categories, accounts, income }: EditIncomeModalProps) {
    const handleSubmit = (data: any) => {
        if (income) {
            return onEdit(income.id, data.data);
        }
    };

    return (
        <FinancialModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            categories={categories}
            accounts={accounts}
            transactionType="INCOME"
            transaction={income}
            mode="edit"
        />
    );
} 