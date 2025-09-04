"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "../../../utils/currency";
import { Income, Expense } from "../../../types/financial";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";
import { useChartExpansion } from "../../../utils/chartUtils";

interface CategoryPieChartProps {
    type: 'income' | 'expense';
    currency?: string;
    title?: string;
    heightClass?: string;
}

interface CategoryData {
    name: string;
    value: number;
    color: string;
    solidColor?: string;
}

// Color palette with bright pie colors and dark legend colors
const COLOR_PALETTE = [
    { pie: '#3b82f6', legend: '#1e3a8a' },    // bright blue / dark blue
    { pie: '#ef4444', legend: '#dc2626' },    // bright red / dark red
    { pie: '#10b981', legend: '#059669' },    // bright emerald / dark emerald
    { pie: '#f97316', legend: '#ea580c' },    // bright orange / dark orange
    { pie: '#a16207', legend: '#7c2d12' },    // bright amber / dark brown
    { pie: '#ec4899', legend: '#be123c' },    // bright pink / dark rose
    { pie: '#14b8a6', legend: '#0f766e' },    // bright teal / dark teal
    { pie: '#eab308', legend: '#a16207' },    // bright yellow / dark amber
    { pie: '#8b5cf6', legend: '#4c1d95' },    // bright violet / dark violet
    { pie: '#f43f5e', legend: '#991b1b' },    // bright rose / dark red
    { pie: '#22c55e', legend: '#065f46' },    // bright green / dark green
    { pie: '#f59e0b', legend: '#92400e' }     // bright amber / dark amber
];

