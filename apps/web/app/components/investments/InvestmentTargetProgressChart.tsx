"use client";

import React from "react";
import { InvestmentTargetProgress } from "../../types/investments";
import { formatCurrency } from "../../utils/currency";
import { Target, TrendingUp, Edit } from "lucide-react";

interface InvestmentTargetProgressChartProps {
    targets: InvestmentTargetProgress[];
    currency?: string;
    title?: string;
    onEditTarget?: (investmentType: string) => void;
    onAddTarget?: () => void;
}

const formatInvestmentType = (type: string): string => {
    switch (type) {
        case 'STOCKS': return 'Stocks';
        case 'CRYPTO': return 'Cryptocurrency';
        case 'MUTUAL_FUNDS': return 'Mutual Funds';
        case 'BONDS': return 'Bonds';
        case 'REAL_ESTATE': return 'Real Estate';
        case 'GOLD': return 'Gold';
        case 'FIXED_DEPOSIT': return 'Fixed Deposit';
        case 'PROVIDENT_FUNDS': return 'Provident Funds';
        case 'SAFE_KEEPINGS': return 'Safe Keepings';
        case 'OTHER': return 'Other';
        default: return type;
    }
};

const getProgressColor = (progress: number, isComplete: boolean): string => {
    if (isComplete) return "bg-green-500";
    if (progress >= 75) return "bg-blue-500";
    if (progress >= 50) return "bg-yellow-500";
    if (progress >= 25) return "bg-orange-500";
    return "bg-red-500";
};

const getProgressBgColor = (progress: number, isComplete: boolean): string => {
    if (isComplete) return "bg-green-50";
    if (progress >= 75) return "bg-blue-50";
    if (progress >= 50) return "bg-yellow-50";
    if (progress >= 25) return "bg-orange-50";
    return "bg-red-50";
};

export function InvestmentTargetProgressChart({ 
    targets, 
    currency = "USD", 
    title = "Investment Target Progress",
    onEditTarget,
    onAddTarget
}: InvestmentTargetProgressChartProps) {
    if (!targets || targets.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <Target className="w-5 h-5 text-blue-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                </div>
                
                <div className="text-center py-12">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Investment Targets Set</h4>
                    <p className="text-gray-500 mb-6">
                        Set investment targets to track your progress toward your financial goals.
                    </p>
                    {onAddTarget && (
                        <button
                            onClick={onAddTarget}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Target className="w-4 h-4 mr-2" />
                            Set Your First Target
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Target className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
                {onAddTarget && (
                    <button
                        onClick={onAddTarget}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                        + Add Target
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {targets.map((target, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getProgressBgColor(target.progress, target.isComplete)}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                                <h4 className="font-medium text-gray-900">
                                    {formatInvestmentType(target.investmentType)}
                                </h4>
                                {target.isComplete && (
                                    <TrendingUp className="w-4 h-4 text-green-600 ml-2" />
                                )}
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">
                                    {target.progress.toFixed(1)}%
                                </span>
                                {onEditTarget && (
                                    <button
                                        onClick={() => onEditTarget(target.investmentType)}
                                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                        title="Edit target"
                                    >
                                        <Edit className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ease-out ${getProgressColor(target.progress, target.isComplete)}`}
                                style={{ width: `${Math.min(target.progress, 100)}%` }}
                            />
                        </div>

                        {/* Progress Details */}
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center space-x-4">
                                <span className="text-gray-600">
                                    Current: <span className="font-medium text-gray-900">{formatCurrency(target.currentAmount, currency)}</span>
                                </span>
                                <span className="text-gray-600">
                                    Target: <span className="font-medium text-gray-900">{formatCurrency(target.targetAmount, currency)}</span>
                                </span>
                            </div>
                            <div className="text-right">
                                {target.isComplete ? (
                                    <span className="text-green-600 font-medium">Target Achieved! 🎉</span>
                                ) : (
                                    <span className="text-gray-600">
                                        Remaining: <span className="font-medium text-gray-900">
                                            {formatCurrency(Math.max(0, target.targetAmount - target.currentAmount), currency)}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-600">Total Targets</p>
                        <p className="text-lg font-semibold text-gray-900">{targets.length}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-lg font-semibold text-green-600">
                            {targets.filter(t => t.isComplete).length}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Average Progress</p>
                        <p className="text-lg font-semibold text-blue-600">
                            {targets.length > 0 ? (targets.reduce((sum, t) => sum + t.progress, 0) / targets.length).toFixed(1) : 0}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}