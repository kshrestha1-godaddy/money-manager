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
    onEditTarget?: (targetId: number) => void;
    onExtendTarget?: (targetId: number, date: Date) => Promise<void>;
    onAddTarget?: () => void;
    onBulkDelete?: () => void;
}


type TargetSortField = 'date' | 'targetAmount' | 'remainingAmount';
type TargetSortConfig = { field: TargetSortField; direction: 'asc' | 'desc' };
const SORT_STORAGE_KEY = 'investment-target-progress-sort';
const DEFAULT_SORT: TargetSortConfig = { field: 'date', direction: 'asc' };



export const InvestmentTargetProgressChart = React.memo<InvestmentTargetProgressChartProps>(({ 
    targets, 
    currency = "USD", 
    title = "Investment Target Progress",
    onEditTarget,
    onExtendTarget,
    onAddTarget,
    onBulkDelete
}) => {
    const [sortConfig, setSortConfig] = React.useState<TargetSortConfig>(DEFAULT_SORT);
    const [sortLoaded, setSortLoaded] = React.useState(false);

    React.useEffect(() => {
        try {
            const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
            const saved = stored ? JSON.parse(stored) : null;
            if (saved && ['date', 'targetAmount', 'remainingAmount'].includes(saved.field)
                && ['asc', 'desc'].includes(saved.direction)) {
                setSortConfig({ field: saved.field, direction: saved.direction });
            }
        } catch {
            // Keep the default when browser storage is unavailable or invalid.
        }
        setSortLoaded(true);
    }, []);

    React.useEffect(() => {
        if (!sortLoaded) return;
        try {
            window.localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortConfig));
        } catch {
            // Sorting remains available when browser storage is unavailable.
        }
    }, [sortConfig, sortLoaded]);

    const sortedTargets = React.useMemo(() => {
        const dateValue = (target: InvestmentTargetProgress) => {
            const time = target.targetCompletionDate ? new Date(target.targetCompletionDate).getTime() : NaN;
            return Number.isFinite(time) ? time : null;
        };
        return [...(targets || [])].sort((a, b) => {
            let difference: number;
            if (sortConfig.field === 'date') {
                const aDate = dateValue(a);
                const bDate = dateValue(b);
                // Undated targets stay last in either direction.
                if (aDate === null || bDate === null) {
                    return aDate === bDate ? a.targetId - b.targetId : aDate === null ? 1 : -1;
                }
                difference = aDate - bDate;
            } else if (sortConfig.field === 'targetAmount') {
                difference = a.targetAmount - b.targetAmount;
            } else {
                difference = Math.max(0, a.targetAmount - a.currentAmount)
                    - Math.max(0, b.targetAmount - b.currentAmount);
            }
            return (sortConfig.direction === 'asc' ? difference : -difference) || a.targetId - b.targetId;
        });
    }, [targets, sortConfig]);

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
        targets?.reduce((sum, target) => sum + target.targetId + target.progress + (target.isComplete ? 1 : 0) + target.targetAmount + target.currentAmount, 0) ?? 0
    ]);

    if (!targets?.length) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-[50rem] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <Target className="w-5 h-5 text-blue-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                </div>
                
                <div className="text-center py-12 flex-1 flex flex-col justify-center">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-[50rem] flex flex-col">
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


            <div className="flex flex-wrap items-center justify-end gap-2 mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
                <label htmlFor="investment-target-sort" className="text-gray-600">Sort by</label>
                <select
                    id="investment-target-sort"
                    value={sortConfig.field}
                    onChange={event => setSortConfig(previous => ({ ...previous, field: event.target.value as TargetSortField }))}
                    className="rounded border border-gray-200 bg-white px-2 py-1.5 text-gray-900"
                >
                    <option value="date">Due date</option>
                    <option value="targetAmount">Target amount</option>
                    <option value="remainingAmount">Remaining amount</option>
                </select>
                <select
                    aria-label="Target sort order"
                    value={sortConfig.direction}
                    onChange={event => setSortConfig(previous => ({ ...previous, direction: event.target.value as TargetSortConfig['direction'] }))}
                    className="rounded border border-gray-200 bg-white px-2 py-1.5 text-gray-900"
                >
                    <option value="asc">{sortConfig.field === 'date' ? 'Earliest first' : 'Lowest first'}</option>
                    <option value="desc">{sortConfig.field === 'date' ? 'Latest first' : 'Highest first'}</option>
                </select>
            </div>

            <div className="space-y-5 overflow-y-auto pr-2 pb-1 flex-1">
                {sortedTargets.map((target) => (
                    <TargetProgressItem
                        key={target.targetId}
                        target={target}
                        currency={currency}
                        onEditTarget={onEditTarget}
                        onExtendTarget={onExtendTarget}
                    />
                ))}
            </div>
        </div>
    );
});

InvestmentTargetProgressChart.displayName = 'InvestmentTargetProgressChart';