"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "../../utils/currency";
import { InvestmentInterface } from "../../types/investments";
import { ChartControls } from "../ChartControls";
import { useChartExpansion } from "../../utils/chartUtils";

interface InvestmentTypePolarChartProps {
    investments: InvestmentInterface[];
    currency?: string;
    title?: string;
}

interface TypeData {
    name: string;
    value: number;
    count: number;
    color: string;
}

const INVESTMENT_TYPE_COLORS = {
    STOCKS: '#0088FE',
    CRYPTO: '#00C49F', 
    MUTUAL_FUNDS: '#FFBB28',
    BONDS: '#FF8042',
    REAL_ESTATE: '#8884D8',
    GOLD: '#82CA9D',
    FIXED_DEPOSIT: '#FFC658',
    PROVIDENT_FUNDS: '#FF7C7C',
    SAFE_KEEPINGS: '#8DD1E1',
    OTHER: '#D084D0'
};

const TYPE_LABELS = {
    STOCKS: 'Stocks',
    CRYPTO: 'Cryptocurrency',
    MUTUAL_FUNDS: 'Mutual Funds',
    BONDS: 'Bonds',
    REAL_ESTATE: 'Real Estate',
    GOLD: 'Gold',
    FIXED_DEPOSIT: 'Fixed Deposits',
    PROVIDENT_FUNDS: 'Provident Funds',
    SAFE_KEEPINGS: 'Safe Keepings',
    OTHER: 'Other'
};

