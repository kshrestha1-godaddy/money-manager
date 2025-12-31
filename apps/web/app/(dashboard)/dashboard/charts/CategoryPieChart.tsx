"use client";

import React, { useId, useState, useRef, useMemo, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
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
    count: number;
    average: number;
    minAmount: number;
    maxAmount: number;
    dateRange: string;
}

interface CategoryStats {
    totalAmount: number;
    count: number;
    minAmount: number;
    maxAmount: number;
    earliestDate: Date;
    latestDate: Date;
    amounts: number[];
}

// Color palette with bright pie colors and dark legend colors
const COLOR_PALETTE = [
    { pie: '#3b82f6', legend: '#3b82f6' },    // bright blue / dark blue
    { pie: '#ef4444', legend: '#ef4444' },    // bright red / dark red
    { pie: '#10b981', legend: '#10b981' },    // bright emerald / dark emerald
    { pie: '#f97316', legend: '#f97316' },    // bright orange / dark orange
    { pie: '#a16207', legend: '#a16207' },    // bright amber / dark brown
    { pie: '#ec4899', legend: '#ec4899' },    // bright pink / dark rose
    { pie: '#14b8a6', legend: '#14b8a6' },    // bright teal / dark teal
    { pie: '#eab308', legend: '#eab308' },    // bright yellow / dark amber
    { pie: '#8b5cf6', legend: '#8b5cf6' },    // bright violet / dark violet
    { pie: '#f43f5e', legend: '#f43f5e' },    // bright rose / dark red
    { pie: '#22c55e', legend: '#22c55e' },    // bright green / dark green
    { pie: '#f59e0b', legend: '#f59e0b' }     // bright amber / dark amber
];

function mulberry32(seed: number) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
    const random = mulberry32(seed);
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        const a = result[i];
        const b = result[j];
        if (a === undefined || b === undefined) continue;
        result[i] = b;
        result[j] = a;
    }
    return result;
}

