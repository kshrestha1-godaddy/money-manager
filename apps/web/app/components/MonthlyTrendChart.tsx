"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { Info } from "lucide-react";
import { formatCurrency } from "../utils/currency";
import { Income, Expense } from "../types/financial";
import { ChartControls } from "./ChartControls";
import { useChartExpansion } from "../utils/chartUtils";

interface MonthlyTrendChartProps {
    incomes: Income[];
    expenses: Expense[];
    currency?: string;
    startDate?: string;
    endDate?: string;
}

interface MonthlyData {
    month: string;
    income: number;
    expenses: number;
    savings: number;
    incomeT: number;
    expensesT: number;
    savingsT: number;
    formattedMonth: string;
}

interface CalculationsResult {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    monthCount: number;
    averageIncome: number;
    averageExpenses: number;
    averageSavings: number;
    maxValue: number;
    minValue: number;
    yAxisMax: number;
    yAxisMin: number;
    referenceLines: number[];
}

// Memoized Summary Stats Component
const SummaryStats = React.memo<{
    calculations: CalculationsResult;
    currency: string;
}>(({ calculations, currency }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-1">
                <p className="text-sm text-gray-600">Monthly Average Income</p>
                <div className="relative group">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        Average income per month from the selected period
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                </div>
            </div>
            <p className="text-base sm:text-lg font-bold text-green-600">
                {formatCurrency(calculations.averageIncome, currency)}
            </p>
        </div>
        <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-1">
                <p className="text-sm text-gray-600">Monthly Average Expenses</p>
                <div className="relative group">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        Average expenses per month from the selected period
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                </div>
            </div>
            <p className="text-base sm:text-lg font-bold text-red-600">
                {formatCurrency(calculations.averageExpenses, currency)}
            </p>
        </div>
        <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-1">
                <p className="text-sm text-gray-600">Monthly Average Savings</p>
                <div className="relative group">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                        Average savings per month: Income - Expenses
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                </div>
            </div>
            <p className={`text-base sm:text-lg font-bold ${calculations.averageSavings >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(calculations.averageSavings, currency)}
            </p>
        </div>
    </div>
));

SummaryStats.displayName = 'SummaryStats';

// Memoized Chart Legend Component
const ChartLegend = React.memo(() => (
    <div className="flex justify-center items-center gap-3 sm:gap-6 mt-4">
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded"></div>
            <span className="text-xs sm:text-sm text-gray-700">Income</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded"></div>
            <span className="text-xs sm:text-sm text-gray-700">Expenses</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded"></div>
            <span className="text-xs sm:text-sm text-gray-700">Savings</span>
        </div>
    </div>
));

ChartLegend.displayName = 'ChartLegend';

// Constants to avoid recreating on each render
const CHART_COLORS = {
    income: "#10b981",
    expenses: "#ef4444",
    savings: "#3b82f6",
    incomeTrend: "#059669",
    expensesTrend: "#dc2626",
    savingsTrend: "#2563eb"
} as const;

const CHART_MARGINS = {
    top: 40,
    right: 20,
    left: 20,
    bottom: 30
} as const;

// Optimized date utilities
const createDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const normalizeDate = (date: Date | string): Date => {
    return date instanceof Date ? date : new Date(date);
};

export const MonthlyTrendChart = React.memo<MonthlyTrendChartProps>(({ 
    incomes, 
    expenses, 
    currency = "USD", 
    startDate, 
    endDate 
}) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    
    // Memoize date range calculation only when dates change
    const dateRange = useMemo(() => {
        if (startDate || endDate) {
            return {
                start: startDate ? new Date(startDate) : null,
                end: endDate ? new Date(endDate) : null,
                hasExplicitRange: true
            };
        }
        
        // Calculate default range (last 6 months) only once
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        let targetMonth = currentMonth - 5;
        let targetYear = currentYear;
        
        if (targetMonth < 0) {
            targetMonth += 12;
            targetYear -= 1;
        }
        
        return {
            start: new Date(targetYear, targetMonth, 1),
            end: new Date(currentYear, currentMonth + 1, 0),
            hasExplicitRange: false
        };
    }, [startDate, endDate]);

    // Memoize the time period text calculation
    const timePeriodText = useMemo((): string => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const startMonth = start.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            const endMonth = end.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            return `(${startMonth} - ${endMonth})`;
        } else if (startDate) {
            const start = new Date(startDate);
            const startMonth = start.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            return `(From ${startMonth})`;
        } else if (endDate) {
            const end = new Date(endDate);
            const endMonth = end.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            return `(Until ${endMonth})`;
        } else {
            const startMonth = dateRange.start!.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            const endMonth = dateRange.end!.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            return `(${startMonth} - ${endMonth})`;
        }
    }, [startDate, endDate, dateRange]);
    
    // Optimized data filtering using the precomputed date range
    const { filteredIncomes, filteredExpenses } = useMemo(() => {
        const filterItems = <T extends Income | Expense>(items: T[]): T[] => {
            if (!dateRange.hasExplicitRange && dateRange.start && dateRange.end) {
                // Use precomputed range for default case
                return items.filter(item => {
                    const itemDate = normalizeDate(item.date);
                    return itemDate >= dateRange.start! && itemDate <= dateRange.end!;
                });
            }
            
            // Handle explicit date filters
            return items.filter(item => {
                const itemDate = normalizeDate(item.date);
                
                if (dateRange.start && dateRange.end) {
                    const start = new Date(dateRange.start);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(dateRange.end);
                    end.setHours(23, 59, 59, 999);
                    return itemDate >= start && itemDate <= end;
                } else if (dateRange.start) {
                    const start = new Date(dateRange.start);
                    start.setHours(0, 0, 0, 0);
                    return itemDate >= start;
                } else if (dateRange.end) {
                    const end = new Date(dateRange.end);
                    end.setHours(23, 59, 59, 999);
                    return itemDate <= end;
                }
                
                return true;
            });
        };

        return {
            filteredIncomes: filterItems(incomes),
            filteredExpenses: filterItems(expenses)
        };
    }, [incomes, expenses, dateRange]);

    // Optimized chart data processing using Map for better performance
    const chartData = useMemo((): MonthlyData[] => {
        // Use Map for O(1) lookups instead of array operations
        const monthlyData = new Map<string, { income: number; expenses: number }>();

        // Process incomes efficiently
        for (const income of filteredIncomes) {
            const date = normalizeDate(income.date);
            const monthKey = createDateKey(date);
            const current = monthlyData.get(monthKey) || { income: 0, expenses: 0 };
            current.income += income.amount;
            monthlyData.set(monthKey, current);
        }

        // Process expenses efficiently
        for (const expense of filteredExpenses) {
            const date = normalizeDate(expense.date);
            const monthKey = createDateKey(date);
            const current = monthlyData.get(monthKey) || { income: 0, expenses: 0 };
            current.expenses += expense.amount;
            monthlyData.set(monthKey, current);
        }

        // Convert to array and sort
        const result: MonthlyData[] = [];
        for (const [monthKey, data] of monthlyData) {
            const parts = monthKey.split('-');
            const yearStr = parts[0];
            const monthStr = parts[1];
            
            if (!yearStr || !monthStr) continue;
            
            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10);
            
            if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
                continue;
            }
            
            const date = new Date(year, month - 1);
            const savings = data.income - data.expenses;
            
            result.push({
                month: monthKey,
                income: data.income,
                expenses: data.expenses,
                savings,
                incomeT: data.income,
                expensesT: data.expenses,
                savingsT: savings,
                formattedMonth: date.toLocaleDateString('en', { month: 'short', year: 'numeric' })
            });
        }
        
        return result.sort((a, b) => a.month.localeCompare(b.month));
    }, [filteredIncomes, filteredExpenses]);

    // Optimized calculations using single pass through data
    const calculations = useMemo((): CalculationsResult => {
        if (chartData.length === 0) {
            return {
                totalIncome: 0,
                totalExpenses: 0,
                totalSavings: 0,
                monthCount: 0,
                averageIncome: 0,
                averageExpenses: 0,
                averageSavings: 0,
                maxValue: 0,
                minValue: 0,
                yAxisMax: 100,
                yAxisMin: 0,
                referenceLines: [25, 50, 75]
            };
        }

        let totalIncome = 0;
        let totalExpenses = 0;
        let maxValue = 0;
        let minValue = 0;

        // Single pass calculation
        for (const item of chartData) {
            totalIncome += item.income;
            totalExpenses += item.expenses;
            maxValue = Math.max(maxValue, item.income, item.expenses, item.savings);
            minValue = Math.min(minValue, 0, item.savings);
        }

        const totalSavings = totalIncome - totalExpenses;
        const monthCount = chartData.length;
        const averageIncome = totalIncome / monthCount;
        const averageExpenses = totalExpenses / monthCount;
        const averageSavings = totalSavings / monthCount;

        const yAxisMax = Math.ceil(maxValue * 1.3);
        const yAxisMin = Math.floor(minValue * 1.5);
        
        const referenceLines = [
            yAxisMax * 0.25,
            yAxisMax * 0.5,
            yAxisMax * 0.75
        ];

        return {
            totalIncome,
            totalExpenses,
            totalSavings,
            monthCount,
            averageIncome,
            averageExpenses,
            averageSavings,
            maxValue,
            minValue,
            yAxisMax,
            yAxisMin,
            referenceLines
        };
    }, [chartData]);

    // Memoize CSV data
    const csvData = useMemo(() => [
        ['Month', 'Income', 'Expenses', 'Savings'],
        ...chartData.map(item => [
            item.formattedMonth,
            item.income.toString(),
            item.expenses.toString(),
            item.savings.toString()
        ])
    ], [chartData]);

    // Memoize chart title and tooltip text
    const { chartTitle, tooltipText } = useMemo(() => ({
        chartTitle: `Monthly Income, Expenses & Savings Trend ${timePeriodText}`,
        tooltipText: "Compare your monthly financial flows and identify patterns over time"
    }), [timePeriodText]);

    // Optimized download functions with better error handling
    const downloadPNG = useCallback(async (): Promise<void> => {
        const element = chartRef.current;
        if (!element) return;

        try {
            const svgElement = element.querySelector('svg');
            if (!svgElement) {
                console.error('No SVG element found');
                return;
            }

            const svgData = new XMLSerializer().serializeToString(svgElement);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const img = new Image();
            const svg = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svg);

            const cleanup = () => URL.revokeObjectURL(url);

            img.onload = () => {
                try {
                    canvas.width = img.width * 2;
                    canvas.height = img.height * 2;
                    ctx.scale(2, 2);
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const link = document.createElement('a');
                            link.download = 'monthly-trend-chart.png';
                            link.href = URL.createObjectURL(blob);
                            link.click();
                            URL.revokeObjectURL(link.href);
                        }
                    }, 'image/png');
                } finally {
                    cleanup();
                }
            };

            img.onerror = () => {
                console.error('Failed to load SVG image');
                cleanup();
                downloadSVG();
            };

            img.src = url;
        } catch (error) {
            console.error('Error downloading PNG:', error);
            downloadSVG();
        }
    }, []);

    const downloadSVG = useCallback((): void => {
        const element = chartRef.current;
        if (!element) return;

        const svgElement = element.querySelector('svg');
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const link = document.createElement('a');
        link.download = 'monthly-trend-chart.svg';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    }, []);

    const downloadCSV = useCallback((): void => {
        const csvString = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const link = document.createElement('a');
        link.download = 'monthly-trend-data.csv';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    }, [csvData]);

    // Optimized tooltip component with better performance
    const CustomTooltip = useCallback(({ active, payload, label }: {
        active?: boolean;
        payload?: Array<{ dataKey: string; value: number; color: string }>;
        label?: string;
    }) => {
        if (!active || !payload?.length) return null;

        // Filter to only show bar data (exclude trend lines) - more efficient
        const barData = payload.filter(entry => 
            entry.dataKey === 'income' || entry.dataKey === 'expenses' || entry.dataKey === 'savings'
        );
        
        if (barData.length === 0) return null;

        return (
            <div className="bg-white border border-gray-300 rounded p-3 shadow-lg">
                <p className="text-gray-900 font-medium mb-2">{label}</p>
                {barData.map((entry, index) => {
                    const displayName = entry.dataKey === 'income' ? 'Income' :
                                     entry.dataKey === 'expenses' ? 'Expenses' : 'Savings';
                    
                    return (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {displayName}: {formatCurrency(entry.value, currency)}
                        </p>
                    );
                })}
            </div>
        );
    }, [currency]);

    const formatYAxisTick = useCallback((value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return formatCurrency(value, currency).replace(/\$/, '');
    }, [currency]);

    // Calculate optimal interval for x-axis ticks based on data length
    const optimalInterval = useMemo(() => {
        return chartData.length <= 6 ? 0 : 1;
    }, [chartData.length]);

    // Custom tick component for horizontal X-axis labels
    const CustomXAxisTick = useCallback((props: any) => {
        const { x, y, payload } = props;
        return (
            <g transform={`translate(${x},${y})`}>
                <text 
                    x={0} 
                    y={0} 
                    dy={16} 
                    textAnchor="middle" 
                    fill="#666" 
                    fontSize="12"
                >
                    {payload.value}
                </text>
            </g>
        );
    }, []);

    // Main chart component - memoized for better performance
    const Chart = useMemo(() => (
        <div 
            ref={chartRef} 
            className={isExpanded ? "h-[60vh] w-full" : "h-[30rem] sm:h-[40rem] w-full"}
            role="img"
            aria-label={`Monthly trend chart showing income, expenses, and savings ${timePeriodText.toLowerCase()}`}
        >
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={CHART_MARGINS}
                    barCategoryGap="15%"
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    
                    {/* Reference lines for better visualization */}
                    <ReferenceLine y={0} stroke="#666" strokeWidth={2} />
                    {calculations.referenceLines.map((value, index) => (
                        <ReferenceLine 
                            key={index}
                            y={value} 
                            stroke="#d0d0d0" 
                            strokeDasharray="2 2"
                            strokeWidth={1}
                        />
                    ))}
                    
                    <XAxis 
                        dataKey="formattedMonth" 
                        tick={<CustomXAxisTick />}
                        interval={optimalInterval}
                        stroke="#666"
                        height={50}
                    />
                    <YAxis 
                        tickFormatter={formatYAxisTick}
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                        domain={[calculations.yAxisMin, calculations.yAxisMax]}
                        tickCount={8}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    <Bar 
                        dataKey="income" 
                        fill={CHART_COLORS.income}
                        name="Income"
                        radius={[2, 2, 0, 0]}
                    />
                    <Bar 
                        dataKey="expenses" 
                        fill={CHART_COLORS.expenses}
                        name="Expenses"
                        radius={[2, 2, 0, 0]}
                    />
                    <Bar 
                        dataKey="savings" 
                        fill={CHART_COLORS.savings}
                        name="Savings"
                        radius={[2, 2, 0, 0]}
                    />
                    
                    {/* Trend Lines */}
                    <Line 
                        type="monotone" 
                        dataKey="incomeT" 
                        stroke={CHART_COLORS.incomeTrend}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.incomeTrend, strokeWidth: 2, r: 4 }}
                        name="Income Trend"
                        connectNulls={false}
                        legendType="none"
                        activeDot={false}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="expensesT" 
                        stroke={CHART_COLORS.expensesTrend}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.expensesTrend, strokeWidth: 2, r: 4 }}
                        name="Expenses Trend"
                        connectNulls={false}
                        legendType="none"
                        activeDot={false}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="savingsT" 
                        stroke={CHART_COLORS.savingsTrend}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.savingsTrend, strokeWidth: 2, r: 4 }}
                        name="Savings Trend"
                        connectNulls={false}
                        legendType="none"
                        activeDot={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    ), [chartData, calculations, isExpanded, timePeriodText, optimalInterval, CustomXAxisTick, formatYAxisTick, CustomTooltip]);

    const ChartContent = useCallback(() => (
        <div>
            <SummaryStats calculations={calculations} currency={currency} />
            {Chart}
            <ChartLegend />
        </div>
    ), [calculations, currency, Chart]);

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6" data-chart-type="monthly-trend">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {chartTitle}
                    </h3>
                </div>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    No data available {timePeriodText.toLowerCase()}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow p-3 sm:p-6" data-chart-type="monthly-trend">
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName="monthly-trend-chart"
                    csvData={csvData}
                    csvFileName="monthly-trend-data"
                    title={chartTitle}
                    tooltipText={tooltipText}
                />
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-[95%] w-full max-h-[95%] overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-2xl font-semibold">{chartTitle}</h2>
                                <p className="text-sm text-gray-500">{tooltipText}</p>
                            </div>
                            <button
                                onClick={toggleExpanded}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-full">
                                <ChartContent />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

MonthlyTrendChart.displayName = 'MonthlyTrendChart'; 