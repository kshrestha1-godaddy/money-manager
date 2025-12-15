"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine, Cell, Legend } from "recharts";
import { AccountInterface } from "../../../types/accounts";
import { formatCurrency } from "../../../utils/currency";

interface BankBalanceChartProps {
    accounts: AccountInterface[];
    currency?: string;
    withheldAmounts?: Record<string, number>; // Withheld amounts from investments by bank name
}

interface ChartDataPoint {
    bank: string;
    balance: number;
    withheld: number;
    free: number;
    actualFree: number; // Actual free balance (can be negative)
    accountCount: number;
    percentage: number;
    withheldPercentage: number;
    freePercentage: number;
}

export function BankBalanceChart({ accounts, currency = "USD", withheldAmounts = {} }: BankBalanceChartProps) {
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
            .map(([bank, data]) => {
                const withheld = withheldAmounts[bank] || 0;
                const totalBalance = data.balance;
                const actualFree = totalBalance - withheld;
                
                return {
                    bank,
                    balance: totalBalance,
                    withheld: withheld,
                    free: actualFree >= 0 ? actualFree : 0, // Prevent negative free balance for bars
                    actualFree: actualFree, // Store actual free balance (can be negative) for tooltip
                    accountCount: data.accountCount
                };
            })
            .sort((a, b) => b.balance - a.balance); // Sort by total balance descending

        // Calculate total balance for percentage calculation
        const totalBalance = initialPoints.reduce((sum, item) => sum + item.balance, 0);

        // Add percentage to each data point
        const chartDataPoints: ChartDataPoint[] = initialPoints.map(item => {
            const withheldPercentage = item.balance > 0 ? ((item.withheld / item.balance) * 100) : 0;
            const freePercentage = item.balance > 0 ? ((item.actualFree / item.balance) * 100) : 0; // Use actual free for percentage
            
            return {
                ...item,
                percentage: totalBalance > 0 ? ((item.balance / totalBalance) * 100) : 0,
                withheldPercentage,
                freePercentage
            };
        });

        return chartDataPoints;
    }, [accounts, withheldAmounts]);

    const formatTooltip = (value: number, name: string, props: any) => {
        if (name === 'free') {
            return [
                formatCurrency(value, currency),
                'Free Balance'
            ];
        }
        if (name === 'withheld') {
            return [
                formatCurrency(value, currency),
                'Withheld (Investments)'
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


    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Balances</h3>
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
        <div className="bg-white rounded-lg p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-1 sm:gap-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Bank Balances</h3>
                
                <div className="text-xs sm:text-sm text-gray-500">
                    {chartData.length} bank{chartData.length !== 1 ? 's' : ''}
                </div>
            </div>
                         <div className="h-80 sm:h-96 lg:h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5
                        }}
                        maxBarSize={chartData.length === 1 ? 100 : undefined}
                        barCategoryGap={chartData.length === 1 ? "20%" : "10%"}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"
                        vertical={true}
                        horizontal={true}
                        strokeWidth={3}
                        />
                        <ReferenceLine y={0} stroke="#666" strokeWidth={1} />
                        <XAxis
                            dataKey="bank"
                            tick={{ fontSize: 11 }}
                            stroke="#666"
                            height={40}
                            interval={0}
                            textAnchor="middle"
                            axisLine={true}
                            tickLine={true}
                            type="category"
                        />
                        <YAxis
                            tick={{ fontSize: 10 }}
                            stroke="#666"
                            tickFormatter={formatYAxisTick}
                            width={50}
                            domain={chartData.length === 1 ? [0, 'dataMax * 1.2'] : ['dataMin < 0 ? dataMin * 1.1 : 0', 'dataMax * 1.1']}
                            axisLine={true}
                            tickLine={true}
                        />
                        <Tooltip
                            formatter={formatTooltip}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length > 0 && payload[0]) {
                                    const data = payload[0].payload as ChartDataPoint;
                                    return (
                                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 sm:p-3 max-w-xs">
                                            <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2">{label}</p>
                                            <p className="text-xs sm:text-sm text-gray-700 mb-1">
                                                Total Balance: <span className="font-semibold">{formatCurrency(data.balance, currency)}</span>
                                            </p>
                                            <div className="border-t border-gray-200 my-1"></div>
                                            <p className={`text-xs sm:text-sm mb-1 ${data.actualFree >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                Free: <span className="font-semibold">{formatCurrency(data.actualFree, currency)}</span> ({data.freePercentage.toFixed(1)}%)
                                            </p>
                                            <p className="text-xs sm:text-sm text-gray-600 mb-1">
                                                Withheld: <span className="font-semibold">{formatCurrency(data.withheld, currency)}</span> ({data.withheldPercentage.toFixed(1)}%)
                                            </p>
                                            <div className="border-t border-gray-200 my-1"></div>
                                            <p className="text-xs sm:text-sm text-gray-600">
                                                Accounts: {data.accountCount}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Legend 
                            verticalAlign="top" 
                            height={36}
                            iconType="rect"
                            formatter={(value) => {
                                if (value === 'free') return 'Free Balance';
                                if (value === 'withheld') return 'Withheld (Investments)';
                                return value;
                            }}
                        />
                        {/* Free balance bar (bottom of stack) */}
                        <Bar
                            dataKey="free"
                            stackId="balance"
                            fill="#10b981"
                            radius={[0, 0, 0, 0]}
                            minPointSize={2}
                        >
                            {/* Percentage labels for free balance */}
                            <LabelList
                                dataKey="freePercentage"
                                position="center"
                                fill="white"
                                fontSize={10}
                                fontWeight="bold"
                                formatter={(value: number) => value > 5 ? `${value.toFixed(1)}%` : ''}
                            />
                        </Bar>
                        {/* Withheld balance bar (top of stack) */}
                        <Bar
                            dataKey="withheld"
                            stackId="balance"
                            fill="#d1d5db"
                            radius={[4, 4, 0, 0]}
                            minPointSize={2}
                        >
                            {/* Data labels on top of stacked bars showing total */}
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
                            {/* Percentage labels for withheld balance */}
                            <LabelList
                                dataKey="withheldPercentage"
                                position="center"
                                fill="#374151"
                                fontSize={10}
                                fontWeight="bold"
                                formatter={(value: number) => value > 5 ? `${value.toFixed(1)}%` : ''}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
} 