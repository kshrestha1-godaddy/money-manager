"use client";

import { useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList, TooltipProps } from "recharts";
import { formatCurrency } from "../utils/currency";
import { useChartExpansion } from "../utils/chartUtils";
import { ChartControls } from "./ChartControls";

interface WaterfallChartProps {
    totalIncome: number;
    totalExpenses: number;
    currency?: string;
    startDate?: string;
    endDate?: string;
}

interface WaterfallData {
    name: string;
    value: number;
    base: number;
    total: number;
    type: "income" | "expenses" | "savings" | "loss";
}

export function WaterfallChart({ totalIncome, totalExpenses, currency = "USD", startDate, endDate }: WaterfallChartProps) {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const totalSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100) : 0;

    // Generate dynamic time period text
    const getTimePeriodText = (): string => {
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
        }
        return "";
    };

    const timePeriodText = getTimePeriodText();

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

    const formatTooltip = (value: number, name: string, props: any) => {
        const { payload } = props;
        if (name === "base") return null; // Don't show base in tooltip
        
        if (payload.name === "Expenses") {
            return [formatCurrency(payload.value, currency), "Expenses"];
        } else if (payload.name === "Net Savings") {
            const label = payload.type === "savings" ? "Net Savings" : "Net Loss";
            return [formatCurrency(payload.value, currency), label];
        }
        return [formatCurrency(value, currency), payload.name];
    };

    const formatYAxisTick = (value: number): string => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return formatCurrency(value, currency);
    };

    // Prepare CSV data for chart controls
    const csvData = [
        ['Category', 'Amount', 'Type'],
        ['Income', totalIncome.toString(), 'Positive'],
        ['Expenses', totalExpenses.toString(), 'Negative'],
        ['Net Savings', totalSavings.toString(), totalSavings >= 0 ? 'Positive' : 'Negative'],
        ['Savings Rate', `${savingsRate.toFixed(1)}%`, 'Percentage']
    ];

    return (
        <div 
            className={`bg-white rounded-lg shadow p-3 sm:p-6 ${isExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}
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
                title={`Financial Waterfall: Income → Expenses → Savings ${timePeriodText}`}
                subtitle="Visualizes the flow from income to expenses, showing your net savings"
            />

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
                    <p className="text-xs text-gray-600">Savings Rate</p>
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
                        <Tooltip formatter={formatTooltip} />
                        
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
} 