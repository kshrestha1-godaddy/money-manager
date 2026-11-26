"use client";

import { FinancialList } from "../../../components/shared/FinancialList";
import { Income } from "../../../types/financial";

interface IncomeListProps {
    incomes: Income[];
    currency?: string;
    onEdit?: (income: Income) => void;
    onView?: (income: Income) => void;
    onDelete?: (appLockPassword: string, income: Income) => void;
    onBookmark?: (income: Income) => void;
    selectedIncomes?: Set<number>;
    onIncomeSelect?: (incomeId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: (appLockPassword: string, ids: number[]) => void;
    onClearSelection?: () => void;
    onRefresh?: () => void | Promise<void>;
}

export function IncomeList({ 
    incomes, 
    currency, 
    onEdit, 
    onView,
    onDelete,
    onBookmark,
    selectedIncomes,
    onIncomeSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection,
    onRefresh
}: IncomeListProps) {
    const handleEdit = onEdit ? (transaction: any) => onEdit(transaction as Income) : undefined;
    const handleView = onView ? (transaction: any) => onView(transaction as Income) : undefined;
    const handleDelete = onDelete
        ? (appLockPassword: string, transaction: any) => onDelete(appLockPassword, transaction as Income)
        : undefined;
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
            onRefresh={onRefresh}
        />
    );
}
