"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { formatCurrency } from "../../../utils/currency";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";

import { useChartAnimationState } from "../../../hooks/useChartAnimationContext";

// Declare Google Charts types
// Google Charts loader helper
import { loadGoogleCharts } from "../../../utils/googleCharts";

interface IncomeSankeyChartProps {
    currency?: string;
    title?: string;
    heightClass?: string;
}

interface SankeyData {
    from: string;
    to: string;
    size: number;
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

export const IncomeSankeyChart = React.memo<IncomeSankeyChartProps>(({ currency = "USD", title, heightClass }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const { filteredIncomes, formatTimePeriod } = useChartData();
    
    // Animation control to prevent restart on re-renders (Google Charts has its own animation)
    const chartId = "income-sankey";
    const { hasAnimated } = useChartAnimationState(chartId);
    
    // Fixed color palette - no randomization
    const COLORS = [
        '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#ec4899', '#a855f7', '#10b981', 
        '#6366f1', '#dc2626', '#7c3aed', '#0891b2', '#65a30d'
    ];

    // Process data with useMemo for stability and optimized dependencies
    const { sankeyData, total, csvData } = useMemo(() => {
        const categoryStatsMap = new Map<string, CategoryStats>();
        
        // Group data by category with detailed statistics (with currency conversion)
        filteredIncomes.forEach(item => {
            const categoryName = item.category?.name || 'Unknown Category';
            const convertedAmount = convertForDisplaySync(item.amount, item.currency, currency);
            const transactionDate = new Date(item.date);
            
            const existingStats = categoryStatsMap.get(categoryName);
            
            if (!existingStats) {
                categoryStatsMap.set(categoryName, {
                    totalAmount: convertedAmount,
                    count: 1,
                    minAmount: convertedAmount,
                    maxAmount: convertedAmount,
                    earliestDate: transactionDate,
                    latestDate: transactionDate,
                    amounts: [convertedAmount]
                });
            } else {
                existingStats.totalAmount += convertedAmount;
                existingStats.count += 1;
                existingStats.minAmount = Math.min(existingStats.minAmount, convertedAmount);
                existingStats.maxAmount = Math.max(existingStats.maxAmount, convertedAmount);
                existingStats.earliestDate = transactionDate < existingStats.earliestDate ? transactionDate : existingStats.earliestDate;
                existingStats.latestDate = transactionDate > existingStats.latestDate ? transactionDate : existingStats.latestDate;
                existingStats.amounts.push(convertedAmount);
            }
        });

        // Convert to Sankey data format with enhanced information
        const sankeyData: SankeyData[] = [];
        const total = Array.from(categoryStatsMap.values()).reduce((sum, stats) => sum + stats.totalAmount, 0);
        
        // Helper function to format date range
        const formatDateRange = (earliest: Date, latest: Date): string => {
            const options: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
            if (earliest.getTime() === latest.getTime()) {
                return earliest.toLocaleDateString('en', options);
            }
            return `${earliest.toLocaleDateString('en', options)} - ${latest.toLocaleDateString('en', options)}`;
        };
        
        // Create flow from each category to "Total Income" with enhanced data
        Array.from(categoryStatsMap.entries()).forEach(([categoryName, stats]) => {
            const average = stats.totalAmount / stats.count;
            const dateRange = formatDateRange(stats.earliestDate, stats.latestDate);
            
            sankeyData.push({
                from: `${categoryName} (${stats.count}x)`,
                to: "Total Income",
                size: stats.totalAmount,
                count: stats.count,
                average: average,
                minAmount: stats.minAmount,
                maxAmount: stats.maxAmount,
                dateRange: dateRange
            });
        });

        // Sort by amount for consistency
        sankeyData.sort((a, b) => b.size - a.size);

        // Prepare enhanced CSV data
        const csvData = [
            ['Income Source', 'Total Amount', 'Percentage', 'Transactions', 'Average Amount', 'Min Amount', 'Max Amount', 'Date Range'],
            ...sankeyData.map((item) => [
                item.from.replace(/ \(\d+x\)$/, ''), // Remove count from category name for CSV
                item.size.toString(),
                total > 0 ? ((item.size / total) * 100).toFixed(1) + '%' : '0.0%',
                item.count.toString(),
                item.average.toFixed(2),
                item.minAmount.toFixed(2),
                item.maxAmount.toFixed(2),
                item.dateRange
            ])
        ];

        return { sankeyData, total, csvData };
    }, [
        filteredIncomes.length,
        currency,
        // Add checksum to detect actual data changes, not just reference changes
        filteredIncomes.reduce((sum, income) => sum + income.amount + income.id, 0)
    ]);

    // Google Charts loading and drawing with proper error handling and animation control
    useEffect(() => {
        if (sankeyData.length === 0 || !chartRef.current) return;

        let isMounted = true;

        let currentChart: any = null;

        const drawChart = () => {
            if (!chartRef.current || !isMounted || !window.google?.visualization) return;

            try {
                const container = chartRef.current;
                
                // Wait for container to be properly sized
                const containerRect = container.getBoundingClientRect();
                if (containerRect.width === 0 || containerRect.height === 0) {
                    console.log('Container not ready, retrying...');
                    setTimeout(() => {
                        if (isMounted) drawChart();
                    }, 100);
                    return;
                }

                // Validate and get container dimensions
                const width = Math.max(Math.floor(containerRect.width) || 600, 400);
                const height = undefined;

                // console.log('Drawing chart with dimensions:', { width, height });

                // Validate data
                const validData = sankeyData.filter(item => {
                    return item.size && !isNaN(item.size) && item.size > 0 && item.from && item.to;
                });

                if (validData.length === 0) {
                    console.log('No valid data for chart');
                    return;
                }

                // Clear container
                container.innerHTML = '';

                // Create data table with HTML tooltip for better formatting
                const data = new window.google.visualization.DataTable();
                data.addColumn('string', 'From');
                data.addColumn('string', 'To');
                data.addColumn('number', 'Weight');
                data.addColumn({type: 'string', role: 'tooltip', p: {html: true}});

                // Add rows with enhanced tooltips
                const rows = validData.map((item) => {
                    const percentage = total > 0 ? ((item.size / total) * 100).toFixed(1) : '0.0';
                    const labelWithPercentage = `${item.from} [${percentage}%]`;
                    const validSize = Math.max(item.size, 0.01); // Ensure minimum positive value
                    
                    // Enhanced HTML tooltip with detailed statistics on separate lines
                    const formattedTotal = formatCurrency(item.size, currency);
                    const formattedAverage = formatCurrency(item.average, currency);
                    const formattedMin = formatCurrency(item.minAmount, currency);
                    const formattedMax = formatCurrency(item.maxAmount, currency);
                    
                    const tooltip = `<div style="padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #e5e7eb; min-width: 300px; max-width: 420px;">
                    <div style="font-weight: 600; margin-bottom: 12px; color: #111827; font-size: 16px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">${item.from.replace(/ \(\d+x\)$/, '')}</div>
                    <div style="display: grid; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6b7280; font-weight: 500;">Total Amount:</span>
                    <span style="font-weight: 600; color: #059669; font-size: 14px;">${formattedTotal} <span style="color: #9ca3af; font-size: 12px;">(${percentage}%)</span></span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6b7280; font-weight: 500;">Transactions:</span>
                    <span style="font-weight: 600; color: #374151;">${item.count}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6b7280; font-weight: 500;">Average:</span>
                    <span style="font-weight: 600; color: #374151;">${formattedAverage}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6b7280; font-weight: 500;">Range:</span>
                    <span style="font-weight: 600; color: #374151;">${formattedMin} - ${formattedMax}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 8px; border-top: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-weight: 500;">Period:</span>
                    <span style="font-weight: 600; color: #6366f1; font-size: 13px;">${item.dateRange}</span>
                    </div>
                    </div>
                    </div>`;
                    
                    return [labelWithPercentage, item.to, validSize, tooltip];
                });

                // console.log('Chart data rows:', rows);
                data.addRows(rows);

                // Chart options with HTML tooltip and optimized animations
                const options = {
                    width: width,
                    height: height,
                    tooltip: {
                        isHtml: true,
                        textStyle: {
                            fontName: 'Arial',
                            fontSize: 16
                        }
                    },
                    sankey: {
                        node: {
                            colors: COLORS.slice(0, validData.length + 1),
                            label: {
                                fontName: 'Arial',
                                fontSize: 16,
                                color: '#333'
                            },
                            width: 10
                        },
                        link: {
                            colorMode: 'gradient'
                        }
                    }
                };

                // console.log('Chart options:', options);

                // Create and draw chart
                currentChart = new window.google.visualization.Sankey(container);
                currentChart.draw(data, options);
                
                // console.log('Chart drawn successfully');
            } catch (error) {
                console.error('Error drawing Sankey chart:', error);
            }
        };

        const initChart = async () => {
            try {
                await loadGoogleCharts(['sankey']);
                if (!isMounted) return;

                // Longer delay to ensure container is ready and styled
                setTimeout(() => {
                    if (isMounted) {
                        drawChart();
                    }
                }, 300);
            } catch (error) {
                console.error('Error initializing chart:', error);
            }
        };

        initChart();

        // Handle window resize with longer debounce
        const handleResize = () => {
            if (isMounted && chartRef.current && window.google?.visualization) {
                setTimeout(() => {
                    if (isMounted) {
                        drawChart();
                    }
                }, 300);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            isMounted = false;
            window.removeEventListener('resize', handleResize);
            currentChart = null;
        };
        }, [sankeyData, total, COLORS, hasAnimated]);

    // Calculate total transactions for display
    const totalTransactions = sankeyData.reduce((sum, item) => sum + item.count, 0);
    
    const timePeriodText = formatTimePeriod();
    const baseTitle = title || `Income Distribution ${timePeriodText}`;
    const chartTitle = totalTransactions > 0 ? `${baseTitle} • ${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''}` : baseTitle;
    const tooltipText = 'Flow visualization of your income sources with detailed statistics including transaction counts, averages, and date ranges. Hover over categories for detailed breakdowns.';

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-chart-type="income-sankey">
            <ChartControls
                title={chartTitle}
                tooltipText={tooltipText}
                csvData={csvData}
                csvFileName="income-distribution"
                chartRef={chartRef}
                showExpandButton={false}
            />
            <div className="px-8 py-6">
                {sankeyData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <h3 className="text-lg font-medium mb-2">No Income Data</h3>
                        <p className="text-sm text-center max-w-sm">
                            Add some income entries to see the flow visualization with detailed statistics.
                            Each category will show transaction counts, averages, ranges, and time periods.
                        </p>
                    </div>
                ) : (
                    <div
                        ref={chartRef}
                        className={`w-full max-w-8xl mx-auto overflow-hidden ${heightClass ?? 'h-[28rem] sm:h-[32rem]'}`}
                        style={{
                            minWidth: '400px',
                            width: '100%',
                            display: 'block',
                            position: 'relative',
                            boxSizing: 'border-box'
                        }}
                    />
                )}
            </div>
        </div>
    );
});

IncomeSankeyChart.displayName = 'IncomeSankeyChart';