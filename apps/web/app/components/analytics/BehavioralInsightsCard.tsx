"use client";

import { useMemo } from 'react';
import { formatCurrency } from '../../utils/currency';

interface Transaction {
    amount: number;
    date: Date;
    category: {
        name: string;
    };
}

interface BehavioralInsightsCardProps {
    transactions: Transaction[];
    currency: string;
    timeframe: 'week' | 'month' | 'quarter' | 'year';
}

export function BehavioralInsightsCard({ transactions, currency, timeframe }: BehavioralInsightsCardProps) {
    const insights = useMemo(() => {
        if (!transactions.length) return null;

        // Sort transactions by date
        const sortedTransactions = [...transactions].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Calculate average transaction size
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        const averageAmount = totalAmount / transactions.length;

        // Find large transactions (>150% of average)
        const largeTransactions = transactions.filter(t => t.amount > averageAmount * 1.5);

        // Group by category
        const categoryTotals = transactions.reduce((acc, t) => {
            const cat = t.category.name;
            acc[cat] = (acc[cat] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        // Find frequent categories (top 3)
        const frequentCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

        // Analyze spending patterns
        const now = new Date();
        const recentTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
        });

        const recentTotal = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
        const averageWeeklySpending = totalAmount / (transactions.length / 7);
        const isHighSpendingWeek = recentTotal > averageWeeklySpending * 1.2;

        return {
            totalSpent: totalAmount,
            averageTransaction: averageAmount,
            largeTransactions: largeTransactions.length,
            topCategories: frequentCategories,
            recentSpending: recentTotal,
            isHighSpendingPeriod: isHighSpendingWeek
        };
    }, [transactions]);

    if (!insights) {
        return (
            <div className="text-gray-500 text-center py-8">
                No transaction data available for analysis
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-3 sm:p-4 rounded-lg shadow text-center sm:text-left">
                    <div className="text-sm text-gray-600">Total Spent</div>
                    <div className="text-lg sm:text-xl font-semibold text-gray-900">
                        {formatCurrency(insights.totalSpent, currency)}
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg shadow text-center sm:text-left">
                    <div className="text-sm text-gray-600">Avg Transaction</div>
                    <div className="text-lg sm:text-xl font-semibold text-gray-900">
                        {formatCurrency(insights.averageTransaction, currency)}
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg shadow text-center sm:text-left">
                    <div className="text-sm text-gray-600">Large Transactions</div>
                    <div className="text-lg sm:text-xl font-semibold text-gray-900">
                        {insights.largeTransactions}
                    </div>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg shadow text-center sm:text-left">
                    <div className="text-sm text-gray-600">Recent Spending</div>
                    <div className="text-lg sm:text-xl font-semibold text-gray-900">
                        {formatCurrency(insights.recentSpending, currency)}
                    </div>
                </div>
            </div>

            {/* Behavioral Insights */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Behavior Insights</h3>
                <div className="space-y-4">
                    {/* Top Categories */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Most Frequent Categories</h4>
                        <div className="space-y-2">
                            {insights.topCategories.map(([category, amount]) => (
                                <div key={category} className="flex justify-between items-center">
                                    <span className="text-gray-600">{category}</span>
                                    <span className="font-medium">{formatCurrency(amount, currency)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Spending Alerts */}
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Spending Alerts</h4>
                        <div className="space-y-2">
                            {insights.isHighSpendingPeriod && (
                                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md">
                                    ⚠️ Your recent spending is higher than usual
                                </div>
                            )}
                            {insights.largeTransactions > 0 && (
                                <div className="bg-blue-50 text-blue-800 p-3 rounded-md">
                                    ℹ️ You had {insights.largeTransactions} large transactions this period
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
                        <ul className="list-disc list-inside space-y-2 text-gray-600">
                            {insights.isHighSpendingPeriod && (
                                <li>Consider reviewing your recent expenses to identify areas for reduction</li>
                            )}
                            {insights.largeTransactions > 2 && (
                                <li>Try to spread out large purchases across different periods</li>
                            )}
                            {insights.topCategories.length > 0 && insights.topCategories[0] && (
                                <li>
                                    Your highest spending category is {insights.topCategories[0][0]} - 
                                    consider setting a budget for this category
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
} 