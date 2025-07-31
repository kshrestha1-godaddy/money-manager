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

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

interface InvestmentTypePolarChartProps {
    investments: InvestmentInterface[];
    currency?: string;
    title?: string;
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
    // Process data - group by investment type
    const chartData = useMemo(() => {
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

        // Convert to arrays
        const labels: string[] = [];
        const data: number[] = [];
        const backgroundColor: string[] = [];
        
        Array.from(typeMap.entries())
            .sort(([, a], [, b]) => b.totalValue - a.totalValue)
            .forEach(([type, typeData]) => {
                labels.push(TYPE_LABELS[type as keyof typeof TYPE_LABELS] || type);
                data.push(typeData.totalValue);
                backgroundColor.push(INVESTMENT_TYPE_COLORS[type as keyof typeof INVESTMENT_TYPE_COLORS] || '#9CA3AF');
            });

        return {
            labels,
            datasets: [{
                label: 'Investment Distribution',
                data,
                backgroundColor,
                borderColor: '#fff',
                borderWidth: 2,
            }]
        };
    }, [investments]);

    // Chart options
    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1500,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1f2937',
                bodyColor: '#374151',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                cornerRadius: 6,
                callbacks: {
                    label: function(context: any) {
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                        return `${formatCurrency(value, currency)} (${percentage}%)`;
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
                        size: 10,
                    }
                },
                ticks: {
                    display: false,
                }
            }
        },
    }), [currency]);

    const totalInvested = chartData.datasets[0]?.data?.reduce((sum, val) => sum + val, 0) || 0;

    if (!investments.length) {
        return (
            <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {title || 'Investment Portfolio by Type'}
                </h3>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    No investment data available
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    {title || 'Investment Portfolio by Type'}
                </h3>
                <p className="text-sm text-gray-600">Total Invested: {formatCurrency(totalInvested, currency)}</p>
            </div>
            
            <div className="h-80">
                <PolarArea data={chartData} options={options} />
            </div>
            
            {/* Simple legend */}
            <div className="mt-4 grid grid-cols-2 gap-2">
                {chartData.labels.map((label, index) => (
                    <div key={label} className="flex items-center space-x-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: chartData.datasets[0]?.backgroundColor[index] }}
                        />
                        <span className="text-xs text-gray-700">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}