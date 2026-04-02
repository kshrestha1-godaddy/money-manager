"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Dot } from "recharts";
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
    /** Stable unique key for Recharts X-axis (displayLabel alone can duplicate when dates and type labels match). */
    axisKey: string;
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

/**
 * Scrollable timeline width (same idea as LifeEventsTimelineLineChart): inner chart has a pixel minWidth
 * so Recharts lays out categories with enough space; outer wrapper is overflow-x-auto.
 */
const MIN_INVESTMENT_TIMELINE_WIDTH_PX = 800;
const MAX_INVESTMENT_TIMELINE_WIDTH_PX = 5200;
/** Wider slots so bars sit farther apart on the scrollable timeline. */
const PX_PER_TIMELINE_POINT = 168;

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

    const { timelineData, maxAmount, hasTargets, todayData, thirtyDaysData, sixtyDaysData, todayIndex, thirtyDaysIndex, sixtyDaysIndex } = useMemo(() => {
        if (!targets?.length) {
            return { timelineData: [], maxAmount: 0, hasTargets: false, todayData: null, thirtyDaysData: null, sixtyDaysData: null, todayIndex: -1, thirtyDaysIndex: -1, sixtyDaysIndex: -1 };
        }

        // Targets with a completion date (main timeline)
        const targetsWithDates = targets.filter(target => 
            target.targetCompletionDate !== undefined && target.targetCompletionDate !== null
        );
        // Targets with no date still appear at the end of the axis so counts match the summary
        const targetsWithoutDates = targets.filter(
            (target) => target.targetCompletionDate === undefined || target.targetCompletionDate === null
        );
        
        const maxAmount = Math.max(
            ...[...targetsWithDates, ...targetsWithoutDates].map((t) => Math.max(t.targetAmount, t.currentAmount)),
            0
        );
        
        const data: TimelineDataPoint[] = targetsWithDates.map(target => {
            const targetDate = new Date(target.targetCompletionDate!);
            const isOverdue = targetDate < new Date() && !target.isComplete;
            
            // Calculate bar values in actual currency amounts for proper scaling
            const completedBar = target.currentAmount;
            const remainingBar = Math.max(0, target.targetAmount - target.currentAmount);

            const formattedDate = targetDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                });
            const titleLine =
                target.nickname?.trim() || TYPE_LABELS[target.investmentType] || target.investmentType;

            return {
                axisKey: `target-${target.targetId}`,
                date: targetDate.toISOString().split('T')[0] || targetDate.toISOString(),
                formattedDate,
                displayLabel: `${formattedDate}\n${titleLine}`,
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

        const noDateSort = new Date(2099, 11, 31);
        const dataWithoutDates: TimelineDataPoint[] = targetsWithoutDates.map((target) => {
            const completedBar = target.currentAmount;
            const remainingBar = Math.max(0, target.targetAmount - target.currentAmount);
            const titleLine =
                target.nickname?.trim() || TYPE_LABELS[target.investmentType] || target.investmentType;
            return {
                axisKey: `target-${target.targetId}`,
                date: "no-date",
                formattedDate: "No date set",
                displayLabel: `No date set\n${titleLine}`,
                targetAmount: target.targetAmount,
                investmentType: target.investmentType,
                nickname: target.nickname,
                isOverdue: false,
                daysRemaining: target.daysRemaining,
                progress: target.progress,
                currentAmount: target.currentAmount,
                isComplete: target.isComplete,
                sortDate: noDateSort,
                completedBar,
                remainingBar,
            };
        });

        const dataSorted = [...data, ...dataWithoutDates].sort(
            (a, b) => a.sortDate.getTime() - b.sortDate.getTime()
        );

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
            axisKey: 'ref-today',
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
            axisKey: 'ref-thirty',
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
            axisKey: 'ref-sixty',
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
        const allData = [...dataSorted];
        const referencePoints = [todayData, thirtyDaysData, sixtyDaysData];
        
        let todayIndex = -1;
        let thirtyDaysIndex = -1;
        let sixtyDaysIndex = -1;
        
        referencePoints.forEach(refPoint => {
            const insertIndex = allData.findIndex(item => item.sortDate > refPoint.sortDate);
            if (insertIndex === -1) {
                allData.push(refPoint);
                if (refPoint.investmentType === 'TODAY') todayIndex = allData.length - 1;
                else if (refPoint.investmentType === 'THIRTY_DAYS') thirtyDaysIndex = allData.length - 1;
                else if (refPoint.investmentType === 'SIXTY_DAYS') sixtyDaysIndex = allData.length - 1;
            } else {
                allData.splice(insertIndex, 0, refPoint);
                if (refPoint.investmentType === 'TODAY') todayIndex = insertIndex;
                else if (refPoint.investmentType === 'THIRTY_DAYS') thirtyDaysIndex = insertIndex;
                else if (refPoint.investmentType === 'SIXTY_DAYS') sixtyDaysIndex = insertIndex;
                
                // Update other indices that got shifted
                if (refPoint.investmentType === 'TODAY') {
                    if (thirtyDaysIndex >= insertIndex) thirtyDaysIndex++;
                    if (sixtyDaysIndex >= insertIndex) sixtyDaysIndex++;
                } else if (refPoint.investmentType === 'THIRTY_DAYS') {
                    if (sixtyDaysIndex >= insertIndex) sixtyDaysIndex++;
                }
            }
        });

        return { 
            timelineData: allData, 
            maxAmount,
            hasTargets: targets.length > 0,
            todayData,
            thirtyDaysData,
            sixtyDaysData,
            todayIndex,
            thirtyDaysIndex,
            sixtyDaysIndex
        };
    }, [targets]);

    const timelineScrollMinWidthPx = useMemo(() => {
        const n = Math.max(timelineData.length, 1);
        return Math.max(
            MIN_INVESTMENT_TIMELINE_WIDTH_PX,
            Math.min(MAX_INVESTMENT_TIMELINE_WIDTH_PX, n * PX_PER_TIMELINE_POINT)
        );
    }, [timelineData.length]);

    const CustomTooltip = useCallback(({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as TimelineDataPoint;
            
            // Special handling for reference data points
            if (data.investmentType === 'TODAY') {
                return (
                    <div className="bg-white border border-red-200 rounded-lg shadow-lg p-5 min-w-80 max-w-md min-h-32">
                        <h4 className="font-semibold text-red-600 mb-3 text-base">
                            Today's Date
                        </h4>
                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="text-gray-600">Current Date:</span>{' '}
                                <span className="font-medium text-gray-900">
                                    {data.formattedDate}
                                </span>
                            </p>
                            <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                                This line shows today's position on the timeline for reference when planning your investment targets.
                            </p>
                        </div>
                    </div>
                );
            }
            
            if (data.investmentType === 'THIRTY_DAYS') {
                return (
                    <div className="bg-white border border-orange-200 rounded-lg shadow-lg p-5 min-w-80 max-w-md min-h-32">
                        <h4 className="font-semibold text-orange-600 mb-3 text-base">
                            30 Days From Today
                        </h4>
                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="text-gray-600">Date:</span>{' '}
                                <span className="font-medium text-gray-900">
                                    {data.formattedDate}
                                </span>
                            </p>
                            <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                                Reference line for 30-day planning horizon. Use this to identify targets approaching in the next month.
                            </p>
                        </div>
                    </div>
                );
            }
            
            if (data.investmentType === 'SIXTY_DAYS') {
                return (
                    <div className="bg-white border border-blue-200 rounded-lg shadow-lg p-5 min-w-80 max-w-md min-h-32">
                        <h4 className="font-semibold text-blue-600 mb-3 text-base">
                            60 Days From Today
                        </h4>
                        <div className="space-y-2 text-sm">
                            <p>
                                <span className="text-gray-600">Date:</span>{' '}
                                <span className="font-medium text-gray-900">
                                    {data.formattedDate}
                                </span>
                            </p>
                            <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                                Reference line for 60-day planning horizon. Use this for medium-term target planning and preparation.
                            </p>
                        </div>
                    </div>
                );
            }
            
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-5 min-w-96 max-w-lg min-h-48">
                    <h4 className="font-semibold text-gray-900 mb-3 text-base">
                        {data.nickname || TYPE_LABELS[data.investmentType] || data.investmentType}
                    </h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Target Date:</span>
                            <span className={data.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900 font-medium'}>
                                {data.formattedDate}
                                {data.isOverdue && ' (Overdue)'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Target Amount:</span>
                            <span className="font-medium text-gray-900">
                                {formatCurrency(data.targetAmount, currency)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Invested:</span>
                            <span className="font-medium text-green-600">
                                {formatCurrency(data.currentAmount, currency)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Remaining:</span>
                            <span className="font-medium text-orange-600">
                                {formatCurrency(Math.max(0, data.targetAmount - data.currentAmount), currency)}
                            </span>
                        </div>
                        {data.daysRemaining !== undefined && (
                            <div className="border-t border-gray-100 pt-3 mt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Days Remaining:</span>
                                    <span className={`font-medium ${data.daysRemaining < 0 ? 'text-red-600' :
                                            data.daysRemaining < 30 ? 'text-orange-600' : 'text-green-600'
                                        }`}>
                                        {data.daysRemaining < 0 ? 'Overdue' : `${data.daysRemaining} days`}
                                    </span>
                                </div>

                            </div>
                        )}
                        <div className="border-t border-gray-100 pt-3 mt-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Progress:</span>
                                <span className={`font-medium ${
                                    data.isComplete ? 'text-green-600' : 
                                    data.progress >= 75 ? 'text-blue-600' :
                                    data.progress >= 50 ? 'text-yellow-600' : 'text-orange-600'
                                }`}>
                                    {data.progress.toFixed(1)}%
                                </span>
                            </div>
                            
                            <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                                <div 
                                    className={`h-3 rounded-full transition-all duration-300 ${
                                        data.isComplete ? 'bg-green-500' :
                                        data.progress >= 75 ? 'bg-blue-500' :
                                        data.progress >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                                    }`}
                                    style={{ width: `${Math.min(100, data.progress)}%` }}
                                />
                            </div>
                        </div>
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

    const CustomXAxisTick = useCallback(
        (props: { x?: number; y?: number; payload?: { value?: string } }) => {
            const { x = 0, y = 0, payload } = props;
            const axisKey = payload?.value;
            if (!axisKey) return null;

            const row = timelineData.find((p) => p.axisKey === axisKey);
            if (!row) return null;

            const titleLine =
                row.investmentType === "TODAY"
                    ? "Today"
                    : row.investmentType === "THIRTY_DAYS"
                      ? "+30 Days"
                      : row.investmentType === "SIXTY_DAYS"
                        ? "+60 Days"
                        : row.nickname?.trim() ||
                          TYPE_LABELS[row.investmentType] ||
                          row.investmentType;

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
                        {titleLine}
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
                        {row.formattedDate}
                    </text>
                </g>
            );
        },
        [timelineData]
    );

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
        <div className="min-w-0 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                </div>
                <ChartControls
                    chartRef={chartRef}
                    fileName="investment-targets-timeline"
                    csvData={[
                        ['Target Type', 'Nickname', 'Target Date', 'Target Amount', 'Invested amount', 'Progress (%)', 'Days Remaining', 'Status'],
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
                            <p className="text-xs sm:text-sm text-gray-600 truncate">Total invested</p>
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

                {/* Chart — scroll pattern matches LifeEventsTimelineLineChart: fixed-height scroll strip + inner minWidth */}
                <div className="h-[28rem] min-h-[28rem] w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 touch-pan-x [scrollbar-gutter:stable] sm:h-[32rem] sm:min-h-[32rem]">
                    <div
                        ref={chartRef}
                        className="h-full"
                        style={{ minWidth: `${timelineScrollMinWidthPx}px` }}
                        role="img"
                        aria-label={`Investment targets timeline chart showing ${timelineData.length} timeline points. Scroll horizontally if needed.`}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={timelineData}
                            margin={{ top: 18, right: 32, left: 52, bottom: 16 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e5e7eb"
                                strokeWidth={2}
                                horizontal={true}
                                vertical={true}
                            />

                            {/* Priority background area between today and +30 days */}
                            {todayIndex >= 0 && thirtyDaysIndex >= 0 && (
                                <ReferenceArea
                                    x1={timelineData[todayIndex]?.axisKey}
                                    x2={timelineData[thirtyDaysIndex]?.axisKey}
                                    fill="#ef4444"
                                    fillOpacity={0.08}
                                    stroke="none"
                                />
                            )}

                            {/* Secondary priority background area between +30 and +60 days */}
                            {thirtyDaysIndex >= 0 && sixtyDaysIndex >= 0 && (
                                <ReferenceArea
                                    x1={timelineData[thirtyDaysIndex]?.axisKey}
                                    x2={timelineData[sixtyDaysIndex]?.axisKey}
                                    fill="#f97316"
                                    fillOpacity={0.06}
                                    stroke="none"
                                />
                            )}

                            {/* Reference lines */}
                            {todayData && (
                                <ReferenceLine
                                    x={todayData.axisKey}
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
                                    x={thirtyDaysData.axisKey}
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
                                    x={sixtyDaysData.axisKey}
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
                                dataKey="axisKey"
                                tick={<CustomXAxisTick />}
                                stroke="#666"
                                height={100}
                                interval={0}
                                padding={{ left: 36, right: 36 }}
                                tickMargin={14}
                            />
                            <YAxis
                                tickFormatter={formatYAxisTick}
                                tick={{ fontSize: 12 }}
                                stroke="#666"
                                width={56}
                                domain={[0, maxAmount * 1.1]}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* Stacked bars for progress visualization */}
                            <Bar
                                dataKey="completedBar"
                                stackId="progress"
                                fill="#10b981"
                                fillOpacity={0.4}
                                stroke="none"
                                name="Completed Progress"
                                barSize={44}
                                maxBarSize={52}
                                barCategoryGap="42%"
                            />
                            <Bar
                                dataKey="remainingBar"
                                stackId="progress"
                                fill="#f59e0b"
                                fillOpacity={0.4}
                                stroke="none"
                                name="Remaining Progress"
                                barSize={44}
                                maxBarSize={52}
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

                            {/* Invested amount (cost) toward target */}
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
                                name="Invested"
                            />
                        </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
});

InvestmentTargetTimelineChart.displayName = 'InvestmentTargetTimelineChart';
