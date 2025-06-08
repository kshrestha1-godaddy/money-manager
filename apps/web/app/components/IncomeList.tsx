"use client";

import { Income } from "../types/financial";
import { formatCurrency } from "../utils/currency";
import { formatDate } from "../utils/date";

interface IncomeListProps {
    incomes: Income[];
    currency?: string;
    onEdit?: (income: Income) => void;
    onDelete?: (income: Income) => void;
}

export function IncomeList({ incomes, currency = "USD", onEdit, onDelete }: IncomeListProps) {
    if (incomes.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">💰</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No income found</h3>
                <p className="text-gray-500">Start tracking your income by adding your first source.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                    Income Sources ({incomes.length})
                </h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Income
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Account
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tags
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Notes
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
                        {incomes.map((income) => (
                            <IncomeRow 
                                key={income.id} 
                                income={income} 
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

function IncomeRow({ income, currency = "USD", onEdit, onDelete }: { 
    income: Income; 
    currency?: string;
    onEdit?: (income: Income) => void;
    onDelete?: (income: Income) => void;
}) {
    const handleEdit = () => {
        if (onEdit) {
            onEdit(income);
        }
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(income);
        }
    };
    return (
        <tr className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
                <div>
                    <div className="text-sm font-medium text-gray-900">
                        {income.title}
                        {income.isRecurring && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Recurring
                            </span>
                        )}
                    </div>
                    {income.description && (
                        <div className="text-sm text-gray-500">
                            {income.description}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: income.category.color }}
                    ></div>
                    <span className="text-sm text-gray-900">{income.category.name}</span>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {income.account ? (
                    <div>
                        <div className="font-medium">{income.account.bankName}</div>
                        <div className="text-gray-500 text-xs">
                            {income.account.holderName} ({income.account.accountType})
                        </div>
                    </div>
                ) : (
                    <span className="text-gray-400">No account</span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatDate(income.date)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-wrap gap-1">
                    {income.tags.map((tag, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap max-w-xs">
                {income.notes ? (
                    <div className="text-sm text-gray-600 truncate" title={income.notes}>
                        {income.notes}
                    </div>
                ) : (
                    <span className="text-xs text-gray-400">No notes</span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-green-600">
                {formatCurrency(income.amount, currency)}
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