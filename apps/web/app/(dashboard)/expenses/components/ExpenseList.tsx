"use client";

import { FinancialList } from "../../../components/shared/FinancialList";
import { Expense } from "../../../types/financial";

interface ExpenseListProps {
    expenses: Expense[];
    currency?: string;
    onEdit?: (expense: Expense) => void;
    onView?: (expense: Expense) => void;
    onDelete?: (appLockPassword: string, expense: Expense) => void;
    onBookmark?: (expense: Expense) => void;
    selectedExpenses?: Set<number>;
    onExpenseSelect?: (expenseId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: (appLockPassword: string, ids: number[]) => void;
    onClearSelection?: () => void;
    onRefresh?: () => void | Promise<void>;
}

export function ExpenseList({ 
    expenses, 
    currency, 
    onEdit, 
    onView,
    onDelete,
    onBookmark,
    selectedExpenses,
    onExpenseSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection,
    onRefresh
}: ExpenseListProps) {
    const handleEdit = onEdit ? (transaction: any) => onEdit(transaction as Expense) : undefined;
    const handleView = onView ? (transaction: any) => onView(transaction as Expense) : undefined;
    const handleDelete = onDelete
        ? (appLockPassword: string, transaction: any) => onDelete(appLockPassword, transaction as Expense)
        : undefined;
    const handleBookmark = onBookmark ? (transaction: any) => onBookmark(transaction as Expense) : undefined;

    return (
        <FinancialList
            transactions={expenses as any}
            transactionType="EXPENSE"
            currency={currency}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            onBookmark={handleBookmark}
            selectedTransactions={selectedExpenses}
            onTransactionSelect={onExpenseSelect}
            onSelectAll={onSelectAll}
            showBulkActions={showBulkActions}
            onBulkDelete={onBulkDelete}
            onClearSelection={onClearSelection}
            onRefresh={onRefresh}
        />
    );
}
