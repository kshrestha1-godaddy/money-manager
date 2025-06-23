import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface Transaction {
    amount: number;
    category: {
        name: string;
        budget?: number;
    };
}

interface Props {
    transactions: Transaction[];
    currency: string;
}

export function BudgetComparisonCard({ transactions, currency }: Props) {
    const budgetData = useMemo(() => {
        const categoryMap = new Map<string, { actual: number; budget: number }>();

        // Sum up actual spending by category
        transactions.forEach(transaction => {
            const existing = categoryMap.get(transaction.category.name) || { 
                actual: 0, 
                budget: transaction.category.budget || 0 
            };
            existing.actual += transaction.amount;
            categoryMap.set(transaction.category.name, existing);
        });

        return Array.from(categoryMap.entries())
            .map(([category, data]) => ({
                category,
                actual: data.actual,
                budget: data.budget,
                variance: data.budget - data.actual,
                percentageUsed: data.budget ? (data.actual / data.budget) * 100 : 0
            }))
            .filter(item => item.budget > 0) // Only show categories with budgets
            .sort((a, b) => b.percentageUsed - a.percentageUsed);
    }, [transactions]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const getVarianceColor = (variance: number) => {
        return variance >= 0 ? '#10B981' : '#EF4444';
    };

    const getPercentageColor = (percentage: number) => {
        if (percentage <= 80) return '#10B981';
        if (percentage <= 100) return '#F59E0B';
        return '#EF4444';
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Budget vs Actual</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart */}
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={budgetData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            layout="vertical"
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={formatCurrency} />
                            <YAxis type="category" dataKey="category" width={100} />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                labelStyle={{ color: '#374151' }}
                            />
                            <Legend />
                            <Bar dataKey="budget" name="Budget" fill="#94A3B8" />
                            <Bar dataKey="actual" name="Actual" fill="#3B82F6">
                                {budgetData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`}
                                        fill={getPercentageColor(entry.percentageUsed)}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Details List */}
                <div className="space-y-4 overflow-y-auto max-h-80">
                    {budgetData.map((item, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-medium text-gray-700">{item.category}</div>
                                    <div className="text-sm text-gray-500">
                                        {item.percentageUsed.toFixed(1)}% of budget used
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-gray-700">
                                        {formatCurrency(item.actual)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        of {formatCurrency(item.budget)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span>Remaining:</span>
                                <span className={`font-medium ${
                                    item.variance >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {formatCurrency(Math.abs(item.variance))}
                                    {item.variance >= 0 ? ' under' : ' over'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
} 