"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "../types/financial";
import { formatDate } from "../utils/date";
import { formatCurrency } from "../utils/currency";
import { useCurrency } from "../providers/CurrencyProvider";
import { getRecentTransactions } from "../actions/transactions";

export function RecentTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { currency: userCurrency } = useCurrency();
    const router = useRouter();

    useEffect(() => {
        const loadTransactions = async () => {
            try {
                setLoading(true);
                const recentTransactions = await getRecentTransactions(10);
                
                setTransactions(recentTransactions);
            } catch (error) {
                console.error("Error loading recent transactions:", error);
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };

        loadTransactions();
    }, []);
    
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                </div>
                <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-4">⏳</div>
                    <p className="text-gray-500">Loading recent transactions...</p>
                </div>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                </div>
                <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                    <p className="text-gray-500">Start by adding some income or expenses to see recent activity.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Transaction
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Account
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white text-sm ${
                                            transaction.type === 'INCOME' ? 'bg-green-500' : 'bg-red-500'
                                        }`}>
                                            {transaction.type === 'INCOME' ? '↗' : '↙'}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {transaction.title}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {transaction.type}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {transaction.category}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {transaction.account}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDate(transaction.date)}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                                    transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount, userCurrency)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-3 bg-gray-50 text-center">
                <button 
                    onClick={() => router.push('/transactions')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline transition-all duration-200"
                >
                    View All Transactions
                </button>
            </div>
        </div>
    );
} 