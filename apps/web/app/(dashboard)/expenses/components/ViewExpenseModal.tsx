"use client";

import { EXPENSES_MODAL_MAX_WIDTH } from "../../constants/expenses-constants";
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
            maxWidthClassName={EXPENSES_MODAL_MAX_WIDTH}
            transaction={expense}
            transactionType="EXPENSE"
            isOpen={isOpen}
            onClose={onClose}
            onEdit={onEdit}
        />
    );
} 