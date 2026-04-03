"use client";

import { InvestmentInterface } from "../../../types/investments";
import { formatCurrency } from "../../../utils/currency";
import { formatDateYearMonthDay } from "../../../utils/date";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { InvestmentSavingsTargetChart } from "./InvestmentSavingsTargetChart";

interface ViewInvestmentModalProps {
    investment: InvestmentInterface | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (investment: InvestmentInterface) => void;
}

export function ViewInvestmentModal({ investment, isOpen, onClose, onEdit }: ViewInvestmentModalProps) {
    const { currency: userCurrency } = useCurrency();

    if (!isOpen || !investment) return null;

    const totalValue = investment.quantity * investment.currentPrice;
    const totalCost = investment.quantity * investment.purchasePrice;
    const gain = totalValue - totalCost;
    const gainPercentage = ((investment.currentPrice - investment.purchasePrice) / investment.purchasePrice * 100).toFixed(2);

    const getGainColor = (gain: number) => {
        if (gain > 0) return 'text-green-600';
        if (gain < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getGainBgColor = (gain: number) => {
        if (gain > 0) return 'bg-green-50 border-green-200';
        if (gain < 0) return 'bg-red-50 border-red-200';
        return 'bg-gray-50 border-gray-200';
    };

    const formatType = (type: string) => {
        return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'STOCKS': return '📈';
            case 'CRYPTO': return '₿';
            case 'MUTUAL_FUNDS': return '📊';
            case 'BONDS': return '🏛️';
            case 'REAL_ESTATE': return '🏠';
            case 'GOLD': return '🥇';
            case 'SILVER': return '🥈';
            case 'FIXED_DEPOSIT': return '🏦';
            case 'PROVIDENT_FUNDS': return '🏛️';
            case 'SAFE_KEEPINGS': return '🔒';
            default: return '💼';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-3">
                        <span className="text-3xl">{getTypeIcon(investment.type)}</span>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{investment.name}</h2>
                            {investment.symbol && (
                                <p className="text-lg text-gray-600">{investment.symbol}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Investment Type */}
                    <div className="flex justify-center">
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {formatType(investment.type)}
                        </span>
                    </div>

                    {investment.investmentTarget && (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <div className="inline-flex flex-col items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-center">
                                    <span className="text-xs font-medium uppercase tracking-wide text-purple-700">
                                        Savings target
                                    </span>
                                    <span className="text-sm font-semibold text-purple-900">
                                        {investment.investmentTarget.nickname?.trim() ||
                                            formatType(investment.investmentTarget.investmentType)}
                                    </span>
                                    {investment.investmentTarget.nickname?.trim() ? (
                                        <span className="text-xs text-purple-700">
                                            {formatType(investment.investmentTarget.investmentType)}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            <InvestmentSavingsTargetChart
                                targetAmount={investment.investmentTarget.targetAmount}
                                fulfilledAmount={investment.investmentTarget.fulfilledAmount}
                                currency={userCurrency}
                            />
                        </div>
                    )}

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Investment Details</h3>
                            <div className="space-y-3">
                                {(investment.type !== 'FIXED_DEPOSIT' && investment.type !== 'PROVIDENT_FUNDS' && investment.type !== 'SAFE_KEEPINGS' && investment.type !== 'EMERGENCY_FUND' && investment.type !== 'MARRIAGE' && investment.type !== 'VACATION') && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Quantity:</span>
                                        <span className="font-medium text-gray-900">{investment.quantity}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        {(investment.type === 'FIXED_DEPOSIT' || investment.type === 'EMERGENCY_FUND' || investment.type === 'MARRIAGE' || investment.type === 'VACATION') ? 'Principal Amount:' : 
                                         investment.type === 'PROVIDENT_FUNDS' || investment.type === 'SAFE_KEEPINGS' ? 'Investment Amount:' : 
                                         investment.type === 'GOLD' || investment.type === 'SILVER' ? 'Purchase price (per unit):' : 'Purchase Price:'}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {formatCurrency(investment.purchasePrice, userCurrency)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        {investment.type === "GOLD" || investment.type === "SILVER" ? "Spot (per unit):" : "Current Value:"}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {formatCurrency(investment.currentPrice, userCurrency)}
                                    </span>
                                </div>
                                {investment.type === "GOLD" || investment.type === "SILVER" ? (
                                    <p className="text-xs text-gray-500">
                                        Total purchase = quantity × purchase price per unit. Current total = quantity × spot
                                        (from Update gold / silver rate on the investments page).
                                    </p>
                                ) : null}
                                {(investment.type === 'FIXED_DEPOSIT' || investment.type === 'PROVIDENT_FUNDS' || investment.type === 'SAFE_KEEPINGS' || investment.type === 'EMERGENCY_FUND' || investment.type === 'MARRIAGE' || investment.type === 'VACATION') && investment.interestRate && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Interest Rate:</span>
                                        <span className="font-medium text-gray-900">{investment.interestRate}% per annum</span>
                                    </div>
                                )}
                                {(investment.type === 'FIXED_DEPOSIT' || investment.type === 'PROVIDENT_FUNDS' || investment.type === 'SAFE_KEEPINGS' || investment.type === 'EMERGENCY_FUND' || investment.type === 'MARRIAGE' || investment.type === 'VACATION') && investment.maturityDate && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Maturity Date:</span>
                                        <span className="font-medium text-gray-900">
                                            {formatDateYearMonthDay(investment.maturityDate)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">
                                        {(investment.type === 'FIXED_DEPOSIT' || investment.type === 'EMERGENCY_FUND' || investment.type === 'MARRIAGE' || investment.type === 'VACATION') ? 'Deposit Date:' : 
                                         investment.type === 'PROVIDENT_FUNDS' || investment.type === 'SAFE_KEEPINGS' ? 'Investment Date:' : 
                                         'Purchase Date:'}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                        {formatDateYearMonthDay(investment.purchaseDate)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total Cost:</span>
                                    <span className="font-medium text-gray-900">
                                        {formatCurrency(totalCost, userCurrency)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Current Value:</span>
                                    <span className="font-bold text-gray-900">
                                        {formatCurrency(totalValue, userCurrency)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Gain/Loss:</span>
                                    <div className="text-right">
                                        <div className={`font-bold ${getGainColor(gain)}`}>
                                            {formatCurrency(gain, userCurrency)}
                                        </div>
                                        <div className={`text-sm ${getGainColor(gain)}`}>
                                            ({gainPercentage}%)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Summary */}
                    <div className={`p-4 rounded-lg border-2 ${getGainBgColor(gain)}`}>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Performance</h3>
                            <div className={`text-3xl font-bold ${getGainColor(gain)}`}>
                                {formatCurrency(gain, userCurrency)}
                            </div>
                            <div className={`text-lg ${getGainColor(gain)}`}>
                                {gainPercentage}% {gain >= 0 ? 'Gain' : 'Loss'}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {investment.notes && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{investment.notes}</p>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Record Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                                <span className="font-medium">Created:</span> {new Date(investment.createdAt).toLocaleString()}
                            </div>
                            <div>
                                <span className="font-medium">Last Updated:</span> {new Date(investment.updatedAt).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            onEdit(investment);
                            onClose();
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                        Edit Investment
                    </button>
                </div>
            </div>
        </div>
    );
} 