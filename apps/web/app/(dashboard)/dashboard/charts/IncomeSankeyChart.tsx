"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { formatCurrency } from "../../../utils/currency";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";
import { useChartExpansion } from "../../../utils/chartUtils";
import { useChartAnimationState } from "../../../hooks/useChartAnimationContext";

// Declare Google Charts types
declare global {
    interface Window {
        google: any;
    }
}

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
    const { isExpanded, toggleExpanded } = useChartExpansion();
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
        
        // Group data by category
        filteredIncomes.forEach(item => {
            const categoryName = item.category?.name || 'Unknown Category';
            const currentAmount = categoryMap.get(categoryName) || 0;
            categoryMap.set(categoryName, currentAmount + item.amount);
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
        // Add checksum to detect actual data changes, not just reference changes
        filteredIncomes.reduce((sum, income) => sum + income.amount + income.id, 0)
    ]);

    // Google Charts loading and drawing with proper error handling and animation control
    useEffect(() => {
        if (sankeyData.length === 0 || !chartRef.current) return;

        let isMounted = true;

        const loadGoogleChartsScript = (): Promise<void> => {
            return new Promise((resolve, reject) => {
                // Check if script is already loaded
                if (window.google?.charts) {
                    resolve();
                    return;
                }

                // Check if script is already in DOM
                const existingScript = document.querySelector('script[src*="gstatic.com/charts"]');
                if (existingScript) {
                    existingScript.addEventListener('load', () => resolve());
                    existingScript.addEventListener('error', reject);
                    return;
                }

                // Load new script
                const script = document.createElement('script');
                script.src = 'https://www.gstatic.com/charts/loader.js';
                script.async = true;
                script.onload = () => resolve();
                script.onerror = reject;
                document.head.appendChild(script);
            });
        };

        const loadSankeyPackage = (): Promise<void> => {
            return new Promise((resolve) => {
                window.google.charts.load('current', { packages: ['sankey'] });
                window.google.charts.setOnLoadCallback(() => resolve());
            });
        };

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
                const height = isExpanded ? 600 : undefined;

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
                    // Reduce or disable animations on subsequent renders to prevent restart
                    animation: hasAnimated ? {
                        duration: 0, // No animation after first render
                        easing: 'none'
                    } : {
                        duration: 750,
                        easing: 'out'
                    },
                    sankey: {
                        node: {
                            colors: COLORS.slice(0, validData.length + 1), // Only use colors we need
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
                await loadGoogleChartsScript();
                if (!isMounted) return;
                
                await loadSankeyPackage();
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
    }, [sankeyData, total, isExpanded, COLORS, hasAnimated]);

    const timePeriodText = formatTimePeriod();
    const chartTitle = title || `Income Distribution ${timePeriodText}`;
    const tooltipText = 'Flow visualization of your income sources contributing to total income';

    const ChartContent = () => (
        <div>
            {sankeyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <div className="text-6xl mb-4">💰</div>
                    <h3 className="text-lg font-medium mb-2">No Income Data</h3>
                    <p className="text-sm text-center max-w-sm">
                        Add some income entries to see the flow visualization.
                        Your income sources will appear here.
                    </p>
                </div>
            ) : (
                <div 
                    ref={chartRef}
                    className={`w-full overflow-hidden ${isExpanded ? '' : (heightClass ?? '')}`}
                    style={{ 
                        height: isExpanded ? '600px' : undefined,
                        minHeight: isExpanded ? '600px' : undefined,
                        minWidth: '400px',
                        width: '100%',
                        display: 'block',
                        position: 'relative',
                        boxSizing: 'border-box'
                    }}
                />
            )}
        </div>
    );

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-chart-type="income-sankey">
                <ChartControls
                    title={chartTitle}
                    tooltipText={tooltipText}
                    csvData={csvData}
                    csvFileName="income-distribution"
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    chartRef={chartRef}
                />
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg p-3 sm:p-6 max-w-7xl w-full max-h-full overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
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
                        <ChartContent />
                    </div>
                </div>
            )}
        </>
    );
});

IncomeSankeyChart.displayName = 'IncomeSankeyChart';