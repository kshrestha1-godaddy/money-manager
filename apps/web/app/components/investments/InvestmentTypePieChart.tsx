"use client";

import { useState, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "../../utils/currency";
import { InvestmentInterface } from "../../types/investments";
import { ChartControls } from "../ChartControls";
import { useChartExpansion } from "../../utils/chartUtils";

interface InvestmentTypePieChartProps {
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

export function InvestmentTypePieChart({ investments, currency = "USD", title }: InvestmentTypePieChartProps) {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    
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
        }))
        .sort((a, b) => b.value - a.value); // Sort by value descending

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

    const formatTooltip = (value: number, name: string): [string, string] => {
        const percentage = totalInvested > 0 ? ((value / totalInvested) * 100).toFixed(1) : '0.0';
        const typeData = chartData.find(item => item.name === name);
        const count = typeData?.count || 0;
        
        // For "Others" category, show additional details
        if (name === 'Others' && smallTypes.length > 0) {
            const typeNames = smallTypes.map(type => type.name).join(', ');
            return [
                `${formatCurrency(value, currency)} (${percentage}%) - ${count} positions - Includes: ${typeNames}`,
                name
            ];
        }
        
        return [
            `${formatCurrency(value, currency)} (${percentage}%) - ${count} position${count !== 1 ? 's' : ''}`,
            name
        ];
    };

    interface LabelEntry {
        value: number;
    }

    const renderCustomizedLabel = (entry: any): string => {
        const percentage = totalInvested > 0 ? ((entry.value / totalInvested) * 100).toFixed(1) : '0.0';
        return `${entry.name} (${percentage}%)`;
    };

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
        <div>
            <div className="flex justify-start items-center mb-3 sm:mb-4">
                <div className="text-left">
                    <p className="text-xs sm:text-sm text-gray-600">Total Invested</p>
                    <p className="text-base sm:text-lg font-semibold text-blue-600">
                        {formatCurrency(totalInvested, currency)}
                    </p>
                    <p className="text-xs text-gray-500">{totalPositions} position{totalPositions !== 1 ? 's' : ''}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {/* Pie Chart */}
                <div 
                    ref={chartRef} 
                    className={`${isExpanded ? "h-[45rem]" : "h-[24rem] sm:h-[32rem] md:h-[38rem]"} lg:col-span-2`}
                    role="img"
                    aria-label={`Investment portfolio distribution pie chart showing ${formatCurrency(totalInvested, currency)} across different investment types`}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                outerRadius={isExpanded ? 200 : 160}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={formatTooltip}
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    fontSize: '10px',
                                    maxWidth: '320px',
                                    wordWrap: 'break-word',
                                    whiteSpace: 'normal',
                                    lineHeight: '1.4'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend and breakdown */}
                <div className="space-y-2 sm:space-y-3">
                    <h4 className="text-sm sm:text-base font-medium text-gray-900">Type Breakdown</h4>
                    <div className="space-y-1 sm:space-y-2 max-h-60 sm:max-h-80 overflow-y-auto">
                        {chartData.map((entry, index) => {
                            const percentage = totalInvested > 0 ? ((entry.value / totalInvested) * 100).toFixed(1) : '0.0';
                            const isOthers = entry.name === 'Others';
                            
                            return (
                                <div key={entry.name}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            <div
                                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: entry.color }}
                                            />
                                            <span className="text-sm sm:text-base text-gray-700 truncate">{entry.name}</span>
                                            <span className="text-xs text-gray-500">
                                                ({entry.count})
                                            </span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-sm sm:text-base font-medium text-gray-900">
                                                {formatCurrency(entry.value, currency)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {percentage}%
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Show breakdown for Others category */}
                                    {isOthers && smallTypes.length > 0 && (
                                        <div className="ml-4 sm:ml-5 mt-1 space-y-1">
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

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6" data-chart-type="investment-type-pie">
                <div className="flex justify-between items-center mb-4">
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
            <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6" data-chart-type="investment-type-pie">
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName="investment-type-chart"
                    csvData={csvDataForControls}
                    csvFileName="investment-type-data"
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