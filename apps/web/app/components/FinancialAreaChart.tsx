"use client";

import { useState, useMemo, useRef, memo, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "../utils/currency";
import { Income, Expense } from "../types/financial";
import { ChartControls } from "./ChartControls";
import { useChartExpansion } from "../utils/chartUtils";

interface FinancialAreaChartProps {
    data: (Income | Expense)[];
    currency?: string;
    type: 'income' | 'expense';
    title?: string;
    hasPageFilters?: boolean;
    pageStartDate?: string;
    pageEndDate?: string;
}

interface ChartDataPoint {
    date: string;
    amount: number;
    formattedDate: string;
}

function FinancialAreaChartComponent({ 
    data, 
    currency = "USD", 
    type, 
    title,
    hasPageFilters = false,
    pageStartDate,
    pageEndDate
}: FinancialAreaChartProps) {
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);

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

    // Determine effective date filters - memoized separately to reduce re-computations
    const effectiveDateFilters = useMemo(() => ({
        startDate: startDate || (hasPageFilters ? pageStartDate : ''),
        endDate: endDate || (hasPageFilters ? pageEndDate : '')
    }), [startDate, endDate, hasPageFilters, pageStartDate, pageEndDate]);

    // Filter data based on date range - optimized with stable dependencies
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];
        if (!effectiveDateFilters.startDate && !effectiveDateFilters.endDate) return data;
        
        return data.filter(item => {
            const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
            const itemDateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
            
            let matchesDateRange = true;
            
            if (effectiveDateFilters.startDate) {
                matchesDateRange = matchesDateRange && itemDateStr >= effectiveDateFilters.startDate;
            }
            
            if (effectiveDateFilters.endDate) {
                matchesDateRange = matchesDateRange && itemDateStr <= effectiveDateFilters.endDate;
            }
            
            return matchesDateRange;
        });
    }, [data, effectiveDateFilters]);

    // Determine which data to display - memoized separately
    const displayData = useMemo(() => {
        if (!data || data.length === 0) return [];
        
        // If page filters are active (hasPageFilters=true), the data is already pre-filtered from parent
        // In this case, respect the pre-filtered data and only apply chart-specific date filters
        if (hasPageFilters) {
            // Data is already filtered by parent, only apply chart-specific date filtering if present
            if (effectiveDateFilters.startDate || effectiveDateFilters.endDate) {
                return filteredData;
            } else {
                // Use the pre-filtered data as-is
                return data;
            }
        } else {
            // No page filters - apply chart's own filtering logic
            if (effectiveDateFilters.startDate || effectiveDateFilters.endDate) {
                return filteredData;
            } else {
                // No filters active - show default 30-day view
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                return data.filter(item => {
                    const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
                    return itemDate >= thirtyDaysAgo;
                });
            }
        }
    }, [data, filteredData, effectiveDateFilters, hasPageFilters]);

    // Chart data computation - simplified dependencies
    const chartData = useMemo(() => {
        if (!displayData || displayData.length === 0) return [];
        
        // Group data by date and sum amounts for each date
        const dateMap = new Map<string, number>();
        
        displayData.forEach(item => {
            const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
            const dateKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
            const existingAmount = dateMap.get(dateKey) || 0;
            dateMap.set(dateKey, existingAmount + item.amount);
        });

        // Convert map to array and sort by date
        const chartPoints: ChartDataPoint[] = Array.from(dateMap.entries())
            .map(([dateStr, amount]) => ({
                date: dateStr,
                amount,
                formattedDate: new Date(dateStr).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                })
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return chartPoints;
    }, [displayData]);

    // Quick filter functions - memoized to prevent unnecessary re-renders
    const handleQuickFilter = useCallback((months: number) => {
        const endDateLocal = new Date();
        const startDateLocal = new Date();
        startDateLocal.setMonth(startDateLocal.getMonth() - months);
        
        setStartDate(startDateLocal.toISOString().split('T')[0] || '');
        setEndDate(endDateLocal.toISOString().split('T')[0] || '');
    }, []);

    const clearFilters = useCallback(() => {
        setStartDate("");
        setEndDate("");
    }, []);

    // Format Y-axis values for compact display - memoized to prevent re-creation
    const formatYAxisTick = useCallback((value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return Math.round(value).toString();
    }, []);

    // Prepare CSV data - memoized to prevent re-computation
    const csvData = useMemo(() => [
        ['Date', 'Amount'],
        ...chartData.map(item => [item.date, item.amount])
    ], [chartData]);

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName={`${type}-chart`}
                    csvData={csvData}
                    csvFileName={`${type}-data`}
                    title={chartConfig.title}
                    tooltipText={`${chartConfig.label} trend over time with interactive filtering`}
                />
                <div className="mb-4">
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        {/* Quick Filter Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => handleQuickFilter(1)}
                                className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Last Month
                            </button>
                            <button
                                onClick={() => handleQuickFilter(3)}
                                className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Last 3 Months
                            </button>
                            <button
                                onClick={() => handleQuickFilter(6)}
                                className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Last 6 Months
                            </button>
                            <button
                                onClick={() => handleQuickFilter(12)}
                                className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Last Year
                            </button>
                        </div>
                        
                        {/* Divider */}
                        <div className="h-4 w-px bg-gray-300"></div>
                        
                        {/* Custom Date Range */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">From:</span>
                            <input
                                type="date"
                                value={startDate || (hasPageFilters ? pageStartDate : '') || ''}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-xs text-gray-500">to</span>
                            <input
                                type="date"
                                value={endDate || (hasPageFilters ? pageEndDate : '') || ''}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        
                        {/* Clear Button */}
                        {(startDate || endDate || (hasPageFilters && (pageStartDate || pageEndDate))) && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    No {type} data available for the selected period
                </div>
            </div>
        );
    }

    const ChartContent = () => (
        <div>
            <div className="mb-3 sm:mb-4">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border">
                    {/* Quick Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <button
                            onClick={() => handleQuickFilter(1)}
                            className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                        >
                            1M
                        </button>
                        <button
                            onClick={() => handleQuickFilter(3)}
                            className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                        >
                            3M
                        </button>
                        <button
                            onClick={() => handleQuickFilter(6)}
                            className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                        >
                            6M
                        </button>
                        <button
                            onClick={() => handleQuickFilter(12)}
                            className="px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
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
                            formatter={(value: number) => [formatCurrency(value, currency), chartConfig.label]}
                            labelFormatter={(label: string) => `Date: ${label}`}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const value = payload[0]?.value as number;
                                    return (
                                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                            <p className="text-sm font-medium text-gray-900">
                                                {formatCurrency(value, currency)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Date: {label}
                                            </p>
                                        </div>
                                    );
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
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <>
            <div className="bg-white rounded-lg shadow p-3 sm:p-6" data-chart-type={`${type}-area-chart`}>
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName={`${type}-chart`}
                    csvData={csvData}
                    csvFileName={`${type}-data`}
                    title={chartConfig.title}
                    tooltipText={`${chartConfig.label} trend over time with interactive filtering`}
                />
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-[95%] w-full max-h-[95%] overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-semibold">{chartConfig.title}</h2>
                                <p className="text-sm text-gray-500">{chartConfig.label} trend over time with interactive filtering</p>
                            </div>
                            <button
                                onClick={toggleExpanded}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base"
                            >
                                Close
                            </button>
                        </div>
                        <ChartContent />
                    </div>
                </div>
            )}
        </>
    );
}

// Custom comparison function for memo to prevent unnecessary re-renders
const arePropsEqual = (prevProps: FinancialAreaChartProps, nextProps: FinancialAreaChartProps) => {
    // Only re-render if meaningful props have changed
    return (
        prevProps.data === nextProps.data &&
        prevProps.currency === nextProps.currency &&
        prevProps.type === nextProps.type &&
        prevProps.title === nextProps.title &&
        prevProps.hasPageFilters === nextProps.hasPageFilters &&
        prevProps.pageStartDate === nextProps.pageStartDate &&
        prevProps.pageEndDate === nextProps.pageEndDate
    );
};

// Export memoized component to prevent unnecessary re-renders
export const FinancialAreaChart = memo(FinancialAreaChartComponent, arePropsEqual);