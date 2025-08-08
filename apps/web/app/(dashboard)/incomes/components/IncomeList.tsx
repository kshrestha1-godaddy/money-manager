"use client";

import { FinancialList } from "../../../components/shared/FinancialList";
import { Income } from "../../../types/financial";

interface IncomeListProps {
    incomes: Income[];
    currency?: string;
    onEdit?: (income: Income) => void;
    onView?: (income: Income) => void;
    onDelete?: (income: Income) => void;
    onBookmark?: (income: Income) => void;
    selectedIncomes?: Set<number>;
    onIncomeSelect?: (incomeId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: (ids: number[]) => void;
    onClearSelection?: () => void;
}

export function IncomeList({ 
    incomes, 
    currency = "USD", 
    onEdit, 
    onView,
    onDelete,
    onBookmark,
    selectedIncomes,
    onIncomeSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection
}: IncomeListProps) {
    // Wrapper functions to handle type conversion between Income and FinancialTransaction
    const handleEdit = onEdit ? (transaction: any) => onEdit(transaction as Income) : undefined;
    const handleView = onView ? (transaction: any) => onView(transaction as Income) : undefined;
    const handleDelete = onDelete ? (transaction: any) => onDelete(transaction as Income) : undefined;
    const handleBookmark = onBookmark ? (transaction: any) => onBookmark(transaction as Income) : undefined;

    return (
        <FinancialList
            transactions={incomes as any}
            transactionType="INCOME"
            currency={currency}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            onBookmark={handleBookmark}
            selectedTransactions={selectedIncomes}
            onTransactionSelect={onIncomeSelect}
            onSelectAll={onSelectAll}
            showBulkActions={showBulkActions}
            onBulkDelete={onBulkDelete}
            onClearSelection={onClearSelection}
        />
    );
} 