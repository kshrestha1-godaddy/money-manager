"use client";

import { useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine, Cell } from "recharts";
import { AccountInterface } from "../types/accounts";
import { formatCurrency } from "../utils/currency";
import { ChartControls } from "./ChartControls";
import { useChartExpansion } from "../utils/chartUtils";

interface BankBalanceChartProps {
    accounts: AccountInterface[];
    currency?: string;
}

interface ChartDataPoint {
    bank: string;
    balance: number;
    accountCount: number;
    percentage: number;
}

export function BankBalanceChart({ accounts, currency = "USD" }: BankBalanceChartProps) {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    
    const chartData = useMemo(() => {
        // Group accounts by bank and calculate total balance per bank
        const bankMap = new Map<string, { balance: number; accountCount: number }>();
        
        accounts.forEach(account => {
            const bankName = account.bankName;
            const balance = account.balance || 0;
            
            if (bankMap.has(bankName)) {
                const existing = bankMap.get(bankName)!;
                bankMap.set(bankName, {
                    balance: existing.balance + balance,
                    accountCount: existing.accountCount + 1
                });
            } else {
                bankMap.set(bankName, {
                    balance: balance,
                    accountCount: 1
                });
            }
        });

        // Convert to array format for chart and calculate total balance
        const initialPoints = Array.from(bankMap.entries())
            .map(([bank, data]) => ({
                bank,
                balance: data.balance,
                accountCount: data.accountCount
            }))
            .sort((a, b) => b.balance - a.balance); // Sort by balance descending

        // Calculate total balance for percentage calculation
        const totalBalance = initialPoints.reduce((sum, item) => sum + item.balance, 0);
        
        // Add percentage to each data point
        const chartDataPoints: ChartDataPoint[] = initialPoints.map(item => ({
            ...item,
            percentage: totalBalance > 0 ? ((item.balance / totalBalance) * 100) : 0
        }));

        return chartDataPoints;
    }, [accounts]);

    // Prepare CSV data for export
    const csvData = [
        ['Bank', 'Total Balance', 'Account Count', 'Percentage'],
        ...chartData.map(item => [
            item.bank,
            item.balance.toString(),
            item.accountCount.toString(),
            item.percentage.toFixed(1) + '%'
        ])
    ];

    const formatTooltip = (value: number, name: string, props: any) => {
        if (name === 'balance') {
            return [
                formatCurrency(value, currency), 
                'Total Balance'
            ];
        }
        return [value, name];
    };

    const formatYAxisTick = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return formatCurrency(value, currency);
    };

    // Data label formatter with 3 decimal precision for top labels
    const formatDataLabel = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(3)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(3)}K`;
        }
        return formatCurrency(value, currency);
    };

    const renderCustomLabel = (props: any) => {
        const { x, y, width, height, payload } = props;
        
        // Debug log to see what data we're getting
        console.log('Label props:', props);
        
        // Check if payload exists and has percentage property
        if (!payload || typeof payload.percentage !== 'number') {
            console.log('No valid payload or percentage:', payload);
            return null;
        }
        
        const percentage = payload.percentage;
        
        // Temporarily remove the 5% filter to see all labels
        // if (percentage < 5) return null;
        
        return (
            <text
                x={x + width / 2}
                y={y + height / 2}
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="bold"
            >
                {`${percentage.toFixed(1)}%`}
            </text>
        );
    };

    const ChartContent = () => (
        <div>
            <div 
                ref={chartRef}
                className={`${isExpanded ? 'h-[60vh] w-full' : 'h-36 sm:h-[200px] lg:h-[300px] xl:h-[400px] w-full'}`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 20,
                            right: 15,
                            left: 20,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <ReferenceLine y={0} stroke="#666" strokeWidth={1} />
                        <XAxis 
                            dataKey="bank" 
                            tick={{ fontSize: 11 }}
                            stroke="#666"
                            height={40}
                            interval={0}
                            textAnchor="middle"
                        />
                        <YAxis 
                            tick={{ fontSize: 10 }}
                            stroke="#666"
                            tickFormatter={formatYAxisTick}
                            width={40}
                            domain={['dataMin < 0 ? dataMin * 1.1 : 0', 'dataMax * 1.1']}
                        />
                        <Tooltip 
                            formatter={formatTooltip}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length > 0 && payload[0]) {
                                    const data = payload[0].payload as ChartDataPoint;
                                    return (
                                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 sm:p-3 max-w-xs">
                                            <p className="text-xs sm:text-sm font-medium text-gray-900 mb-1">{label}</p>
                                            <p className="text-xs sm:text-sm text-blue-600">
                                                Balance: {formatCurrency(data.balance, currency)}
                                            </p>
                                            <p className="text-xs sm:text-sm text-gray-600">
                                                Accounts: {data.accountCount}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar 
                            dataKey="balance" 
                            radius={[4, 4, 0, 0]}
                        >
                            {/* Conditional colors for positive/negative values */}
                            {chartData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.balance >= 0 ? "#3b82f6" : "#ef4444"} 
                                />
                            ))}
                            {/* Data labels on top of bars */}
                            <LabelList 
                                dataKey="balance" 
                                position="top" 
                                formatter={formatDataLabel}
                                style={{ 
                                    fill: '#374151',
                                    fontSize: '11px',
                                    fontWeight: '600'
                                }}
                            />
                            {/* Percentage labels inside bars */}
                            <LabelList 
                                dataKey="percentage" 
                                position="center" 
                                fill="white"
                                fontSize={9}
                                fontWeight="bold"
                                formatter={(value: number) => `${value.toFixed(1)}%`}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-3 sm:p-6" data-chart-type="bank-balance">
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName="bank-balance-chart"
                    csvData={csvData}
                    csvFileName="bank-balance-data"
                    title="Bank Balances"
                    tooltipText="Distribution of account balances across different banks"
                />
                <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                        <div className="text-4xl mb-2">🏦</div>
                        <p>No account data to display</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div 
                className="bg-white rounded-lg shadow p-3 sm:p-6" 
                role="region"
                aria-label="Bank Balance Chart"
                data-chart-type="bank-balance"
            >
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName="bank-balance-chart"
                    csvData={csvData}
                    csvFileName="bank-balance-data"
                    title="Bank Balances"
                    tooltipText="Distribution of account balances across different banks"
                />
                
                {/* Summary Stats */}
                <div className="mb-3 sm:mb-4">
                    <div className="text-xs sm:text-sm text-gray-500">
                        {chartData.length} bank{chartData.length !== 1 ? 's' : ''} • Total Balance: {formatCurrency(chartData.reduce((sum, item) => sum + item.balance, 0), currency)}
                    </div>
                </div>
                
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-[95%] w-full max-h-[95%] overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-semibold">Bank Balances</h2>
                                <p className="text-sm text-gray-500">Distribution of account balances across different banks</p>
                            </div>
                            <button
                                onClick={toggleExpanded}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base"
                            >
                                Close
                            </button>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="mb-4">
                            <div className="text-sm text-gray-500">
                                {chartData.length} bank{chartData.length !== 1 ? 's' : ''} • Total Balance: {formatCurrency(chartData.reduce((sum, item) => sum + item.balance, 0), currency)}
                            </div>
                        </div>
                        
                        <ChartContent />
                    </div>
                </div>
            )}
        </>
    );
} 