"use client";

import { useState, useRef } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { formatCurrency } from "../utils/currency";
import { Income, Expense } from "../types/financial";

interface MonthlyTrendChartProps {
    incomes: Income[];
    expenses: Expense[];
    currency?: string;
    startDate?: string;
    endDate?: string;
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
}

export function MonthlyTrendChart({ incomes, expenses, currency = "USD", startDate, endDate }: MonthlyTrendChartProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const chartRef = useRef<HTMLDivElement>(null);
    
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
        } else {
            // Calculate the last 4 full calendar months
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            // Calculate the month 4 months ago
            const fourMonthsAgoYear = currentMonth >= 3 ? currentYear : currentYear - 1;
            const fourMonthsAgoMonth = currentMonth >= 3 ? currentMonth - 3 : currentMonth + 9;
            
            const startDate = new Date(fourMonthsAgoYear, fourMonthsAgoMonth, 1);
            const startMonth = startDate.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            const endMonth = today.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            
            return `(${startMonth} - ${endMonth})`;
        }
    };

    const timePeriodText = getTimePeriodText();
    
    // Filter data based on provided date range or last 4 months
    const filterData = (data: (Income | Expense)[]) => {
        if (startDate || endDate) {
            return data.filter(item => {
                const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
                let matchesDateRange = true;
                
                if (startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesDateRange = itemDate >= start && itemDate <= end;
                } else if (startDate) {
                    const start = new Date(startDate);
                    matchesDateRange = itemDate >= start;
                } else if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    matchesDateRange = itemDate <= end;
                }
                
                return matchesDateRange;
            });
        } else {
            // Default to last 4 full calendar months if no date filters provided
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            // Calculate the first day of 4 months ago
            // For example, if current month is June (5), we want to include February (1), March (2), April (3), May (4)
            const fourMonthsAgoYear = currentMonth >= 3 ? currentYear : currentYear - 1;
            const fourMonthsAgoMonth = currentMonth >= 3 ? currentMonth - 3 : currentMonth + 9; // +9 wraps around to previous year
            
            // Create date for first day of 4 months ago (e.g., February 1st if current month is June)
            const startDate = new Date(fourMonthsAgoYear, fourMonthsAgoMonth, 1);
            
            // Create date for last day of current month
            const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
            
            return data.filter(item => {
                const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            });
        }
    };

    const filteredIncomes = filterData(incomes);
    const filteredExpenses = filterData(expenses);

    // Group data by month
    const monthlyMap = new Map<string, { income: number; expenses: number }>();

    // Process incomes
    filteredIncomes.forEach(income => {
        const date = income.date instanceof Date ? income.date : new Date(income.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
        current.income += income.amount;
        monthlyMap.set(monthKey, current);
    });

    // Process expenses
    filteredExpenses.forEach(expense => {
        const date = expense.date instanceof Date ? expense.date : new Date(expense.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyMap.get(monthKey) || { income: 0, expenses: 0 };
        current.expenses += expense.amount;
        monthlyMap.set(monthKey, current);
    });

    // Convert to chart data and sort by date
    const chartData: MonthlyData[] = Array.from(monthlyMap.entries())
        .map(([monthKey, data]) => {
            const parts = monthKey.split('-');
            const year = parseInt(parts[0] || '0', 10);
            const month = parseInt(parts[1] || '0', 10);
            
            // Validate year and month
            if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
                console.warn(`Invalid date components: year=${year}, month=${month}`);
                return null;
            }
            
            const date = new Date(year, month - 1);
            const savings = data.income - data.expenses;
            
            return {
                month: monthKey,
                income: data.income,
                expenses: data.expenses,
                savings,
                incomeT: data.income,
                expensesT: data.expenses,
                savingsT: savings,
                formattedMonth: date.toLocaleDateString('en', { month: 'short', year: 'numeric' })
            };
        })
        .filter((item): item is MonthlyData => item !== null)
        .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate totals and averages
    const totalIncome = chartData.reduce((sum, item) => sum + item.income, 0);
    const totalExpenses = chartData.reduce((sum, item) => sum + item.expenses, 0);
    const totalSavings = totalIncome - totalExpenses;
    const monthCount = chartData.length;

    const averageIncome = monthCount > 0 ? totalIncome / monthCount : 0;
    const averageExpenses = monthCount > 0 ? totalExpenses / monthCount : 0;
    const averageSavings = monthCount > 0 ? totalSavings / monthCount : 0;

    // Calculate max and min values for reference lines
    const maxValue = chartData.length > 0 ? Math.max(
        ...chartData.map(item => Math.max(item.income, item.expenses, item.savings))
    ) : 0;
    const minValue = chartData.length > 0 ? Math.min(
        ...chartData.map(item => Math.min(0, item.savings))
    ) : 0;
    
    const yAxisMax = Math.ceil(maxValue * 1.3);
    const yAxisMin = Math.floor(minValue * 1.5);
    
    const referenceLines = [
        yAxisMax * 0.25,
        yAxisMax * 0.5,
        yAxisMax * 0.75
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
                        link.download = 'monthly-trend-chart.png';
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
        link.download = 'monthly-trend-chart.svg';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const downloadCSV = (): void => {
        const csvData = [
            ['Month', 'Income', 'Expenses', 'Savings'],
            ...chartData.map(item => [
                item.formattedMonth,
                item.income.toString(),
                item.expenses.toString(),
                item.savings.toString()
            ])
        ];
        
        const csvString = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const link = document.createElement('a');
        link.download = 'monthly-trend-data.csv';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const toggleExpanded = (): void => {
        setIsExpanded(!isExpanded);
    };

    interface TooltipEntry {
        dataKey: string;
        value: number;
        color: string;
    }

    interface TooltipProps {
        active?: boolean;
        payload?: TooltipEntry[];
        label?: string;
    }

    const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
        if (active && payload && payload.length) {
            // Filter to only show bar data (exclude trend lines)
            const barData = payload.filter((entry) => 
                entry.dataKey === 'income' || entry.dataKey === 'expenses' || entry.dataKey === 'savings'
            );
            
            if (barData.length === 0) return null;

            return (
                <div className="bg-white border border-gray-300 rounded p-3 shadow-lg">
                    <p className="text-gray-900 font-medium mb-2">{label}</p>
                    {barData.map((entry, index) => {
                        let displayName = '';
                        switch (entry.dataKey) {
                            case 'income':
                                displayName = 'Income';
                                break;
                            case 'expenses':
                                displayName = 'Expenses';
                                break;
                            case 'savings':
                                displayName = 'Savings';
                                break;
                            default:
                                displayName = entry.dataKey;
                        }
                        return (
                            <p key={index} style={{ color: entry.color }} className="text-sm">
                                {displayName}: {formatCurrency(entry.value, currency)}
                                <br />
                            </p>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    const formatYAxisTick = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return formatCurrency(value, currency).replace(/\$/, '');
    };

    // Calculate optimal interval for x-axis ticks based on data length
    const calculateOptimalInterval = () => {
        // Show all months if there are 6 or fewer months
        if (chartData.length <= 6) {
            return 0; // Show all ticks
        }
        // Otherwise use a gap of 1 month (show every other month)
        return 1;
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
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                    <p className="text-sm text-gray-600">Monthly Average Income</p>
                    <p className="text-lg font-bold text-green-600">
                        {formatCurrency(averageIncome, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Monthly Average Expenses</p>
                    <p className="text-lg font-bold text-red-600">
                        {formatCurrency(averageExpenses, currency)}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Monthly Average Savings</p>
                    <p className={`text-lg font-bold ${averageSavings >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatCurrency(averageSavings, currency)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div 
                ref={chartRef} 
                className={isExpanded ? "h-[50vh] w-full mx-auto" : "h-[50rem] w-5/6 mx-auto"}
                role="img"
                aria-label={`Monthly trend chart showing income, expenses, and savings ${timePeriodText.toLowerCase()}`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{
                            top: 40,
                            right: 30,
                            left: 40,
                            bottom: 100,
                        }}
                        barCategoryGap="25%"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        
                        {/* Reference lines for better visualization */}
                        <ReferenceLine 
                            y={0} 
                            stroke="#666" 
                            strokeWidth={2}
                        />
                        {referenceLines.map((value, index) => (
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
                            interval={calculateOptimalInterval()}
                            stroke="#666"
                            height={80}
                        />
                        <YAxis 
                            tickFormatter={formatYAxisTick}
                            tick={{ fontSize: 12 }}
                            stroke="#666"
                            domain={[yAxisMin, yAxisMax]}
                            tickCount={8}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '30px' }} />
                        <Bar 
                            dataKey="income" 
                            fill="#10b981" 
                            name="Income"
                            radius={[2, 2, 0, 0]}
                        />
                        <Bar 
                            dataKey="expenses" 
                            fill="#ef4444" 
                            name="Expenses"
                            radius={[2, 2, 0, 0]}
                        />
                        <Bar 
                            dataKey="savings" 
                            fill="#3b82f6" 
                            name="Savings"
                            radius={[2, 2, 0, 0]}
                        />
                        
                        {/* Trend Lines */}
                        <Line 
                            type="monotone" 
                            dataKey="incomeT" 
                            stroke="#059669" 
                            strokeWidth={3}
                            dot={{ fill: "#059669", strokeWidth: 2, r: 4 }}
                            name="Income Trend"
                            connectNulls={false}
                            legendType="none"
                            activeDot={false}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="expensesT" 
                            stroke="#dc2626" 
                            strokeWidth={3}
                            dot={{ fill: "#dc2626", strokeWidth: 2, r: 4 }}
                            name="Expenses Trend"
                            connectNulls={false}
                            legendType="none"
                            activeDot={false}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="savingsT" 
                            stroke="#2563eb" 
                            strokeWidth={3}
                            dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
                            name="Savings Trend"
                            connectNulls={false}
                            legendType="none"
                            activeDot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6" data-chart-type="monthly-trend">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Monthly Income, Expenses & Savings Trend {timePeriodText}
                    </h3>
                </div>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    No data available {timePeriodText.toLowerCase()}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow p-6" data-chart-type="monthly-trend">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Monthly Income, Expenses & Savings Trend {timePeriodText}
                    </h3>
                    <div className="flex items-center gap-2">
                        {/* Download Chart as PNG Button */}
                        <button
                            onClick={downloadPNG}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title="Download Chart as PNG (fallback to SVG)"
                            aria-label="Download monthly trend chart as PNG image"
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
                            aria-label="Download monthly trend chart as SVG image"
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
                            aria-label="Download monthly trend data as CSV file"
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
                    <div className="bg-white rounded-lg p-6 max-w-[95%] w-full max-h-[95%] overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold">Monthly Income, Expenses & Savings Trend {timePeriodText}</h2>
                            <button
                                onClick={toggleExpanded}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="w-full">
                                <ChartContent />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
} 