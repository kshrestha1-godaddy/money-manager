"use client";

import React from "react";
import { InvestmentTargetProgress } from "../../../types/investments";
import { Target } from "lucide-react";
import { TargetProgressItem } from "../components/TargetProgressItem";
import { ProgressLegend } from "../components/ProgressLegend";
import { formatCurrency } from "../../../utils/currency";

interface InvestmentTargetProgressChartProps {
    targets: InvestmentTargetProgress[];
    currency?: string;
    title?: string;
    onEditTarget?: (investmentType: string) => void;
    onAddTarget?: () => void;
    onBulkDelete?: () => void;
}



export const InvestmentTargetProgressChart = React.memo<InvestmentTargetProgressChartProps>(({ 
    targets, 
    currency = "USD", 
    title = "Investment Target Progress",
    onEditTarget,
    onAddTarget,
    onBulkDelete
}) => {
    // Memoize summary calculations
    const summary = React.useMemo(() => {
        if (!targets?.length) {
            return { total: 0, completed: 0, averageProgress: 0, totalRemaining: 0 };
        }
        
        const completed = targets.filter(t => t.isComplete).length;
        const averageProgress = targets.reduce((sum, t) => sum + t.progress, 0) / targets.length;
        const totalRemaining = targets.reduce((sum, t) => {
            const remaining = Math.max(0, t.targetAmount - t.currentAmount);
            return sum + remaining;
        }, 0);
        
        return {
            total: targets.length,
            completed,
            averageProgress: Number(averageProgress.toFixed(1)),
            totalRemaining: Number(totalRemaining.toFixed(2))
        };
    }, [
        targets?.length,
        // Add checksum to detect actual data changes, not just reference changes
        targets?.reduce((sum, target) => sum + target.progress + (target.isComplete ? 1 : 0) + target.targetAmount + target.currentAmount, 0) ?? 0
    ]);

    if (!targets?.length) {
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
                
                {/* Progress Legend for empty state */}
                <ProgressLegend className="mt-6" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <Target className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
                {/* Progress Legend */}
                <ProgressLegend className="mb-4" />
                <div className="flex items-center gap-3">
                    {onAddTarget && (
                        <button
                            onClick={onAddTarget}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            + Add Target
                        </button>
                    )}
                    {onBulkDelete && targets.length > 0 && (
                        <button
                            onClick={onBulkDelete}
                            className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                        >
                            Delete All
                        </button>
                    )}
                </div>
            </div>

            {/* Summary */}
            <div className="mb-6 pb-4 border-b border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-600">Total Targets</p>
                        <p className="text-lg font-semibold text-gray-900">{summary.total}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-lg font-semibold text-green-600">{summary.completed}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Average Progress</p>
                        <p className="text-lg font-semibold text-blue-600">{summary.averageProgress}%</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Total Remaining</p>
                        <p className="text-lg font-semibold text-orange-600">{formatCurrency(summary.totalRemaining, currency)}</p>
                    </div>
                </div>
            </div>


            <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: '562px' }}>
                {targets.map((target, index) => (
                    <TargetProgressItem
                        key={`${target.investmentType}-${index}`}
                        target={target}
                        currency={currency}
                        onEditTarget={onEditTarget}
                    />
                ))}
            </div>
        </div>
    );
});

InvestmentTargetProgressChart.displayName = 'InvestmentTargetProgressChart';