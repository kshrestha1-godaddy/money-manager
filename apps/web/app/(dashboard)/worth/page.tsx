"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from 'recharts';
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
import { useChartExpansion } from "../../utils/chartUtils";
import { ChartControls } from "../../components/ChartControls";

export default function NetWorthPage() {
    const session = useSession();
    const { currency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [debts, setDebts] = useState<DebtInterface[]>([]);
    const [investments, setInvestments] = useState<InvestmentInterface[]>([]);
    const [expandedSections, setExpandedSections] = useState({
        accounts: false,
        investments: false,
        moneyLent: false
    });
    const { isExpanded: isChartExpanded, toggleExpanded: toggleChartExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);

    const toggleSection = (section: 'accounts' | 'investments' | 'moneyLent') => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

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

    // Prepare CSV data for chart controls
    const csvData = [
        ['Category', 'Amount', 'Percentage of Net Worth'],
        ['Bank Balance', totalAccountBalance.toString(), totalAssets > 0 ? ((totalAccountBalance / totalAssets) * 100).toFixed(2) + '%' : '0%'],
        ['Investments', totalInvestmentValue.toString(), totalAssets > 0 ? ((totalInvestmentValue / totalAssets) * 100).toFixed(2) + '%' : '0%'],
        ['Money Lent', totalMoneyLent.toString(), totalAssets > 0 ? ((totalMoneyLent / totalAssets) * 100).toFixed(2) + '%' : '0%'],
        ['Total Assets', totalAssets.toString(), '100%'],
        ['Net Worth', netWorth.toString(), '']
    ];

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
            {/* Asset Breakdown Chart */}
            <div className={`bg-white rounded-lg shadow p-6 ${isChartExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isChartExpanded}
                    onToggleExpanded={toggleChartExpanded}
                    fileName="net-worth-chart"
                    csvData={csvData}
                    csvFileName="net-worth-data"
                    title="Total vs. Category"
                />
                <div ref={chartRef} className={`${isChartExpanded ? 'h-[70vh] w-full' : ''}`} style={{ height: isChartExpanded ? undefined : '450px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={[
                                {
                                    name: 'Bank Balance',
                                    value: totalAccountBalance,
                                    color: '#10B981'
                                },
                                {
                                    name: 'Investments',
                                    value: totalInvestmentValue,
                                    color: '#3B82F6'
                                },
                                {
                                    name: 'Money Lent',
                                    value: totalMoneyLent,
                                    color: '#EF4444'
                                }
                            ]}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            {/* Reference lines for each bar top */}
                            <ReferenceLine 
                                y={totalAccountBalance} 
                                stroke="#10B981" 
                                strokeDasharray="2 2" 
                                strokeWidth={1}
                                opacity={0.6}
                            />
                            <ReferenceLine 
                                y={totalInvestmentValue} 
                                stroke="#3B82F6" 
                                strokeDasharray="2 2" 
                                strokeWidth={1}
                                opacity={0.6}
                            />
                            <ReferenceLine 
                                y={totalMoneyLent} 
                                stroke="#EF4444" 
                                strokeDasharray="2 2" 
                                strokeWidth={1}
                                opacity={0.6}
                            />
                            <XAxis 
                                dataKey="name" 
                                axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                                tickLine={{ stroke: '#374151', strokeWidth: 1 }}
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                            />
                            <YAxis 
                                axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                                tickLine={{ stroke: '#374151', strokeWidth: 1 }}
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickFormatter={(value) => formatCurrency(value, currency).replace(/\.[0-9]+/, '')}
                            />
                            <Tooltip 
                                formatter={(value: number) => [formatCurrency(value, currency), 'Total']}
                                labelStyle={{ color: '#374151' }}
                                contentStyle={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {[
                                    { name: 'Bank Balance', value: totalAccountBalance, color: '#10B981' },
                                    { name: 'Investments', value: totalInvestmentValue, color: '#3B82F6' },
                                    { name: 'Money Lent', value: totalMoneyLent, color: '#EF4444' }
                                ].map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                                <LabelList 
                                    dataKey="value" 
                                    position="top" 
                                    content={(props: any) => {
                                        const { x, y, width, value } = props;
                                        const percentage = totalAssets > 0 ? ((value / totalAssets) * 100).toFixed(1) : '0.0';
                                        const formattedValue = formatCurrency(value, currency);
                                        return (
                                            <g>
                                                <text 
                                                    x={x + width / 2} 
                                                    y={y - 25} 
                                                    fill="#374151" 
                                                    textAnchor="middle" 
                                                    dominantBaseline="middle"
                                                    fontSize="12"
                                                    fontWeight="600"
                                                >
                                                    {percentage}%
                                                </text>
                                                <text 
                                                    x={x + width / 2} 
                                                    y={y - 10} 
                                                    fill="#1E40AF" 
                                                    textAnchor="middle" 
                                                    dominantBaseline="middle"
                                                    fontSize="11"
                                                    fontWeight="500"
                                                >
                                                    {formattedValue}
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center space-x-6">
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Bank Balance</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Investments</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm text-gray-600">Money Lent</span>
                    </div>
                </div>
            </div>



            {/* Account Breakdown Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div 
                    className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection('accounts')}
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Bank Accounts ({accounts.length})
                        </h3>
                        <div className="flex items-center space-x-4">
                            <span className="text-lg font-bold text-green-600">
                                {formatCurrency(totalAccountBalance, currency)}
                            </span>
                            <svg 
                                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.accounts ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                {expandedSections.accounts && (
                    <>
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
                    </>
                )}
            </div>

            {/* Investments Breakdown Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div 
                    className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection('investments')}
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Investments ({investments.length})
                        </h3>
                        <div className="flex items-center space-x-4">
                            <span className="text-lg font-bold text-blue-600">
                                {formatCurrency(totalInvestmentValue, currency)}
                            </span>
                            <svg 
                                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.investments ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                {expandedSections.investments && (
                    <>
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
                    </>
                )}
            </div>

            {/* Money Lent Breakdown Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div 
                    className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSection('moneyLent')}
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Money Lent ({debts.filter(debt => {
                                const totalRepayments = debt.repayments?.reduce((sum, rep) => sum + rep.amount, 0) || 0;
                                return debt.amount - totalRepayments > 0;
                            }).length})
                        </h3>
                        <div className="flex items-center space-x-4">
                            <span className="text-lg font-bold text-red-600">
                                {formatCurrency(totalMoneyLent, currency)}
                            </span>
                            <svg 
                                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.moneyLent ? 'rotate-180' : ''}`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                {expandedSections.moneyLent && (
                    <>
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
                            <tfoot className="bg-gradient-to-r from-red-50 to-red-100 border-t-2 border-red-200">
                                <tr>
                                    <td colSpan={6} className="px-6 py-5 text-base font-bold text-red-700">

                                    </td>
                                    <td className="px-6 py-5 text-lg font-black text-right text-red-600">
                                        {formatCurrency(totalMoneyLent, currency)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
                    </>
                )}
            </div>

        </div>
    );
} 