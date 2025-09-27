"use client";

import React, { useRef, useMemo, useCallback } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { Info } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { Income, Expense } from "../../../types/financial";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";


interface MonthlyTrendChartProps {
    currency?: string;
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
    incomeCount: number;
    expenseCount: number;
    savingsRate: number;
    incomeAverage: number;
    expenseAverage: number;
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
    <div className="w-full flex justify-center pb-2">
        <div className="flex justify-between items-center w-full max-w-sm">
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

// Note: Date utilities now centralized in useChartDataContext

export const MonthlyTrendChart = React.memo<MonthlyTrendChartProps>(({ 
    currency = "USD"
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const { monthlyData, formatTimePeriod } = useChartData();
    
    const timePeriodText = formatTimePeriod();
    
    // Transform chart data to match component expectations with enhanced statistics
    const chartData = useMemo((): MonthlyData[] => {
        return monthlyData.map(month => {
            // Use the pre-calculated counts from monthlyData
            const incomeCount = month.incomeCount || 0;
            const expenseCount = month.expenseCount || 0;
            const incomeAverage = incomeCount > 0 ? month.income / incomeCount : 0;
            const expenseAverage = expenseCount > 0 ? month.expenses / expenseCount : 0;
            const savingsRate = month.income > 0 ? ((month.income - month.expenses) / month.income) * 100 : 0;
            
            return {
                month: month.monthKey,
                income: month.income,
                expenses: month.expenses,
                savings: month.savings,
                incomeT: month.income,
                expensesT: month.expenses,
                savingsT: month.savings,
                formattedMonth: month.formattedMonth,
                incomeCount,
                expenseCount,
                savingsRate,
                incomeAverage,
                expenseAverage
            };
        });
    }, [monthlyData]);

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

    // Enhanced CSV data with detailed statistics
    const csvData = useMemo(() => [
        ['Month', 'Income', 'Expenses', 'Savings', 'Income Transactions', 'Expense Transactions', 'Total Transactions', 'Savings Rate (%)', 'Avg Income', 'Avg Expense'],
        ...chartData.map(item => [
            item.formattedMonth,
            item.income.toString(),
            item.expenses.toString(),
            item.savings.toString(),
            item.incomeCount.toString(),
            item.expenseCount.toString(),
            (item.incomeCount + item.expenseCount).toString(),
            item.savingsRate.toFixed(1),
            item.incomeAverage.toFixed(2),
            item.expenseAverage.toFixed(2)
        ])
    ], [chartData]);

    // Calculate total transactions for display
    const totalTransactions = chartData.reduce((sum, item) => sum + item.incomeCount + item.expenseCount, 0);
    
    // Memoize chart title and tooltip text
    const { chartTitle, tooltipText } = useMemo(() => ({
        chartTitle: totalTransactions > 0 ? `Monthly Income, Expenses & Savings Trend ${timePeriodText} • ${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''}` : `Monthly Income, Expenses & Savings Trend ${timePeriodText}`,
        tooltipText: "Compare your monthly financial flows with detailed statistics including transaction counts, averages, savings rates, and percentages. Hover over bars for detailed breakdowns."
    }), [timePeriodText, totalTransactions]);

    // Optimized download functions with better error handling
    // Removed unused custom download functions; ChartControls handles downloads

    // Enhanced tooltip component with detailed statistics
    const CustomTooltip = useCallback(({ active, payload, label }: {
        active?: boolean;
        payload?: Array<{ dataKey: string; value: number; color: string; payload?: MonthlyData }>;
        label?: string;
    }) => {
        if (!active || !payload?.length) return null;

        // Filter to only show bar data (exclude trend lines) - more efficient
        const barData = payload.filter(entry => 
            entry.dataKey === 'income' || entry.dataKey === 'expenses' || entry.dataKey === 'savings'
        );
        
        if (barData.length === 0) return null;

        // Get the month data for detailed statistics
        const monthData = barData[0]?.payload;
        if (!monthData) return null;

        const totalTransactions = monthData.incomeCount + monthData.expenseCount;
        const totalAmount = monthData.income + monthData.expenses;

        return (
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg max-w-sm">
                <div className="font-bold text-gray-900 mb-3 text-base">{label}</div>
                
                {/* Financial Summary */}
                <div className="space-y-2 mb-3">
                    {barData.map((entry, index) => {
                        const displayName = entry.dataKey === 'income' ? 'Income' :
                                         entry.dataKey === 'expenses' ? 'Expenses' : 'Savings';
                        const percentage = totalAmount > 0 ? ((Math.abs(entry.value) / totalAmount) * 100).toFixed(1) : '0.0';
                        
                        return (
                            <div key={index} className="flex justify-between items-center">
                                <span className="text-sm font-medium" style={{ color: entry.color }}>
                                    {displayName}:
                                </span>
                                <span className="text-sm font-semibold">
                                    {formatCurrency(entry.value, currency)} ({percentage}%)
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Detailed Statistics */}
                <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total Transactions:</span>
                        <span className="font-medium">{totalTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Income Transactions:</span>
                        <span className="font-medium">{monthData.incomeCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Expense Transactions:</span>
                        <span className="font-medium">{monthData.expenseCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Savings Rate:</span>
                        <span className={`font-medium ${monthData.savingsRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {monthData.savingsRate.toFixed(1)}%
                        </span>
                    </div>
                    {monthData.incomeCount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Avg Income:</span>
                            <span className="font-medium">{formatCurrency(monthData.incomeAverage, currency)}</span>
                        </div>
                    )}
                    {monthData.expenseCount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Avg Expense:</span>
                            <span className="font-medium">{formatCurrency(monthData.expenseAverage, currency)}</span>
                        </div>
                    )}
                </div>
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
            className="h-[30rem] sm:h-[40rem] w-full"
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
    ), [chartData, calculations, timePeriodText, optimalInterval, CustomXAxisTick, formatYAxisTick, CustomTooltip]);


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
        <div className="bg-white rounded-lg shadow p-3 sm:p-6" data-chart-type="monthly-trend">
            <ChartControls
                chartRef={chartRef}
                fileName="monthly-trend-chart"
                csvData={csvData}
                csvFileName="monthly-trend-data"
                title={chartTitle}
                tooltipText={tooltipText}
                showExpandButton={false}
            />
            <div>
                <SummaryStats calculations={calculations} currency={currency} />
                {Chart}
                
            </div>
            <ChartLegend />
        </div>
    );
});

MonthlyTrendChart.displayName = 'MonthlyTrendChart'; 