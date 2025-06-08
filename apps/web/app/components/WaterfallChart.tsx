"use client";

import { useState, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList, TooltipProps } from "recharts";
import { formatCurrency } from "../utils/currency";

interface WaterfallChartProps {
    totalIncome: number;
    totalExpenses: number;
    currency?: string;
}

interface WaterfallData {
    name: string;
    value: number;
    base: number;
    total: number;
    type: "income" | "expenses" | "savings" | "loss";
}

export function WaterfallChart({ totalIncome, totalExpenses, currency = "USD" }: WaterfallChartProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);
    const totalSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100) : 0;

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

    // Download chart as PNG
    const downloadChart = (): void => {
        if (chartRef.current) {
            const svgElement = chartRef.current.querySelector('svg');
            if (svgElement) {
                try {
                    // Clone the SVG to avoid modifying the original
                    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
                    
                    // Get computed styles and dimensions
                    const bbox = svgElement.getBoundingClientRect();
                    const width = bbox.width || 800;
                    const height = bbox.height || 600;
                    
                    // Set explicit dimensions on cloned SVG
                    clonedSvg.setAttribute('width', width.toString());
                    clonedSvg.setAttribute('height', height.toString());
                    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    
                    // Add white background
                    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('width', '100%');
                    rect.setAttribute('height', '100%');
                    rect.setAttribute('fill', 'white');
                    clonedSvg.insertBefore(rect, clonedSvg.firstChild);
                    
                    // Convert to string
                    const svgData = new XMLSerializer().serializeToString(clonedSvg);
                    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                    const svgUrl = URL.createObjectURL(svgBlob);
                    
                    // Create canvas and image
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    
                    canvas.width = width * 2; // Higher resolution
                    canvas.height = height * 2;
                    
                    img.onload = () => {
                        if (ctx) {
                            // Scale for higher quality
                            ctx.scale(2, 2);
                            ctx.drawImage(img, 0, 0);
                            
                            // Convert to PNG and download
                            canvas.toBlob((blob) => {
                                if (blob) {
                                    const url = URL.createObjectURL(blob);
                                    const downloadLink = document.createElement('a');
                                    downloadLink.download = 'waterfall-chart.png';
                                    downloadLink.href = url;
                                    document.body.appendChild(downloadLink);
                                    downloadLink.click();
                                    document.body.removeChild(downloadLink);
                                    URL.revokeObjectURL(url);
                                }
                            }, 'image/png', 1.0);
                        }
                        URL.revokeObjectURL(svgUrl);
                    };
                    
                    img.onerror = () => {
                        console.error('Failed to load SVG for PNG conversion');
                        URL.revokeObjectURL(svgUrl);
                        // Fallback: download as SVG
                        downloadAsSvg();
                    };
                    
                    img.src = svgUrl;
                    
                } catch (error) {
                    console.error('Error converting to PNG:', error);
                    // Fallback: download as SVG
                    downloadAsSvg();
                }
            }
        }
    };

    // Fallback: Download as SVG
    const downloadAsSvg = (): void => {
        if (chartRef.current) {
            const svgElement = chartRef.current.querySelector('svg');
            if (svgElement) {
                const svgData = new XMLSerializer().serializeToString(svgElement);
                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.download = 'waterfall-chart.svg';
                downloadLink.href = url;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);
            }
        }
    };

    // Download data as CSV
    const downloadData = (): void => {
        const csvData = [
            ['Category', 'Amount', 'Type'],
            ['Income', totalIncome.toString(), 'Positive'],
            ['Expenses', totalExpenses.toString(), 'Negative'],
            ['Net Savings', totalSavings.toString(), totalSavings >= 0 ? 'Positive' : 'Negative'],
            ['Savings Rate', `${savingsRate.toFixed(1)}%`, 'Percentage']
        ];
        
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.download = 'waterfall-data.csv';
        downloadLink.href = url;
        downloadLink.click();
        window.URL.revokeObjectURL(url);
    };

    // Toggle expanded view
    const toggleExpanded = (): void => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div 
            className={`bg-white rounded-lg shadow p-6 ${isExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}
            role="region"
            aria-label="Financial Waterfall Chart"
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    Financial Waterfall: Income → Expenses → Savings
                </h3>
                <div className="flex items-center gap-2">
                    {/* Download Chart as PNG Button */}
                    <button
                        onClick={downloadChart}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                        title="Download Chart as PNG (fallback to SVG)"
                        aria-label="Download chart as PNG image"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </button>
                    
                    {/* Download Chart as SVG Button */}
                    <button
                        onClick={downloadAsSvg}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                        title="Download Chart as SVG"
                        aria-label="Download chart as SVG image"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                    </button>
                    
                    {/* Download Data Button */}
                    <button
                        onClick={downloadData}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                        title="Download Data as CSV"
                        aria-label="Download chart data as CSV file"
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

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                    <p className="text-sm text-gray-600">Total Income</p>
                    <p className="text-xl font-bold text-green-600">
                        {formatCurrency(totalIncome, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-xl font-bold text-red-600">
                        -{formatCurrency(totalExpenses, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Net Savings</p>
                    <p className={`text-xl font-bold ${totalSavings >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {totalSavings >= 0 ? '+' : ''}{formatCurrency(totalSavings, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Savings Rate</p>
                    <p className={`text-xl font-bold ${savingsRate >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {savingsRate.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div 
                ref={chartRef}
                className={`${isExpanded ? 'h-[60vh] w-full' : 'h-[32rem] w-5/6'} mx-auto`}
                role="img"
                aria-label={`Waterfall chart showing income of ${formatCurrency(totalIncome, currency)}, expenses of ${formatCurrency(totalExpenses, currency)}, and net savings of ${formatCurrency(totalSavings, currency)}`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 30,
                            right: 30,
                            left: 40,
                            bottom: 20,
                        }}
                        barCategoryGap="20%"
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
                        <ReferenceLine y={totalIncome} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: "Total Income", position: "top" }} />
                        {totalSavings > 0 && (
                            <ReferenceLine y={totalSavings} stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={2} label={{ value: "Net Savings", position: "top" }} />
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
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span>Losses</span>
                </div>
            </div>
        </div>
    );
} 