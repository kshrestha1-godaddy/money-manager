"use client";

import { INCOMES_MODAL_MAX_WIDTH } from "../../constants/incomes-constants";
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
            maxWidthClassName={INCOMES_MODAL_MAX_WIDTH}
            transaction={income}
            transactionType="INCOME"
            isOpen={isOpen}
            onClose={onClose}
            onEdit={onEdit}
        />
    );
} 