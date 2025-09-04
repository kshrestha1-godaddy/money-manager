"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Dot, Legend } from "recharts";
import { Calendar, Target, TrendingUp } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { InvestmentTargetProgress } from "../../../types/investments";
import { ChartControls } from "../../../components/ChartControls";

import { useChartAnimationState } from "../../../hooks/useChartAnimationContext";

interface InvestmentTargetTimelineChartProps {
    targets: InvestmentTargetProgress[];
    currency?: string;
    title?: string;
}

interface TimelineDataPoint {
    date: string;
    formattedDate: string;
    displayLabel: string;
    targetAmount: number;
    investmentType: string;
    nickname?: string;
    isOverdue: boolean;
    daysRemaining?: number;
    progress: number;
    currentAmount: number;
    isComplete: boolean;
    sortDate: Date;
    // For stacked bar chart - showing progress as percentage of max amount
    completedBar: number;
    remainingBar: number;
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
    const chartRef = useRef<HTMLDivElement>(null);
    const chartId = "investment-target-timeline";
    const { animationDuration, isAnimationActive } = useChartAnimationState(chartId);

    const { timelineData, maxAmount, hasTargets, todayData, thirtyDaysData, sixtyDaysData } = useMemo(() => {
        if (!targets?.length) {
            return { timelineData: [], maxAmount: 0, hasTargets: false, todayData: null, thirtyDaysData: null, sixtyDaysData: null };
        }

        // Filter targets that have completion dates and sort by date
        const targetsWithDates = targets.filter(target => 
            target.targetCompletionDate !== undefined && target.targetCompletionDate !== null
        );
        
        // Calculate max amount first
        const maxAmount = Math.max(...targetsWithDates.map(t => Math.max(t.targetAmount, t.currentAmount)), 0);
        
        const data: TimelineDataPoint[] = targetsWithDates.map(target => {
            const targetDate = new Date(target.targetCompletionDate!);
            const isOverdue = targetDate < new Date() && !target.isComplete;
            
            // Calculate bar values in actual currency amounts for proper scaling
            const completedBar = target.currentAmount;
            const remainingBar = Math.max(0, target.targetAmount - target.currentAmount);

            return {
                date: targetDate.toISOString().split('T')[0] || targetDate.toISOString(),
                formattedDate: targetDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                }),
                displayLabel: `${targetDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                })}${target.nickname ? `\n${target.nickname}` : `\n${TYPE_LABELS[target.investmentType] || target.investmentType}`}`,
                targetAmount: target.targetAmount,
                investmentType: target.investmentType,
                nickname: target.nickname,
                isOverdue,
                daysRemaining: target.daysRemaining,
                progress: target.progress,
                currentAmount: target.currentAmount,
                isComplete: target.isComplete,
                sortDate: targetDate,
                completedBar: completedBar,
                remainingBar: remainingBar
            };
        }).sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

