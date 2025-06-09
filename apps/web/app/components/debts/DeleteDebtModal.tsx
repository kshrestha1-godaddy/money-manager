"use client";

import { DebtInterface } from "../../types/debts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";

interface DeleteDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    debt: DebtInterface | null;
}

export function DeleteDebtModal({ isOpen, onClose, onConfirm, debt }: DeleteDebtModalProps) {
    const { currency: userCurrency } = useCurrency();

    if (!isOpen || !debt) return null;

    const totalRepayments = debt.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
    const remainingAmount = debt.amount - totalRepayments;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                </div>

                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Delete Debt Record
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Are you sure you want to delete this debt record? This action cannot be undone.
                    </p>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Borrower:</span>
                                <span className="text-sm font-medium text-gray-900">{debt.borrowerName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Original Amount:</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(debt.amount, userCurrency)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Remaining:</span>
                                <span className={`text-sm font-medium ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(remainingAmount, userCurrency)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Status:</span>
                                <span className="text-sm font-medium text-gray-900">{debt.status.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}