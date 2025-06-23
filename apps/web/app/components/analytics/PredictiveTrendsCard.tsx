"use client";

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/currency';

interface Transaction {
    amount: number;
    date: Date;
    category: {
        name: string;
    };
}

interface PredictiveTrendsCardProps {
    transactions: Transaction[];
    currency: string;
    timeframe: 'week' | 'month' | 'quarter' | 'year';
}

export function PredictiveTrendsCard({ transactions, currency, timeframe }: PredictiveTrendsCardProps) {
    const predictions = useMemo(() => {
        if (!transactions.length) return null;

        // Sort transactions by date
        const sortedTransactions = [...transactions].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Group transactions by month
        const monthlyTotals = sortedTransactions.reduce((acc, t) => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            acc[monthKey] = (acc[monthKey] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        // Convert to array and sort by date
        const monthlyData = Object.entries(monthlyTotals)
            .map(([month, total]) => ({ month, total }))
            .sort((a, b) => a.month.localeCompare(b.month)) as { month: string; total: number }[];

        // Calculate moving average and trend
        const movingAverageWindow = 3;
        const movingAverages = monthlyData.map((_, index, array) => {
            if (index < movingAverageWindow - 1) return null;
            
            const sum = array
                .slice(index - movingAverageWindow + 1, index + 1)
                .reduce((acc, item) => acc + item.total, 0);
            
            return sum / movingAverageWindow;
        });

        // Calculate trend using simple linear regression
        const n = monthlyData.length;
        const xValues = Array.from({ length: n }, (_, i) => i);
        const yValues = monthlyData.map(d => d.total);

        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
        const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Generate predictions for next 3 months
        if (monthlyData.length === 0) return null;
        
        const lastMonthData = monthlyData[monthlyData.length - 1];
        if (!lastMonthData) return null;

        const lastMonth = new Date(lastMonthData.month + '-01');
        const predictions = Array.from({ length: 3 }, (_, i) => {
            const predictedDate = new Date(lastMonth);
            predictedDate.setMonth(lastMonth.getMonth() + i + 1);
            const monthKey = `${predictedDate.getFullYear()}-${String(predictedDate.getMonth() + 1).padStart(2, '0')}`;
            const predictedValue = intercept + slope * (n + i);
            return {
                month: monthKey,
                predicted: Math.max(0, predictedValue),
                actual: null
            };
        });

        // Combine historical data with predictions
        const chartData = [
            ...monthlyData.map((data, index) => ({
                month: data.month,
                actual: data.total,
                predicted: null,
                movingAverage: movingAverages[index]
            })),
            ...predictions
        ];

        // Calculate insights
        const averageSpending = sumY / n;
        const lastThreeMonthsAvg = monthlyData.slice(-3).reduce((sum, m) => sum + m.total, 0) / 3;
        const trend = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';
        const predictedNextMonth = predictions[0]?.predicted ?? 0;
        const spendingChange = ((predictedNextMonth - lastThreeMonthsAvg) / lastThreeMonthsAvg) * 100;

        return {
            chartData,
            insights: {
                trend,
                averageSpending,
                lastThreeMonthsAvg,
                predictedNextMonth,
                spendingChange
            }
        };
    }, [transactions]);

    if (!predictions) {
        return (
            <div className="text-gray-500 text-center py-8">
                Not enough data for predictions
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Predictions Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Forecast</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={predictions.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="month" 
                                tick={{ fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                tickFormatter={(value) => formatCurrency(value, currency)}
                                width={80}
                            />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value, currency)}
                                labelFormatter={(label) => `Month: ${label}`}
                            />
                            <Line
                                type="monotone"
                                dataKey="actual"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                name="Actual"
                            />
                            <Line
                                type="monotone"
                                dataKey="predicted"
                                stroke="#ef4444"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ r: 4 }}
                                name="Predicted"
                            />
                            <Line
                                type="monotone"
                                dataKey="movingAverage"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={false}
                                name="3-Month Average"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Insights */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Trends */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Trends</h4>
                        <div className="space-y-3">
                            <div>
                                <div className="text-sm text-gray-600">Average Monthly Spending</div>
                                <div className="text-lg font-semibold">
                                    {formatCurrency(predictions.insights.averageSpending, currency)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Last 3 Months Average</div>
                                <div className="text-lg font-semibold">
                                    {formatCurrency(predictions.insights.lastThreeMonthsAvg, currency)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Spending Trend</div>
                                <div className={`text-lg font-semibold ${
                                    predictions.insights.trend === 'increasing' ? 'text-red-600' :
                                    predictions.insights.trend === 'decreasing' ? 'text-green-600' :
                                    'text-blue-600'
                                }`}>
                                    {predictions.insights.trend.charAt(0).toUpperCase() + predictions.insights.trend.slice(1)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Predictions */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Next Month Prediction</h4>
                        <div className="space-y-3">
                            <div>
                                <div className="text-sm text-gray-600">Predicted Spending</div>
                                <div className="text-lg font-semibold">
                                    {formatCurrency(predictions.insights.predictedNextMonth, currency)}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Expected Change</div>
                                <div className={`text-lg font-semibold ${
                                    predictions.insights.spendingChange > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                    {predictions.insights.spendingChange > 0 ? '↑' : '↓'} {
                                        Math.abs(predictions.insights.spendingChange).toFixed(1)
                                    }%
                                </div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-md mt-2">
                                <div className="text-sm text-gray-600">
                                    {predictions.insights.spendingChange > 10 ? (
                                        '⚠️ Spending is predicted to increase significantly. Consider reviewing your budget.'
                                    ) : predictions.insights.spendingChange < -10 ? (
                                        '👍 Your spending is trending down nicely!'
                                    ) : (
                                        '✓ Spending is expected to remain relatively stable.'
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 