        // Create reference date points for timeline
        const today = new Date();
        const todayFormatted = today.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });

        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        const thirtyDaysFormatted = thirtyDaysFromNow.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });

        const sixtyDaysFromNow = new Date(today);
        sixtyDaysFromNow.setDate(today.getDate() + 60);
        const sixtyDaysFormatted = sixtyDaysFromNow.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });

        // Create reference data points
        const todayData: TimelineDataPoint = {
            date: today.toISOString().split('T')[0] || today.toISOString(),
            formattedDate: todayFormatted,
            displayLabel: `${todayFormatted}\nToday`,
            targetAmount: 0,
            investmentType: 'TODAY',
            isOverdue: false,
            progress: 0,
            currentAmount: 0,
            isComplete: false,
            sortDate: today,
            completedBar: 0,
            remainingBar: 0
        };

        const thirtyDaysData: TimelineDataPoint = {
            date: thirtyDaysFromNow.toISOString().split('T')[0] || thirtyDaysFromNow.toISOString(),
            formattedDate: thirtyDaysFormatted,
            displayLabel: `${thirtyDaysFormatted}\n+30 Days`,
            targetAmount: 0,
            investmentType: 'THIRTY_DAYS',
            isOverdue: false,
            progress: 0,
            currentAmount: 0,
            isComplete: false,
            sortDate: thirtyDaysFromNow,
            completedBar: 0,
            remainingBar: 0
        };

        const sixtyDaysData: TimelineDataPoint = {
            date: sixtyDaysFromNow.toISOString().split('T')[0] || sixtyDaysFromNow.toISOString(),
            formattedDate: sixtyDaysFormatted,
            displayLabel: `${sixtyDaysFormatted}\n+60 Days`,
            targetAmount: 0,
            investmentType: 'SIXTY_DAYS',
            isOverdue: false,
            progress: 0,
            currentAmount: 0,
            isComplete: false,
            sortDate: sixtyDaysFromNow,
            completedBar: 0,
            remainingBar: 0
        };

        // Insert reference data points in the correct chronological positions
        const allData = [...data];
        const referencePoints = [todayData, thirtyDaysData, sixtyDaysData];
        
        referencePoints.forEach(refPoint => {
            const insertIndex = allData.findIndex(item => item.sortDate > refPoint.sortDate);
            if (insertIndex === -1) {
                allData.push(refPoint);
            } else {
                allData.splice(insertIndex, 0, refPoint);
            }
        });

        return { 
            timelineData: allData, 
            maxAmount,
            hasTargets: data.length > 0,
            todayData,
            thirtyDaysData,
            sixtyDaysData
        };
    }, [targets]);

    const CustomTooltip = useCallback(({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as TimelineDataPoint;
            
            // Special handling for reference data points
            if (data.investmentType === 'TODAY') {
                return (
                    <div className="bg-white border border-red-200 rounded-lg shadow-lg p-4 max-w-xs">
                        <h4 className="font-semibold text-red-600 mb-2">
                            Today's Date
                        </h4>
                        <div className="space-y-1 text-sm">
                            <p>
                                <span className="text-gray-600">Current Date:</span>{' '}
                                <span className="font-medium text-gray-900">
                                    {data.formattedDate}
                                </span>
                            </p>
                            <p className="text-gray-500 text-xs mt-2">
                                This line shows today's position on the timeline
                            </p>
                        </div>
                    </div>
                );
            }
            
            if (data.investmentType === 'THIRTY_DAYS') {
                return (
                    <div className="bg-white border border-orange-200 rounded-lg shadow-lg p-4 max-w-xs">
                        <h4 className="font-semibold text-orange-600 mb-2">
                            30 Days From Today
                        </h4>
                        <div className="space-y-1 text-sm">
                            <p>
                                <span className="text-gray-600">Date:</span>{' '}
                                <span className="font-medium text-gray-900">
                                    {data.formattedDate}
                                </span>
                            </p>
                            <p className="text-gray-500 text-xs mt-2">
                                Reference line for 30-day planning horizon
                            </p>
                        </div>
                    </div>
                );
            }
            
            if (data.investmentType === 'SIXTY_DAYS') {
                return (
                    <div className="bg-white border border-blue-200 rounded-lg shadow-lg p-4 max-w-xs">
                        <h4 className="font-semibold text-blue-600 mb-2">
                            60 Days From Today
                        </h4>
                        <div className="space-y-1 text-sm">
                            <p>
                                <span className="text-gray-600">Date:</span>{' '}
                                <span className="font-medium text-gray-900">
                                    {data.formattedDate}
                                </span>
                            </p>
                            <p className="text-gray-500 text-xs mt-2">
                                Reference line for 60-day planning horizon
                            </p>
                        </div>
                    </div>
                );
            }
            
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
                            <span className="font-medium text-green-600">
                                {formatCurrency(data.currentAmount, currency)}
                            </span>
                        </p>
                        <p>
                            <span className="text-gray-600">Remaining:</span>{' '}
                            <span className="font-medium text-orange-600">
                                {formatCurrency(Math.max(0, data.targetAmount - data.currentAmount), currency)}
                            </span>
                        </p>
                        <div className="border-t border-gray-100 pt-2 mt-2">
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
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                    className={`h-2 rounded-full ${
                                        data.isComplete ? 'bg-green-500' :
                                        data.progress >= 75 ? 'bg-blue-500' :
                                        data.progress >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                                    }`}
                                    style={{ width: `${Math.min(100, data.progress)}%` }}
                                />
                            </div>
                        </div>
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
        
        // Don't render dots for reference markers
        if (data.investmentType === 'TODAY' || data.investmentType === 'THIRTY_DAYS' || data.investmentType === 'SIXTY_DAYS') {
            return null;
        }
        
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


    const formatYAxisTick = useCallback((value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
        return value.toString();
    }, []);

    const CustomXAxisTick = useCallback((props: any) => {
        const { x, y, payload } = props;
        if (!payload?.value) return null;
        
        const lines = payload.value.split('\n');
        const dateText = lines[0] || '';
        const nicknameText = lines[1] || '';
        
        return (
            <g transform={`translate(${x},${y})`}>
                <text 
                    x={0} 
                    y={0} 
                    dy={16} 
                    textAnchor="middle" 
                    fill="#666" 
                    fontSize="10"
                    fontWeight="500"
                >
                    {nicknameText}
                </text>
                <text 
                    x={0} 
                    y={0} 
                    dy={30} 
                    textAnchor="middle" 
                    fill="#888" 
                    fontSize="9"
                    fontWeight="400"
                >
                    {dateText}
                </text>
            </g>
        );
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


    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
                <ChartControls
                    chartRef={chartRef}
                    fileName="investment-targets-timeline"
                    csvData={[
                        ['Target Type', 'Nickname', 'Target Date', 'Target Amount', 'Current Amount', 'Progress (%)', 'Days Remaining', 'Status'],
                        ...timelineData.filter(item => !['TODAY', 'THIRTY_DAYS', 'SIXTY_DAYS'].includes(item.investmentType)).map(item => [
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
                    showExpandButton={false}
                />
            </div>
            <div>
                {/* Summary Statistics */}
                <div className="mb-6 pb-4 border-b border-gray-200">
                    <div className="flex justify-between items-center gap-2 sm:gap-4">
                        <div className="flex-1 text-center min-w-0">
                            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mx-auto mb-1" />
                            <p className="text-xs sm:text-sm text-gray-600 truncate">Total Targets</p>
                            <p className="text-sm sm:text-lg font-semibold text-gray-900">{timelineData.filter(t => !['TODAY', 'THIRTY_DAYS', 'SIXTY_DAYS'].includes(t.investmentType)).length}</p>
                        </div>
                        <div className="flex-1 text-center min-w-0">
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-xs sm:text-sm text-gray-600 truncate">Completed</p>
                            <p className="text-sm sm:text-lg font-semibold text-green-600">
                                {timelineData.filter(t => t.isComplete && !['TODAY', 'THIRTY_DAYS', 'SIXTY_DAYS'].includes(t.investmentType)).length}
                            </p>
                        </div>
                        <div className="flex-1 text-center min-w-0">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mx-auto mb-1" />
                            <p className="text-xs sm:text-sm text-gray-600 truncate">Overdue</p>
                            <p className="text-sm sm:text-lg font-semibold text-red-600">
                                {timelineData.filter(t => t.isOverdue && !t.isComplete && !['TODAY', 'THIRTY_DAYS', 'SIXTY_DAYS'].includes(t.investmentType)).length}
                            </p>
                        </div>
                        <div className="flex-1 text-center min-w-0">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-600 rounded mx-auto mb-1"></div>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">Total Target Value</p>
                            <p className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
                                {formatCurrency(timelineData.filter(t => !['TODAY', 'THIRTY_DAYS', 'SIXTY_DAYS'].includes(t.investmentType)).reduce((sum, t) => sum + t.targetAmount, 0), currency)}
                            </p>
                        </div>
                        <div className="flex-1 text-center min-w-0">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-600 rounded mx-auto mb-1"></div>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">Total Progress</p>
                            <p className="text-sm sm:text-lg font-semibold text-green-600 truncate">
                                {formatCurrency(timelineData.filter(t => !['TODAY', 'THIRTY_DAYS', 'SIXTY_DAYS'].includes(t.investmentType)).reduce((sum, t) => sum + t.currentAmount, 0), currency)}
                            </p>
                        </div>
                        <div className="flex-1 text-center min-w-0">
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 mx-auto mb-1" />
                            <p className="text-xs sm:text-sm text-gray-600 truncate">Overall Progress</p>
                            <p className="text-sm sm:text-lg font-semibold text-purple-600">
                                {timelineData.filter(t => !['TODAY', 'THIRTY_DAYS', 'SIXTY_DAYS'].includes(t.investmentType)).length > 0
                                    ? ((timelineData.filter(t => !['TODAY', 'THIRTY_DAYS', 'SIXTY_DAYS'].includes(t.investmentType)).reduce((sum, t) => sum + t.progress, 0) / timelineData.filter(t => !['TODAY', 'THIRTY_DAYS', 'SIXTY_DAYS'].includes(t.investmentType)).length)).toFixed(1)
                                    : '0.0'
                                }%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div
                    ref={chartRef}
                    className="w-full h-[28rem] sm:h-[32rem]"
                    role="img"
                    aria-label={`Investment targets timeline chart showing ${timelineData.length} targets`}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={timelineData}
                            margin={{ top: 20, right: 30, left: 40, bottom: 30 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                                strokeWidth={2}
                                horizontal={true}
                                vertical={true}
                            />

                            {/* Reference lines */}
                            {todayData && (
                                <ReferenceLine
                                    x={todayData.displayLabel}
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    strokeDasharray="8 4"
                                    label={{ 
                                        position: "top",
                                        style: {
                                            fill: "#ef4444",
                                            fontWeight: "600",
                                            fontSize: "12px"
                                        }
                                    }}
                                />
                            )}
                            
                            {thirtyDaysData && (
                                <ReferenceLine
                                    x={thirtyDaysData.displayLabel}
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    strokeDasharray="12 6"
                                    label={{ 
                                        position: "top",
                                        style: {
                                            fill: "#ef4444",
                                            fontWeight: "500",
                                            fontSize: "11px"
                                        }
                                    }}
                                />
                            )}
                            
                            {sixtyDaysData && (
                                <ReferenceLine
                                    x={sixtyDaysData.displayLabel}
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    strokeDasharray="16 8"
                                    label={{ 
                                        position: "top",
                                        style: {
                                            fill: "#ef4444",
                                            fontWeight: "500",
                                            fontSize: "11px"
                                        }
                                    }}
                                />
                            )}

                            <XAxis
                                dataKey="displayLabel"
                                tick={<CustomXAxisTick />}
                                stroke="#666"
                                height={100}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                tickFormatter={formatYAxisTick}
                                tick={{ fontSize: 12 }}
                                stroke="#666"
                                domain={[0, maxAmount * 1.1]}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                height={10}
                                iconType="line"
                                wrapperStyle={{
                                    paddingBottom: '5px',
                                    fontSize: '14px',
                                    color: '#374151'
                                }}
                            />

                            {/* Stacked bars for progress visualization */}
                            <Bar
                                dataKey="completedBar"
                                stackId="progress"
                                fill="#10b981"
                                fillOpacity={0.4}
                                stroke="none"
                                name="Completed Progress"
                                barSize={60}
                            />
                            <Bar
                                dataKey="remainingBar"
                                stackId="progress"
                                fill="#f59e0b"
                                fillOpacity={0.4}
                                stroke="none"
                                name="Remaining Progress"
                                barSize={60}
                            />

                            {/* Target amounts line */}
                            <Line
                                type="monotone"
                                dataKey="targetAmount"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={<CustomDot />}
                                activeDot={{ r: 8, strokeWidth: 2 }}
                                connectNulls={false}
                                animationDuration={isAnimationActive ? animationDuration : 0}
                                name="Target Amount"
                            />

                            {/* Current progress line */}
                            <Line
                                type="monotone"
                                dataKey="currentAmount"
                                stroke="#10b981"
                                strokeWidth={2}
                                strokeDasharray="8 4"
                                dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, strokeWidth: 2, fill: "#10b981" }}
                                connectNulls={false}
                                animationDuration={isAnimationActive ? animationDuration : 0}
                                name="Current Amount"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
});

InvestmentTargetTimelineChart.displayName = 'InvestmentTargetTimelineChart';
