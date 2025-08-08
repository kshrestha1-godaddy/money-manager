"use client";

import { Card } from "@repo/ui/card";
import { DashboardStats as DashboardStatsType } from "../types/financial";

// Mock data - replace with actual API calls
const mockStats: DashboardStatsType = {
    totalBalance: 25000,
    monthlyIncome: 5000,
    monthlyExpenses: 3200,
    savingsRate: 36,
    totalInvestments: 15000,
    recentTransactions: []
};

export function DashboardStats() {
    const stats = mockStats;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                title="Total Balance"
                value={`$${stats.totalBalance.toLocaleString()}`}
                icon="💰"
                color="bg-green-500"
            />
            <StatCard
                title="Monthly Income"
                value={`$${stats.monthlyIncome.toLocaleString()}`}
                icon="📈"
                color="bg-blue-500"
            />
            <StatCard
                title="Monthly Expenses"
                value={`$${stats.monthlyExpenses.toLocaleString()}`}
                icon="💸"
                color="bg-red-500"
            />
            <StatCard
                title="Savings Rate"
                value={`${stats.savingsRate}%`}
                icon="🎯"
                color="bg-purple-500"
            />
        </div>
    );
}

function StatCard({ title, value, icon, color }: {
    title: string;
    value: string;
    icon: string;
    color: string;
}) {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
                <div className={`${color} rounded-full p-3 text-white text-xl mr-4`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
} 