"use client";

import { FinancialModal } from "../../../components/shared/FinancialModal";
import { Expense, Category } from "../../../types/financial";
import { AccountInterface } from "../../../types/accounts";
import { CategoryWithFrequencyData } from "../../../utils/categoryFrequency";

interface EditExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: (id: number, expense: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>) => void;
    categories: CategoryWithFrequencyData[];
    accounts: AccountInterface[];
    expense: Expense | null;
}

export function EditExpenseModal({ isOpen, onClose, onEdit, categories, accounts, expense }: EditExpenseModalProps) {
    const handleSubmit = (data: any) => {
        if (expense) {
            onEdit(expense.id, data.data);
        }
    };

    return (
        <FinancialModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            categories={categories}
            accounts={accounts}
            transactionType="EXPENSE"
            transaction={expense}
            mode="edit"
        />
    );
} 