"use client";

import { Card } from "@repo/ui/card";
import React, { useState } from "react";
import { DebtInterface } from "../../types/debts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { calculateRemainingWithInterest } from "../../utils/interestCalculation";

export function DebtCard({ 
    debt, 
    onEdit, 
    onDelete, 
    onViewDetails, 
    onAddRepayment,
    isSelected = false,
    onSelect,
    showCheckbox = false 
}: { 
    debt: DebtInterface;
    onEdit?: (debt: DebtInterface) => void;
    onDelete?: (debt: DebtInterface) => void;
    onViewDetails?: (debt: DebtInterface) => void;
    onAddRepayment?: (debt: DebtInterface) => void;
    isSelected?: boolean;
    onSelect?: (debtId: number, selected: boolean) => void;
    showCheckbox?: boolean;
}) {
    const { currency: userCurrency } = useCurrency();

    const handleSelect = () => {
        if (onSelect) {
            onSelect(debt.id, !isSelected);
        }
    };

    // Calculate remaining amount including interest
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

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'text-blue-600';
            case 'PARTIALLY_PAID':
                return 'text-yellow-600';
            case 'FULLY_PAID':
                return 'text-green-600';
            case 'OVERDUE':
                return 'text-red-600';
            case 'DEFAULTED':
                return 'text-gray-600';
            default:
                return 'text-gray-600';
        }
    };

    // Check if debt is overdue
    const isOverdue = debt.dueDate && new Date() > debt.dueDate && remainingAmount > 0;

    return (
        <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-8 hover:shadow-lg transition-shadow ${isOverdue ? 'border-red-300' : ''} ${isSelected ? 'bg-blue-50 border-blue-200' : ''}`}>
            {/* Checkbox for bulk selection */}
            {showCheckbox && (
                <div className="flex justify-end mb-2">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                </div>
            )}
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-semibold text-2xl text-gray-900">{debt.borrowerName}</h3>
                    <p className="text-lg text-gray-600 mt-1">{debt.purpose || 'Personal Loan'}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-red-600">{formatCurrency(remainingAmount, userCurrency)}</p>
                    <p className="text-sm text-gray-500">Remaining</p>
                </div>
            </div>

            {/* Status and Progress */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-medium ${getStatusColor(debt.status)}`}>
                        {debt.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                        {remainingWithInterest.totalWithInterest > 0 ? ((totalRepayments / remainingWithInterest.totalWithInterest) * 100).toFixed(1) : '0.0'}% repaid
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${remainingWithInterest.totalWithInterest > 0 ? Math.min((totalRepayments / remainingWithInterest.totalWithInterest) * 100, 100) : 0}%` }}
                    ></div>
                </div>
            </div>

            {/* Compact Info - 2 column layout for wider cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Original Amount:</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(debt.amount, userCurrency)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Interest Rate:</span>
                    <span className="text-sm font-medium text-gray-900">{debt.interestRate}%</span>
                </div>
                {remainingWithInterest.interestAmount > 0 && (
                    <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Interest Amount:</span>
                        <span className="text-sm font-medium text-orange-600">{formatCurrency(remainingWithInterest.interestAmount, userCurrency)}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Amount:</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(remainingWithInterest.totalWithInterest, userCurrency)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Lent Date:</span>
                    <span className="text-sm font-medium text-gray-900">{debt.lentDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Due Date:</span>
                    <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {debt.dueDate ? debt.dueDate.toLocaleDateString() : 'No due date'}
                    </span>
                </div>
            </div>

            {/* Contact Info */}
            {(debt.borrowerContact || debt.borrowerEmail) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                    {debt.borrowerContact && (
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Contact:</span>
                            <span className="text-sm font-medium text-gray-900">{debt.borrowerContact}</span>
                        </div>
                    )}
                    {debt.borrowerEmail && (
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Email:</span>
                            <span className="text-sm font-medium text-gray-900">{debt.borrowerEmail}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
                {onViewDetails && (
                    <button
                        onClick={() => onViewDetails(debt)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                        View Details
                    </button>
                )}
                
                <div className="flex space-x-2">
                    {onAddRepayment && remainingAmount > 0 && (
                        <button
                            onClick={() => onAddRepayment(debt)}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                        >
                            Add Repayment
                        </button>
                    )}
                    {onEdit && (
                        <button
                            onClick={() => onEdit(debt)}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={() => onDelete(debt)}
                            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function DebtGrid({ 
    debts, 
    onEdit, 
    onDelete, 
    onViewDetails, 
    onAddRepayment,
    selectedDebts = new Set(),
    onDebtSelect,
    showBulkActions = false 
}: { 
    debts: DebtInterface[];
    onEdit?: (debt: DebtInterface) => void;
    onDelete?: (debt: DebtInterface) => void;
    onViewDetails?: (debt: DebtInterface) => void;
    onAddRepayment?: (debt: DebtInterface) => void;
    selectedDebts?: Set<number>;
    onDebtSelect?: (debtId: number, selected: boolean) => void;
    showBulkActions?: boolean;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-full w-full">
            {debts.map((debt) => (
                <DebtCard 
                    key={debt.id} 
                    debt={debt} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                    onViewDetails={onViewDetails}
                    onAddRepayment={onAddRepayment}
                    isSelected={selectedDebts.has(debt.id)}
                    onSelect={onDebtSelect}
                    showCheckbox={showBulkActions}
                />
            ))}
        </div>
    );
}