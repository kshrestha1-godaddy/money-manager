"use client";

import React from "react";
import { InvestmentTargetProgress } from "../../types/investments";
import { formatCurrency } from "../../utils/currency";
import { TrendingUp, Edit } from "lucide-react";
import { formatInvestmentType } from "./constants";

interface TargetProgressItemProps {
    target: InvestmentTargetProgress;
    currency: string;
    onEditTarget?: (investmentType: string) => void;
}

const getProgressColor = (progress: number): string => {
    // Convert progress to a value between 0 and 1
    const intensity = Math.min(progress / 100, 1);
    
    // Use a blue gradient that gets more intense as progress increases
    if (intensity >= 0.9) return "bg-blue-600";
    if (intensity >= 0.8) return "bg-blue-500";
    if (intensity >= 0.7) return "bg-blue-400";
    if (intensity >= 0.6) return "bg-blue-400";
    if (intensity >= 0.5) return "bg-blue-300";
    if (intensity >= 0.4) return "bg-blue-300";
    if (intensity >= 0.3) return "bg-blue-200";
    if (intensity >= 0.2) return "bg-blue-200";
    if (intensity >= 0.1) return "bg-blue-100";
    return "bg-blue-50";
};

const getProgressBgColor = (progress: number, isComplete: boolean): string => {
    if (isComplete) return "bg-green-50 border-green-200";
    return "bg-blue-50/30 border-blue-100";
};

export function TargetProgressItem({ target, currency, onEditTarget }: TargetProgressItemProps) {
    return (
        <div className={`p-4 rounded-lg border ${getProgressBgColor(target.progress, target.isComplete)}`}>
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
            <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ease-out ${getProgressColor(target.progress)}`}
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
    );
}