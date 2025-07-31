"use client";

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { formatCurrency } from "../utils/currency";
import { Income } from "../types/financial";
import { ChartControls } from "./ChartControls";
import { useChartExpansion } from "../utils/chartUtils";

// Declare Google Charts types
declare global {
    interface Window {
        google: any;
    }
}

interface IncomeSankeyChartProps {
    data: Income[];
    currency?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
}

interface SankeyData {
    from: string;
    to: string;
    size: number;
    color?: string;
}

export function IncomeSankeyChart({ data, currency = "USD", title, startDate, endDate }: IncomeSankeyChartProps) {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<any>(null);
    const chartId = useRef(`income-sankey-${Math.random().toString(36).substring(7)}`);
    
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
    
    // Define color palette for randomization (no duplicates)
    const colorPalette = [
        '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#ec4899', '#a855f7', '#10b981', 
        '#6366f1', '#dc2626', '#7c3aed', '#0891b2', '#65a30d', 
        '#ea580c', '#db2777', '#9333ea', '#059669', '#4f46e5', 
        '#d97706', '#b91c1c', '#6d28d9', '#f43f5e', '#14b8a6',
        '#8b5a2b', '#0ea5e9', '#eab308', '#be123c', '#7e22ce'
    ];

    // Shuffle function to randomize array
    const shuffleArray = (array: string[]): string[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = shuffled[i]!;
            shuffled[i] = shuffled[j]!;
            shuffled[j] = temp;
        }
        return shuffled;
    };

    // Group data by category and sum amounts
    const categoryMap = new Map<string, number>();
    const categoryColors = new Map<string, string>();
    
    // Create randomized colors for this render
    const randomizedColors = shuffleArray(colorPalette);
    let colorIndex = 0;
    
    data.forEach(item => {
        const categoryName = item.category?.name || 'Unknown Category';
        const currentAmount = categoryMap.get(categoryName) || 0;
        categoryMap.set(categoryName, currentAmount + item.amount);
        
        // Assign randomized color if not already assigned
        if (!categoryColors.has(categoryName)) {
            const color = randomizedColors[colorIndex % randomizedColors.length] || '#9ca3af';
            categoryColors.set(categoryName, color);
            colorIndex++;
        }
    });

    // Convert to Sankey data format
    const sankeyData: SankeyData[] = [];
    const total = Array.from(categoryMap.values()).reduce((sum, value) => sum + value, 0);
    
    // Create flow from each category to "Total Income"
    Array.from(categoryMap.entries()).forEach(([categoryName, amount]) => {
        sankeyData.push({
            from: categoryName,
            to: "Total Income",
            size: amount,
            color: categoryColors.get(categoryName) || randomizedColors[0]
        });
    });

    // Filter out categories with very small amounts (< 2% of total) and group as "Other Sources"
    const significantCategories: SankeyData[] = [];
    const smallCategories: SankeyData[] = [];
    
    sankeyData.forEach(item => {
        const percentage = total > 0 ? (item.size / total) * 100 : 0;
        if (percentage >= 2) {
            significantCategories.push(item);
        } else {
            smallCategories.push(item);
        }
    });

    // Create "Other Sources" if there are small categories
    const finalSankeyData = [...significantCategories];
    if (smallCategories.length > 0) {
        const othersTotal = smallCategories.reduce((sum, item) => sum + item.size, 0);
        finalSankeyData.push({
            from: "Other Sources",
            to: "Total Income",
            size: othersTotal,
            color: randomizedColors[colorIndex % randomizedColors.length] || '#9ca3af'
        });
    }

    // Load Google Charts and initialize Sankey
    useEffect(() => {
        let mounted = true;
        
        const loadGoogleCharts = () => {
            if (typeof window !== 'undefined') {
                // Load Google Charts script
                const script = document.createElement('script');
                script.src = 'https://www.gstatic.com/charts/loader.js';
                script.async = true;
                script.onload = () => {
                    if (window.google && mounted) {
                        window.google.charts.load('current', { packages: ['sankey'] });
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
                } else if (window.google) {
                    // Google Charts already loaded
                    if (window.google.visualization) {
                        drawChart();
                    } else {
                        window.google.charts.load('current', { packages: ['sankey'] });
                        window.google.charts.setOnLoadCallback(() => {
                            if (mounted) {
                                drawChart();
                            }
                        });
                    }
                }
            }
        };

        const drawChart = () => {
            if (!chartRef.current || !mounted || finalSankeyData.length === 0) return;

            try {
                // Clear the container
                chartRef.current.innerHTML = '';

                // Create the data table
                const data = new window.google.visualization.DataTable();
                data.addColumn('string', 'From');
                data.addColumn('string', 'To');
                data.addColumn('number', 'Weight');
                data.addColumn({type: 'string', role: 'tooltip', p: {html: true}});

                // Add rows from our data with custom tooltips and percentage labels
                const rows = finalSankeyData.map((item, index) => {
                    const formattedAmount = formatCurrency(item.size, currency);
                    const percentage = total > 0 ? ((item.size / total) * 100).toFixed(1) : '0.0';
                    const tooltip = `<div style="padding: 12px 16px; font-family: Arial, sans-serif; font-size: 13px; min-width: 150px; width: auto; white-space: nowrap;">
                        <strong>${item.from} (${percentage}%)</strong><br/>
                        ${formattedAmount}
                    </div>`;
                    
                    // Add percentage to the node label
                    const labelWithPercentage = `${item.from} (${percentage}%)`;
                    return [labelWithPercentage, item.to, item.size, tooltip];
                });
                data.addRows(rows);


                // Chart options (accounting for container padding)
                const containerWidth = chartRef.current.offsetWidth || 600;
                const containerHeight = isExpanded ? 600 : 400;

                // print the category and its color
                finalSankeyData.forEach(item => {
                    console.log(item.from, item.color);
                });

                const options = {
                    width: containerWidth - 40, // Subtract padding (20px on each side)
                    height: containerHeight - 40, // Subtract padding (20px top and bottom)
                    sankey: {
                        node: {
                            colors: [...finalSankeyData.map(item => item.color), '#22c55e'], // Add green for "Total Income" node
                            label: {
                                fontName: 'Arial',
                                fontSize: 12,
                                color: '#333',
                                bold: false
                            },
                            interactivity: true,
                            fillOpacity: 0.1,
                            width: 15
                        },
                        link: {
                            colorMode: 'source',
                            fillOpacity: 0.3,
                            strokeOpacity: 0.3
                        }
                    },
                    tooltip: {
                        isHtml: true
                    },
                    chartArea: {
                        left: 60,
                        top: 40,
                        width: '60%',
                        height: '75%',

                    },
                };

                // Create and draw the chart
                const chart = new window.google.visualization.Sankey(chartRef.current);
                chart.draw(data, options);
                
                chartInstance.current = chart;
            } catch (error) {
                console.error('Error creating Google Sankey chart:', error);
            }
        };

        if (finalSankeyData.length > 0) {
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
            // Google Charts doesn't require explicit cleanup
        };
    }, [finalSankeyData, isExpanded]);

    const chartTitle = title || `Income Distribution ${timePeriodText}`;
    const tooltipText = 'Flow visualization of your income sources contributing to total income';

    // Custom download function for Google Charts with padding
    const downloadChartWithPadding = () => {
        if (!chartRef.current) return;
        
        const svgElement = chartRef.current.querySelector('svg');
        if (!svgElement) return;
        
        try {
            // Get original SVG dimensions
            const originalWidth = svgElement.getBoundingClientRect().width || 600;
            const originalHeight = svgElement.getBoundingClientRect().height || 400;
            
            // Add padding to dimensions
            const paddingSize = 80;
            const newWidth = originalWidth + paddingSize;
            const newHeight = originalHeight + paddingSize;
            
            // Create new SVG with padding
            const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            newSvg.setAttribute('width', newWidth.toString());
            newSvg.setAttribute('height', newHeight.toString());
            newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            
            // Add white background
            const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            background.setAttribute('width', '100%');
            background.setAttribute('height', '100%');
            background.setAttribute('fill', 'white');
            newSvg.appendChild(background);
            
            // Clone and center the original SVG content
            const originalContent = svgElement.cloneNode(true) as SVGElement;
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('transform', `translate(${paddingSize/2}, ${paddingSize/2})`);
            
            // Copy all children from original SVG to the group
            while (originalContent.firstChild) {
                group.appendChild(originalContent.firstChild);
            }
            newSvg.appendChild(group);
            
            // Convert to PNG
            const svgData = new XMLSerializer().serializeToString(newSvg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            canvas.width = newWidth * 2;
            canvas.height = newHeight * 2;
            
            img.onload = () => {
                if (ctx) {
                    ctx.scale(2, 2);
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.download = 'income-sankey-chart.png';
                            link.href = url;
                            link.click();
                            URL.revokeObjectURL(url);
                        }
                    }, 'image/png', 1.0);
                }
                URL.revokeObjectURL(svgUrl);
            };
            
            img.src = svgUrl;
        } catch (error) {
            console.error('Error exporting chart:', error);
        }
    };

    // Prepare CSV data for chart controls
    const csvDataForControls = [
        ['Income Source', 'Amount', 'Percentage'],
        ...Array.from(categoryMap.entries()).map(([categoryName, amount]) => [
            categoryName,
            amount.toString(),
            total > 0 ? ((amount / total) * 100).toFixed(1) + '%' : '0.0%'
        ])
    ];

    const ChartContent = () => (
        <div className={isExpanded ? "h-full" : ""}>
            {finalSankeyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <div className="text-6xl mb-4">💰</div>
                    <h3 className="text-lg font-medium mb-2">No Income Data</h3>
                    <p className="text-sm text-center max-w-sm">
                        Add some income entries to see the flow visualization.
                        Your income sources will appear here.
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
                            height: isExpanded ? '600px' : '400px',
                            width: isExpanded ? '90vw' : '95%',
                            minHeight: '400px',
                            position: 'relative',
                            padding: '40px',
                            boxSizing: 'border-box'
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
                    csvFileName="income-distribution"
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    chartRef={chartRef}
                    customDownloadPNG={downloadChartWithPadding}
                />
                <div className={isExpanded ? 'flex-1 mt-4' : ''}>
                    <ChartContent />
                </div>
            </div>
        </div>
    );
}