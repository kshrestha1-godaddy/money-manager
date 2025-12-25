"use client";

import { useMemo, useState, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Income, Expense } from "../types/financial";
import { formatCurrency } from "../utils/currency";
import { useChartExpansion } from "../utils/chartUtils";
import { ChartControls } from "./ChartControls";
import { convertForDisplaySync } from "../utils/currencyDisplay";

type FinancialTransaction = Income | Expense;

interface FinancialAreaChartProps {
    data: FinancialTransaction[];
    currency?: string;
    type: 'income' | 'expense';
    title?: string;
    hasPageFilters?: boolean; // New prop to indicate if page-level filters are applied
    pageStartDate?: string; // Page-level start date filter
    pageEndDate?: string; // Page-level end date filter
    userThresholds?: {
        autoBookmarkEnabled: boolean;
        income: number;
        expense: number;
    };
    thresholdsLoading?: boolean;
}

interface ChartDataPoint {
    date: string;
    amount: number;
    formattedDate: string;
    transactionCount: number;
    averageAmount: number;
    minAmount: number;
    maxAmount: number;
    transactions: Array<{title: string; amount: number; category?: string}>;
    isHighValue: boolean;
}

export function FinancialAreaChart({
    data,
    currency = "USD",
    type,
    title,
    hasPageFilters = false,
    pageStartDate,
    pageEndDate,
    userThresholds,
    thresholdsLoading = false
}: FinancialAreaChartProps) {
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);

    // Use provided thresholds or fallback to defaults (50K income, 10K expense)
    const activeThresholds = useMemo(() => ({
        income: userThresholds?.income ?? 50000,
        expense: userThresholds?.expense ?? 10000
    }), [userThresholds]);

    // Get chart configuration based on type
    const chartConfig = {
        income: {
            color: "#10b981",
            label: "Income",
            title: title || "Income Trend (Last 30 Days)"
        },
        expense: {
            color: "#ef4444",
            label: "Expense",
            title: title || "Expense Trend (Last 30 Days)"
        }
    }[type];

    // Filter data based on date range
    const filteredData = useMemo(() => {
        // Use chart filters if they exist, otherwise use page filters
        const effectiveStartDate = startDate || (hasPageFilters ? pageStartDate : '');
        const effectiveEndDate = endDate || (hasPageFilters ? pageEndDate : '');


        if (!effectiveStartDate && !effectiveEndDate) return data || [];

        if (!data) return [];

        const filtered = data.filter(item => {
            const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
            const itemDateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;

            if (effectiveStartDate && effectiveEndDate) {
                const result = itemDateStr >= effectiveStartDate && itemDateStr <= effectiveEndDate;
                if (data.indexOf(item) < 3) {
                    console.log(`Date comparison for ${itemDateStr}:`, {
                        effectiveStartDate,
                        effectiveEndDate,
                        result,
                        item: item.title
                    });
                }
                return result;
            } else if (effectiveStartDate) {
                return itemDateStr >= effectiveStartDate;
            } else if (effectiveEndDate) {
                return itemDateStr <= effectiveEndDate;
            }
            return true;
        });

        // console.log(`${type} chart filtered result:`, filtered.length, 'items');
        return filtered;
    }, [data, startDate, endDate, pageStartDate, pageEndDate, hasPageFilters, type, currency]);

    const chartData = useMemo(() => {
        if (!data) return [];

        let chartDisplayData;
        const effectiveStartDate = startDate || (hasPageFilters ? pageStartDate : '');
        const effectiveEndDate = endDate || (hasPageFilters ? pageEndDate : '');

        // If any filters are active, use the filtered data
        if (hasPageFilters || effectiveStartDate || effectiveEndDate) {
            chartDisplayData = filteredData;
        } else {
            // No filters active - show default 30-day view
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            chartDisplayData = data.filter(item => {
                const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
                return itemDate >= thirtyDaysAgo;
            });
        }

        let recentData = chartDisplayData;

        // console.log(`${chartConfig.label} chart filtering:`, {
        //     chartStartDate: startDate,
        //     chartEndDate: endDate,
        //     pageStartDate,
        //     pageEndDate,
        //     effectiveStartDate,
        //     effectiveEndDate,
        //     hasPageFilters,
        //     originalDataLength: data?.length || 0,
        //     filteredDataLength: filteredData?.length || 0,
        //     finalDataLength: recentData?.length || 0,
        //     appliedDefaultFilter: !effectiveStartDate && !effectiveEndDate && !hasPageFilters
        // });

        // Group data by date with enhanced statistics
        const dateMap = new Map<string, {
            amount: number;
            count: number;
            transactions: Array<{title: string; amount: number; category?: string}>;
            amounts: number[];
        }>();

        if (recentData) {
            recentData.forEach(item => {
                // Use local date to avoid timezone issues
                const dateObj = item.date instanceof Date ? item.date : new Date(item.date);
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                if (!dateStr) return;
                
                // Convert amount to user's currency before adding to chart data
                const convertedAmount = convertForDisplaySync(item.amount, item.currency, currency);
                
                if (!dateMap.has(dateStr)) {
                    dateMap.set(dateStr, {
                        amount: 0,
                        count: 0,
                        transactions: [],
                        amounts: []
                    });
                }
                
                const current = dateMap.get(dateStr)!;
                current.amount += convertedAmount;
                current.count += 1;
                current.amounts.push(convertedAmount);
                current.transactions.push({
                    title: item.title || 'Untitled',
                    amount: convertedAmount,
                    category: item.category?.name
                });
            });
        }

        // console.log(`${chartConfig.label} chart data processing:`, {
        //     totalItems: recentData?.length || 0,
        //     dateMapEntries: Array.from(dateMap.entries()),
        //     firstFewItems: recentData?.slice(0, 5).map(item => {
        //         const dateObj = item.date instanceof Date ? item.date : new Date(item.date);
        //         return {
        //             title: item.title,
        //             originalDate: item.date,
        //             processedDate: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`,
        //             amount: item.amount
        //         };
        //     }) || []
        // });

        // Convert to array and sort by date with enhanced statistics
        const chartDataPoints: ChartDataPoint[] = Array.from(dateMap.entries())
            .map(([date, dayData]) => {
                const dateObj = new Date(date);
                const month = dateObj.toLocaleDateString('en', { month: 'short' });
                const day = dateObj.getDate().toString();
                
                const averageAmount = dayData.count > 0 ? dayData.amount / dayData.count : 0;
                const minAmount = dayData.amounts.length > 0 ? Math.min(...dayData.amounts) : 0;
                const maxAmount = dayData.amounts.length > 0 ? Math.max(...dayData.amounts) : 0;
                const isHighValue = dayData.amount > activeThresholds[type];
                
                return {
                    date,
                    amount: dayData.amount,
                    formattedDate: `${month} ${day}`,
                    transactionCount: dayData.count,
                    averageAmount,
                    minAmount,
                    maxAmount,
                    transactions: dayData.transactions,
                    isHighValue
                };
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // If there are more than 30 data points, aggregate by week
        if (chartDataPoints.length > 30) {
            const weekMap = new Map<string, {
                amount: number;
                count: number;
                transactions: Array<{title: string; amount: number; category?: string}>;
                amounts: number[];
            }>();
            
            chartDataPoints.forEach(item => {
                const date = new Date(item.date);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());

                // Use local date formatting to avoid timezone issues
                const year = weekStart.getFullYear();
                const month = String(weekStart.getMonth() + 1).padStart(2, '0');
                const day = String(weekStart.getDate()).padStart(2, '0');
                const weekKey = `${year}-${month}-${day}`;

                if (!weekKey) return;
                
                if (!weekMap.has(weekKey)) {
                    weekMap.set(weekKey, {
                        amount: 0,
                        count: 0,
                        transactions: [],
                        amounts: []
                    });
                }
                
                const current = weekMap.get(weekKey)!;
                current.amount += item.amount;
                current.count += item.transactionCount;
                current.transactions.push(...item.transactions);
                current.amounts.push(...item.transactions.map(t => t.amount));
            });

            return Array.from(weekMap.entries())
                .map(([date, weekData]) => {
                    const dateObj = new Date(date);
                    const month = dateObj.toLocaleDateString('en', { month: 'short' });
                    const day = dateObj.getDate().toString();
                    
                    const averageAmount = weekData.count > 0 ? weekData.amount / weekData.count : 0;
                    const minAmount = weekData.amounts.length > 0 ? Math.min(...weekData.amounts) : 0;
                    const maxAmount = weekData.amounts.length > 0 ? Math.max(...weekData.amounts) : 0;
                    const isHighValue = weekData.amount > activeThresholds[type];
                    
                    return {
                        date,
                        amount: weekData.amount,
                        formattedDate: `${month} ${day}`,
                        transactionCount: weekData.count,
                        averageAmount,
                        minAmount,
                        maxAmount,
                        transactions: weekData.transactions,
                        isHighValue
                    };
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        // console.log(`${chartConfig.label} chart final data:`, chartDataPoints.length, 'points');

        return chartDataPoints;
    }, [filteredData, startDate, endDate, pageStartDate, pageEndDate, chartConfig.label, hasPageFilters, data, currency, activeThresholds, type]);


    const formatTooltip = (value: number) => {
        return [formatCurrency(value, currency), chartConfig.label];
    };

    const formatLabel = (label: string) => {
        // Find the corresponding data point to get the actual date
        const dataPoint = chartData.find(d => d.formattedDate === label);
        if (dataPoint) {
            const date = new Date(dataPoint.date);
            const weekday = date.toLocaleDateString('en', { weekday: 'short' });
            const month = date.toLocaleDateString('en', { month: 'short' });
            const day = date.getDate();
            const year = date.getFullYear();
            return `${weekday}, ${month} ${day}, ${year}`;
        }
        // Fallback if we can't find the data point
        return label;
    };

    const formatYAxisTick = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return formatCurrency(value, currency);
    };

    // Custom dot renderer for high-value markers - only show red blinking dots for values above threshold
    const renderCustomDot = (props: any) => {
        const { payload, cx, cy } = props;
        
        if (!payload?.isHighValue || thresholdsLoading) {
            return <g key={`${payload?.date || 'unknown'}-empty`} />; // Return empty group for normal days
        }

        return (
            <g key={`${payload?.date || 'unknown'}-marker`}>
                {/* Pulse animation ring */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={2}
                    opacity={0.6}
                >
                    <animate
                        attributeName="r"
                        values="8;12;8"
                        dur="2s"
                        repeatCount="indefinite"
                    />
                    <animate
                        attributeName="opacity"
                        values="0.6;0.2;0.6"
                        dur="2s"
                        repeatCount="indefinite"
                    />
                </circle>
                
                {/* Main marker dot - always red for high values */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#dc2626"
                    stroke="white"
                    strokeWidth={2}
                />
                
                {/* Inner highlight dot */}
                <circle
                    cx={cx}
                    cy={cy}
                    r={2}
                    fill="white"
                    opacity={0.8}
                />
            </g>
        );
    };


    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
    };

    const getDateRange = (months: number) => {
        const today = new Date();
        const startDate = new Date(today);

        // Handle month rollover properly
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const targetMonth = currentMonth - months;

        if (targetMonth >= 0) {
            startDate.setMonth(targetMonth);
        } else {
            // Handle year rollover
            const yearsBack = Math.ceil(Math.abs(targetMonth) / 12);
            const newMonth = 12 + (targetMonth % 12);
            startDate.setFullYear(currentYear - yearsBack);
            startDate.setMonth(newMonth === 12 ? 0 : newMonth);
        }

        const start = startDate.toISOString().split('T')[0] || '';
        const end = today.toISOString().split('T')[0] || '';
        
        return { start, end };
    };

    const handleQuickFilter = (months: number) => {
        console.log(`Quick filter clicked: ${months} months`);
        const { start, end } = getDateRange(months);
        console.log(`Setting date range: ${start} to ${end}`);
        setStartDate(start);
        setEndDate(end);
    };

    // Check if current selection matches a quick filter option
    const isActiveQuickFilter = (months: number) => {
        const { start, end } = getDateRange(months);
        return startDate === start && endDate === end;
    };

    // Check if no filters are applied (default state)
    const isDefaultState = !startDate && !endDate && !hasPageFilters;

    // Get button styling based on active state
    const getButtonStyle = (months: number, isDefault = false) => {
        const isActive = isActiveQuickFilter(months) || (isDefault && isDefaultState);
        
        if (isActive) {
            return "px-2 sm:px-3 py-1 text-xs border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm whitespace-nowrap";
        }
        
        return "px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap";
    };

    // Enhanced CSV data for chart controls with detailed statistics
    const csvData = [
        ['Date', 'Formatted Date', 'Total Amount', 'Transaction Count', 'Average Amount', 'Min Amount', 'Max Amount', 'Activity Level'],
        ...chartData.map(item => {
            const activityLevel = item.transactionCount === 0 ? 'None' :
                               item.transactionCount === 1 ? 'Single' :
                               item.transactionCount <= 3 ? 'Low' :
                               item.transactionCount <= 6 ? 'Moderate' : 'High';
            
            return [
                item.date,
                item.formattedDate,
                item.amount.toString(),
                item.transactionCount.toString(),
                item.averageAmount.toFixed(2),
                item.minAmount.toFixed(2),
                item.maxAmount.toFixed(2),
                activityLevel
            ];
        })
    ];

    if (chartData.length === 0) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${isExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName={`${type}-chart`}
                    csvData={csvData}
                    csvFileName={`${type}-data`}
                    title={chartConfig.title}
                />
                <div className="mb-4">
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        {/* Quick Filter Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => handleQuickFilter(1)}
                                className={getButtonStyle(1, true)} // true indicates this is the default
                            >
                                Last Month
                            </button>
                            <button
                                onClick={() => handleQuickFilter(3)}
                                className={getButtonStyle(3)}
                            >
                                Last 3 Months
                            </button>
                            <button
                                onClick={() => handleQuickFilter(6)}
                                className={getButtonStyle(6)}
                            >
                                Last 6 Months
                            </button>
                            <button
                                onClick={() => handleQuickFilter(12)}
                                className={getButtonStyle(12)}
                            >
                                Last 12 Months
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="h-4 w-px bg-gray-300"></div>

                        {/* Custom Date Range */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">From:</span>
                            <input
                                id={`${type}-chart-start-date`}
                                type="date"
                                value={startDate || (hasPageFilters ? pageStartDate : '') || ''}
                                onChange={(e) => setStartDate(e.target.value)}
                                placeholder={hasPageFilters && pageStartDate ? `Page filter: ${pageStartDate}` : ''}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                            <span className="text-xs text-gray-500">to</span>
                            <input
                                id={`${type}-chart-end-date`}
                                type="date"
                                value={endDate || (hasPageFilters ? pageEndDate : '') || ''}
                                onChange={(e) => setEndDate(e.target.value)}
                                placeholder={hasPageFilters && pageEndDate ? `Page filter: ${pageEndDate}` : ''}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                        </div>

                        {/* Clear Button */}
                        {(startDate || endDate || (hasPageFilters && (pageStartDate || pageEndDate))) && (
                            <>
                                <div className="h-4 w-px bg-gray-300"></div>
                                <button
                                    onClick={clearFilters}
                                    className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                >
                                    Clear Chart Filters
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                        <div className="text-4xl mb-2">📊</div>
                        <p>No {type} data to display{(startDate || endDate) ? ' for the selected date range' : ''}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg shadow p-3 sm:p-6 ${isExpanded ? 'fixed inset-2 sm:inset-4 z-50 overflow-auto' : ''}`}>
            <ChartControls
                chartRef={chartRef}
                isExpanded={isExpanded}
                onToggleExpanded={toggleExpanded}
                fileName={`${type}-chart`}
                csvData={csvData}
                csvFileName={`${type}-data`}
                title={chartConfig.title}
            />
            <div className="mb-3 sm:mb-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border">
                    {/* Quick Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <button
                            onClick={() => handleQuickFilter(1)}
                            className={getButtonStyle(1, true)} // true indicates this is the default
                        >
                            1M
                        </button>
                        <button
                            onClick={() => handleQuickFilter(3)}
                            className={getButtonStyle(3)}
                        >
                            3M
                        </button>
                        <button
                            onClick={() => handleQuickFilter(6)}
                            className={getButtonStyle(6)}
                        >
                            6M
                        </button>
                        <button
                            onClick={() => handleQuickFilter(12)}
                            className={getButtonStyle(12)}
                        >
                            1Y
                        </button>
                    </div>

                    {/* Divider - Hidden on mobile */}
                    <div className="hidden sm:block h-4 w-px bg-gray-300"></div>

                    {/* Custom Date Range */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">From:</span>
                            <input
                                id={`${type}-chart-start-date`}
                                type="date"
                                value={startDate || (hasPageFilters ? pageStartDate : '') || ''}
                                onChange={(e) => setStartDate(e.target.value)}
                                placeholder={hasPageFilters && pageStartDate ? `Page filter: ${pageStartDate}` : ''}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white flex-1 sm:flex-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">to</span>
                            <input
                                id={`${type}-chart-end-date`}
                                type="date"
                                value={endDate || (hasPageFilters ? pageEndDate : '') || ''}
                                onChange={(e) => setEndDate(e.target.value)}
                                placeholder={hasPageFilters && pageEndDate ? `Page filter: ${pageEndDate}` : ''}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white flex-1 sm:flex-none"
                            />
                        </div>
                    </div>

                    {/* Clear Button */}
                    {(startDate || endDate || (hasPageFilters && (pageStartDate || pageEndDate))) && (
                        <button
                            onClick={clearFilters}
                            className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors w-full sm:w-auto text-center"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            </div>
            <div ref={chartRef} className={`${isExpanded ? 'h-[70vh] w-full' : 'h-64 sm:h-80 w-full'}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{
                            top: 10,
                            right: isExpanded ? 30 : 10,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="formattedDate"
                            tick={{ fontSize: isExpanded ? 12 : 10 }}
                            stroke="#666"
                            interval={isExpanded ? 'preserveStartEnd' : 'preserveStart'}
                            angle={isExpanded ? 0 : -45}
                            textAnchor={isExpanded ? 'middle' : 'end'}
                            height={isExpanded ? 50 : 60}
                        />
                        <YAxis
                            tick={{ fontSize: isExpanded ? 12 : 10 }}
                            stroke="#666"
                            tickFormatter={formatYAxisTick}
                            width={isExpanded ? 60 : 45}
                        />
                        <Tooltip
                            formatter={formatTooltip}
                            labelFormatter={formatLabel}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length > 0) {
                                    const dataPoint = chartData.find(d => d.formattedDate === label);
                                    if (dataPoint) {
                                        const date = new Date(dataPoint.date);
                                        const weekday = date.toLocaleDateString('en', { weekday: 'short' });
                                        const month = date.toLocaleDateString('en', { month: 'short' });
                                        const day = date.getDate();
                                        const year = date.getFullYear();
                                        const formattedDate = `${weekday}, ${month} ${day}, ${year}`;
                                        const isWeekly = chartData.length <= 30 ? false : true;

                                        return (
                                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80 max-w-md">
                                                <div className="font-bold text-gray-900 mb-3 text-base">
                                                    {formattedDate} {isWeekly && <span className="text-xs text-gray-500">(Week)</span>}
                                                </div>
                                                
                                                {/* Main Amount */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-medium text-gray-700">
                                                        Total {type === 'income' ? 'Income' : 'Expenses'}:
                                                    </span>
                                                    <span className={`font-bold text-lg ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(dataPoint.amount, currency)}
                                                    </span>
                                                </div>

                                                {/* Transaction Statistics */}
                                                <div className="space-y-2 mb-3 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">Transactions:</span>
                                                        <span className="font-medium">{dataPoint.transactionCount}</span>
                                                    </div>
                                                    
                                                    {dataPoint.transactionCount > 0 && (
                                                        <>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Average per Transaction:</span>
                                                                <span className="font-medium">{formatCurrency(dataPoint.averageAmount, currency)}</span>
                                                            </div>
                                                            
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Range:</span>
                                                                <span className="font-medium">
                                                                    {formatCurrency(dataPoint.minAmount, currency)} - {formatCurrency(dataPoint.maxAmount, currency)}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Top Transactions Preview */}
                                                {dataPoint.transactions.length > 0 && (
                                                    <div className="border-t border-gray-200 pt-3">
                                                        <div className="text-xs text-gray-600 mb-2">
                                                            {dataPoint.transactions.length > 6 ? 'Top 5 Transactions:' : 'Transactions:'}
                                                        </div>
                                                        <div className="space-y-1">
                                                            {dataPoint.transactions
                                                                .sort((a, b) => b.amount - a.amount)
                                                                .slice(0, 6)
                                                                .map((transaction, index) => (
                                                                    <div key={index} className="flex justify-between text-xs">
                                                                        <span className="text-gray-600 truncate max-w-32">
                                                                            {transaction.title}
                                                                            {transaction.category && (
                                                                                <span className="text-gray-400 ml-1">({transaction.category})</span>
                                                                            )}
                                                                        </span>
                                                                        <span className="font-medium ml-2">
                                                                            {formatCurrency(transaction.amount, currency)}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            }
                                                            {dataPoint.transactions.length > 6 && (
                                                                <div className="text-xs text-gray-400 text-center pt-1">
                                                                    +{dataPoint.transactions.length - 6} more transaction{dataPoint.transactions.length - 6 !== 1 ? 's' : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                }
                                return null;
                            }}
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke={chartConfig.color}
                            fill={chartConfig.color}
                            fillOpacity={0.2}
                            strokeWidth={2}
                            dot={renderCustomDot}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}