"use client";

import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { DebtInterface } from "../../types/debts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { getUserDebts } from "../../actions/debts";
import { calculateRemainingWithInterest, calculateInterest } from "../../utils/interestCalculation";

interface ViewDebtModalProps {
    debtId: number | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (debt: DebtInterface) => void;
    onAddRepayment?: (debt: DebtInterface) => void;
    onDeleteRepayment?: (repaymentId: number, debtId: number) => Promise<void>;
}

export function ViewDebtModal({ debtId, isOpen, onClose, onEdit, onAddRepayment, onDeleteRepayment }: ViewDebtModalProps) {
    const { currency: userCurrency } = useCurrency();
    const [deletingRepayments, setDeletingRepayments] = useState<Set<number>>(new Set());

    // Fetch debt data from React Query cache
    const { data: debtsResponse } = useQuery({
        queryKey: ['debts'],
        queryFn: getUserDebts,
        staleTime: 3 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        enabled: isOpen && debtId !== null,
        select: (data) => {
            if (data && !('error' in data)) {
                return data.data || [];
            }
            return [];
        }
    });

    const debt = debtsResponse?.find(d => d.id === debtId) || null;

    if (!isOpen || !debtId || !debt) return null;

    // Calculate debt summary including interest
    const totalRepayments = debt.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
    const remainingWithInterest = calculateRemainingWithInterest(
        debt.amount,
        debt.interestRate,
        debt.lentDate,
        debt.dueDate,
        debt.repayments || [],
        new Date(),
        debt.status
    );
    const remainingAmount = remainingWithInterest.remainingAmount;
    const repaymentPercentage = remainingWithInterest.totalWithInterest > 0 ? ((totalRepayments / remainingWithInterest.totalWithInterest) * 100) : 0;

    // Calculate interest details for display
    const interestCalc = calculateInterest(debt.amount, debt.interestRate, debt.lentDate, debt.dueDate);
    
    // Calculate term days for display
    const termDays = debt.dueDate 
        ? Math.max(0, Math.floor((debt.dueDate.getTime() - debt.lentDate.getTime()) / (1000 * 60 * 60 * 24)))
        : Math.max(0, Math.floor((new Date().getTime() - debt.lentDate.getTime()) / (1000 * 60 * 60 * 24)));

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
        if (deletingRepayments.has(repaymentId) || !onDeleteRepayment) return;

        try {
            setDeletingRepayments(prev => new Set([...prev, repaymentId]));
            await onDeleteRepayment(repaymentId, debt.id);
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
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden transition-all duration-200 ease-in-out">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8 transition-all duration-200 ease-in-out">
                        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                            <h3 className="text-xs sm:text-sm font-medium text-blue-700 mb-1">Original Amount</h3>
                            <p className="text-lg sm:text-2xl font-bold text-blue-900">{formatCurrency(debt.amount, userCurrency)}</p>
                        </div>
                        <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                            <h3 className="text-xs sm:text-sm font-medium text-orange-700 mb-1">
                                Interest ({debt.interestRate}%)
                                {debt.status === 'FULLY_PAID' && <span className="text-xs text-orange-600 ml-1">(Final)</span>}
                            </h3>
                            <p className="text-lg sm:text-2xl font-bold text-orange-900">{formatCurrency(remainingWithInterest.interestAmount, userCurrency)}</p>
                            <p className="text-xs text-orange-600">
                                {debt.dueDate ? `${termDays} days term` : `${termDays} days elapsed`}
                            </p>
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
                            <p className={`text-sm font-medium ${remainingAmount > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                                {formatCurrency(remainingAmount, userCurrency)}
                            </p>
                            {debt.status === 'FULLY_PAID' && (
                                <p className="text-xs text-green-600 font-medium">✓ Fully Paid</p>
                            )}
                        </div>
                    </div>

                    {/* Interest Calculation Details */}
                    {(debt.interestRate > 0 || debt.status === 'FULLY_PAID') && (
                        <div className="mb-6 sm:mb-8">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Interest Calculation</h3>
                            <div className="bg-orange-50 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-orange-800 mb-2">Calculation Details</h4>
                                        <div className="space-y-1 text-sm text-orange-700">
                                            <div>Principal: {formatCurrency(debt.amount, userCurrency)}</div>
                                            <div>Interest Rate: {debt.interestRate}% per year</div>
                                            <div>Term: {termDays} days {debt.dueDate ? '(loan term)' : '(elapsed)'}</div>
                                            <div>Time in Years: {(termDays / 365).toFixed(4)}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-orange-800 mb-2">Formula</h4>
                                        <div className="space-y-1 text-sm text-orange-700">
                                            <div>Interest = Principal × Rate × Time</div>
                                            <div>= {formatCurrency(debt.amount, userCurrency)} × {debt.interestRate}% × {(termDays / 365).toFixed(4)}</div>
                                            <div className="font-medium">= {formatCurrency(remainingWithInterest.interestAmount, userCurrency)}</div>
                                            {debt.status === 'FULLY_PAID' && (
                                                <div className="text-green-600 font-medium mt-2">
                                                    ✓ Interest calculation stopped (Fully Paid)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-6 sm:mb-8 transition-all duration-200 ease-in-out">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Repayment Progress</h3>
                            <span className="text-sm text-gray-600 transition-all duration-200 ease-in-out">{repaymentPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                            <div 
                                className="bg-green-600 h-2 sm:h-3 rounded-full transition-all duration-500 ease-in-out" 
                                style={{ width: `${Math.min(repaymentPercentage, 100)}%` }}
                            ></div>
                        </div>
                        {debt.status === 'FULLY_PAID' && (
                            <div className="text-center mt-2 transition-all duration-200 ease-in-out">
                                <span className="text-sm text-green-600 font-medium">✓ Debt Fully Repaid</span>
                            </div>
                        )}
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
                    <div className="mb-6 transition-all duration-200 ease-in-out">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 transition-all duration-200 ease-in-out">
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
                                                <tr 
                                                    key={repayment.id} 
                                                    className={`hover:bg-gray-50 transition-all duration-200 ease-in-out ${
                                                        deletingRepayments.has(repayment.id) 
                                                            ? 'opacity-50 bg-red-50 transform scale-95' 
                                                            : 'opacity-100 transform scale-100'
                                                    }`}
                                                >
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
                                                            <span className="text-gray-500 flex items-center">
                                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Deleting...
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleDeleteRepayment(repayment.id)}
                                                                className="text-red-500 hover:text-red-700 transition-colors duration-150 ease-in-out"
                                                            >
                                                                Delete
                                                            </button>
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