"use client";

import { Income } from "../../../types/financial";
import { TransactionViewModal } from "../../../components/shared/TransactionViewModal";

interface ViewIncomeModalProps {
    income: Income | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (income: Income) => void;
}

export function ViewIncomeModal({ income, isOpen, onClose, onEdit }: ViewIncomeModalProps) {
    return (
        <TransactionViewModal
            transaction={income}
            transactionType="INCOME"
            isOpen={isOpen}
            onClose={onClose}
            onEdit={onEdit}
        />
    );
} 