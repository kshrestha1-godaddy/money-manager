"use client";

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/currency';

interface CategoryData {
    name: string;
    total: number;
}

interface CategoryInsightsCardProps {
    categories: CategoryData[];
    currency: string;
}

interface PieChartData {
    name: string;
    value: number;
    percentage: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function CategoryInsightsCard({ categories, currency }: CategoryInsightsCardProps) {
    const sortedCategories = useMemo(() => {
        return [...categories].sort((a, b) => b.total - a.total);
    }, [categories]);

    const totalSpending = useMemo(() => {
        return categories.reduce((sum, cat) => sum + cat.total, 0);
    }, [categories]);

    const pieData = useMemo(() => {
        return sortedCategories.map(cat => ({
            name: cat.name,
            value: cat.total,
            percentage: ((cat.total / totalSpending) * 100).toFixed(1)
        }));
    }, [sortedCategories, totalSpending]);

    const renderLabel = (entry: PieChartData) => {
        return `${entry.name}: ${entry.percentage}%`;
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            label={renderLabel}
                        >
                            {pieData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} 
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => formatCurrency(value, currency)}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            
            <div className="mt-4">
                <h3 className="font-medium text-gray-900 mb-2">Top Categories</h3>
                <div className="space-y-2">
                    {sortedCategories.slice(0, 5).map((category, index) => (
                        <div key={category.name} className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div 
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="text-sm text-gray-600">{category.name}</span>
                            </div>
                            <div className="text-sm font-medium">
                                {formatCurrency(category.total, currency)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Insights */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Category Insights</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                    {sortedCategories.length > 0 && sortedCategories[0] && (
                        <li>
                            Highest spending in {sortedCategories[0].name}:
                            {' '}{formatCurrency(sortedCategories[0].total, currency)}
                            {' '}({((sortedCategories[0].total / totalSpending) * 100).toFixed(1)}% of total)
                        </li>
                    )}
                    {sortedCategories.length > 1 && sortedCategories[0] && sortedCategories[1] && (
                        <li>
                            Top 2 categories account for
                            {' '}{(((sortedCategories[0].total + sortedCategories[1].total) / totalSpending) * 100).toFixed(1)}%
                            {' '}of your spending
                        </li>
                    )}
                    {sortedCategories.some(cat => (cat.total / totalSpending) > 0.4) && (
                        <li className="text-orange-600">
                            Consider diversifying spending - some categories take up a large portion of your budget
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
} 