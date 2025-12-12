"use client";

import React, { useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList, TooltipProps } from "recharts";
import { Info } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { useChartExpansion } from "../../../utils/chartUtils";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";

interface WaterfallChartProps {
    currency?: string;
    heightClass?: string;
}

interface WaterfallData {
    name: string;
    value: number;
    base: number;
    total: number;
    type: "income" | "expenses" | "savings" | "loss";
    count?: number;
    average?: number;
    percentage?: number;
    description?: string;
}

export const WaterfallChart = React.memo<WaterfallChartProps>(({ currency = "USD", heightClass }) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const { totals, formatTimePeriod, filteredIncomes, filteredExpenses } = useChartData();
    
    const totalIncome = totals.income;
    const totalExpenses = totals.expenses;
    const totalSavings = totals.savings;
    const savingsRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100) : 0;

    const timePeriodText = formatTimePeriod();

    // Calculate detailed statistics
    const incomeCount = filteredIncomes.length;
    const expenseCount = filteredExpenses.length;
    const totalTransactions = incomeCount + expenseCount;
    const averageIncome = incomeCount > 0 ? totalIncome / incomeCount : 0;
    const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;
    const totalFlow = totalIncome + totalExpenses;

    // Create waterfall data with enhanced statistics
    const data: WaterfallData[] = [
        {
            name: "Income",
            value: totalIncome,
            base: 0,
            total: totalIncome,
            type: "income",
            count: incomeCount,
            average: averageIncome,
            percentage: totalFlow > 0 ? (totalIncome / totalFlow) * 100 : 0,
            description: "Total money earned during this period"
        },
        {
            name: "Expenses",
            value: totalExpenses,
            base: totalSavings > 0 ? totalSavings : 0, // Start from savings level
            total: totalIncome,
            type: "expenses",
            count: expenseCount,
            average: averageExpense,
            percentage: totalFlow > 0 ? (totalExpenses / totalFlow) * 100 : 0,
            description: "Total money spent during this period"
        },
        {
            name: "Net Savings",
            value: Math.abs(totalSavings),
            base: 0,
            total: Math.abs(totalSavings),
            type: totalSavings >= 0 ? "savings" : "loss",
            count: totalTransactions,
            average: totalTransactions > 0 ? Math.abs(totalSavings) / totalTransactions : 0,
            percentage: totalIncome > 0 ? Math.abs(savingsRate) : 0,
            description: totalSavings >= 0 ? "Money saved after all expenses" : "Amount by which expenses exceeded income"
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
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-5 min-w-96 max-w-lg min-h-56">
                    <div className="font-bold text-gray-900 mb-3 text-base">{label}</div>
                    
                    {/* Main Amount */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                            <span 
                                className="inline-block w-3 h-3 rounded mr-2" 
                                style={{ backgroundColor: getBarColor(data.type) }}
                            ></span>
                            <span className="font-medium">Amount:</span>
                        </div>
                        <span className="font-bold text-lg">
                            {formatCurrency(data.value, currency)}
                        </span>
                    </div>

                    {/* Description */}
                    <div className="text-sm text-gray-600 mb-3 italic">
                        {data.description}
                    </div>

                    {/* Detailed Statistics */}
                    <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Transactions:</span>
                            <span className="font-medium">{data.count}</span>
                        </div>
                        
                        {data.type !== "savings" && data.type !== "loss" && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Average per Transaction:</span>
                                <span className="font-medium">{formatCurrency(data.average || 0, currency)}</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between">
                            <span className="text-gray-600">
                                {data.type === "savings" || data.type === "loss" ? "Savings Rate:" : "Percentage of Total:"}
                            </span>
                            <span className={`font-medium ${
                                data.type === "savings" ? 'text-green-600' : 
                                data.type === "loss" ? 'text-red-600' : 
                                'text-gray-900'
                            }`}>
                                {data.percentage?.toFixed(1)}%
                            </span>
                        </div>
                    </div>
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

    // Enhanced CSV data with detailed statistics
    const csvData = [
        ['Category', 'Amount', 'Type', 'Transactions', 'Average per Transaction', 'Percentage', 'Description'],
        ['Income', totalIncome.toString(), 'Positive', incomeCount.toString(), averageIncome.toFixed(2), `${(totalFlow > 0 ? (totalIncome / totalFlow) * 100 : 0).toFixed(1)}%`, 'Total money earned during this period'],
        ['Expenses', totalExpenses.toString(), 'Negative', expenseCount.toString(), averageExpense.toFixed(2), `${(totalFlow > 0 ? (totalExpenses / totalFlow) * 100 : 0).toFixed(1)}%`, 'Total money spent during this period'],
        ['Net Savings', totalSavings.toString(), totalSavings >= 0 ? 'Positive' : 'Negative', totalTransactions.toString(), (totalTransactions > 0 ? Math.abs(totalSavings) / totalTransactions : 0).toFixed(2), `${Math.abs(savingsRate).toFixed(1)}%`, totalSavings >= 0 ? 'Money saved after all expenses' : 'Amount by which expenses exceeded income'],
        ['Summary', '', '', '', '', '', ''],
        ['Total Transactions', totalTransactions.toString(), 'Count', '', '', '', 'All income and expense transactions'],
        ['Savings Rate', `${savingsRate.toFixed(1)}%`, 'Percentage', '', '', '', 'Percentage of income that was saved or lost']
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
                className={`${isExpanded ? 'h-[60vh]' : (heightClass ?? 'h-[24rem] sm:h-[32rem]')} w-full`}
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
                        {/* Define texture patterns */}
                        <defs>
                            <pattern id="incomePattern" patternUnits="userSpaceOnUse" width="4" height="4">
                                <rect width="4" height="4" fill="#10b981"/>
                                <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#0d9488" strokeWidth="0.5" opacity="0.3"/>
                            </pattern>
                            <pattern id="expensesPattern" patternUnits="userSpaceOnUse" width="4" height="4">
                                <rect width="4" height="4" fill="#ef4444"/>
                                <circle cx="2" cy="2" r="0.5" fill="#dc2626" opacity="0.4"/>
                                <circle cx="0" cy="0" r="0.3" fill="#dc2626" opacity="0.4"/>
                                <circle cx="4" cy="4" r="0.3" fill="#dc2626" opacity="0.4"/>
                            </pattern>
                            <pattern id="savingsPattern" patternUnits="userSpaceOnUse" width="6" height="6">
                                <rect width="6" height="6" fill="#3b82f6"/>
                                <rect x="0" y="0" width="2" height="2" fill="#2563eb" opacity="0.3"/>
                                <rect x="4" y="4" width="2" height="2" fill="#2563eb" opacity="0.3"/>
                                <rect x="2" y="2" width="2" height="2" fill="#1d4ed8" opacity="0.2"/>
                            </pattern>
                            <pattern id="lossPattern" patternUnits="userSpaceOnUse" width="3" height="3">
                                <rect width="3" height="3" fill="#f59e0b"/>
                                <path d="M 0,3 l 3,-3 M -0.5,0.5 l 1,-1 M 2.5,3.5 l 1,-1" stroke="#d97706" strokeWidth="0.8" opacity="0.4"/>
                            </pattern>
                        </defs>

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
                        
                        {/* Value bars with textured patterns and labels */}
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
                            {data.map((entry, index) => {
                                let fillPattern;
                                switch (entry.type) {
                                    case "income":
                                        fillPattern = "url(#incomePattern)";
                                        break;
                                    case "expenses":
                                        fillPattern = "url(#expensesPattern)";
                                        break;
                                    case "savings":
                                        fillPattern = "url(#savingsPattern)";
                                        break;
                                    case "loss":
                                        fillPattern = "url(#lossPattern)";
                                        break;
                                    default:
                                        fillPattern = getBarColor(entry.type);
                                }
                                return (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={fillPattern}
                                    />
                                );
                            })}
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
                    title={totalTransactions > 0 ? `Financial Waterfall ${timePeriodText} • ${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''}` : `Financial Waterfall ${timePeriodText}`}
                    tooltipText="Visualizes the flow from income to expenses, showing your net savings with detailed statistics including transaction counts, averages, and percentages. Hover over bars for detailed breakdowns."
                />
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg p-3 sm:p-6 max-w-7xl w-full max-h-full overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-semibold">
                                    {totalTransactions > 0 ? `Financial Waterfall ${timePeriodText} • ${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''}` : `Financial Waterfall ${timePeriodText}`}
                                </h2>
                                <p className="text-sm text-gray-500">Visualizes the flow from income to expenses, showing your net savings with detailed statistics</p>
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