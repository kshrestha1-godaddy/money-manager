"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "../../../types/financial";
import { formatDate } from "../../../utils/date";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { getRecentTransactions } from "../../transactions/actions/transactions";

export function RecentTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const { currency: userCurrency } = useCurrency();
    const router = useRouter();

    // Check if we're on mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Transactions</h2>
                </div>
                <div className="p-6 sm:p-8 text-center">
                    <div className="text-gray-400 text-3xl sm:text-4xl mb-4">⏳</div>
                    <p className="text-gray-500 text-sm sm:text-base">Loading recent transactions...</p>
                </div>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Transactions</h2>
                </div>
                <div className="p-6 sm:p-8 text-center">
                    <div className="text-gray-400 text-3xl sm:text-4xl mb-4">📝</div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                    <p className="text-gray-500 text-sm sm:text-base">Start by adding some income or expenses to see recent activity.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Transactions</h2>
            </div>
            
            {/* Mobile Card View */}
            {isMobile ? (
                <div className="p-3 space-y-2">
                    {transactions.map((transaction) => (
                        <div key={transaction.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1 min-w-0">
                                    <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-white text-xs ${
                                        transaction.type === 'INCOME' ? 'bg-green-500' : 'bg-red-500'
                                    }`}>
                                        {transaction.type === 'INCOME' ? '↗' : '↙'}
                                    </div>
                                    <div className="ml-2 flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                            {transaction.title}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {transaction.category} • {formatDate(transaction.date)}
                                        </div>
                                    </div>
                                </div>
                                <div className={`text-sm font-medium ml-2 ${
                                    transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount, userCurrency)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Desktop Table View */
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Transaction
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Account
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.map((transaction) => (
                                <tr key={transaction.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-white text-xs ${
                                                transaction.type === 'INCOME' ? 'bg-green-500' : 'bg-red-500'
                                            }`}>
                                                {transaction.type === 'INCOME' ? '↗' : '↙'}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900 truncate max-w-48">
                                                    {transaction.title}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                        {transaction.category}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                        {transaction.account}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                        {formatDate(transaction.date)}
                                    </td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-right ${
                                        transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount, userCurrency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="px-4 sm:px-6 py-3 bg-gray-50 text-center">
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