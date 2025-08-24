"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Dot } from "recharts";
import { Calendar, Target, TrendingUp } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { InvestmentTargetProgress } from "../../../types/investments";
import { ChartControls } from "../../../components/ChartControls";
import { useChartExpansion } from "../../../utils/chartUtils";
import { useChartAnimationState } from "../../../hooks/useChartAnimationContext";

interface InvestmentTargetTimelineChartProps {
    targets: InvestmentTargetProgress[];
    currency?: string;
    title?: string;
}

interface TimelineDataPoint {
    date: string;
    formattedDate: string;
    targetAmount: number;
    investmentType: string;
    nickname?: string;
    isOverdue: boolean;
    daysRemaining?: number;
    progress: number;
    currentAmount: number;
    isComplete: boolean;
    sortDate: Date;
}

const TYPE_COLORS: Record<string, string> = {
    STOCKS: "#3b82f6",
    CRYPTO: "#10b981", 
    MUTUAL_FUNDS: "#f59e0b",
    BONDS: "#f97316",
    REAL_ESTATE: "#8b5cf6",
    GOLD: "#22c55e",
    FIXED_DEPOSIT: "#fde047",
    EMERGENCY_FUND: "#ef4444",
    MARRIAGE: "#f97316", 
    VACATION: "#06b6d4",
    PROVIDENT_FUNDS: "#fb7185",
    SAFE_KEEPINGS: "#60a5fa",
    OTHER: "#a78bfa",
};

const TYPE_LABELS: Record<string, string> = {
    STOCKS: "Stocks",
    CRYPTO: "Cryptocurrency", 
    MUTUAL_FUNDS: "Mutual Funds",
    BONDS: "Bonds",
    REAL_ESTATE: "Real Estate",
    GOLD: "Gold",
    FIXED_DEPOSIT: "Fixed Deposit",
    EMERGENCY_FUND: "Emergency Fund",
    MARRIAGE: "Marriage",
    VACATION: "Vacation",
    PROVIDENT_FUNDS: "Provident Funds",
    SAFE_KEEPINGS: "Safe Keepings",
    OTHER: "Other",
};

