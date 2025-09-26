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
        const categoryMap = new Map<string, number>();
        
        // Group data by category (with currency conversion)
        filteredIncomes.forEach(item => {
            const categoryName = item.category?.name || 'Unknown Category';
            const currentAmount = categoryMap.get(categoryName) || 0;
            // Convert individual transaction amount to display currency
            const convertedAmount = convertForDisplaySync(item.amount, item.currency, currency);
            categoryMap.set(categoryName, currentAmount + convertedAmount);
        });

        // Convert to Sankey data format
        const sankeyData: SankeyData[] = [];
        const total = Array.from(categoryMap.values()).reduce((sum, value) => sum + value, 0);
        
        // Create flow from each category to "Total Income"
        Array.from(categoryMap.entries()).forEach(([categoryName, amount]) => {
            sankeyData.push({
                from: categoryName,
                to: "Total Income",
                size: amount
            });
        });

        // Sort by amount for consistency
        sankeyData.sort((a, b) => b.size - a.size);

        // Prepare CSV data
        const csvData = [
            ['Income Source', 'Amount', 'Percentage'],
            ...Array.from(categoryMap.entries()).map(([categoryName, amount]) => [
                categoryName,
                amount.toString(),
                total > 0 ? ((amount / total) * 100).toFixed(1) + '%' : '0.0%'
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

                // Create data table with simple tooltip
                const data = new window.google.visualization.DataTable();
                data.addColumn('string', 'From');
                data.addColumn('string', 'To');
                data.addColumn('number', 'Weight');
                data.addColumn({type: 'string', role: 'tooltip'});

                // Add rows with simple tooltips
                const rows = validData.map((item) => {
                    const percentage = total > 0 ? ((item.size / total) * 100).toFixed(1) : '0.0';
                    const labelWithPercentage = `${item.from} [${percentage}%]`;
                    const validSize = Math.max(item.size, 0.01); // Ensure minimum positive value
                    
                    // Simple tooltip format: "Category (X%)" on first line, "Currency Amount" on second line
                    const formattedAmount = formatCurrency(item.size, currency);
                    const tooltip = `Total: ${formattedAmount}`;
                    
                    return [labelWithPercentage, item.to, validSize, tooltip];
                });

                // console.log('Chart data rows:', rows);
                data.addRows(rows);

                // Chart options with simple tooltip and optimized animations
                const options = {
                    width: width,
                    height: height,
                    tooltip: {
                        textStyle: {
                            fontName: 'Arial',
                            fontSize: 13
                        }
                    },
                    sankey: {
                        node: {
                            colors: COLORS.slice(0, validData.length + 1),
                            label: {
                                fontName: 'Arial',
                                fontSize: 12,
                                color: '#333'
                            },
                            width: 15
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

    const timePeriodText = formatTimePeriod();
    const chartTitle = title || `Income Distribution ${timePeriodText}`;
    const tooltipText = 'Flow visualization of your income sources contributing to total income';

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
                            Add some income entries to see the flow visualization.
                            Your income sources will appear here.
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