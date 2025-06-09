"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Income, Expense } from "../../types/financial";
import { AccountInterface } from "../../types/accounts";
import { DebtInterface } from "../../types/debts";
import { InvestmentInterface } from "../../types/investments";
import { getIncomes } from "../../actions/incomes";
import { getExpenses } from "../../actions/expenses";
import { getUserAccounts } from "../../actions/accounts";
import { getUserDebts } from "../../actions/debts";
import { getUserInvestments } from "../../actions/investments";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";

export default function NetWorthPage() {
    const session = useSession();
    const { currency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [debts, setDebts] = useState<DebtInterface[]>([]);
    const [investments, setInvestments] = useState<InvestmentInterface[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [incomesData, expensesData, accountsData, debtsData, investmentsData] = await Promise.all([
                    getIncomes(),
                    getExpenses(),
                    getUserAccounts(),
                    getUserDebts(),
                    getUserInvestments()
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

                // Handle debts response
                if (debtsData && !('error' in debtsData)) {
                    setDebts(debtsData.data || []);
                } else {
                    console.error("Error loading debts:", debtsData?.error);
                    setDebts([]);
                }

                // Handle investments response
                if (investmentsData && !('error' in investmentsData)) {
                    setInvestments(investmentsData.data || []);
                } else {
                    console.error("Error loading investments:", investmentsData?.error);
                    setInvestments([]);
                }
            } catch (error) {
                console.error("Error loading net worth data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Calculate total assets based on your rules:
    // 1. Sum of balances in bank accounts
    const totalAccountBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    
    // 2. Total investments money invested (current value)
    const totalInvestmentValue = investments.reduce((sum, investment) => 
        sum + (investment.quantity * investment.currentPrice), 0
    );
    
    // 3. Total money lent from debts tab (outstanding amounts owed to you)
    const totalMoneyLent = debts.reduce((sum, debt) => {
        const totalRepayments = debt.repayments?.reduce((repSum, rep) => repSum + rep.amount, 0) || 0;
        const remainingAmount = debt.amount - totalRepayments;
        return sum + Math.max(0, remainingAmount); // Only count positive remaining amounts
    }, 0);
    
    const totalAssets = totalAccountBalance + totalInvestmentValue + totalMoneyLent;

    // No liabilities in this calculation model
    const totalLiabilities = 0;

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

    // Calculate investment gains/losses
    const totalInvested = investments.reduce((sum, investment) => 
        sum + (investment.quantity * investment.purchasePrice), 0
    );
    const totalInvestmentGain = totalInvestmentValue - totalInvested;

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
                            <div className="text-sm text-green-100 mt-1">
                                Accounts: {formatCurrency(totalAccountBalance, currency)} | 
                                Investments: {formatCurrency(totalInvestmentValue, currency)} | 
                                Money Lent: {formatCurrency(totalMoneyLent, currency)}
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Total Liabilities</h3>
                            <p className="text-2xl font-semibold text-red-200">{formatCurrency(totalLiabilities, currency)}</p>
                            <div className="text-sm text-red-100 mt-1">
                                No Liabilities: {formatCurrency(0, currency)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Health Indicators */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        <h4 className="font-medium text-gray-700 mb-2">Asset Allocation</h4>
                        <p className="text-2xl font-bold text-purple-600">
                            {totalAssets > 0 ? `${((totalInvestmentValue / totalAssets) * 100).toFixed(1)}%` : '0%'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            Percentage in investments
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-700 mb-2">Debt to Asset Ratio</h4>
                        <p className="text-2xl font-bold text-orange-600">
                            {totalAssets > 0 ? `${((totalLiabilities / totalAssets) * 100).toFixed(1)}%` : '0%'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {totalLiabilities === 0 ? 'Debt-free! 🎉' : 'Lower is better'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Account Breakdown Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Bank Accounts ({accounts.length})
                    </h3>
                </div>
                {accounts.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">🏦</div>
                        <h4 className="text-lg font-medium text-gray-600 mb-2">No Accounts Found</h4>
                        <p className="text-gray-500">Add your bank accounts to track your net worth accurately.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Account Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Bank & Branch
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Account Type
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Balance
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {accounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {account.holderName}
                                                </div>
                                                <div className="text-sm text-gray-500 font-mono">
                                                    {account.accountNumber}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{account.bankName}</div>
                                                <div className="text-sm text-gray-500">{account.branchName}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {account.accountType}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                            {account.balance !== undefined ? (
                                                <span className="text-green-600">
                                                    {formatCurrency(account.balance, currency)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gradient-to-r from-green-50 to-green-100 border-t-2 border-green-200">
                                <tr>
                                    <td colSpan={3} className="px-6 py-5 text-base font-bold text-green-800">
                 
                                    </td>
                                    <td className="px-6 py-5 text-lg font-black text-right text-green-700">
                                        {formatCurrency(totalAccountBalance, currency)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Investments Breakdown Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Investments ({investments.length})
                    </h3>
                </div>
                {investments.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">📈</div>
                        <h4 className="text-lg font-medium text-gray-600 mb-2">No Investments Found</h4>
                        <p className="text-gray-500">Add your investments to track your portfolio value.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Investment
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Quantity
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Purchase Price
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Current Price
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Current Value
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Gain/Loss
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {investments.map((investment) => {
                                    const currentValue = investment.quantity * investment.currentPrice;
                                    const investedValue = investment.quantity * investment.purchasePrice;
                                    const gainLoss = currentValue - investedValue;
                                    const gainLossPercent = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;
                                    
                                    return (
                                        <tr key={investment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {investment.name}
                                                    </div>
                                                    {investment.symbol && (
                                                        <div className="text-sm text-gray-500">
                                                            {investment.symbol}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {investment.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {investment.quantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {formatCurrency(investment.purchasePrice, currency)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {formatCurrency(investment.currentPrice, currency)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-blue-600">
                                                {formatCurrency(currentValue, currency)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                                <div className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {formatCurrency(gainLoss, currency)}
                                                    <div className="text-xs">
                                                        ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%)
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-200">
                                <tr>
                                    <td colSpan={6} className="px-6 py-5 text-base font-bold text-blue-800">
                                 
                                    </td>
                                    <td className="px-6 py-5 text-lg font-black text-right text-blue-700">
                                        <div>{formatCurrency(totalInvestmentValue, currency)}</div>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Money Lent Breakdown Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Money Lent ({debts.filter(debt => {
                            const totalRepayments = debt.repayments?.reduce((sum, rep) => sum + rep.amount, 0) || 0;
                            return debt.amount - totalRepayments > 0;
                        }).length})
                    </h3>
                </div>
                {debts.filter(debt => {
                    const totalRepayments = debt.repayments?.reduce((sum, rep) => sum + rep.amount, 0) || 0;
                    return debt.amount - totalRepayments > 0;
                }).length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">💰</div>
                        <h4 className="text-lg font-medium text-gray-600 mb-2">No Money Lent</h4>
                        <p className="text-gray-500">You haven't lent any money that is still outstanding.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Borrower
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Purpose
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Original Amount
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Repaid
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Outstanding
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Due Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {debts.filter(debt => {
                                    const totalRepayments = debt.repayments?.reduce((sum, rep) => sum + rep.amount, 0) || 0;
                                    return debt.amount - totalRepayments > 0;
                                }).map((debt) => {
                                    const totalRepayments = debt.repayments?.reduce((sum, rep) => sum + rep.amount, 0) || 0;
                                    const remainingAmount = debt.amount - totalRepayments;
                                    const isOverdue = debt.dueDate && new Date() > debt.dueDate && remainingAmount > 0;
                                    
                                    const getStatusColor = (status: string) => {
                                        switch (status) {
                                            case 'ACTIVE':
                                                return 'text-blue-600 bg-blue-50';
                                            case 'PARTIALLY_PAID':
                                                return 'text-yellow-600 bg-yellow-50';
                                            case 'OVERDUE':
                                                return 'text-red-600 bg-red-50';
                                            default:
                                                return 'text-gray-600 bg-gray-50';
                                        }
                                    };
                                    
                                    return (
                                        <tr key={debt.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {debt.borrowerName}
                                                    </div>
                                                    {debt.borrowerContact && (
                                                        <div className="text-sm text-gray-500">
                                                            {debt.borrowerContact}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {debt.purpose || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {formatCurrency(debt.amount, currency)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                {formatCurrency(totalRepayments, currency)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-red-600">
                                                {formatCurrency(remainingAmount, currency)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {debt.dueDate ? (
                                                    <span className={isOverdue ? 'text-red-600' : ''}>
                                                        {formatDate(debt.dueDate)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">No due date</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(debt.status)}`}>
                                                    {debt.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-t-2 border-emerald-200">
                                <tr>
                                    <td colSpan={6} className="px-6 py-5 text-base font-bold text-emerald-800">

                                    </td>
                                    <td className="px-6 py-5 text-lg font-black text-right text-emerald-700">
                                        {formatCurrency(totalMoneyLent, currency)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
} 