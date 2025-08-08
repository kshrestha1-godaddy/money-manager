"use client";

import { DebtInterface } from "../../../types/debts";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { calculateRemainingWithInterest } from "../../../utils/interestCalculation";

interface BulkDeleteDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    debts: DebtInterface[];
}

export function BulkDeleteDebtModal({ isOpen, onClose, onConfirm, debts }: BulkDeleteDebtModalProps) {
    const { currency: userCurrency } = useCurrency();

    if (!isOpen || debts.length === 0) return null;

    // Calculate totals for all selected debts
    const totals = debts.reduce((acc, debt) => {
        const remainingWithInterest = calculateRemainingWithInterest(
            debt.amount,
            debt.interestRate,
            debt.lentDate,
            debt.dueDate,
            debt.repayments || [],
            new Date(),
            debt.status
        );
        
        return {
            originalAmount: acc.originalAmount + debt.amount,
            remainingAmount: acc.remainingAmount + remainingWithInterest.remainingAmount,
            totalRepayments: acc.totalRepayments + (debt.repayments?.reduce((sum, r) => sum + r.amount, 0) || 0)
        };
    }, { originalAmount: 0, remainingAmount: 0, totalRepayments: 0 });

    // Count debts by status
    const statusCounts = debts.reduce((acc, debt) => {
        acc[debt.status] = (acc[debt.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                </div>

                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Delete Multiple Debt Records
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Are you sure you want to delete {debts.length} debt record{debts.length > 1 ? 's' : ''}? This action cannot be undone.
                    </p>

                    {/* Summary Section */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Summary</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Debts:</span>
                                <span className="text-sm font-medium text-gray-900">{debts.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Original Amount:</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(totals.originalAmount, userCurrency)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Remaining:</span>
                                <span className={`text-sm font-medium ${totals.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(totals.remainingAmount, userCurrency)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Repayments:</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(totals.totalRepayments, userCurrency)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Status Breakdown</h4>
                        <div className="space-y-1">
                            {Object.entries(statusCounts).map(([status, count]) => (
                                <div key={status} className="flex justify-between">
                                    <span className="text-sm text-gray-600">{status.replace('_', ' ')}:</span>
                                    <span className="text-sm font-medium text-gray-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Individual Debts List */}
                    {debts.length <= 5 && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left max-h-40 overflow-y-auto">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Debts to be deleted</h4>
                            <div className="space-y-2">
                                {debts.map((debt) => {
                                    const remainingWithInterest = calculateRemainingWithInterest(
                                        debt.amount,
                                        debt.interestRate,
                                        debt.lentDate,
                                        debt.dueDate,
                                        debt.repayments || [],
                                        new Date(),
                                        debt.status
                                    );
                                    
                                    return (
                                        <div key={debt.id} className="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">{debt.borrowerName}</div>
                                                <div className="text-xs text-gray-500">{debt.purpose || 'Personal Loan'}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900">{formatCurrency(debt.amount, userCurrency)}</div>
                                                <div className={`text-xs ${remainingWithInterest.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {remainingWithInterest.remainingAmount > 0 ? 'Outstanding' : 'Paid'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {debts.length > 5 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                            <p className="text-sm text-yellow-800">
                                <strong>{debts.length} debts</strong> will be deleted. This includes debts for: {debts.slice(0, 3).map(d => d.borrowerName).join(', ')}
                                {debts.length > 3 && ` and ${debts.length - 3} more`}.
                            </p>
                        </div>
                    )}

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
                            Delete {debts.length} Debt{debts.length > 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 