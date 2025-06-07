"use client";

import { useSession } from "next-auth/react";
import Balance from "../../components/Balance";
import { DashboardStats } from "../../components/DashboardStats";
import { RecentTransactions } from "../../components/RecentTransactions";
import { QuickActions } from "../../components/QuickActions";

export default function Dashboard() {
    const session = useSession();
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <div className="text-sm text-gray-500">
                    Welcome back, {session.data?.user?.name || 'User'}
                </div>
            </div>

            {/* Quick Actions */}
            <QuickActions />

            {/* Financial Overview Stats */}
            <DashboardStats />

            {/* Balance Display */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Current Balance</h2>
                <Balance />
            </div>

            {/* Recent Transactions */}
            <RecentTransactions />
        </div>
    );
}
