import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Transaction {
    amount: number;
    date: Date;
    category: {
        name: string;
    };
    title: string;
}

interface Props {
    transactions: Transaction[];
    currency: string;
    timeframe: 'week' | 'month' | 'quarter' | 'year';
}

export function RecurringExpensesCard({ transactions, currency, timeframe }: Props) {
    const recurringExpenses = useMemo(() => {
        const expenseMap = new Map<string, { count: number; total: number; average: number }>();

        // Group transactions by title
        transactions.forEach(transaction => {
            const key = `${transaction.title}-${transaction.category.name}`;
            const existing = expenseMap.get(key) || { count: 0, total: 0, average: 0 };
            
            existing.count += 1;
            existing.total += transaction.amount;
            existing.average = existing.total / existing.count;
            
            expenseMap.set(key, existing);
        });

        // Filter for recurring expenses based on frequency
        const minOccurrences = timeframe === 'week' ? 2 :
            timeframe === 'month' ? 3 :
            timeframe === 'quarter' ? 6 : 12;

        return Array.from(expenseMap.entries())
            .filter(([_, data]) => data.count >= minOccurrences)
            .map(([title, data]) => ({
                name: title.split('-')[0],
                category: title.split('-')[1],
                amount: data.total,
                frequency: data.count,
                average: data.average
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5); // Top 5 recurring expenses
    }, [transactions, timeframe]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Top Recurring Expenses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={recurringExpenses}
                                dataKey="amount"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                                {recurringExpenses.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            {/* <Legend /> */}
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Details List */}
                <div className="space-y-4">
                    {recurringExpenses.map((expense, index) => (
                        <div key={index} className="flex justify-between items-start">
                            <div>
                                <div className="font-medium text-gray-700">{expense.name}</div>
                                <div className="text-sm text-gray-500">{expense.category}</div>
                                <div className="text-sm text-gray-500">
                                    {expense.frequency}x in this {timeframe}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-medium text-gray-700">{formatCurrency(expense.amount)}</div>
                                <div className="text-sm text-gray-500">
                                    Avg: {formatCurrency(expense.average)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 