export function InvestmentTypePolarChart({ investments, currency = "USD", title }: InvestmentTypePolarChartProps) {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);
    
    // Group investments by type and calculate total invested amounts
    const typeMap = new Map<string, { totalValue: number; count: number }>();
    
    investments.forEach(investment => {
        const type = investment.type || 'OTHER';
        const currentData = typeMap.get(type) || { totalValue: 0, count: 0 };
        
        // Calculate total invested amount (purchase price * quantity for current value)
        // Ensure we handle null/undefined values safely
        const quantity = Number(investment.quantity) || 0;
        const purchasePrice = Number(investment.purchasePrice) || 0;
        const investedAmount = quantity * purchasePrice;
        
        typeMap.set(type, {
            totalValue: currentData.totalValue + investedAmount,
            count: currentData.count + 1
        });
    });

    // Convert to array and add colors
    const rawChartData: TypeData[] = Array.from(typeMap.entries())
        .map(([type, data]) => ({
            name: TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type,
            value: data.totalValue,
            count: data.count,
            color: INVESTMENT_TYPE_COLORS[type as keyof typeof INVESTMENT_TYPE_COLORS] || '#9CA3AF'
        }));

    const totalInvested = rawChartData.reduce((sum, item) => sum + item.value, 0);
    const totalPositions = rawChartData.reduce((sum, item) => sum + item.count, 0);

    // Filter types >= 2% and group smaller ones as "Others"
    const significantTypes = rawChartData.filter(item => {
        const percentage = totalInvested > 0 ? (item.value / totalInvested) * 100 : 0;
        return percentage >= 2;
    });

    const smallTypes = rawChartData.filter(item => {
        const percentage = totalInvested > 0 ? (item.value / totalInvested) * 100 : 0;
        return percentage < 2;
    });

    // Create "Others" category if there are small types
    const chartData: TypeData[] = [...significantTypes];
    if (smallTypes.length > 0) {
        const othersValue = smallTypes.reduce((sum, item) => sum + item.value, 0);
        const othersCount = smallTypes.reduce((sum, item) => sum + item.count, 0);
        chartData.push({
            name: 'Others',
            value: othersValue,
            count: othersCount,
            color: '#9CA3AF' // Gray color for Others category
        });
    }

    // Initialize Chart.js
    useEffect(() => {
        const initChart = async () => {
            if (canvasRef.current && chartData.length > 0 && totalInvested > 0) {
                // Dynamically import Chart.js to avoid SSR issues
                const { Chart, registerables } = await import('chart.js');
                const ChartDataLabels = await import('chartjs-plugin-datalabels');
                Chart.register(...registerables, ChartDataLabels.default);

                // Destroy existing chart if it exists
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }

                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                                    // Filter out any data with zero or negative values
                const validChartData = chartData.filter(item => item.value > 0);
                
                const data = {
                    labels: validChartData.map(item => item.name),
                    datasets: [{
                        label: 'Investment Portfolio',
                        data: validChartData.map(item => item.value),
                        backgroundColor: validChartData.map(item => item.color),
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                };

                    const config = {
                        type: 'polarArea' as const,
                        data: data,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                datalabels: {
                                    display: true,
                                    color: 'white',
                                    font: {
                                        weight: 'bold' as const,
                                        size: 12
                                    },
                                    formatter: function(value: number, context: any) {
                                        const percentage = totalInvested > 0 && value > 0 ? 
                                            ((value / totalInvested) * 100) : 0;
                                        return percentage >= 5 ? `${percentage.toFixed(1)}%` : ''; // Only show if >= 5%
                                    },
                                    anchor: 'center' as const,
                                    align: 'center' as const,
                                    offset: 0,
                                    textAlign: 'center' as const
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context: any) {
                                            const value = context.raw || context.parsed || 0;
                                            const percentage = totalInvested > 0 && value > 0 ? ((value / totalInvested) * 100).toFixed(1) : '0.0';
                                            const dataItem = validChartData[context.dataIndex];
                                            return [
                                                `${context.label}: ${formatCurrency(value, currency)}`,
                                                `Percentage: ${percentage}%`,
                                                `Positions: ${dataItem?.count || 0}`
                                            ];
                                        }
                                    }
                                },
                                legend: {
                                    position: 'right' as const,
                                    labels: {
                                        generateLabels: function(chart: any) {
                                            return validChartData.map((item, index) => {
                                                const percentage = totalInvested > 0 && item.value > 0 ? ((item.value / totalInvested) * 100).toFixed(1) : '0.0';
                                                return {
                                                    text: `${item.name} (${percentage}%)`,
                                                    fillStyle: item.color,
                                                    strokeStyle: item.color,
                                                    lineWidth: 0,
                                                    pointStyle: 'rect' as const,
                                                    datasetIndex: 0,
                                                    index: index
                                                };
                                            });
                                        }
                                    }
                                }
                            },
                            scales: {
                                r: {
                                    beginAtZero: true,
                                    ticks: {
                                        display: false
                                    },
                                    grid: {
                                        color: 'rgba(0, 0, 0, 0.1)'
                                    },
                                    angleLines: {
                                        color: 'rgba(0, 0, 0, 0.1)'
                                    }
                                }
                            }
                        }
                    };

                    chartInstance.current = new Chart(ctx, config);
                }
            }
        };

        initChart();

        // Cleanup function
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [chartData, currency, totalInvested]);

    const chartTitle = title || 'Investment Portfolio by Type';
    const tooltipText = 'Distribution of your investment portfolio across different asset types';

    // Prepare CSV data for chart controls
    const csvDataForControls = [
        ['Investment Type', 'Invested Amount', 'Percentage', 'Positions'],
        ...chartData.map(item => [
            item.name,
            item.value.toString(),
            totalInvested > 0 ? ((item.value / totalInvested) * 100).toFixed(1) + '%' : '0.0%',
            item.count.toString()
        ])
    ];

    // Add detailed breakdown if "Others" category exists
    if (smallTypes.length > 0) {
        csvDataForControls.push(['', '', '', '']); // Empty row for separation
        csvDataForControls.push(['--- Detailed Breakdown ---', '', '', '']);
        csvDataForControls.push(['All Types (including < 2%)', '', '', '']);
        rawChartData.forEach(item => {
            const percentage = totalInvested > 0 ? ((item.value / totalInvested) * 100).toFixed(1) + '%' : '0.0%';
            csvDataForControls.push([item.name, item.value.toString(), percentage, item.count.toString()]);
        });
    }

    const ChartContent = () => (
        <div className={isExpanded ? "h-full" : ""}>
            {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-medium mb-2">No Investment Data</h3>
                    <p className="text-sm text-center max-w-sm">
                        Add some investments to see the distribution chart. 
                        Your portfolio breakdown will appear here.
                    </p>
                </div>
            ) : (
                <div className={isExpanded ? "h-full" : ""}>
                    {/* Chart Container */}
                    <div 
                        className="relative" 
                        style={{ 
                            height: isExpanded ? 'calc(100vh - 200px)' : '400px' 
                        }}
                    >
                        <canvas 
                            ref={canvasRef}
                            className="w-full h-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div 
            ref={chartRef}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 ${
                isExpanded ? 'fixed inset-4 z-50 overflow-auto flex flex-col' : ''
            }`}
        >
            <div className={`${isExpanded ? 'p-4 flex-1 flex flex-col' : 'p-6'}`}>
                <ChartControls
                    title={chartTitle}
                    tooltipText={tooltipText}
                    csvData={csvDataForControls}
                    csvFileName="investment-type-distribution"
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