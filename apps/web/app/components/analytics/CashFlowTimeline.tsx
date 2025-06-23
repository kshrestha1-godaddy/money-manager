import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { format, eachDayOfInterval, startOfDay, endOfDay, subDays } from 'date-fns';

interface Transaction {
    amount: number;
    date: Date;
    type: 'income' | 'expense';
}

interface Props {
    transactions: Transaction[];
    currency: string;
    timeframe: 'week' | 'month' | 'quarter' | 'year';
}

export function CashFlowTimeline({ transactions, currency, timeframe }: Props) {
    const timelineData = useMemo(() => {
        // Sort transactions by date
        const sortedTransactions = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
        
        if (!sortedTransactions.length) {
            // If no transactions, show empty chart with last 7 days
            const endDate = new Date();
            const startDate = subDays(endDate, 7);
            
            return eachDayOfInterval({ start: startDate, end: endDate }).map(date => ({
                date: format(date, 'MMM dd'),
                income: 0,
                expenses: 0,
                netFlow: 0,
                balance: 0
            }));
        }

        // Get date range
        const firstTransaction = sortedTransactions[0];
        const lastTransaction = sortedTransactions[sortedTransactions.length - 1];
        
        if (!firstTransaction || !lastTransaction) {
            return [];
        }

        const startDate = startOfDay(firstTransaction.date);
        const endDate = endOfDay(lastTransaction.date);

        // Create daily data points
        const dailyData = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
            const dayTransactions = sortedTransactions.filter(t => 
                startOfDay(t.date).getTime() === startOfDay(date).getTime()
            );

            const income = dayTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            const expenses = dayTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            return {
                date: format(date, 'MMM dd'),
                income,
                expenses,
                netFlow: income - expenses,
                balance: 0 // Will be calculated next
            };
        });

        // Calculate running balance
        let runningBalance = 0;
        dailyData.forEach(day => {
            runningBalance += day.netFlow;
            day.balance = runningBalance;
        });

        return dailyData;
    }, [transactions]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Cash Flow Timeline</h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={timelineData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis tickFormatter={formatCurrency} />
                        <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            labelStyle={{ color: '#374151' }}
                        />
                        <Legend />
                        <ReferenceLine y={0} stroke="#CBD5E1" />
                        <Line
                            type="monotone"
                            dataKey="income"
                            name="Income"
                            stroke="#10B981"
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="expenses"
                            name="Expenses"
                            stroke="#EF4444"
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="balance"
                            name="Running Balance"
                            stroke="#3B82F6"
                            strokeWidth={2}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
} 