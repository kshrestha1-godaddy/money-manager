"use client";

import React from "react";
import { FinancialModal } from "../../../components/shared/FinancialModal";
import { Income, Category } from "../../../types/financial";
import { AccountInterface } from "../../../types/accounts";
import { CategoryWithFrequencyData } from "../../../utils/categoryFrequency";

interface AddIncomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => void;
    categories: CategoryWithFrequencyData[];
    accounts: AccountInterface[];
}

export function AddIncomeModal({ isOpen, onClose, onAdd, categories, accounts }: AddIncomeModalProps) {
    const handleSubmit = (data: any) => {
        onAdd(data);
    };

    return (
        <FinancialModal
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