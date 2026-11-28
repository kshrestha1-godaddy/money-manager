"use client";

import { INCOMES_MODAL_MAX_WIDTH } from "../../constants/incomes-constants";
import React from "react";
import { FinancialModal } from "../../../components/shared/FinancialModal";
import type { Income } from "../../../types/financial";
import { AccountInterface } from "../../../types/accounts";
import { CategoryWithFrequencyData } from "../../../utils/categoryFrequency";

interface AddIncomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => void | Promise<unknown>;
    categories: CategoryWithFrequencyData[];
    accounts: AccountInterface[];
}

export function AddIncomeModal({ isOpen, onClose, onAdd, categories, accounts }: AddIncomeModalProps) {
    const handleSubmit = (data: any) => {
        return onAdd(data);
    };

    return (
        <FinancialModal
            maxWidthClassName={INCOMES_MODAL_MAX_WIDTH}
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            categories={categories}
            accounts={accounts}
            transactionType="INCOME"
            mode="add"
        />
    );
} 