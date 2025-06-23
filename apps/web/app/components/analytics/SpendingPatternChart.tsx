"use client";

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/currency';

interface SpendingPatternChartProps {
    data: number[];
    type: 'hourly' | 'daily';
    currency: string;
}

export function SpendingPatternChart({ data, type, currency }: SpendingPatternChartProps) {
    const chartData = useMemo(() => {
        if (type === 'hourly') {
            return data.map((amount, index) => ({
                label: `${index}:00`,
                amount
            }));
        } else {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return data.map((amount, index) => ({
                label: days[index],
                amount
            }));
        }
    }, [data, type]);

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={type === 'hourly' ? -45 : 0}
                        textAnchor={type === 'hourly' ? 'end' : 'middle'}
                        height={60}
                    />
                    <YAxis 
                        tickFormatter={(value) => formatCurrency(value, currency)}
                        width={80}
                    />
                    <Tooltip 
                        formatter={(value: number) => formatCurrency(value, currency)}
                        labelFormatter={(label) => type === 'hourly' ? `Time: ${label}` : `Day: ${label}`}
                    />
                    <Bar 
                        dataKey="amount" 
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
} 