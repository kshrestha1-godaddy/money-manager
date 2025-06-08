"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Income, Expense } from "../../types/financial";
import { AccountInterface } from "../../types/accounts";
import { getIncomes } from "../../actions/incomes";
import { getExpenses } from "../../actions/expenses";
import { getUserAccounts } from "../../actions/accounts";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";

export default function NetWorthPage() {
    const session = useSession();
    const { currency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [accounts, setAccounts] = useState<AccountInterface[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [incomesData, expensesData, accountsData] = await Promise.all([
                    getIncomes(),
                    getExpenses(),
                    getUserAccounts()
                ]);
                setIncomes(incomesData);
                setExpenses(expensesData);
                
                // Handle accounts response
                if (accountsData && !('error' in accountsData)) {
                    setAccounts(accountsData);
                } else {
                    console.error("Error loading accounts:", accountsData?.error);
                    setAccounts([]);
                }
            } catch (error) {
                console.error("Error loading net worth data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Calculate total assets (account balances + total income)
    const totalAccountBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalAssets = totalAccountBalance;

    // Calculate total liabilities (total expenses - this is a simplified approach)
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalLiabilities = 0; // For now, we'll set this to 0 as we don't have explicit liability tracking

    // Calculate net worth
    const netWorth = totalAssets - totalLiabilities;

    // Calculate this month's data
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthIncome = incomes
        .filter(income => {
            const incomeDate = income.date instanceof Date ? income.date : new Date(income.date);
            return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
        })
        .reduce((sum, income) => sum + income.amount, 0);

    const thisMonthExpenses = expenses
        .filter(expense => {
            const expenseDate = expense.date instanceof Date ? expense.date : new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        })
        .reduce((sum, expense) => sum + expense.amount, 0);

    const thisMonthNetIncome = thisMonthIncome - thisMonthExpenses;

    // Group accounts by bank for better visualization
    const accountsByBank = accounts.reduce((groups, account) => {
        const bank = account.bankName;
        if (!groups[bank]) {
            groups[bank] = [];
        }
        groups[bank].push(account);
        return groups;
    }, {} as Record<string, AccountInterface[]>);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Net Worth</h1>
                    <div className="text-sm text-gray-500">
                        Welcome back, {session.data?.user?.name || 'User'}
                    </div>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading net worth data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Net Worth</h1>
                    <p className="text-gray-600 mt-1">Track your overall financial position</p>
                </div>
                <div className="text-sm text-gray-500">
                    Welcome back, {session.data?.user?.name || 'User'}
                </div>
            </div>

            {/* Net Worth Overview */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">Total Net Worth</h2>
                    <p className="text-5xl font-bold mb-4">{formatCurrency(netWorth, currency)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Total Assets</h3>
                            <p className="text-2xl font-semibold text-green-200">{formatCurrency(totalAssets, currency)}</p>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Total Liabilities</h3>
                            <p className="text-2xl font-semibold text-red-200">{formatCurrency(totalLiabilities, currency)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Summary */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Monthly Income</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(thisMonthIncome, currency)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(thisMonthExpenses, currency)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Net Income</p>
                        <p className={`text-2xl font-bold ${thisMonthNetIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(thisMonthNetIncome, currency)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Account Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Breakdown</h3>
                {Object.keys(accountsByBank).length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">🏦</div>
                        <h4 className="text-lg font-medium text-gray-600 mb-2">No Accounts Found</h4>
                        <p className="text-gray-500">Add your bank accounts to track your net worth accurately.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(accountsByBank).map(([bankName, bankAccounts]) => (
                            <div key={bankName} className="border rounded-lg p-4">
                                <h4 className="font-semibold text-gray-800 mb-3">{bankName}</h4>
                                <div className="space-y-2">
                                    {bankAccounts.map((account) => (
                                        <div key={account.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                            <div>
                                                <p className="font-medium text-gray-900">{account.holderName}</p>
                                                <p className="text-sm text-gray-500">{account.accountType}</p>
                                            </div>
                                            <p className="font-semibold text-gray-900">
                                                {formatCurrency(account.balance || 0, currency)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-gray-700">Bank Total:</p>
                                        <p className="font-bold text-gray-900">
                                            {formatCurrency(
                                                bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0),
                                                currency
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Financial Health Indicators */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2">Savings Rate (This Month)</h4>
                        <p className="text-2xl font-bold text-blue-600">
                            {thisMonthIncome > 0 ? `${((thisMonthNetIncome / thisMonthIncome) * 100).toFixed(1)}%` : '0%'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {thisMonthNetIncome >= 0 ? 'You are saving money this month! 🎉' : 'You are spending more than earning this month 📉'}
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2">Asset Growth</h4>
                        <p className="text-2xl font-bold text-purple-600">
                            {formatCurrency(totalAssets, currency)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Total value of all your assets
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 