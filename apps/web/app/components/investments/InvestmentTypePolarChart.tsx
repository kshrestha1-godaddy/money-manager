"use client";

import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { PolarArea } from 'react-chartjs-2';
import { formatCurrency } from "../../utils/currency";
import { InvestmentInterface } from "../../types/investments";
import { ChartControls } from "../ChartControls";
import { useChartExpansion } from "../../utils/chartUtils";

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

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
    const chartRef = React.useRef<HTMLDivElement>(null);

    const processedData = useMemo(() => {
        // Group investments by type and calculate total invested amounts
        const typeMap = new Map<string, { totalValue: number; count: number }>();
        
        investments.forEach(investment => {
            const type = investment.type || 'OTHER';
            const currentData = typeMap.get(type) || { totalValue: 0, count: 0 };
            
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
            }))
            .sort((a, b) => b.value - a.value);

        const totalInvested = rawChartData.reduce((sum, item) => sum + item.value, 0);

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
        const processedChartData = [...significantTypes];
        if (smallTypes.length > 0) {
            const othersValue = smallTypes.reduce((sum, item) => sum + item.value, 0);
            const othersCount = smallTypes.reduce((sum, item) => sum + item.count, 0);
            processedChartData.push({
                name: 'Others',
                value: othersValue,
                count: othersCount,
                color: '#9CA3AF'
            });
        }

        return {
            data: processedChartData,
            totalInvested,
            smallTypes
        };
    }, [investments]);

    const { data, totalInvested, smallTypes } = processedData;
    const totalPositions = data.reduce((sum, item) => sum + item.count, 0);

    // Chart.js data structure for react-chartjs-2
    const chartData = useMemo(() => ({
        labels: data.map(item => item.name),
        datasets: [
            {
                label: 'Investment Distribution',
                data: data.map(item => item.value),
                backgroundColor: data.map(item => item.color),
                borderColor: '#fff',
                borderWidth: 2,
            },
        ],
    }), [data]);

    // Chart options
    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1500,
        },
        plugins: {
            legend: {
                display: false, // We'll use our custom legend
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1f2937',
                bodyColor: '#374151',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                cornerRadius: 6,
                callbacks: {
                    title: function(tooltipItems: any[]) {
                        const index = tooltipItems[0]?.dataIndex;
                        return data[index]?.name || '';
                    },
                    label: function(context: any) {
                        const index = context.dataIndex;
                        const item = data[index];
                        if (!item) return '';
                        
                        const percentage = totalInvested > 0 ? ((item.value / totalInvested) * 100).toFixed(1) : '0.0';
                        const positions = item.count;
                        
                        const lines = [
                            `${formatCurrency(item.value, currency)} (${percentage}%)`,
                            `${positions} position${positions !== 1 ? 's' : ''}`
                        ];
                        
                        // Add detailed breakdown for Others category
                        if (item.name === 'Others' && smallTypes.length > 0) {
                            lines.push('Includes: ' + smallTypes.map(type => type.name).join(', '));
                        }
                        
                        return lines;
                    }
                }
            }
        },
        scales: {
            r: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                },
                angleLines: {
                    color: 'rgba(0, 0, 0, 0.1)',
                },
                pointLabels: {
                    color: '#374151',
                    font: {
                        size: isExpanded ? 12 : 10,
                    }
                },
                ticks: {
                    display: false, // Hide radial ticks
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'nearest' as const,
        }
    }), [data, totalInvested, smallTypes, currency, isExpanded]);

    const chartTitle = title || 'Investment Portfolio by Type';
    const tooltipText = 'Distribution of your investment portfolio across different asset types';

    // Prepare CSV data for chart controls - memoized to prevent recalculation
    const csvDataForControls = useMemo(() => {
        const csvData = [
            ['Investment Type', 'Invested Amount', 'Percentage', 'Positions'],
            ...data.map(item => [
                item.name,
                item.value.toString(),
                totalInvested > 0 ? ((item.value / totalInvested) * 100).toFixed(1) + '%' : '0.0%',
                item.count.toString()
            ])
        ];

        // Add detailed breakdown if "Others" category exists
        if (smallTypes.length > 0) {
            csvData.push(['', '', '', '']); // Empty row for separation
            csvData.push(['--- Detailed Breakdown ---', '', '', '']);
            csvData.push(['All Types (including < 2%)', '', '', '']);
            [...data.filter(item => item.name !== 'Others'), ...smallTypes].forEach(item => {
                const percentage = totalInvested > 0 ? ((item.value / totalInvested) * 100).toFixed(1) + '%' : '0.0%';
                csvData.push([item.name, item.value.toString(), percentage, item.count.toString()]);
            });
        }

        return csvData;
    }, [data, totalInvested, smallTypes]);

    const ChartContent = () => (
        <div>
            <div className="flex justify-start items-center mb-2 sm:mb-3">
                <div className="text-left">
                    <p className="text-xs sm:text-sm text-gray-600">Total Invested</p>
                    <p className="text-base sm:text-lg font-semibold text-blue-600">
                        {formatCurrency(totalInvested, currency)}
                    </p>
                    <p className="text-xs text-gray-500">{totalPositions} position{totalPositions !== 1 ? 's' : ''}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-1 sm:gap-2">
                {/* Polar Chart */}
                <div 
                    ref={chartRef} 
                    className={`${isExpanded ? "h-[50rem]" : "h-[24rem] sm:h-[26rem] md:h-[28rem]"} lg:col-span-3 flex items-center justify-center`}
                    role="img"
                    aria-label={`Investment portfolio distribution polar chart showing ${formatCurrency(totalInvested, currency)} across different investment types`}
                >
                    <div className="relative w-full h-full">
                        <PolarArea data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* Legend and breakdown */}
                <div className="lg:col-span-2 space-y-1">
                    <h4 className="text-sm font-medium text-gray-900">Type Breakdown</h4>
                    <div className="space-y-1 max-h-48 sm:max-h-64 overflow-y-auto">
                        {data.map((entry, index) => {
                            const percentage = totalInvested > 0 ? ((entry.value / totalInvested) * 100).toFixed(1) : '0.0';
                            const isOthers = entry.name === 'Others';
                            
                            return (
                                <div key={entry.name}>
                                    <div className="flex items-center justify-between gap-1">
                                        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                            <div
                                                className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: entry.color }}
                                            />
                                            <span className="text-xs sm:text-sm text-gray-700 truncate">{entry.name}</span>
                                            <span className="text-xs text-gray-500">
                                                ({entry.count})
                                            </span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-xs sm:text-sm font-medium text-gray-900">
                                                {formatCurrency(entry.value, currency)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {percentage}%
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Show breakdown for Others category */}
                                    {isOthers && smallTypes.length > 0 && (
                                        <div className="ml-3 mt-1 space-y-1">
                                            {smallTypes.map((smallType) => {
                                                const smallPercentage = totalInvested > 0 ? ((smallType.value / totalInvested) * 100).toFixed(1) : '0.0';
                                                return (
                                                    <div key={smallType.name} className="flex items-center justify-between text-xs text-gray-500">
                                                        <span className="truncate">• {smallType.name} ({smallType.count})</span>
                                                        <span className="flex-shrink-0 ml-2">
                                                            {formatCurrency(smallType.value, currency)} ({smallPercentage}%)
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

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-2 sm:p-3 md:p-4" data-chart-type="investment-type-polar">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{chartTitle}</h3>
                </div>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    No investment data available
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow p-2 sm:p-3 md:p-4" data-chart-type="investment-type-polar">
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName="investment-type-polar-chart"
                    csvData={csvDataForControls}
                    csvFileName="investment-type-polar-data"
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
}