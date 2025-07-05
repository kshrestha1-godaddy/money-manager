"use client";

import { useState } from "react";
import { DebtInterface } from "../../types/debts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { deleteRepayment } from "../../actions/debts";

interface ViewDebtModalProps {
    debt: DebtInterface | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (debt: DebtInterface) => void;
    onAddRepayment?: (debt: DebtInterface) => void;
    onRepaymentDeleted?: () => void;
}

export function ViewDebtModal({ debt, isOpen, onClose, onEdit, onAddRepayment, onRepaymentDeleted }: ViewDebtModalProps) {
    const { currency: userCurrency } = useCurrency();
    const [deletingRepayments, setDeletingRepayments] = useState<Set<number>>(new Set());

    if (!isOpen || !debt) return null;

    // Calculate debt summary
    const totalRepayments = debt.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
    const remainingAmount = debt.amount - totalRepayments;
    const repaymentPercentage = ((totalRepayments / debt.amount) * 100);

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-blue-100 text-blue-800';
            case 'PARTIALLY_PAID':
                return 'bg-yellow-100 text-yellow-800';
            case 'FULLY_PAID':
                return 'bg-green-100 text-green-800';
            case 'OVERDUE':
                return 'bg-red-100 text-red-800';
            case 'DEFAULTED':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Check if debt is overdue
    const isOverdue = debt.dueDate && new Date() > debt.dueDate && remainingAmount > 0;

    const handleDeleteRepayment = async (repaymentId: number) => {
        if (deletingRepayments.has(repaymentId)) return;

        try {
            setDeletingRepayments(prev => new Set([...prev, repaymentId]));
            await deleteRepayment(repaymentId, debt.id);
            onRepaymentDeleted?.();
        } catch (error) {
            console.error("Error deleting repayment:", error);
            // You could add a toast notification here if you have one
        } finally {
            setDeletingRepayments(prev => {
                const newSet = new Set(prev);
                newSet.delete(repaymentId);
                return newSet;
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{debt.borrowerName}</h2>
                            <p className="text-sm sm:text-base text-gray-600 truncate">{debt.purpose || 'Personal Loan'}</p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end space-x-3">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(debt.status)}`}>
                                {debt.status.replace('_', ' ')}
                            </span>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(95vh-6rem)] sm:max-h-[calc(90vh-8rem)]">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
                        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                            <h3 className="text-xs sm:text-sm font-medium text-blue-700 mb-1">Original Amount</h3>
                            <p className="text-lg sm:text-2xl font-bold text-blue-900">{formatCurrency(debt.amount, userCurrency)}</p>
                        </div>
                        <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                            <h3 className="text-xs sm:text-sm font-medium text-green-700 mb-1">Repaid Amount</h3>
                            <p className="text-lg sm:text-2xl font-bold text-green-900">{formatCurrency(totalRepayments, userCurrency)}</p>
                            <p className="text-xs sm:text-sm text-green-600">{repaymentPercentage.toFixed(1)}% repaid</p>
                        </div>
                        <div className={`p-3 sm:p-4 rounded-lg ${remainingAmount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <h3 className={`text-xs sm:text-sm font-medium mb-1 ${remainingAmount > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                                Remaining Amount
                            </h3>
                            <p className={`text-lg sm:text-2xl font-bold ${remainingAmount > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                                {formatCurrency(remainingAmount, userCurrency)}
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6 sm:mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Repayment Progress</h3>
                            <span className="text-sm text-gray-600">{repaymentPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                            <div 
                                className="bg-green-600 h-2 sm:h-3 rounded-full transition-all duration-300" 
                                style={{ width: `${Math.min(repaymentPercentage, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Debt Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
                        {/* Borrower Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Borrower Information</h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm text-gray-600">Name:</span>
                                    <p className="font-medium text-gray-900">{debt.borrowerName}</p>
                                </div>
                                {debt.borrowerContact && (
                                    <div>
                                        <span className="text-sm text-gray-600">Contact:</span>
                                        <p className="font-medium text-gray-900">{debt.borrowerContact}</p>
                                    </div>
                                )}
                                {debt.borrowerEmail && (
                                    <div>
                                        <span className="text-sm text-gray-600">Email:</span>
                                        <p className="font-medium text-gray-900">{debt.borrowerEmail}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Loan Details */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="text-sm text-gray-600">Interest Rate:</span>
                                    <p className="font-medium text-gray-900">{debt.interestRate}% per year</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Lent Date:</span>
                                    <p className="font-medium text-gray-900">{debt.lentDate.toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Due Date:</span>
                                    <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                        {debt.dueDate ? debt.dueDate.toLocaleDateString() : 'No due date set'}
                                        {isOverdue && <span className="text-red-600 ml-2">(Overdue)</span>}
                                    </p>
                                </div>
                                {debt.purpose && (
                                    <div>
                                        <span className="text-sm text-gray-600">Purpose:</span>
                                        <p className="font-medium text-gray-900">{debt.purpose}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {debt.notes && (
                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-gray-700 whitespace-pre-wrap">{debt.notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Repayment History */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Repayment History ({debt.repayments?.length || 0})
                            </h3>
                            {onAddRepayment && remainingAmount > 0 && (
                                <button
                                    onClick={() => onAddRepayment(debt)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                >
                                    Add Repayment
                                </button>
                            )}
                        </div>
                        
                        {debt.repayments && debt.repayments.length > 0 ? (
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Amount
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Notes
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {debt.repayments
                                                .sort((a, b) => new Date(b.repaymentDate).getTime() - new Date(a.repaymentDate).getTime())
                                                .map((repayment, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {repayment.repaymentDate.toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm font-medium text-green-600">
                                                            {formatCurrency(repayment.amount, userCurrency)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {repayment.notes || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {deletingRepayments.has(repayment.id) ? (
                                                            <span className="text-gray-500">Deleting...</span>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleDeleteRepayment(repayment.id)}
                                                                    className="text-red-500 hover:text-red-700 mr-2"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                                <p className="text-gray-500">No repayments recorded yet</p>
                                {onAddRepayment && remainingAmount > 0 && (
                                    <button
                                        onClick={() => onAddRepayment(debt)}
                                        className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                                    >
                                        Add First Repayment
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            Created: {debt.createdAt.toLocaleDateString()} • 
                            Last updated: {debt.updatedAt.toLocaleDateString()}
                        </div>
                        <div className="flex space-x-3">
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(debt)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                    Edit Debt
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