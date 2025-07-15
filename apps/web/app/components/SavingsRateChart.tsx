import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from "recharts";
import { Income, Expense } from "../types/financial";
import { useChartExpansion } from "../utils/chartUtils";
import { ChartControls } from "./ChartControls";
import { useRef } from "react";

interface SavingsRateChartProps {
    incomes: Income[];
    expenses: Expense[];
    currency: string;
    startDate?: string;
    endDate?: string;
}

interface MonthlyData {
    month: string;
    savingsRate: number;
    totalIncome: number;
    totalExpenses: number;
    savings: number;
}

export function SavingsRateChart({ incomes, expenses, currency, startDate, endDate }: SavingsRateChartProps) {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);

    // Generate dynamic time period text
    const getTimePeriodText = (): string => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const startMonth = start.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            const endMonth = end.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            return `(${startMonth} - ${endMonth})`;
        } else if (startDate) {
            const start = new Date(startDate);
            const startMonth = start.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            return `(From ${startMonth})`;
        } else if (endDate) {
            const end = new Date(endDate);
            const endMonth = end.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            return `(Until ${endMonth})`;
        }
        return "";
    };

    const timePeriodText = getTimePeriodText();

    const data = useMemo(() => {
        // Create a map to store monthly totals
        const monthlyTotals = new Map<string, MonthlyData>();

        // Process incomes
        incomes.forEach(income => {
            const date = new Date(income.date);
            const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
            
            if (!monthlyTotals.has(monthKey)) {
                monthlyTotals.set(monthKey, {
                    month: monthKey,
                    totalIncome: 0,
                    totalExpenses: 0,
                    savings: 0,
                    savingsRate: 0
                });
            }
            
            const monthData = monthlyTotals.get(monthKey)!;
            monthData.totalIncome += income.amount;
        });

        // Process expenses
        expenses.forEach(expense => {
            const date = new Date(expense.date);
            const monthKey = date.toISOString().slice(0, 7);
            
            if (!monthlyTotals.has(monthKey)) {
                monthlyTotals.set(monthKey, {
                    month: monthKey,
                    totalIncome: 0,
                    totalExpenses: 0,
                    savings: 0,
                    savingsRate: 0
                });
            }
            
            const monthData = monthlyTotals.get(monthKey)!;
            monthData.totalExpenses += expense.amount;
        });

        // Calculate savings rate for each month
        const monthlyData = Array.from(monthlyTotals.values())
            .map(data => {
                data.savings = data.totalIncome - data.totalExpenses;
                let savingsRate = data.totalIncome > 0 
                    ? Math.max(-100, (data.savings / data.totalIncome) * 100)
                    : -100;
                // Round to 2 decimal places during data processing
                data.savingsRate = Number(savingsRate.toFixed(2));
                return data;
            })
            .sort((a, b) => a.month.localeCompare(b.month));

        return monthlyData;
    }, [incomes, expenses]);

    // Calculate average savings rate
    const averageSavingsRate = useMemo(() => {
        if (data.length === 0) return 0;
        const sum = data.reduce((sum, item) => sum + item.savingsRate, 0);
        const average = sum / data.length;
        return isNaN(average) || !isFinite(average) ? 0 : average;
    }, [data]);

    // Format month for display
    const formatMonth = (month: string) => {
        const date = new Date(month);
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    // Format tooltip
    const formatTooltip = (value: number, name: string) => {
        if (name === "savingsRate") {
            if (value <= -100) {
                return ["<-100%", "Savings Rate"];
            }
            return [`${value}%`, "Savings Rate"];
        }
        return [value, name];
    };

    // Format data label
    const formatDataLabel = (value: number) => {
        if (value <= -100) {
            return "<-100%";
        }
        return `${value.toFixed(1)}%`;
    };

    // Prepare CSV data for export
    const csvData = [
        ['Month', 'Savings Rate (%)', 'Total Income', 'Total Expenses', 'Net Savings'],
        ...data.map(item => [
            item.month,
            item.savingsRate.toFixed(1),
            item.totalIncome.toString(),
            item.totalExpenses.toString(),
            item.savings.toString()
        ])
    ];

    return (
        <div 
            className={`bg-white rounded-lg shadow p-3 sm:p-6 ${isExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}
            role="region"
            aria-label="Savings Rate Trend Chart"
            data-chart-type="savings-rate"
        >
            <ChartControls
                chartRef={chartRef}
                isExpanded={isExpanded}
                onToggleExpanded={toggleExpanded}
                fileName="savings-rate-chart"
                csvData={csvData}
                csvFileName="savings-rate-data"
                title={`Monthly Savings Rate Trend ${timePeriodText}`}
                subtitle="Tracks your monthly savings as a percentage of income over time"
            />

            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
                <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600">Average Savings Rate</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-600">
                        {data.length === 0 ? '0.0' : (data.reduce((sum, item) => sum + item.savingsRate, 0) / data.length).toFixed(1)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600">Highest Savings Rate</p>
                    <p className="text-lg sm:text-xl font-bold text-green-600">
                        {data.length === 0 ? '0.0' : Math.max(...data.map(item => item.savingsRate)).toFixed(1)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs sm:text-sm text-gray-600">Lowest Savings Rate</p>
                    <p className="text-lg sm:text-xl font-bold text-red-600">
                        {data.length === 0 ? '0.0' : Math.min(...data.map(item => item.savingsRate)).toFixed(1)}%
                    </p>
                </div>
            </div>

            <div 
                ref={chartRef}
                className={`${isExpanded ? 'h-[60vh] w-full' : 'h-[24rem] sm:h-[32rem] w-full'}`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{
                            top: 40,
                            right: 20,
                            left: 20,
                            bottom: 30,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="month" 
                            tickFormatter={formatMonth}
                            tick={{ fontSize: 12 }}
                            interval="preserveStartEnd"
                            dy={10}
                        />
                        <YAxis
                            tickFormatter={(value) => `${value}%`}
                            domain={[-100, 100]}
                            tick={{ fontSize: 12 }}
                            ticks={[-100, -75, -50, -25, 0, 25, 50, 75, 100]}
                            dx={-10}
                        />
                        <Tooltip formatter={formatTooltip} />
                        
                        {/* Zero reference line */}
                        <ReferenceLine 
                            y={0} 
                            stroke="#94a3b8" 
                            strokeWidth={1}
                        />

                        {/* Average savings rate reference line */}
                        <ReferenceLine 
                            y={averageSavingsRate} 
                            stroke="#6b7280" 
                            strokeDasharray="3 3"
                            strokeWidth={2}
                        >
                            <Label 
                                value={`Avg: ${averageSavingsRate.toFixed(1)}%`} 
                                position="insideLeft"
                                fill="#6b7280"
                                fontSize={8}
                                dy={10}
                            />
                        </ReferenceLine>

                        <Line
                            type="monotone"
                            dataKey="savingsRate"
                            stroke="#3b82f6"
                            strokeWidth={1.5}
                            dot={{ fill: "#3b82f6", r: 4 }}
                            activeDot={{ r: 4 }}
                            name="Savings Rate"
                            label={{
                                position: 'top',
                                formatter: formatDataLabel,
                                fontSize: 10,
                                fill: '#6b7280',
                                dy: -8,
                                dx: 1
                                }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>


        </div>
    );
} 