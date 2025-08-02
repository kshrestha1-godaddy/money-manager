"use client";

import React, { useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList, TooltipProps } from "recharts";
import { Info } from "lucide-react";
import { formatCurrency } from "../utils/currency";
import { useChartExpansion } from "../utils/chartUtils";
import { useChartData } from "../hooks/useChartDataContext";
import { ChartControls } from "./ChartControls";

interface WaterfallChartProps {
    currency?: string;
}

interface WaterfallData {
    name: string;
    value: number;
    base: number;
    total: number;
    type: "income" | "expenses" | "savings" | "loss";
}

export const WaterfallChart = React.memo<WaterfallChartProps>(({ currency = "USD" }) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const { totals, formatTimePeriod } = useChartData();
    
    const totalIncome = totals.income;
    const totalExpenses = totals.expenses;
    const totalSavings = totals.savings;
    const savingsRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100) : 0;

    const timePeriodText = formatTimePeriod();

    // Create waterfall data - each bar shows cumulative values with base and value parts
    const data: WaterfallData[] = [
        {
            name: "Income",
            value: totalIncome,
            base: 0,
            total: totalIncome,
            type: "income"
        },
        {
            name: "Expenses",
            value: totalExpenses,
            base: totalSavings > 0 ? totalSavings : 0, // Start from savings level
            total: totalIncome,
            type: "expenses"
        },
        {
            name: "Net Savings",
            value: Math.abs(totalSavings),
            base: 0,
            total: Math.abs(totalSavings),
            type: totalSavings >= 0 ? "savings" : "loss"
        }
    ];

    const getBarColor = (type: string): string => {
        switch (type) {
            case "income": return "#10b981"; // Green
            case "expenses": return "#ef4444"; // Red
            case "savings": return "#3b82f6"; // Blue
            case "loss": return "#f59e0b"; // Orange
            default: return "#6b7280"; // Gray
        }
    };

    const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            const data = payload[0]?.payload as WaterfallData;
            return (
                <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                    <p className="font-medium">{label}</p>
                    <p className="text-sm">
                        <span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: getBarColor(data.type) }}></span>
                        {formatCurrency(data.value, currency)}
                    </p>
                    {data.type === "expenses" && (
                        <p className="text-xs text-gray-500">Reduces available savings</p>
                    )}
                    {data.type === "savings" && (
                        <p className="text-xs text-gray-500">Money saved this period</p>
                    )}
                    {data.type === "loss" && (
                        <p className="text-xs text-gray-500">Spending exceeded income</p>
                    )}
                </div>
            );
        }
        return null;
    };

    const formatYAxisTick = (value: number) => {
        // Create a compact format for Y-axis ticks
        const symbol = currency === "USD" ? "$" : currency === "NPR" ? "₨ " : "$";
        
        if (value >= 1000000) {
            return `${symbol}${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${symbol}${(value / 1000).toFixed(1)}K`;
        } else {
            return `${symbol}${value.toFixed(0)}`;
        }
    };

    // Prepare CSV data
    const csvData = [
        ['Category', 'Amount', 'Type'],
        ['Income', totalIncome.toString(), 'Positive'],
        ['Expenses', totalExpenses.toString(), 'Negative'],
        ['Net Savings', totalSavings.toString(), totalSavings >= 0 ? 'Positive' : 'Negative'],
        ['Savings Rate', `${savingsRate.toFixed(1)}%`, 'Percentage']
    ];

    const ChartContent = () => (
        <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4">
                <div className="text-center">
                    <p className="text-xs text-gray-600">Total Income</p>
                    <p className="text-sm sm:text-xl font-bold text-green-600">
                        {formatCurrency(totalIncome, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-600">Total Expenses</p>
                    <p className="text-sm sm:text-xl font-bold text-red-600">
                        -{formatCurrency(totalExpenses, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-600">Net Savings</p>
                    <p className={`text-sm sm:text-xl font-bold ${totalSavings >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {totalSavings >= 0 ? '+' : ''}{formatCurrency(totalSavings, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                        <p className="text-xs text-gray-600">Savings Rate</p>
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Percentage of income that was saved
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <p className={`text-sm sm:text-xl font-bold ${savingsRate >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {savingsRate.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div 
                ref={chartRef}
                className={`${isExpanded ? 'h-[60vh] w-full' : 'h-[24rem] sm:h-[32rem] w-full'}`}
                role="img"
                aria-label={`Waterfall chart showing income of ${formatCurrency(totalIncome, currency)}, expenses of ${formatCurrency(totalExpenses, currency)}, and net savings of ${formatCurrency(totalSavings, currency)}`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 30,
                            right: 20,
                            left: 20,
                            bottom: 20,
                        }}
                        barCategoryGap="10%"
                        barGap="1%"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                            interval={0}
                        />
                        <YAxis 
                            tickFormatter={formatYAxisTick}
                            tick={{ fontSize: 12 }}
                            domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, totalIncome * 1.1)]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        
                        {/* Reference lines for better visual separation */}
                        <ReferenceLine y={totalIncome} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: "", position: "top" }} />
                        {totalSavings > 0 && (
                            <ReferenceLine y={totalSavings} stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={2} label={{ value: "", position: "top" }} />
                        )}
                        
                        {/* Base bars (invisible) to create waterfall effect */}
                        <Bar 
                            dataKey="base" 
                            fill="transparent" 
                            stackId="waterfall"
                        />
                        
                        {/* Value bars with different colors and labels */}
                        <Bar 
                            dataKey="value" 
                            stackId="waterfall"
                            radius={[4, 4, 0, 0]}
                        >
                            <LabelList 
                                dataKey="value" 
                                position="center" 
                                fill="white" 
                                fontSize={12}
                                fontWeight="bold"
                                formatter={(value: number) => formatCurrency(value, currency)}
                            />
                            {data.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={getBarColor(entry.type)} 
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend and explanation */}
            <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Income</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Expenses</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Savings</span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div 
                className="bg-white rounded-lg shadow p-3 sm:p-6"
                role="region"
                aria-label="Financial Waterfall Chart"
                data-chart-type="waterfall"
            >
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName="waterfall-chart"
                    csvData={csvData}
                    csvFileName="waterfall-data"
                    title={`Financial Waterfall ${timePeriodText}`}
                    tooltipText="Visualizes the flow from income to expenses, showing your net savings"
                />
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg p-3 sm:p-6 max-w-7xl w-full max-h-full overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-semibold">Financial Waterfall {timePeriodText}</h2>
                                <p className="text-sm text-gray-500">Visualizes the flow from income to expenses, showing your net savings</p>
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
});

WaterfallChart.displayName = 'WaterfallChart';