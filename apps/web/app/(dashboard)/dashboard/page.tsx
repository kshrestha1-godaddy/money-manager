"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Income, Expense } from "../../types/financial";
import { getIncomes } from "../../actions/incomes";
import { getExpenses } from "../../actions/expenses";
import { useCurrency } from "../../providers/CurrencyProvider";
import { DateFilterButtons } from "../../components/DateFilterButtons";
import { WaterfallChart } from "../../components/WaterfallChart";
import { CategoryPieChart } from "../../components/CategoryPieChart";
import { MonthlyTrendChart } from "../../components/MonthlyTrendChart";
import { CategoryTrendChart } from "../../components/CategoryTrendChart";
import { RecentTransactions } from "../../components/RecentTransactions";

export default function Dashboard() {
    const session = useSession();
    const { currency } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [incomesData, expensesData] = await Promise.all([
                    getIncomes(),
                    getExpenses()
                ]);
                setIncomes(incomesData);
                setExpenses(expensesData);
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Filter data based on date range
    const getFilteredData = (data: (Income | Expense)[]) => {
        if (!startDate && !endDate) return data;
        
        return data.filter(item => {
            const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
            let matchesDateRange = true;
            
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchesDateRange = itemDate >= start && itemDate <= end;
            } else if (startDate) {
                const start = new Date(startDate);
                matchesDateRange = itemDate >= start;
            } else if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchesDateRange = itemDate <= end;
            }
            
            return matchesDateRange;
        });
    };

    const filteredIncomes = getFilteredData(incomes) as Income[];
    const filteredExpenses = getFilteredData(expenses) as Expense[];

    const totalIncome = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    const handleDateChange = (start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
    };

    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <div className="text-sm text-gray-500">
                        Welcome back, {session.data?.user?.name || 'User'}
                    </div>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading dashboard data...</div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <div className="text-sm text-gray-500">
                    Welcome back, {session.data?.user?.name || 'User'}
                </div>
            </div>

            {/* Date Filter Controls */}
            <DateFilterButtons
                startDate={startDate}
                endDate={endDate}
                onDateChange={handleDateChange}
                onClearFilters={clearFilters}
            />

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-1/2 border-t border-gray-200"></div>
            </div>

            {/* Financial Overview - Waterfall Chart */}
            <WaterfallChart 
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                currency={currency}
            />

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-1/2 border-t border-gray-200"></div>
            </div>

            {/* Monthly Trend Chart */}
            <MonthlyTrendChart 
                incomes={filteredIncomes}
                expenses={filteredExpenses}
                currency={currency}
                startDate={startDate}
                endDate={endDate}
            />

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-1/2 border-t border-gray-200"></div>
            </div>

            {/* Category Charts - Side by Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CategoryPieChart 
                    data={filteredExpenses}
                    type="expense"
                    currency={currency}
                />
                <CategoryPieChart 
                    data={filteredIncomes}
                    type="income"
                    currency={currency}
                />
            </div>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-1/2 border-t border-gray-200"></div>
            </div>

            {/* Category Trend Charts - Side by Side */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CategoryTrendChart 
                    data={filteredExpenses}
                    type="expense"
                    currency={currency}
                />
                <CategoryTrendChart 
                    data={filteredIncomes}
                    type="income"
                    currency={currency}
                />
            </div>

            {/* Divider */}
            <div className="flex justify-center">
                <div className="w-1/2 border-t border-gray-200"></div>
            </div>

            {/* Recent Transactions */}
            <RecentTransactions />
        </div>
    );
}
