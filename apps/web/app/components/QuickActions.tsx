"use client";

import { Button } from "@repo/ui/button";
import { useRouter } from "next/navigation";

export function QuickActions() {
    const router = useRouter();
    
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionButton
                    title="Add Expense"
                    icon="💸"
                    color="bg-red-500 hover:bg-red-600"
                    onClick={() => router.push('/expenses?action=add')}
                />
                <QuickActionButton
                    title="Add Income"
                    icon="💰"
                    color="bg-green-500 hover:bg-green-600"
                    onClick={() => router.push('/incomes?action=add')}
                />
                <QuickActionButton
                    title="Add Investment"
                    icon="📈"
                    color="bg-blue-500 hover:bg-blue-600"
                    onClick={() => router.push('/investments?action=add')}
                />
                <QuickActionButton
                    title="Set Budget"
                    icon="🎯"
                    color="bg-purple-500 hover:bg-purple-600"
                    onClick={() => router.push('/targets?action=add')}
                />
            </div>
        </div>
    );
}

function QuickActionButton({ title, icon, color, onClick }: {
    title: string;
    icon: string;
    color: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`${color} text-white rounded-lg p-4 flex flex-col items-center justify-center space-y-2 transition-colors duration-200`}
        >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium">{title}</span>
        </button>
    );
} 