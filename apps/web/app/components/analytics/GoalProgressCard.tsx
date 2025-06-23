import React from 'react';

interface Goal {
    name: string;
    target: number;
    current: number;
    type: 'savings' | 'investment' | 'debt';
}

interface Props {
    goals: Goal[];
    currency: string;
}

export function GoalProgressCard({ goals, currency }: Props) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const getProgressColor = (progress: number) => {
        if (progress >= 90) return 'bg-green-500';
        if (progress >= 60) return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Financial Goals</h3>
            <div className="space-y-4">
                {goals.map((goal, index) => {
                    const progress = Math.min((goal.current / goal.target) * 100, 100);
                    const progressColor = getProgressColor(progress);

                    return (
                        <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700 font-medium">{goal.name}</span>
                                <span className="text-gray-600">
                                    {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                                </span>
                            </div>
                            <div className="relative w-full h-2 bg-gray-200 rounded">
                                <div
                                    className={`absolute left-0 top-0 h-full rounded ${progressColor}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">
                                    {progress.toFixed(1)}% Complete
                                </span>
                                <span className="text-gray-500">
                                    {formatCurrency(goal.target - goal.current)} to go
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 