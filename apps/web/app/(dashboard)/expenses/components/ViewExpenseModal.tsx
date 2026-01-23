"use client";

import { Expense } from "../../../types/financial";
import { TransactionViewModal } from "../../../components/shared/TransactionViewModal";

interface ViewExpenseModalProps {
    expense: Expense | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (expense: Expense) => void;
}

export function ViewExpenseModal({ expense, isOpen, onClose, onEdit }: ViewExpenseModalProps) {
    return (
        <TransactionViewModal
            transaction={expense}
            transactionType="EXPENSE"
            isOpen={isOpen}
            onClose={onClose}
            onEdit={onEdit}
        />
    );
} 