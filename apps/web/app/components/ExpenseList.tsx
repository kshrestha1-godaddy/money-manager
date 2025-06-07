"use client";

import { Expense } from "../types/financial";
import { formatCurrency } from "../utils/currency";

interface ExpenseListProps {
    expenses: Expense[];
    currency?: string;
    onEdit?: (expense: Expense) => void;
    onDelete?: (expense: Expense) => void;
}

export function ExpenseList({ expenses, currency = "USD", onEdit, onDelete }: ExpenseListProps) {
    if (expenses.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">💸</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
                <p className="text-gray-500">Start tracking your expenses by adding your first transaction.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                    Expenses ({expenses.length})
                </h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Expense
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tags
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {expenses.map((expense) => (
                            <ExpenseRow 
                                key={expense.id} 
                                expense={expense} 
                                currency={currency}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ExpenseRow({ expense, currency = "USD", onEdit, onDelete }: { 
    expense: Expense; 
    currency?: string;
    onEdit?: (expense: Expense) => void;
    onDelete?: (expense: Expense) => void;
}) {
    const handleEdit = () => {
        if (onEdit) {
            onEdit(expense);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(expense);
        }
    };

    return (
        <tr className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
                <div>
                    <div className="text-sm font-medium text-gray-900">
                        {expense.title}
                        {expense.isRecurring && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Recurring
                            </span>
                        )}
                    </div>
                    {expense.description && (
                        <div className="text-sm text-gray-500">
                            {expense.description}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: expense.category.color }}
                    ></div>
                    <span className="text-sm text-gray-900">{expense.category.name}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {expense.date.toLocaleDateString()}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-wrap gap-1">
                    {expense.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-red-600">
                {formatCurrency(expense.amount, currency)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                    <button 
                        onClick={handleEdit}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
} 