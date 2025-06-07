"use client";

import { Transaction } from "../types/financial";

// Mock data - replace with actual API calls
const mockTransactions: Transaction[] = [
    {
        id: 1,
        type: 'EXPENSE',
        title: 'Grocery Shopping',
        amount: 85.50,
        date: new Date('2024-01-15'),
        category: 'Food & Dining',
        account: 'Nabil Bank'
    },
    {
        id: 2,
        type: 'INCOME',
        title: 'Salary',
        amount: 5000,
        date: new Date('2024-01-01'),
        category: 'Salary',
        account: 'Nabil Bank'
    },
    {
        id: 3,
        type: 'EXPENSE',
        title: 'Netflix Subscription',
        amount: 15.99,
        date: new Date('2024-01-10'),
        category: 'Entertainment',
        account: 'Nabil Bank'
    },
    {
        id: 4,
        type: 'EXPENSE',
        title: 'Gas Station',
        amount: 45.00,
        date: new Date('2024-01-08'),
        category: 'Transportation',
        account: 'Nabil Bank'
    },
    {
        id: 5,
        type: 'INCOME',
        title: 'Freelance Project',
        amount: 800,
        date: new Date('2024-01-05'),
        category: 'Freelance',
        account: 'Nabil Bank'
    }
];

export function RecentTransactions() {
    const transactions = mockTransactions;
    
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
                                    {transaction.date.toLocaleDateString()}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                                    transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {transaction.type === 'INCOME' ? '+' : '-'}${transaction.amount.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-3 bg-gray-50 text-center">
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    View All Transactions
                </button>
            </div>
        </div>
    );
} 