export const CategoryPieChart = React.memo<CategoryPieChartProps>(({ type, currency = "USD", title, heightClass }) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const { categoryData, formatTimePeriod, filteredIncomes, filteredExpenses } = useChartData();
    const patternPrefix = useId().replace(/:/g, "");
    const paletteSeedRef = useRef<number>(Math.floor(Math.random() * 2 ** 31));
    
    // Memoize all data processing for better performance
    const { chartData, rawChartData, total, smallCategories } = useMemo(() => {
        // Get the appropriate transaction data based on type
        const transactions = type === 'income' ? filteredIncomes : filteredExpenses;
        const shuffledPalette = shuffleWithSeed(COLOR_PALETTE, paletteSeedRef.current);
        
        // Create detailed category statistics map
        const categoryStatsMap = new Map<string, CategoryStats>();
        
        transactions.forEach(transaction => {
            const categoryName = transaction.category?.name || 'Unknown Category';
            const transactionDate = new Date(transaction.date);
            // Convert transaction amount to display currency for consistent totals
            const amount = convertForDisplaySync(transaction.amount, transaction.currency, currency);
            
            const existingStats = categoryStatsMap.get(categoryName);
            
            if (!existingStats) {
                categoryStatsMap.set(categoryName, {
                    totalAmount: amount,
                    count: 1,
                    minAmount: amount,
                    maxAmount: amount,
                    earliestDate: transactionDate,
                    latestDate: transactionDate,
                    amounts: [amount]
                });
            } else {
                existingStats.totalAmount += amount;
                existingStats.count += 1;
                existingStats.minAmount = Math.min(existingStats.minAmount, amount);
                existingStats.maxAmount = Math.max(existingStats.maxAmount, amount);
                existingStats.earliestDate = transactionDate < existingStats.earliestDate ? transactionDate : existingStats.earliestDate;
                existingStats.latestDate = transactionDate > existingStats.latestDate ? transactionDate : existingStats.latestDate;
                existingStats.amounts.push(amount);
            }
        });

        // Helper function to format date range
        const formatDateRange = (earliest: Date, latest: Date): string => {
            const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
            if (earliest.getTime() === latest.getTime()) {
                return earliest.toLocaleDateString('en', options);
            }
            return `${earliest.toLocaleDateString('en', options)} - ${latest.toLocaleDateString('en', options)}`;
        };

        // Convert to array and add colors with detailed statistics
        const rawChartData: CategoryData[] = Array.from(categoryStatsMap.entries())
            .map(([name, stats], index) => {
                const colorConfig = shuffledPalette[index % shuffledPalette.length];
                const average = stats.totalAmount / stats.count;
                const dateRange = formatDateRange(stats.earliestDate, stats.latestDate);
                
                return {
                    name,
                    value: stats.totalAmount,
                    color: colorConfig?.pie || '#8884d8',
                    solidColor: colorConfig?.legend || '#6b7280',
                    count: stats.count,
                    average: average,
                    minAmount: stats.minAmount,
                    maxAmount: stats.maxAmount,
                    dateRange: dateRange
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
            const othersCount = smallCategories.reduce((sum, item) => sum + item.count, 0);
            const othersAverage = othersCount > 0 ? othersValue / othersCount : 0;
            const othersMin = Math.min(...smallCategories.map(item => item.minAmount));
            const othersMax = Math.max(...smallCategories.map(item => item.maxAmount));
            
            // Get date range for Others category
            const allDates = smallCategories.flatMap(item => {
                if (item.dateRange.includes(' - ')) {
                    const parts = item.dateRange.split(' - ');
                    const start = parts[0] ? new Date(parts[0] + ' 1, 2000') : new Date();
                    const end = parts[1] ? new Date(parts[1] + ' 1, 2000') : new Date();
                    return [start, end];
                } else {
                    const date = new Date(item.dateRange + ' 1, 2000');
                    return [date, date];
                }
            });
            const validDates = allDates.filter(d => d instanceof Date && !isNaN(d.getTime()));
            const othersEarliest = validDates.length > 0 ? new Date(Math.min(...validDates.map(d => d.getTime()))) : new Date();
            const othersLatest = validDates.length > 0 ? new Date(Math.max(...validDates.map(d => d.getTime()))) : new Date();
            const othersDateRange = formatDateRange(othersEarliest, othersLatest);
            
            chartData.push({
                name: 'Others',
                value: othersValue,
                color: '#94a3b8', // Light gray for Others category pie
                solidColor: '#64748b', // Dark gray for Others category legend
                count: othersCount,
                average: othersAverage,
                minAmount: othersMin,
                maxAmount: othersMax,
                dateRange: othersDateRange
            });
        }

        return { chartData, rawChartData, total, smallCategories };
    }, [filteredIncomes, filteredExpenses, type]);

    // Custom tooltip component for better formatting
    const CustomTooltip = useCallback(({ active, payload }: any) => {
        if (!active || !payload || !payload.length) {
            return null;
        }

        const data = payload[0];
        const name = data.name;
        const value = data.value;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
        
        // Find the category data to get detailed statistics
        const categoryItem = chartData.find(item => item.name === name);
        
        if (!categoryItem) {
            return (
                <div style={{
                    padding: '16px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    background: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid #e5e7eb',
                    minWidth: '280px',
                    maxWidth: '400px'
                }}>
                    <div style={{
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#111827',
                        fontSize: '16px'
                    }}>
                        {name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {formatCurrency(value, currency)} [{percentage}%]
                    </div>
                </div>
            );
        }
        
        // Format detailed statistics
        const formattedTotal = formatCurrency(categoryItem.value, currency);
        const formattedAverage = formatCurrency(categoryItem.average, currency);
        const formattedMin = formatCurrency(categoryItem.minAmount, currency);
        const formattedMax = formatCurrency(categoryItem.maxAmount, currency);
        
        return (
            <div style={{
                padding: '16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid #e5e7eb',
                minWidth: '320px',
                maxWidth: '440px'
            }}>
                <div style={{
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#111827',
                    fontSize: '16px',
                    borderBottom: '1px solid #f3f4f6',
                    paddingBottom: '8px'
                }}>
                    {name}
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Total Amount:</span>
                        <span style={{ 
                            fontWeight: '600', 
                            color: type === 'income' ? '#059669' : '#dc2626', 
                            fontSize: '14px' 
                        }}>
                            {formattedTotal} <span style={{ color: '#9ca3af', fontSize: '12px' }}>({percentage}%)</span>
                        </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Transactions:</span>
                        <span style={{ fontWeight: '600', color: '#374151' }}>{categoryItem.count}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Average:</span>
                        <span style={{ fontWeight: '600', color: '#374151' }}>{formattedAverage}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Range:</span>
                        <span style={{ fontWeight: '600', color: '#374151' }}>{formattedMin} - {formattedMax}</span>
                    </div>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginTop: '4px',
                        paddingTop: '8px',
                        borderTop: '1px solid #f3f4f6'
                    }}>
                        <span style={{ color: '#6b7280', fontWeight: '500' }}>Period:</span>
                        <span style={{ fontWeight: '600', color: '#6366f1', fontSize: '13px' }}>{categoryItem.dateRange}</span>
                    </div>
                    {name === 'Others' && smallCategories.length > 0 && (
                        <div style={{ 
                            marginTop: '8px', 
                            paddingTop: '8px', 
                            borderTop: '1px solid #f3f4f6' 
                        }}>
                            <div style={{ 
                                fontWeight: '500', 
                                fontSize: '12px', 
                                color: '#6b7280', 
                                marginBottom: '4px' 
                            }}>
                                Includes:
                            </div>
                            <div style={{ 
                                fontSize: '12px', 
                                color: '#374151', 
                                lineHeight: '1.4' 
                            }}>
                                {smallCategories.map(cat => cat.name).join(', ')}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }, [total, smallCategories, currency, chartData]);

    interface LabelEntry {
        value: number;
    }

    const renderCustomizedLabel = useCallback((entry: any) => {
        const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
        
        // Find the corresponding chart data to get the solid color and transaction count
        const chartDataEntry = chartData.find(item => item.name === entry.name);
        const labelColor = chartDataEntry?.solidColor || entry.fill || "#374151";
        const transactionCount = chartDataEntry?.count || 0;
        
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
                    strokeWidth="2"
                    fill="none"
                />
                {/* Label text with transaction count */}
                <text 
                    x={textX} 
                    y={textY} 
                    fill={labelColor} 
                    textAnchor={isRightSide ? 'start' : 'end'} 
                    dominantBaseline="central"
                    fontSize="14"
                    fontWeight="600"
                >
                    {`${entry.name} (${transactionCount}x) [${percentage}%]`}
                </text>
            </g>
        );
    }, [total, chartData]);

    // Calculate total transactions for display
    const totalTransactions = chartData.reduce((sum, item) => sum + item.count, 0);
    
    // Memoize computed text values
    const timePeriodText = useMemo(() => formatTimePeriod(), [formatTimePeriod]);
    const defaultTitle = type === 'income' ? 'Income by Category' : 'Expenses by Category';
    const baseTitle = `${title || defaultTitle} ${timePeriodText}`;
    const chartTitle = totalTransactions > 0 ? `${baseTitle} • ${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''}` : baseTitle;
    const totalLabel = type === 'income' ? 'Total Income' : 'Total Expenses';
    const tooltipText = type === 'income' ? 'Breakdown of your income sources by category with detailed statistics including transaction counts, averages, and date ranges. Hover over slices for detailed information.' : 'Analysis of your spending patterns by category with detailed statistics including transaction counts, averages, and date ranges. Hover over slices for detailed information.';

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



    // Memoize CSV data preparation with enhanced statistics
    const csvDataForControls = useMemo(() => {
        const csvData = [
            ['Category', 'Total Amount', 'Percentage', 'Transactions', 'Average Amount', 'Min Amount', 'Max Amount', 'Date Range'],
            ...chartData.map(item => [
                item.name || 'Unknown Category',
                item.value.toString(),
                total > 0 ? ((item.value / total) * 100).toFixed(1) + '%' : '0.0%',
                item.count.toString(),
                item.average.toFixed(2),
                item.minAmount.toFixed(2),
                item.maxAmount.toFixed(2),
                item.dateRange
            ])
        ];

        // Add detailed breakdown if "Others" category exists
        if (smallCategories.length > 0) {
            csvData.push(['', '', '', '', '', '', '', '']); // Empty row for separation
            csvData.push(['--- Detailed Breakdown ---', '', '', '', '', '', '', '']);
            csvData.push(['All Categories (including < 2.5%)', '', '', '', '', '', '', '']);
            rawChartData.forEach(item => {
                const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) + '%' : '0.0%';
                csvData.push([
                    item.name, 
                    item.value.toString(), 
                    percentage,
                    item.count.toString(),
                    item.average.toFixed(2),
                    item.minAmount.toFixed(2),
                    item.maxAmount.toFixed(2),
                    item.dateRange
                ]);
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-3">
                {/* Pie Chart */}
                <div 
                    ref={chartRef} 
                    className={`w-full max-w-7xl mx-auto ${isExpanded ? "h-[60rem]" : (heightClass ?? "h-[48rem] sm:h-[52rem]")} lg:col-span-3 flex items-center justify-center`}
                    role="img"
                    aria-label={`${type === 'income' ? 'Income' : 'Expense'} categories pie chart showing distribution of ${formatCurrency(total, currency)} across different categories`}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            {/* Define texture patterns for pie slices */}
                            <defs>
                                {chartData.map((entry, index) => {
                                    const patternId = `${patternPrefix}-piePattern${index}`;
                                    const baseColor = entry.color;
                                    const darkerColor = entry.solidColor || baseColor;
                                    
                                    // Different texture patterns for variety
                                    const patterns = [
                                        // Diagonal lines
                                        <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="6" height="6">
                                            <rect width="6" height="6" fill={baseColor}/>
                                            <path d="M 0,6 l 6,-6 M -1.5,1.5 l 3,-3 M 4.5,7.5 l 3,-3" stroke={darkerColor} strokeWidth="0.8" opacity="0.3"/>
                                        </pattern>,
                                        // Dots pattern
                                        <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="8" height="8">
                                            <rect width="8" height="8" fill={baseColor}/>
                                            <circle cx="2" cy="2" r="0.8" fill={darkerColor} opacity="0.4"/>
                                            <circle cx="6" cy="6" r="0.8" fill={darkerColor} opacity="0.4"/>
                                            <circle cx="4" cy="4" r="0.5" fill={darkerColor} opacity="0.3"/>
                                        </pattern>,
                                        // Grid pattern
                                        <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="5" height="5">
                                            <rect width="5" height="5" fill={baseColor}/>
                                            <rect x="0" y="0" width="1.5" height="1.5" fill={darkerColor} opacity="0.25"/>
                                            <rect x="3.5" y="3.5" width="1.5" height="1.5" fill={darkerColor} opacity="0.25"/>
                                            <rect x="1.75" y="1.75" width="1.5" height="1.5" fill={darkerColor} opacity="0.2"/>
                                        </pattern>,
                                        // Cross-hatch pattern
                                        <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="4" height="4">
                                            <rect width="4" height="4" fill={baseColor}/>
                                            <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke={darkerColor} strokeWidth="0.6" opacity="0.3"/>
                                            <path d="M 0,0 l 4,4 M -1,3 l 2,2 M 3,-1 l 2,2" stroke={darkerColor} strokeWidth="0.6" opacity="0.2"/>
                                        </pattern>,
                                        // Waves pattern
                                        <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="8" height="4">
                                            <rect width="8" height="4" fill={baseColor}/>
                                            <path d="M 0,2 Q 2,0 4,2 T 8,2" stroke={darkerColor} strokeWidth="0.8" fill="none" opacity="0.35"/>
                                            <path d="M 0,3 Q 2,1 4,3 T 8,3" stroke={darkerColor} strokeWidth="0.6" fill="none" opacity="0.25"/>
                                        </pattern>,
                                        // Hexagon pattern
                                        <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="6" height="6">
                                            <rect width="6" height="6" fill={baseColor}/>
                                            <polygon points="3,0.5 5,1.5 5,3.5 3,4.5 1,3.5 1,1.5" fill={darkerColor} opacity="0.25"/>
                                        </pattern>
                                    ];
                                    
                                    // Cycle through different patterns
                                    return patterns[index % patterns.length];
                                })}
                                
                                {/* Special pattern for "Others" category */}
                                <pattern id={`${patternPrefix}-othersPattern`} patternUnits="userSpaceOnUse" width="3" height="3">
                                    <rect width="3" height="3" fill="#94a3b8"/>
                                    <rect x="0" y="0" width="1" height="1" fill="#64748b" opacity="0.4"/>
                                    <rect x="2" y="2" width="1" height="1" fill="#64748b" opacity="0.4"/>
                                    <rect x="1" y="1" width="1" height="1" fill="#475569" opacity="0.3"/>
                                </pattern>
                            </defs>

                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={isExpanded ? 260 : 220}
                                innerRadius={isExpanded ? 90 : 120}
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
                                        fill={
                                            entry.name === "Others"
                                                ? `url(#${patternPrefix}-othersPattern)`
                                                : `url(#${patternPrefix}-piePattern${index})`
                                        }
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={CustomTooltip} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend and breakdown */}
                <div className="space-y-1 sm:space-y-2 lg:col-span-1">
                    <h4 className="text-xs font-medium text-gray-900 mb-2">Category Breakdown</h4>
                        <div className="space-y-1 sm:space-y-2 max-h-80 sm:max-h-96 overflow-y-auto pr-2">{/* Increased from max-h-60 to max-h-80/96 and added pr-2 for scrollbar */}
                        {chartData.map((entry, index) => {
                            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
                            const isOthers = entry.name === 'Others';
                            
                            return (
                                <div key={entry.name}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex-shrink-0 border border-white"
                                                style={{ 
                                                    backgroundColor: entry.color,
                                                    boxShadow: `0 1px 3px rgba(0, 0, 0, 0.1)`
                                                }}
                                            />
                                            <span className="text-xs sm:text-sm text-gray-700 truncate font-medium">
                                                {entry.name} ({entry.count}x)
                                            </span>
                                            {isOthers && smallCategories.length > 0 && (
                                                <span className="text-xs text-gray-400">
                                                    ({smallCategories.length} categories)
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-1">
                                            <div className="text-xs sm:text-sm font-medium text-gray-900">
                                                {formatCurrency(entry.value, currency)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {percentage}%
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Show breakdown for Others category */}
                                    {isOthers && smallCategories.length > 0 && (
                                        <div className="ml-5 sm:ml-6 mt-1 space-y-0.5">
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
                <div className="flex items-center justify-center h-96 text-gray-500">
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