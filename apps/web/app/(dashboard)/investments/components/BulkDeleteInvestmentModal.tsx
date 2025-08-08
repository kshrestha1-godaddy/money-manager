"use client";

import { InvestmentInterface } from "../../../types/investments";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../providers/CurrencyProvider";

interface BulkDeleteInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    investments: InvestmentInterface[];
}

export function BulkDeleteInvestmentModal({ isOpen, onClose, onConfirm, investments }: BulkDeleteInvestmentModalProps) {
    const { currency: userCurrency } = useCurrency();

    if (!isOpen || investments.length === 0) return null;

    // Calculate totals for all selected investments
    const totals = investments.reduce((acc, investment) => {
        const totalCost = investment.quantity * investment.purchasePrice;
        const totalValue = investment.quantity * investment.currentPrice;
        const gain = totalValue - totalCost;
        
        return {
            totalInvested: acc.totalInvested + totalCost,
            totalCurrentValue: acc.totalCurrentValue + totalValue,
            totalGainLoss: acc.totalGainLoss + gain
        };
    }, { totalInvested: 0, totalCurrentValue: 0, totalGainLoss: 0 });

    // Count investments by type
    const typeCounts = investments.reduce((acc, investment) => {
        acc[investment.type] = (acc[investment.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Format investment type for display
    const formatType = (type: string) => {
        return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

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
                        Delete Multiple Investment Records
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Are you sure you want to delete {investments.length} investment record{investments.length > 1 ? 's' : ''}? This action cannot be undone.
                    </p>

                    {/* Summary Section */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Summary</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Investments:</span>
                                <span className="text-sm font-medium text-gray-900">{investments.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Invested:</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(totals.totalInvested, userCurrency)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Current Value:</span>
                                <span className="text-sm font-medium text-gray-900">{formatCurrency(totals.totalCurrentValue, userCurrency)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Gain/Loss:</span>
                                <span className={`text-sm font-medium ${totals.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {totals.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totals.totalGainLoss, userCurrency)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Type Breakdown */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Type Breakdown</h4>
                        <div className="space-y-1">
                            {Object.entries(typeCounts).map(([type, count]) => (
                                <div key={type} className="flex justify-between">
                                    <span className="text-sm text-gray-600">{formatType(type)}:</span>
                                    <span className="text-sm font-medium text-gray-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Individual Investments List */}
                    {investments.length <= 5 && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left max-h-40 overflow-y-auto">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Investments to be deleted</h4>
                            <div className="space-y-2">
                                {investments.map((investment) => {
                                    const totalCost = investment.quantity * investment.purchasePrice;
                                    const totalValue = investment.quantity * investment.currentPrice;
                                    const gain = totalValue - totalCost;
                                    
                                    return (
                                        <div key={investment.id} className="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">{investment.name}</div>
                                                <div className="text-xs text-gray-500">{formatType(investment.type)}</div>
                                                {investment.symbol && (
                                                    <div className="text-xs text-gray-400">{investment.symbol}</div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-900">{formatCurrency(totalValue, userCurrency)}</div>
                                                <div className={`text-xs ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {gain >= 0 ? '+' : ''}{formatCurrency(gain, userCurrency)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {investments.length > 5 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                            <p className="text-sm text-yellow-800">
                                <strong>{investments.length} investments</strong> will be deleted. This includes: {investments.slice(0, 3).map(i => i.name).join(', ')}
                                {investments.length > 3 && ` and ${investments.length - 3} more`}.
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
                            Delete {investments.length} Investment{investments.length > 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 