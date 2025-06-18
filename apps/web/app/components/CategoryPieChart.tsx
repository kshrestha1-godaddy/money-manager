"use client";

import { useState, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "../utils/currency";
import { Income, Expense } from "../types/financial";

interface CategoryPieChartProps {
    data: Income[] | Expense[];
    type: 'income' | 'expense';
    currency?: string;
    title?: string;
}

interface CategoryData {
    name: string;
    value: number;
    color: string;
}

const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0',
    '#87D068', '#F7A35C', '#434348', '#90ED7D', '#F15C80'
];

export function CategoryPieChart({ data, type, currency = "USD", title }: CategoryPieChartProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);
    
    // Group data by category and sum amounts
    const categoryMap = new Map<string, number>();
    
    data.forEach(item => {
        const categoryName = item.category?.name || 'Unknown Category';
        const currentAmount = categoryMap.get(categoryName) || 0;
        categoryMap.set(categoryName, currentAmount + item.amount);
    });

    // Convert to array and add colors
    const rawChartData: CategoryData[] = Array.from(categoryMap.entries())
        .map(([name, value], index) => ({
            name,
            value,
            color: COLORS[index % COLORS.length] || '#8884d8'
        }))
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
            color: '#9CA3AF' // Gray color for Others category
        });
    }

    const formatTooltip = (value: number, name: string): [string, string] => {
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        
        // For "Others" category, show additional details
        if (name === 'Others' && smallCategories.length > 0) {
            const categoryNames = smallCategories.map(cat => cat.name).join(', ');
            return [
                `${formatCurrency(value, currency)} (${percentage}%) - Includes: ${categoryNames}`,
                name
            ];
        }
        
        return [
            `${formatCurrency(value, currency)} (${percentage}%)`,
            name
        ];
    };

    interface LabelEntry {
        value: number;
    }

    const renderCustomizedLabel = (entry: LabelEntry): string => {
        const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
        return `${percentage}%`;
    };

    const defaultTitle = type === 'income' ? 'Income by Category' : 'Expenses by Category';
    const chartTitle = title || defaultTitle;
    const totalLabel = type === 'income' ? 'Total Income' : 'Total Expenses';

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

    const downloadCSV = (): void => {
        const csvData = [
            ['Category', 'Amount', 'Percentage'],
            ...chartData.map(item => [
                item.name || 'Unknown Category', // Handle empty category names
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
        
        const csvString = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const link = document.createElement('a');
        link.download = `${type}-category-data.csv`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const toggleExpanded = (): void => {
        setIsExpanded(!isExpanded);
    };

    const ChartContent = () => (
        <div>
            <div className="flex justify-end items-center mb-4">
                <div className="text-right">
                    <p className="text-sm text-gray-600">{totalLabel}</p>
                    <p className={`text-lg font-semibold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(total, currency)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pie Chart */}
                <div 
                    ref={chartRef} 
                    className={`${isExpanded ? "h-[45rem]" : "h-[30rem]"} lg:col-span-2`}
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
                                outerRadius={150}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={formatTooltip} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend and breakdown */}
                <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Category Breakdown</h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {chartData.map((entry, index) => {
                            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
                            const isOthers = entry.name === 'Others';
                            
                            return (
                                <div key={entry.name}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: entry.color }}
                                            />
                                            <span className="text-sm text-gray-700 truncate">{entry.name}</span>
                                            {isOthers && smallCategories.length > 0 && (
                                                <span className="text-xs text-gray-500">
                                                    ({smallCategories.length} categories)
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatCurrency(entry.value, currency)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {percentage}%
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Show breakdown for Others category */}
                                    {isOthers && smallCategories.length > 0 && (
                                        <div className="ml-5 mt-1 space-y-1">
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
            <div className="bg-white rounded-lg shadow p-6" data-chart-type={type === 'expense' ? 'expense-pie' : 'income-pie'}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{chartTitle}</h3>
                    <div className="flex items-center gap-2">
                        {/* Download Chart as PNG Button */}
                        <button
                            onClick={downloadPNG}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title="Download Chart as PNG (fallback to SVG)"
                            aria-label="Download pie chart as PNG image"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>
                        
                        {/* Download Chart as SVG Button */}
                        <button
                            onClick={downloadSVG}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title="Download Chart as SVG"
                            aria-label="Download pie chart as SVG image"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </button>
                        
                        {/* Download Data Button */}
                        <button
                            onClick={downloadCSV}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title="Download Data as CSV"
                            aria-label="Download category data as CSV file"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>
                        
                        {/* Expand/Collapse Button */}
                        <button
                            onClick={toggleExpanded}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title={isExpanded ? "Exit Fullscreen" : "Expand to Fullscreen"}
                            aria-label={isExpanded ? "Exit fullscreen view" : "Enter fullscreen view"}
                        >
                            {isExpanded ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-7xl w-full max-h-full overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold">{chartTitle}</h2>
                            <button
                                onClick={toggleExpanded}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
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