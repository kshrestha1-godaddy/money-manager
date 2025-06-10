"use client";

import { useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { formatCurrency } from "../utils/currency";
import { Income, Expense } from "../types/financial";

interface CategoryTrendChartProps {
    data: Income[] | Expense[];
    type: 'income' | 'expense';
    currency?: string;
}

interface MonthlyData {
    month: string;
    amount: number;
    formattedMonth: string;
}

export function CategoryTrendChart({ data, type, currency = "USD" }: CategoryTrendChartProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const chartRef = useRef<HTMLDivElement>(null);

    // Get unique categories from data
    const categories = Array.from(
        new Set(data.map((item: Income | Expense) => item.category?.name).filter(Boolean))
    ).sort();

    // Set default category if none selected
    const currentCategory = selectedCategory || categories[0] || "";

    // Filter data by selected category and last 12 months
    const filterByCategory = (dataArray: (Income | Expense)[], categoryName: string) => {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        return dataArray.filter((item: Income | Expense) => {
            const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
            const matchesCategory = item.category?.name === categoryName;
            const withinTimeRange = itemDate >= twelveMonthsAgo;
            return matchesCategory && withinTimeRange;
        });
    };

    const filteredData = filterByCategory(data, currentCategory);

    // Group data by month
    const monthlyMap = new Map<string, number>();

    filteredData.forEach((item: Income | Expense) => {
        const date = item.date instanceof Date ? item.date : new Date(item.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyMap.get(monthKey) || 0;
        monthlyMap.set(monthKey, current + item.amount);
    });

    // Convert to chart data and sort by date
    const chartData: MonthlyData[] = Array.from(monthlyMap.entries())
        .map(([monthKey, amount]) => {
            const parts = monthKey.split('-');
            const year = parseInt(parts[0] || '0', 10);
            const month = parseInt(parts[1] || '0', 10);
            
            if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
                console.warn(`Invalid date components: year=${year}, month=${month}`);
                return null;
            }
            
            const date = new Date(year, month - 1);
            
            return {
                month: monthKey,
                amount,
                formattedMonth: date.toLocaleDateString('en', { month: 'short', year: 'numeric' })
            };
        })
        .filter((item): item is MonthlyData => item !== null)
        .sort((a, b) => a.month.localeCompare(b.month));

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

    const toggleExpanded = (): void => {
        setIsExpanded(!isExpanded);
    };

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

    // Custom tick component for rotated X-axis labels
    const CustomXAxisTick = (props: any) => {
        const { x, y, payload } = props;
        return (
            <g transform={`translate(${x},${y})`}>
                <text 
                    x={0} 
                    y={0} 
                    dy={16} 
                    textAnchor="end" 
                    fill="#666" 
                    fontSize="12"
                    transform="rotate(-45)"
                >
                    {payload.value}
                </text>
            </g>
        );
    };

    const ChartContent = () => (
        <div>
            {/* Category Selection */}
            <div className="mb-6">
                <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Category
                </label>
                <select
                    id="category-select"
                    value={currentCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                    <p className="text-sm text-gray-600">Total {type === 'income' ? 'Earned' : 'Spent'}</p>
                    <p className={`text-lg font-bold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalAmount, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Monthly Average</p>
                    <p className="text-lg font-bold text-gray-700">
                        {formatCurrency(averageAmount, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Highest Month</p>
                    <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(maxAmount, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Lowest Month</p>
                    <p className={`text-lg font-bold ${type === 'income' ? 'text-blue-600' : 'text-green-600'}`}>
                        {formatCurrency(minAmount, currency)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div 
                ref={chartRef} 
                className={isExpanded ? "h-[72vh] w-5/6 mx-auto" : "h-[32rem] w-5/6 mx-auto"}
                role="img"
                aria-label={`Category trend chart showing monthly ${type} for ${currentCategory} over the last 12 months`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{
                            top: 40,
                            right: 30,
                            left: 40,
                            bottom: 60,
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
                            interval={0}
                            stroke="#666"
                            height={60}
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
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    if (categories.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Category {type === 'income' ? 'Income' : 'Expense'} Trend (Last 12 Months)
                    </h3>
                </div>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    No {type} categories available
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Category {type === 'income' ? 'Income' : 'Expense'} Trend: {currentCategory}
                    </h3>
                    <div className="flex items-center gap-2">
                        {/* Download Chart as PNG Button */}
                        <button
                            onClick={downloadPNG}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title="Download Chart as PNG (fallback to SVG)"
                            aria-label="Download category trend chart as PNG image"
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
                            aria-label="Download category trend chart as SVG image"
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
                            aria-label="Download category trend data as CSV file"
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
                            <h2 className="text-2xl font-semibold">Category Expense Trend: {currentCategory} (Last 12 Months)</h2>
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