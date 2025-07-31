"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "../utils/currency";
import { Income, Expense } from "../types/financial";
import { ChartControls } from "./ChartControls";
import { useChartExpansion } from "../utils/chartUtils";

// Declare Google Charts types
declare global {
    interface Window {
        google: any;
    }
}

interface TransactionCalendarChartProps {
    data: (Income | Expense)[];
    type: "income" | "expense";
    currency?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
}

export function TransactionCalendarChart({ 
    data, 
    type, 
    currency = "USD", 
    title, 
    startDate, 
    endDate 
}: TransactionCalendarChartProps) {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<any>(null);
    const chartId = useRef(`transaction-calendar-${type}-${Math.random().toString(36).substring(7)}`);
    
    // Generate time period text
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
        return '';
    };

    const timePeriodText = getTimePeriodText();

    // Process data to get daily transaction counts and amounts (current year only)
    const processCalendarData = () => {
        const dailyData = new Map<string, { count: number; totalAmount: number }>();
        const currentYear = new Date().getFullYear();
        
        // Filter data to current year only for better performance
        const currentYearData = data.filter(transaction => {
            const transactionYear = new Date(transaction.date).getFullYear();
            return transactionYear === currentYear;
        });
        
        currentYearData.forEach(transaction => {
            const date = new Date(transaction.date);
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            
            if (!dailyData.has(dateKey)) {
                dailyData.set(dateKey, { count: 0, totalAmount: 0 });
            }
            
            const current = dailyData.get(dateKey)!;
            current.count += 1;
            current.totalAmount += transaction.amount;
        });

        return Array.from(dailyData.entries()).map(([dateKey, values]) => {
            const [year, month, day] = dateKey.split('-').map(Number);
            return [new Date(year!, month!, day!), values.count];
        });
    };

    const calendarData = processCalendarData();

    // Load Google Charts and initialize Calendar
    useEffect(() => {
        let mounted = true;
        
        const loadGoogleCharts = () => {
            if (typeof window !== 'undefined') {
                // Check if Google Charts is already loaded
                if (window.google && window.google.charts && window.google.visualization) {
                    // If calendar package is available, draw immediately
                    if (window.google.visualization.Calendar) {
                        drawChart();
                        return;
                    }
                    // Otherwise, load the calendar package
                    window.google.charts.load('current', { packages: ['calendar'] });
                    window.google.charts.setOnLoadCallback(() => {
                        if (mounted) {
                            drawChart();
                        }
                    });
                    return;
                }

                // Load Google Charts script if not already loaded
                const script = document.createElement('script');
                script.src = 'https://www.gstatic.com/charts/loader.js';
                script.async = true;
                script.onload = () => {
                    if (window.google && mounted) {
                        window.google.charts.load('current', { packages: ['calendar'] });
                        window.google.charts.setOnLoadCallback(() => {
                            if (mounted) {
                                drawChart();
                            }
                        });
                    }
                };
                
                // Only add script if it's not already loaded
                if (!document.querySelector('script[src="https://www.gstatic.com/charts/loader.js"]')) {
                    document.head.appendChild(script);
                }
            }
        };

        const drawChart = () => {
            if (!chartRef.current || !mounted || calendarData.length === 0) return;

            try {
                // Clear the container
                chartRef.current.innerHTML = '';

                // Debug logging
                console.log('Google Charts status:', {
                    google: !!window.google,
                    visualization: !!window.google?.visualization,
                    Calendar: !!window.google?.visualization?.Calendar
                });

                // Check if Calendar visualization is available
                if (!window.google?.visualization?.Calendar) {
                    console.error('Google Charts Calendar visualization not available');
                    chartRef.current.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Calendar chart is loading...</div>';
                    return;
                }

                // Create the data table
                const dataTable = new window.google.visualization.DataTable();
                dataTable.addColumn({ type: 'date', id: 'Date' });
                dataTable.addColumn({ type: 'number', id: 'Transactions' });

                // Add rows from our processed data
                dataTable.addRows(calendarData);

                // Chart options
                const containerWidth = chartRef.current.offsetWidth || 600;
                const containerHeight = isExpanded ? 700 : 420; // Increased height for better spacing
                const currentYear = new Date().getFullYear();

                const options = {
                    title: title || `${type === 'income' ? 'Income' : 'Expense'} Transaction Frequency - ${currentYear} ${timePeriodText}`,
                    height: containerHeight,
                    width: containerWidth,
                    calendar: {
                        cellSize: isExpanded ? 18 : 14, // Larger cells for better visibility
                        monthOutlineColor: {
                            stroke: '#d1d5db',
                            strokeOpacity: 0.8,
                            strokeWidth: 2 // Thicker month outlines
                        },
                        focusedCellColor: {
                            stroke: type === 'income' ? '#10b981' : '#ef4444',
                            strokeOpacity: 1,
                            strokeWidth: 2
                        },
                        dayOfWeekLabel: {
                            fontName: 'Arial',
                            fontSize: 11,
                            color: '#374151',
                            bold: true
                        },
                        monthLabel: {
                            fontName: 'Arial',
                            fontSize: 14,
                            color: '#1f2937',
                            bold: true
                        },
                        dayOfWeekRightSpace: 8, // More space between day labels and calendar
                        underMonthSpace: 10, // More space under month labels
                        underYearSpace: 8 // More space under year labels
                    },
                    colorAxis: {
                        minValue: 0,
                        colors: type === 'income' 
                            ? ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a']
                            : ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626']
                    },
                    tooltip: {
                        isHtml: true
                    }
                };

                // Create and draw the chart
                const chart = new window.google.visualization.Calendar(chartRef.current);
                chart.draw(dataTable, options);
                
                chartInstance.current = chart;
            } catch (error) {
                console.error('Error creating Google Calendar chart:', error);
            }
        };

        if (calendarData.length > 0) {
            loadGoogleCharts();
        }

        // Handle window resize
        const handleResize = () => {
            if (chartInstance.current && chartRef.current) {
                // Redraw chart on resize with new dimensions
                setTimeout(() => {
                    if (mounted) {
                        drawChart();
                    }
                }, 100);
            }
        };

        window.addEventListener('resize', handleResize);

        // Cleanup function
        return () => {
            mounted = false;
            window.removeEventListener('resize', handleResize);
        };
    }, [calendarData, isExpanded, type, title, timePeriodText]);

    const currentYear = new Date().getFullYear();
    const chartTitle = title || `${type === 'income' ? 'Income' : 'Expense'} Transaction Frequency - ${currentYear} ${timePeriodText}`;
    const tooltipText = `Calendar view showing the frequency of ${type} transactions per day in ${currentYear}`;

    // Prepare CSV data for chart controls
    const csvDataForControls = [
        ['Date', 'Transaction Count'],
        ...calendarData.map(([date, count]) => [
            (date as Date).toLocaleDateString(),
            (count || 0).toString()
        ])
    ];

    const ChartContent = () => (
        <div className={isExpanded ? "h-full" : ""}>
            {calendarData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <div className="text-6xl mb-4">{type === 'income' ? '💰' : '💸'}</div>
                    <h3 className="text-lg font-medium mb-2">No {type === 'income' ? 'Income' : 'Expense'} Data for {currentYear}</h3>
                    <p className="text-sm text-center max-w-sm">
                        Add some {type} entries for {currentYear} to see the transaction frequency calendar.
                        Your daily {type} activity will appear here.
                    </p>
                </div>
            ) : (
                <div className={isExpanded ? "h-full" : ""}>
                    {/* Chart Container */}
                    <div 
                        ref={chartRef}
                        id={chartId.current}
                        className="w-full" 
                        style={{ 
                            height: isExpanded ? '700px' : '420px',
                            width: '100%',
                            minHeight: '420px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    />
                </div>
            )}
        </div>
    );

    return (
        <div 
            className={`bg-white rounded-lg shadow-sm border border-gray-200 ${
                isExpanded ? 'fixed inset-4 z-50 overflow-auto flex flex-col' : ''
            }`}
        >
            <div className={`${isExpanded ? 'p-4 flex-1 flex flex-col' : 'p-6'}`}>
                <ChartControls
                    title={chartTitle}
                    tooltipText={tooltipText}
                    csvData={csvDataForControls}
                    csvFileName={`${type}-transaction-frequency`}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    chartRef={chartRef}
                />
                <div className={isExpanded ? 'flex-1 mt-4' : ''}>
                    <ChartContent />
                </div>
            </div>
        </div>
    );
}