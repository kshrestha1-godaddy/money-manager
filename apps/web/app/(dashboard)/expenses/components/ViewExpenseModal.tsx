"use client";

import { Expense } from "../../../types/financial";
import { formatCurrency } from "../../../utils/currency";
import { getDualCurrencyDisplay, formatDualCurrency } from "../../../utils/currency";
import { formatDate } from "../../../utils/date";
import { useCurrency } from "../../../providers/CurrencyProvider";

interface ViewExpenseModalProps {
    expense: Expense | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (expense: Expense) => void;
}

export function ViewExpenseModal({ expense, isOpen, onClose, onEdit }: ViewExpenseModalProps) {
    const { currency: userCurrency } = useCurrency();

    if (!isOpen || !expense) return null;

    // Get both currency values for display
    const dualCurrencyValues = getDualCurrencyDisplay(expense.amount, userCurrency);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{expense.title}</h2>
                            <p className="text-gray-600">{expense.category.name}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {expense.isRecurring && (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                    Recurring
                                </span>
                            )}
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                    {/* Summary Card */}
                    <div className="bg-red-50 p-6 rounded-lg mb-8">
                        <h3 className="text-lg font-medium text-red-700 mb-2">Expense Amount</h3>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-4xl font-bold text-red-900">
                                    {userCurrency === 'INR' 
                                        ? formatDualCurrency(dualCurrencyValues.inr, 'INR')
                                        : formatDualCurrency(dualCurrencyValues.npr, 'NPR')
                                    }
                                </p>
                                <p className="text-lg text-red-700 mt-1">
                                    {userCurrency === 'INR' 
                                        ? formatDualCurrency(dualCurrencyValues.npr, 'NPR')
                                        : formatDualCurrency(dualCurrencyValues.inr, 'INR')
                                    }
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-red-600 mt-2">
                            {formatDate(expense.date)}
                        </p>
                    </div>

                    {/* Expense Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm text-gray-600">Title:</span>
                                    <p className="font-medium text-gray-900">{expense.title}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Category:</span>
                                    <div className="flex items-center mt-1">
                                        <div 
                                            className="w-3 h-3 rounded-full mr-2"
                                            style={{ backgroundColor: expense.category.color }}
                                        ></div>
                                        <span className="font-medium text-gray-900">{expense.category.name}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Date:</span>
                                    <p className="font-medium text-gray-900">{formatDate(expense.date)}</p>
                                </div>
                                {expense.description && (
                                    <div>
                                        <span className="text-sm text-gray-600">Description:</span>
                                        <p className="font-medium text-gray-900">{expense.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm text-gray-600">Account:</span>
                                    <p className="font-medium text-gray-900">
                                        {expense.account ? (
                                            <span>
                                                {expense.account.bankName} - {expense.account.accountType}
                                                <br />
                                                <span className="text-sm text-gray-500">
                                                    {expense.account.holderName}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center">
                                                Cash Payment
                                            </span>
                                        )}
                                    </p>
                                </div>
                                {expense.isRecurring && (
                                    <div>
                                        <span className="text-sm text-gray-600">Recurring:</span>
                                        <p className="font-medium text-gray-900">
                                            Yes{expense.recurringFrequency && ` - ${expense.recurringFrequency}`}
                                        </p>
                                    </div>
                                )}
                                {expense.tags && expense.tags.length > 0 && (
                                    <div>
                                        <span className="text-sm text-gray-600">Tags:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {expense.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {expense.notes && (
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-gray-700 whitespace-pre-wrap">{expense.notes}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            Created: {formatDate(expense.date)}
                        </div>
                        <div className="flex space-x-3">
                            {onEdit && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onEdit(expense);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    Edit Expense
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 