export const CategoryPieChart = React.memo<CategoryPieChartProps>(({ type, currency = "USD", title, heightClass }) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const { categoryData, formatTimePeriod } = useChartData();
    
    // Memoize all data processing for better performance
    const { chartData, rawChartData, total, smallCategories } = useMemo(() => {
        // Create category map based on type
        const categoryMap = new Map<string, number>();
        
        Object.entries(categoryData).forEach(([categoryName, data]) => {
            const amount = type === 'income' ? data.income : data.expenses;
            if (amount > 0) {
                categoryMap.set(categoryName, amount);
            }
        });

        // Convert to array and add colors
        const rawChartData: CategoryData[] = Array.from(categoryMap.entries())
            .map(([name, value], index) => {
                const colorConfig = COLOR_PALETTE[index % COLOR_PALETTE.length];
                return {
                    name,
                    value,
                    color: colorConfig?.pie || '#8884d8',
                    solidColor: colorConfig?.legend || '#6b7280'
                };
            })
            .sort((a, b) => b.value - a.value); // Sort by value descending

        const total = rawChartData.reduce((sum, item) => sum + item.value, 0);

        // Filter categories >= 2.5% and group smaller ones as "Others"
        const significantCategories = rawChartData.filter(item => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return percentage >= 2.5;
        });

        const smallCategories = rawChartData.filter(item => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return percentage < 2.5;
        });

        // Create "Others" category if there are small categories
        const chartData: CategoryData[] = [...significantCategories];
        if (smallCategories.length > 0) {
            const othersValue = smallCategories.reduce((sum, item) => sum + item.value, 0);
            chartData.push({
                name: 'Others',
                value: othersValue,
                color: '#94a3b8', // Light gray for Others category pie
                solidColor: '#64748b' // Dark gray for Others category legend
            });
        }

        return { chartData, rawChartData, total, smallCategories };
    }, [categoryData, type]);

    // Memoize callback functions for better performance
    const formatTooltip = useCallback((value: number, name: string): [string, string] => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        
        // For "Others" category, show additional details
        if (name === 'Others' && smallCategories.length > 0) {
            const categoryNames = smallCategories.map(cat => cat.name).join(', ');
            return [
                `${formatCurrency(value, currency)} [${percentage}%] - Includes: ${categoryNames}`,
                name
            ];
        }
        
        return [
            `${formatCurrency(value, currency)} [${percentage}%]`,
            name
        ];
    }, [total, smallCategories, currency]);

    interface LabelEntry {
        value: number;
    }

    const renderCustomizedLabel = useCallback((entry: any) => {
        const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
        
        // Find the corresponding chart data to get the solid color
        const chartDataEntry = chartData.find(item => item.name === entry.name);
        const labelColor = chartDataEntry?.solidColor || entry.fill || "#374151";
        
        // Calculate positioning for elbow-shaped connector lines
        const RADIAN = Math.PI / 180;
        const radius = entry.outerRadius + 15; // First segment of line
        const x1 = entry.cx + radius * Math.cos(-entry.midAngle * RADIAN);
        const y1 = entry.cy + radius * Math.sin(-entry.midAngle * RADIAN);
        
        // Horizontal line segment
        const horizontalLength = 20;
        const isRightSide = x1 > entry.cx;
        const x2 = isRightSide ? x1 + horizontalLength : x1 - horizontalLength;
        const y2 = y1;
        
        // Text position
        const textX = isRightSide ? x2 + 5 : x2 - 5;
        const textY = y2;
        
        return (
            <g>
                {/* Elbow-shaped connector line */}
                <polyline
                    points={`${entry.cx + entry.outerRadius * Math.cos(-entry.midAngle * RADIAN)},${entry.cy + entry.outerRadius * Math.sin(-entry.midAngle * RADIAN)} ${x1},${y1} ${x2},${y2}`}
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    fill="none"
                />
                {/* Label text */}
                <text 
                    x={textX} 
                    y={textY} 
                    fill={labelColor} 
                    textAnchor={isRightSide ? 'start' : 'end'} 
                    dominantBaseline="central"
                    fontSize="10"
                    fontWeight="500"
                >
                    {`${entry.name} [${percentage}%]`}
                </text>
            </g>
        );
    }, [total, chartData]);

    // Memoize computed text values
    const timePeriodText = useMemo(() => formatTimePeriod(), [formatTimePeriod]);
    const defaultTitle = type === 'income' ? 'Income by Category' : 'Expenses by Category';
    const chartTitle = `${title || defaultTitle} ${timePeriodText}`;
    const totalLabel = type === 'income' ? 'Total Income' : 'Total Expenses';
    const tooltipText = type === 'income' ? 'Breakdown of your income sources by category' : 'Analysis of your spending patterns by category';

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
                        link.download = `${type}-category-chart.png`;
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
        link.download = `${type}-category-chart.svg`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    };



    // Memoize CSV data preparation to avoid duplication and improve performance
    const csvDataForControls = useMemo(() => {
        const csvData = [
            ['Category', 'Amount', 'Percentage'],
            ...chartData.map(item => [
                item.name || 'Unknown Category',
                item.value.toString(),
                total > 0 ? ((item.value / total) * 100).toFixed(1) + '%' : '0.0%'
            ])
        ];

        // Add detailed breakdown if "Others" category exists
        if (smallCategories.length > 0) {
            csvData.push(['', '', '']); // Empty row for separation
            csvData.push(['--- Detailed Breakdown ---', '', '']);
            csvData.push(['All Categories (including < 2.5%)', '', '']);
            rawChartData.forEach(item => {
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) + '%' : '0.0%';
                csvData.push([item.name, item.value.toString(), percentage]);
            });
        }

        return csvData;
    }, [chartData, total, smallCategories, rawChartData]);

    const ChartContent = () => (
        <div className="px-2 py-6">
            <div className="flex justify-start items-center mb-3 sm:mb-4">
                <div className="text-left">
                    <p className="text-xs sm:text-sm text-gray-600">{totalLabel}</p>
                    <p className={`text-base sm:text-lg font-semibold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(total, currency)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {/* Pie Chart */}
                <div 
                    ref={chartRef} 
                    className={`w-full max-w-5xl mx-auto ${isExpanded ? "h-[45rem]" : (heightClass ?? "h-[28rem] sm:h-[32rem]")} lg:col-span-2`}
                    role="img"
                    aria-label={`${type === 'income' ? 'Income' : 'Expense'} categories pie chart showing distribution of ${formatCurrency(total, currency)} across different categories`}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>

                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={isExpanded ? 200 : 160}
                                innerRadius={isExpanded ? 70 : 90}
                                fill="#8884d8"
                                dataKey="value"
                                paddingAngle={0.1}
                                cornerRadius={8}
                                stroke="#ffffff"
                                strokeWidth={3}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.color}
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={formatTooltip}
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                    fontSize: '11px',
                                    maxWidth: '300px',
                                    wordWrap: 'break-word',
                                    whiteSpace: 'normal',
                                    lineHeight: '1.5',
                                    padding: '12px'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend and breakdown */}
                <div className="space-y-2 sm:space-y-3 pr-10">
                    <h4 className="text-sm sm:text-base font-medium text-gray-900">Category Breakdown</h4>
                    <div className="space-y-1 sm:space-y-2 max-h-60 sm:max-h-80 overflow-y-auto">
                        {chartData.map((entry, index) => {
                            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
                            const isOthers = entry.name === 'Others';
                            
                            return (
                                <div key={entry.name}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            <div
                                                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 border border-white"
                                                style={{ 
                                                    backgroundColor: entry.color,
                                                    boxShadow: `0 1px 3px rgba(0, 0, 0, 0.1)`
                                                }}
                                            />
                                            <span className="text-sm sm:text-base text-gray-700 truncate font-medium">{entry.name}</span>
                                            {isOthers && smallCategories.length > 0 && (
                                                <span className="text-xs text-gray-500">
                                                    ({smallCategories.length})
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-sm sm:text-base font-medium text-gray-900">
                                                {formatCurrency(entry.value, currency)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {percentage}%
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Show breakdown for Others category */}
                                    {isOthers && smallCategories.length > 0 && (
                                        <div className="ml-4 sm:ml-5 mt-1 space-y-1">
                                            {smallCategories.map((smallCat) => {
                                                const smallPercentage = total > 0 ? ((smallCat.value / total) * 100).toFixed(1) : '0.0';
                                                return (
                                                    <div key={smallCat.name} className="flex items-center justify-between text-xs text-gray-500">
                                                        <span className="truncate">• {smallCat.name}</span>
                                                        <span className="flex-shrink-0 ml-2">
                                                            {formatCurrency(smallCat.value, currency)} ({smallPercentage}%)
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6" data-chart-type={type === 'expense' ? 'expense-pie' : 'income-pie'}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{chartTitle}</h3>
                </div>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    No data available
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6" data-chart-type={type === 'expense' ? 'expense-pie' : 'income-pie'}>
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName={`${type}-category-chart`}
                    csvData={csvDataForControls}
                    csvFileName={`${type}-category-data`}
                    title={chartTitle}
                    tooltipText={tooltipText}
                />
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg p-3 sm:p-6 max-w-7xl w-full max-h-full overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-semibold truncate">{chartTitle}</h2>
                                <p className="text-sm text-gray-500">{tooltipText}</p>
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

CategoryPieChart.displayName = 'CategoryPieChart';  