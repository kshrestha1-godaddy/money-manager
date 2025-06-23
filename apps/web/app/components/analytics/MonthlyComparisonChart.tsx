import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

interface MonthlyData {
    date: Date;
    amount: number;
    type: 'income' | 'expense';
}

interface Props {
    transactions: MonthlyData[];
    currency: string;
}

export function MonthlyComparisonChart({ transactions, currency }: Props) {
    const monthlyData = useMemo(() => {
        const monthMap = new Map<string, { income: number; expenses: number }>();

        transactions.forEach(transaction => {
            const monthKey = format(transaction.date, 'MMM yyyy');
            const existing = monthMap.get(monthKey) || { income: 0, expenses: 0 };

            if (transaction.type === 'income') {
                existing.income += transaction.amount;
            } else {
                existing.expenses += transaction.amount;
            }

            monthMap.set(monthKey, existing);
        });

        return Array.from(monthMap.entries())
            .map(([month, data]) => ({
                month,
                income: data.income,
                expenses: data.expenses,
                savings: data.income - data.expenses
            }))
            .sort((a, b) => {
                const [monthA, yearA] = a.month.split(' ');
                const [monthB, yearB] = b.month.split(' ');
                return new Date(`${monthA} 1, ${yearA}`).getTime() - new Date(`${monthB} 1, ${yearB}`).getTime();
            })
            .slice(-6); // Show last 6 months
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
        <div className="w-full h-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Income vs Expenses</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: '#374151' }}
                    />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10B981" />
                    <Bar dataKey="expenses" name="Expenses" fill="#EF4444" />
                    <Bar dataKey="savings" name="Savings" fill="#3B82F6" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
} 