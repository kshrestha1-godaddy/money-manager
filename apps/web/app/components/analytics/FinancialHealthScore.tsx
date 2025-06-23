"use client";

import { useMemo } from 'react';
import { formatCurrency } from '../../utils/currency';

interface FinancialData {
    income: number;
    expenses: number;
    savings: number;
    debt: number;
    investments: number;
}

interface FinancialHealthScoreProps {
    data: FinancialData;
    currency: string;
}

interface HealthMetric {
    name: string;
    score: number;
    status: 'good' | 'warning' | 'danger';
    description: string;
}

export function FinancialHealthScore({ data, currency }: FinancialHealthScoreProps) {
    const metrics = useMemo(() => {
        const { income, expenses, savings, debt, investments } = data;

        // Calculate key ratios
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;
        const debtToIncomeRatio = income > 0 ? (debt / income) * 100 : 0;
        const expenseToIncomeRatio = income > 0 ? (expenses / income) * 100 : 0;
        const investmentRate = income > 0 ? (investments / income) * 100 : 0;

        const healthMetrics: HealthMetric[] = [
            {
                name: 'Savings Rate',
                score: Math.min(100, (savingsRate / 20) * 100), // Target: 20% savings rate
                status: savingsRate >= 20 ? 'good' : savingsRate >= 10 ? 'warning' : 'danger',
                description: `You're saving ${savingsRate.toFixed(1)}% of your income`
            },
            {
                name: 'Debt Management',
                score: Math.max(0, 100 - debtToIncomeRatio), // Lower is better
                status: debtToIncomeRatio <= 30 ? 'good' : debtToIncomeRatio <= 40 ? 'warning' : 'danger',
                description: `Your debt is ${debtToIncomeRatio.toFixed(1)}% of your income`
            },
            {
                name: 'Expense Control',
                score: Math.max(0, 100 - expenseToIncomeRatio), // Lower is better
                status: expenseToIncomeRatio <= 70 ? 'good' : expenseToIncomeRatio <= 85 ? 'warning' : 'danger',
                description: `You spend ${expenseToIncomeRatio.toFixed(1)}% of your income`
            },
            {
                name: 'Investment Health',
                score: Math.min(100, (investmentRate / 15) * 100), // Target: 15% investment rate
                status: investmentRate >= 15 ? 'good' : investmentRate >= 7 ? 'warning' : 'danger',
                description: `You invest ${investmentRate.toFixed(1)}% of your income`
            }
        ];

        const overallScore = Math.round(
            healthMetrics.reduce((sum, metric) => sum + metric.score, 0) / healthMetrics.length
        );

        return {
            metrics: healthMetrics,
            overallScore
        };
    }, [data]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getStatusBadge = (status: 'good' | 'warning' | 'danger') => {
        switch (status) {
            case 'good':
                return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Good</span>;
            case 'warning':
                return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Needs Attention</span>;
            case 'danger':
                return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Critical</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-white p-6 rounded-lg shadow text-center">
                <div className="text-xl text-gray-600 mb-2">Overall Financial Health</div>
                <div className={`text-5xl font-bold mb-4 ${getScoreColor(metrics.overallScore)}`}>
                    {metrics.overallScore}
                </div>
                <div className="text-sm text-gray-500">
                    {metrics.overallScore >= 80 ? 'Excellent financial health!' :
                     metrics.overallScore >= 60 ? 'Good, but room for improvement' :
                     'Needs significant attention'}
                </div>
            </div>

            {/* Individual Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.metrics.map((metric) => (
                    <div key={metric.name} className="bg-white p-4 rounded-lg shadow">
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-gray-900 font-medium">{metric.name}</div>
                            {getStatusBadge(metric.status)}
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${
                                        metric.status === 'good' ? 'bg-green-500' :
                                        metric.status === 'warning' ? 'bg-yellow-500' :
                                        'bg-red-500'
                                    }`}
                                    style={{ width: `${metric.score}%` }}
                                />
                            </div>
                            <div className={`text-sm font-medium ${getScoreColor(metric.score)}`}>
                                {Math.round(metric.score)}
                            </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                            {metric.description}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recommendations */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
                <ul className="space-y-3">
                    {metrics.metrics.filter(m => m.status !== 'good').map(metric => (
                        <li key={metric.name} className="flex items-start">
                            <span className="text-gray-400 mr-2">•</span>
                            <span className="text-gray-600">
                                {metric.status === 'warning' ? 'Consider' : 'Prioritize'} improving your {metric.name.toLowerCase()} - {
                                    metric.name === 'Savings Rate' ? 'try to save at least 20% of your income' :
                                    metric.name === 'Debt Management' ? 'work on reducing your debt-to-income ratio' :
                                    metric.name === 'Expense Control' ? 'look for ways to reduce your expenses' :
                                    'consider increasing your investment allocation'
                                }
                            </span>
                        </li>
                    ))}
                    {metrics.metrics.every(m => m.status === 'good') && (
                        <li className="text-green-600">
                            Great job! All your financial metrics are in good standing. Keep up the good work!
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
} 