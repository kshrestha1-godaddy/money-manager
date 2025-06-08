"use client";

import { InvestmentInterface } from "../types/investments";
import { formatCurrency } from "../utils/currency";
import { useCurrency } from "../providers/CurrencyProvider";

interface InvestmentCardProps {
    investment: InvestmentInterface;
    onEdit: (investment: InvestmentInterface) => void;
    onDelete: (investment: InvestmentInterface) => void;
    onViewDetails: (investment: InvestmentInterface) => void;
}

export function InvestmentCard({ investment, onEdit, onDelete, onViewDetails }: InvestmentCardProps) {
    const { currency: userCurrency } = useCurrency();

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
            default: return '💼';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="text-2xl">{getTypeIcon(investment.type)}</span>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {investment.name}
                            </h3>
                            {investment.symbol && (
                                <p className="text-sm text-gray-500">{investment.symbol}</p>
                            )}
                        </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {formatType(investment.type)}
                    </span>
                </div>
                
                <div className="flex space-x-1">
                    <button
                        onClick={() => onViewDetails(investment)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="View Details"
                    >
                        👁️
                    </button>
                    <button
                        onClick={() => onEdit(investment)}
                        className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                        title="Edit"
                    >
                        ✏️
                    </button>
                    <button
                        onClick={() => onDelete(investment)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Delete"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Quantity</p>
                        <p className="text-sm font-medium text-gray-900">{investment.quantity}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Purchase Price</p>
                        <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(investment.purchasePrice, userCurrency)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Current Price</p>
                        <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(investment.currentPrice, userCurrency)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Total Value</p>
                        <p className="text-sm font-bold text-gray-900">
                            {formatCurrency(totalValue, userCurrency)}
                        </p>
                    </div>
                </div>

                <div className={`p-3 rounded-lg border ${getGainBgColor(gain)}`}>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 uppercase tracking-wide">Gain/Loss</span>
                        <div className="text-right">
                            <div className={`text-sm font-bold ${getGainColor(gain)}`}>
                                {formatCurrency(gain, userCurrency)}
                            </div>
                            <div className={`text-xs ${getGainColor(gain)}`}>
                                ({gainPercentage}%)
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Purchased</span>
                        <span>{new Date(investment.purchaseDate).toLocaleDateString()}</span>
                    </div>
                </div>

                {investment.notes && (
                    <div className="pt-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{investment.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
} 