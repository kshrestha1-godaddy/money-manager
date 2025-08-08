"use client";

import React, { useState, useRef, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatCurrency } from "../../../utils/currency";
import { Income, Expense } from "../../../types/financial";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";
import { useChartExpansion } from "../../../utils/chartUtils";
import { useChartAnimationState } from "../../../hooks/useChartAnimationContext";

interface CategoryTrendChartProps {
    type: 'income' | 'expense';
    currency?: string;
}

interface MonthlyData {
    month: string;
    amount: number;
    formattedMonth: string;
}

export const CategoryTrendChart = React.memo<CategoryTrendChartProps>(({ type, currency = "USD" }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const { getCategoryList, getMonthlyDataForCategory, formatTimePeriod } = useChartData();
    
    // Animation control to prevent restart on re-renders
    const chartId = `category-trend-${type}`;
    const { animationDuration, isAnimationActive } = useChartAnimationState(chartId);

    // Get unique categories from data
    const categories = getCategoryList(type);

    // randomly select a category
    const currentCategory = selectedCategory || categories[Math.floor(Math.random() * categories.length)] || "";

    const timePeriodText = formatTimePeriod();

    // Get monthly data for the selected category
    const monthlyData = getMonthlyDataForCategory(currentCategory, type);

    // Convert monthly data to chart format
    const chartData: MonthlyData[] = monthlyData.map(month => ({
        month: month.monthKey,
        amount: type === 'income' ? month.income : month.expenses,
        formattedMonth: month.formattedMonth
    }));

    // Calculate statistics
    const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);
    const averageAmount = chartData.length > 0 ? totalAmount / chartData.length : 0;
    const maxAmount = chartData.length > 0 ? Math.max(...chartData.map(item => item.amount)) : 0;
    const minAmount = chartData.length > 0 ? Math.min(...chartData.map(item => item.amount)) : 0;

    // Chart domain and reference lines
    const yAxisMax = Math.ceil(maxAmount * 1.2);
    const yAxisMin = Math.floor(minAmount * 0.8);
    
    const referenceLines = [
        { value: averageAmount, label: "Average", color: "#6b7280" },
        { value: yAxisMax * 0.25, label: "", color: "#e5e7eb" },
        { value: yAxisMax * 0.5, label: "", color: "#e5e7eb" },
        { value: yAxisMax * 0.75, label: "", color: "#e5e7eb" }
    ];

    // Download functions
    const downloadPNG = async (): Promise<void> => {
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

            img.onload = () => {
                canvas.width = img.width * 2;
                canvas.height = img.height * 2;
                ctx.scale(2, 2);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const link = document.createElement('a');
                        link.download = `${currentCategory}-trend-chart.png`;
                        link.href = URL.createObjectURL(blob);
                        link.click();
                        URL.revokeObjectURL(link.href);
                    }
                }, 'image/png');
            };

            img.onerror = () => {
                console.error('Failed to load SVG image');
                URL.revokeObjectURL(url);
                downloadSVG();
            };

            img.src = url;
        } catch (error) {
            console.error('Error downloading PNG:', error);
            downloadSVG();
        }
    };

    const downloadSVG = (): void => {
        const element = chartRef.current;
        if (!element) return;

        const svgElement = element.querySelector('svg');
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const link = document.createElement('a');
        link.download = `${currentCategory}-trend-chart.svg`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const downloadCSV = (): void => {
        const csvData = [
            ['Month', 'Amount'],
            ...chartData.map(item => [
                item.formattedMonth,
                item.amount.toString()
            ])
        ];
        
        const csvString = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const link = document.createElement('a');
        link.download = `${currentCategory}-trend-data.csv`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    };

    // Prepare CSV data for chart controls
    const csvData = [
        ['Month', 'Amount'],
        ...chartData.map(item => [
            item.formattedMonth,
            item.amount.toString()
        ])
    ];

    const chartTitle = `${type === 'income' ? 'Income' : 'Expense'} Category Trends ${timePeriodText}`;
    const tooltipText = `Monthly trend for ${currentCategory} category over time`;

    const formatYAxisTick = (value: number): string => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return formatCurrency(value, currency).replace(/\$/, '');
    };

    interface TooltipProps {
        active?: boolean;
        payload?: Array<{
            value: number;
            color: string;
        }>;
        label?: string;
    }

    const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-gray-300 rounded p-3 shadow-lg">
                    <p className="text-gray-900 font-medium mb-2">{label || ''}</p>
                    <p className="text-sm" style={{ color: payload[0]?.color }}>
                        {currentCategory}: {formatCurrency(payload[0]?.value || 0, currency)}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Custom tick component for horizontal X-axis labels
    const CustomXAxisTick = (props: any) => {
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
                    style={{ fontWeight: isExpanded ? "normal" : "normal" }}
                >
                    {payload.value}
                </text>
            </g>
        );
    };

    const ChartContent = () => (
        <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center sm:text-left">
                    <p className="text-sm text-gray-600">Total {type === 'income' ? 'Earned' : 'Spent'}</p>
                    <p className={`text-base sm:text-lg font-bold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalAmount, currency)}
                    </p>
                </div>
                <div className="text-center sm:text-left">
                    <p className="text-sm text-gray-600">Monthly Average</p>
                    <p className="text-base sm:text-lg font-bold text-gray-700">
                        {formatCurrency(averageAmount, currency)}
                    </p>
                </div>
                <div className="text-center sm:text-left">
                    <p className="text-sm text-gray-600">Highest Month</p>
                    <p className="text-base sm:text-lg font-bold text-orange-600">
                        {formatCurrency(maxAmount, currency)}
                    </p>
                </div>
                <div className="text-center sm:text-left">
                    <p className="text-sm text-gray-600">Lowest Month</p>
                    <p className={`text-base sm:text-lg font-bold ${type === 'income' ? 'text-blue-600' : 'text-green-600'}`}>
                        {formatCurrency(minAmount, currency)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div 
                ref={chartRef} 
                className={isExpanded ? "h-[50vh] w-full" : "h-[28rem] w-full"}
                role="img"
                aria-label={`Category trend chart showing monthly ${type} for ${currentCategory} ${timePeriodText}`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{
                            top: 30,
                            right: 20,
                            left: 20,
                            bottom: 50,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        
                        {/* Reference lines */}
                        {referenceLines.map((refLine, index) => (
                            <ReferenceLine 
                                key={index}
                                y={refLine.value} 
                                stroke={refLine.color} 
                                strokeDasharray={refLine.label ? "5 5" : "2 2"}
                                strokeWidth={refLine.label ? 2 : 1}
                                label={refLine.label ? { value: refLine.label, position: "top" } : undefined}
                            />
                        ))}
                        
                        <XAxis 
                            dataKey="formattedMonth" 
                            tick={<CustomXAxisTick />}
                            interval={isExpanded ? 0 : "preserveStartEnd"}
                            stroke="#666"
                            height={40}
                        />
                        <YAxis 
                            tickFormatter={formatYAxisTick}
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                            domain={[yAxisMin, yAxisMax]}
                            tickCount={8}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        
                        <Line 
                            type="monotone" 
                            dataKey="amount" 
                            stroke={type === 'income' ? "#22c55e" : "#ef4444"} 
                            strokeWidth={3}
                            dot={{ fill: type === 'income' ? "#22c55e" : "#ef4444", strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, fill: type === 'income' ? "#16a34a" : "#dc2626" }}
                            connectNulls={false}
                            animationDuration={animationDuration}
                            isAnimationActive={isAnimationActive}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    // Return the component
    if (categories.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6" data-chart-type={`${type}-category-trend`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {chartTitle}
                    </h3>
                </div>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    No categories available
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow p-3 sm:p-6" data-chart-type={`${type}-category-trend`}>
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName={`${currentCategory}-trend-chart`}
                    csvData={csvData}
                    csvFileName={`${currentCategory}-trend-data`}
                    title={chartTitle}
                    tooltipText={tooltipText}
                />
                
                {/* Category Selector */}
                <div className="mb-4">
                    <label htmlFor="category-selector" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Category:
                    </label>
                    <select
                        id="category-selector"
                        value={currentCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>
                
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-[95%] w-full max-h-[95%] overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-semibold">{chartTitle}</h2>
                                <p className="text-sm text-gray-500">{tooltipText}</p>
                            </div>
                            <button
                                onClick={toggleExpanded}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base"
                            >
                                Close
                            </button>
                        </div>
                        
                        {/* Category Selector */}
                        <div className="mb-4">
                            <label htmlFor="category-selector-fullscreen" className="block text-sm font-medium text-gray-700 mb-1">
                                Select Category:
                            </label>
                            <select
                                id="category-selector-fullscreen"
                                value={currentCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <ChartContent />
                    </div>
                </div>
            )}
        </>
    );
});

CategoryTrendChart.displayName = 'CategoryTrendChart'; 