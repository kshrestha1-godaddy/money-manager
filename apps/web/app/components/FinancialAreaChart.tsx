"use client";

import { useMemo, useState, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Income, Expense } from "../types/financial";
import { formatCurrency } from "../utils/currency";
import { useChartExpansion } from "../utils/chartUtils";
import { ChartControls } from "./ChartControls";

type FinancialTransaction = Income | Expense;

interface FinancialAreaChartProps {
    data: FinancialTransaction[];
    currency?: string;
    type: 'income' | 'expense';
    title?: string;
    hasPageFilters?: boolean; // New prop to indicate if page-level filters are applied
    pageStartDate?: string; // Page-level start date filter
    pageEndDate?: string; // Page-level end date filter
}

interface ChartDataPoint {
    date: string;
    amount: number;
    formattedDate: string;
}

export function FinancialAreaChart({ 
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

    // Filter data based on date range
    const filteredData = useMemo(() => {
        // Use chart filters if they exist, otherwise use page filters
        const effectiveStartDate = startDate || (hasPageFilters ? pageStartDate : '');
        const effectiveEndDate = endDate || (hasPageFilters ? pageEndDate : '');
        
        console.log(`${type} chart filtering data:`, {
            totalData: data?.length || 0,
            chartStartDate: startDate,
            chartEndDate: endDate,
            pageStartDate,
            pageEndDate,
            effectiveStartDate,
            effectiveEndDate,
            hasPageFilters,
            sampleDates: data?.slice(0, 3).map(item => ({
                original: item.date,
                formatted: item.date instanceof Date ? 
                    `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}-${String(item.date.getDate()).padStart(2, '0')}` :
                    item.date
            })) || []
        });
        
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
        
        console.log(`${type} chart filtered result:`, filtered.length, 'items');
        return filtered;
    }, [data, startDate, endDate, pageStartDate, pageEndDate, hasPageFilters, type]);

    const chartData = useMemo(() => {
        // Apply default 30-day filter when no chart filters and no page filters are active
        if (!filteredData) return [];
        
        let recentData = filteredData;
        const effectiveStartDate = startDate || (hasPageFilters ? pageStartDate : '');
        const effectiveEndDate = endDate || (hasPageFilters ? pageEndDate : '');
        
        if (!effectiveStartDate && !effectiveEndDate && !hasPageFilters) {
            // Only apply 30-day filter if no page filters AND no chart filters are applied
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            recentData = filteredData.filter(item => {
                const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
                return itemDate >= thirtyDaysAgo;
            });
        }
        
        console.log(`${chartConfig.label} chart filtering:`, {
            chartStartDate: startDate,
            chartEndDate: endDate,
            pageStartDate,
            pageEndDate,
            effectiveStartDate,
            effectiveEndDate,
            hasPageFilters,
            originalDataLength: data?.length || 0,
            filteredDataLength: filteredData?.length || 0,
            finalDataLength: recentData?.length || 0,
            appliedDefaultFilter: !effectiveStartDate && !effectiveEndDate && !hasPageFilters
        });

        // Group data by date and sum amounts for each date
        const dateMap = new Map<string, number>();
        
        if (recentData) {
            recentData.forEach(item => {
                // Use local date to avoid timezone issues
                const dateObj = item.date instanceof Date ? item.date : new Date(item.date);
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                
                if (!dateStr) return;
                const current = dateMap.get(dateStr) || 0;
                dateMap.set(dateStr, current + item.amount);
            });
        }

        console.log(`${chartConfig.label} chart data processing:`, {
            totalItems: recentData?.length || 0,
            dateMapEntries: Array.from(dateMap.entries()),
            firstFewItems: recentData?.slice(0, 5).map(item => {
                const dateObj = item.date instanceof Date ? item.date : new Date(item.date);
                return {
                    title: item.title,
                    originalDate: item.date,
                    processedDate: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`,
                    amount: item.amount
                };
            }) || []
        });

        // Convert to array and sort by date
        const chartDataPoints: ChartDataPoint[] = Array.from(dateMap.entries())
            .map(([date, amount]) => {
                const dateObj = new Date(date);
                const month = dateObj.toLocaleDateString('en', { month: 'short' });
                const day = dateObj.getDate().toString();
                return {
                    date,
                    amount,
                    formattedDate: `${month} ${day}`
                };
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // If there are more than 30 data points, aggregate by week
        if (chartDataPoints.length > 30) {
            const weekMap = new Map<string, number>();
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
                const current = weekMap.get(weekKey) || 0;
                weekMap.set(weekKey, current + item.amount);
            });

            return Array.from(weekMap.entries())
                .map(([date, amount]) => {
                    const dateObj = new Date(date);
                    const month = dateObj.toLocaleDateString('en', { month: 'short' });
                    const day = dateObj.getDate().toString();
                    return {
                        date,
                        amount,
                        formattedDate: `${month} ${day}`
                    };
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        console.log(`${chartConfig.label} chart final data:`, chartDataPoints.length, 'points');
        
        return chartDataPoints;
    }, [filteredData, startDate, endDate, pageStartDate, pageEndDate, chartConfig.label, hasPageFilters, data]);

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
        
        console.log(`Getting date range for ${months} months:`, { 
            start, 
            end, 
            startDate: startDate.toLocaleDateString(),
            endDate: today.toLocaleDateString()
        });
        
        return { start, end };
    };

    const handleQuickFilter = (months: number) => {
        console.log(`Quick filter clicked: ${months} months`);
        const { start, end } = getDateRange(months);
        console.log(`Setting date range: ${start} to ${end}`);
        setStartDate(start);
        setEndDate(end);
    };

    // Prepare CSV data for chart controls
    const csvData = [
        ['Date', 'Amount'],
        ...chartData.map(item => [item.date, item.amount])
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
            <div ref={chartRef} className={`${isExpanded ? 'h-[70vh] w-full' : 'h-64 w-full'}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="formattedDate" 
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                        />
                        <YAxis 
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                            tickFormatter={formatYAxisTick}
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
                                        
                                        return (
                                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                                                <p className="text-sm text-gray-600 mb-1">{formattedDate}</p>
                                                <p className={`text-sm font-medium ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                   {formatCurrency(dataPoint.amount, currency)}
                                                </p>
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
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}