export const InvestmentTargetTimelineChart = React.memo<InvestmentTargetTimelineChartProps>(({ 
    targets, 
    currency = "USD", 
    title = "Investment Target Timeline" 
}) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const chartId = "investment-target-timeline";
    const { animationDuration, isAnimationActive } = useChartAnimationState(chartId);

    const { timelineData, maxAmount, hasTargets } = useMemo(() => {
        if (!targets?.length) {
            return { timelineData: [], maxAmount: 0, hasTargets: false };
        }

        // Filter targets that have completion dates and sort by date
        const targetsWithDates = targets.filter(target => 
            target.targetCompletionDate !== undefined && target.targetCompletionDate !== null
        );
        
        const data: TimelineDataPoint[] = targetsWithDates.map(target => {
            const targetDate = new Date(target.targetCompletionDate!);
            const isOverdue = targetDate < new Date() && !target.isComplete;
            
            return {
                date: targetDate.toISOString().split('T')[0] || targetDate.toISOString(),
                formattedDate: targetDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                }),
                targetAmount: target.targetAmount,
                investmentType: target.investmentType,
                nickname: target.nickname,
                isOverdue,
                daysRemaining: target.daysRemaining,
                progress: target.progress,
                currentAmount: target.currentAmount,
                isComplete: target.isComplete,
                sortDate: targetDate
            };
        }).sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

        const maxAmount = Math.max(...data.map(d => d.targetAmount), 0);

        return { 
            timelineData: data, 
            maxAmount,
            hasTargets: data.length > 0
        };
    }, [targets]);

    const CustomTooltip = useCallback(({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as TimelineDataPoint;
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs">
                    <h4 className="font-semibold text-gray-900 mb-2">
                        {data.nickname || TYPE_LABELS[data.investmentType] || data.investmentType}
                    </h4>
                    <div className="space-y-1 text-sm">
                        <p>
                            <span className="text-gray-600">Target Date:</span>{' '}
                            <span className={data.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                                {data.formattedDate}
                                {data.isOverdue && ' (Overdue)'}
                            </span>
                        </p>
                        <p>
                            <span className="text-gray-600">Target Amount:</span>{' '}
                            <span className="font-medium text-gray-900">
                                {formatCurrency(data.targetAmount, currency)}
                            </span>
                        </p>
                        <p>
                            <span className="text-gray-600">Current Amount:</span>{' '}
                            <span className="font-medium text-blue-600">
                                {formatCurrency(data.currentAmount, currency)}
                            </span>
                        </p>
                        <p>
                            <span className="text-gray-600">Progress:</span>{' '}
                            <span className={`font-medium ${
                                data.isComplete ? 'text-green-600' : 
                                data.progress >= 75 ? 'text-blue-600' :
                                data.progress >= 50 ? 'text-yellow-600' : 'text-orange-600'
                            }`}>
                                {data.progress.toFixed(1)}%
                            </span>
                        </p>
                        {data.daysRemaining !== undefined && (
                            <p>
                                <span className="text-gray-600">Days Remaining:</span>{' '}
                                <span className={`font-medium ${
                                    data.daysRemaining < 0 ? 'text-red-600' :
                                    data.daysRemaining < 30 ? 'text-orange-600' : 'text-green-600'
                                }`}>
                                    {data.daysRemaining < 0 ? 'Overdue' : data.daysRemaining}
                                </span>
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    }, [currency]);

    const CustomDot = useCallback((props: any) => {
        const { cx, cy, payload } = props;
        if (!payload) return null;
        
        const data = payload as TimelineDataPoint;
        const color = TYPE_COLORS[data.investmentType] || "#6b7280";
        
        return (
            <Dot 
                cx={cx} 
                cy={cy} 
                r={data.isComplete ? 8 : 6}
                fill={data.isOverdue && !data.isComplete ? "#ef4444" : color}
                stroke={data.isComplete ? "#22c55e" : "white"}
                strokeWidth={data.isComplete ? 3 : 2}
                opacity={data.isComplete ? 1 : 0.8}
            />
        );
    }, []);

    const formatXAxisTick = useCallback((value: string) => {
        const date = new Date(value);
        return date.toLocaleDateString('en-US', { 
            month: 'short',
            day: 'numeric'
        });
    }, []);

    const formatYAxisTick = useCallback((value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
        return value.toString();
    }, []);

    if (!hasTargets) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                </div>
                
                <div className="text-center py-16">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Target Dates Set</h4>
                    <p className="text-gray-500 mb-6">
                        Set completion dates for your investment targets to visualize your timeline.
                    </p>
                </div>
            </div>
        );
    }

    const currentDate = new Date().toISOString().split('T')[0];

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName="investment-targets-timeline"
                    csvData={[
                        ['Target Type', 'Nickname', 'Target Date', 'Target Amount', 'Current Amount', 'Progress (%)', 'Days Remaining', 'Status'],
                        ...timelineData.map(item => [
                            TYPE_LABELS[item.investmentType] || item.investmentType,
                            item.nickname || '-',
                            item.formattedDate,
                            item.targetAmount,
                            item.currentAmount,
                            item.progress.toFixed(1),
                            item.daysRemaining?.toString() || '-',
                            item.isComplete ? 'Complete' : item.isOverdue ? 'Overdue' : 'In Progress'
                        ])
                    ]}
                    csvFileName={`investment-targets-timeline-${new Date().toISOString().split('T')[0]}`}
                />
            </div>

            {/* Summary Statistics */}
            <div className="mb-6 pb-4 border-b border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                        <Target className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                        <p className="text-sm text-gray-600">Total Targets</p>
                        <p className="text-lg font-semibold text-gray-900">{timelineData.length}</p>
                    </div>
                    <div className="text-center">
                        <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-lg font-semibold text-green-600">
                            {timelineData.filter(t => t.isComplete).length}
                        </p>
                    </div>
                    <div className="text-center">
                        <Calendar className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                        <p className="text-sm text-gray-600">Overdue</p>
                        <p className="text-lg font-semibold text-red-600">
                            {timelineData.filter(t => t.isOverdue && !t.isComplete).length}
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-5 h-5 bg-blue-600 rounded mx-auto mb-1"></div>
                        <p className="text-sm text-gray-600">Total Target Value</p>
                        <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(timelineData.reduce((sum, t) => sum + t.targetAmount, 0), currency)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div 
                ref={chartRef}
                className={`w-full ${isExpanded ? "h-[60vh]" : "h-[28rem] sm:h-[32rem]"}`}
                role="img"
                aria-label={`Investment targets timeline chart showing ${timelineData.length} targets`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={timelineData}
                        margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
                    >
                        <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="#e5e7eb" 
                            strokeWidth={1}
                            horizontal={true}
                            vertical={false}
                        />
                        
                        {/* Current date reference line */}
                        <ReferenceLine 
                            x={currentDate} 
                            stroke="#ef4444" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{ value: "Today", position: "top" }}
                        />
                        
                        <XAxis 
                            dataKey="date"
                            tickFormatter={formatXAxisTick}
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval="preserveStartEnd"
                        />
                        <YAxis 
                            tickFormatter={formatYAxisTick}
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                            domain={[0, maxAmount * 1.1]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        
                        {/* Main timeline line */}
                        <Line
                            type="monotone"
                            dataKey="targetAmount"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={<CustomDot />}
                            activeDot={{ r: 8, strokeWidth: 2 }}
                            connectNulls={false}
                            animationDuration={isAnimationActive ? animationDuration : 0}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span className="text-gray-700">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600 border-2 border-green-600"></div>
                    <span className="text-gray-700">Completed</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-600"></div>
                    <span className="text-gray-700">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-red-600 opacity-60" style={{ borderTop: "2px dashed #ef4444" }}></div>
                    <span className="text-gray-700">Today</span>
                </div>
            </div>
        </div>
    );
});

InvestmentTargetTimelineChart.displayName = 'InvestmentTargetTimelineChart';
