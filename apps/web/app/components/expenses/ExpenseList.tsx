"use client";

import { FinancialList } from "../shared/FinancialList";
import { Expense } from "../../types/financial";

interface ExpenseListProps {
    expenses: Expense[];
    currency?: string;
    onEdit?: (expense: Expense) => void;
    onView?: (expense: Expense) => void;
    onDelete?: (expense: Expense) => void;
    selectedExpenses?: Set<number>;
    onExpenseSelect?: (expenseId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: (ids: number[]) => void;
    onClearSelection?: () => void;
}

export function ExpenseList({ 
    expenses, 
    currency = "USD", 
    onEdit, 
    onView,
    onDelete,
    selectedExpenses,
    onExpenseSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection
}: ExpenseListProps) {
    // Wrapper functions to handle type conversion between Expense and FinancialTransaction
    const handleEdit = onEdit ? (transaction: any) => onEdit(transaction as Expense) : undefined;
    const handleView = onView ? (transaction: any) => onView(transaction as Expense) : undefined;
    const handleDelete = onDelete ? (transaction: any) => onDelete(transaction as Expense) : undefined;

    return (
        <FinancialList
            transactions={expenses as any}
            transactionType="EXPENSE"
            currency={currency}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            selectedTransactions={selectedExpenses}
            onTransactionSelect={onExpenseSelect}
            onSelectAll={onSelectAll}
            showBulkActions={showBulkActions}
            onBulkDelete={onBulkDelete}
            onClearSelection={onClearSelection}
        />
    );
} 