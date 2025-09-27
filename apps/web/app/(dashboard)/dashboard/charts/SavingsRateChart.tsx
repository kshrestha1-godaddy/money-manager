import React, { useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from "recharts";
import { Info } from "lucide-react";
import { Income, Expense } from "../../../types/financial";
import { useChartExpansion } from "../../../utils/chartUtils";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";

interface SavingsRateChartProps {
    currency: string;
    heightClass?: string;
}

interface MonthlyData {
    month: string;
    savingsRate: number;
    totalIncome: number;
    totalExpenses: number;
    savings: number;
    incomeCount: number;
    expenseCount: number;
    averageIncome: number;
    averageExpense: number;
    formattedMonth: string;
}

export const SavingsRateChart = React.memo<SavingsRateChartProps>(({ currency, heightClass }) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const { monthlyData, formatTimePeriod } = useChartData();

    const timePeriodText = formatTimePeriod();

    const data = useMemo(() => {
        // Transform monthly data to savings rate format with enhanced statistics
        const monthlyData_ = monthlyData.map(month => {
            const incomeCount = month.incomeCount || 0;
            const expenseCount = month.expenseCount || 0;
            const averageIncome = incomeCount > 0 ? month.income / incomeCount : 0;
            const averageExpense = expenseCount > 0 ? month.expenses / expenseCount : 0;
            const savingsRate = month.income > 0 
                ? Math.max(-100, (month.savings / month.income) * 100)
                : -100;

            return {
                month: month.monthKey,
                totalIncome: month.income,
                totalExpenses: month.expenses,
                savings: month.savings,
                savingsRate,
                incomeCount,
                expenseCount,
                averageIncome,
                averageExpense,
                formattedMonth: month.formattedMonth
            };
        });

        return monthlyData_.map(data => ({
            ...data,
            savingsRate: Number(data.savingsRate.toFixed(2))
        }));
    }, [monthlyData]);

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

    // Enhanced custom tooltip component
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;

        const data = payload[0]?.payload as MonthlyData;
        if (!data) return null;

        const totalTransactions = data.incomeCount + data.expenseCount;

        return (
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-lg max-w-sm">
                <div className="font-bold text-gray-900 mb-3 text-base">{data.formattedMonth}</div>
                
                {/* Savings Rate - Main Metric */}
                <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-blue-600">Savings Rate:</span>
                    <span className={`font-bold text-lg ${
                        data.savingsRate >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                        {data.savingsRate <= -100 ? '<-100%' : `${data.savingsRate.toFixed(1)}%`}
                    </span>
                </div>

                {/* Financial Summary */}
                <div className="space-y-2 mb-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total Income:</span>
                        <span className="font-medium text-green-600">
                            {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: currency === 'INR' ? 'INR' : 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }).format(data.totalIncome)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total Expenses:</span>
                        <span className="font-medium text-red-600">
                            {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: currency === 'INR' ? 'INR' : 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }).format(data.totalExpenses)}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Net Savings:</span>
                        <span className={`font-medium ${
                            data.savings >= 0 ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                            {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: currency === 'INR' ? 'INR' : 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            }).format(data.savings)}
                        </span>
                    </div>
                </div>

                {/* Transaction Statistics */}
                <div className="border-t border-gray-200 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total Transactions:</span>
                        <span className="font-medium">{totalTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Income Transactions:</span>
                        <span className="font-medium">{data.incomeCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Expense Transactions:</span>
                        <span className="font-medium">{data.expenseCount}</span>
                    </div>
                    {data.incomeCount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Avg Income:</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: currency === 'INR' ? 'INR' : 'USD',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                }).format(data.averageIncome)}
                            </span>
                        </div>
                    )}
                    {data.expenseCount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Avg Expense:</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: currency === 'INR' ? 'INR' : 'USD',
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0
                                }).format(data.averageExpense)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Contextual Message */}
                <div className="mt-3 pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                        {data.savingsRate >= 50 && "Excellent savings rate! Keep it up!"}
                        {data.savingsRate >= 20 && data.savingsRate < 50 && "Good savings rate. You're on track!"}
                        {data.savingsRate >= 0 && data.savingsRate < 20 && "Positive savings, but room for improvement."}
                        {data.savingsRate < 0 && "Expenses exceeded income this month."}
                    </div>
                </div>
            </div>
        );
    };

    // Format data label
    const formatDataLabel = (value: number) => {
        if (value <= -100) {
            return "<-100%";
        }
        return `${value.toFixed(1)}%`;
    };

    // Calculate total transactions for display
    const totalTransactions = data.reduce((sum, item) => sum + item.incomeCount + item.expenseCount, 0);

    // Enhanced CSV data for export
    const csvData = [
        ['Month', 'Savings Rate (%)', 'Total Income', 'Total Expenses', 'Net Savings', 'Income Transactions', 'Expense Transactions', 'Total Transactions', 'Avg Income', 'Avg Expense'],
        ...data.map(item => [
            item.formattedMonth,
            item.savingsRate.toFixed(1),
            item.totalIncome.toString(),
            item.totalExpenses.toString(),
            item.savings.toString(),
            item.incomeCount.toString(),
            item.expenseCount.toString(),
            (item.incomeCount + item.expenseCount).toString(),
            item.averageIncome.toFixed(2),
            item.averageExpense.toFixed(2)
        ])
    ];

    const ChartContent = () => (
        <div>
            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                        <p className="text-xs sm:text-sm text-gray-600">Average Savings Rate</p>
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Average percentage of income saved across all months
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-blue-600">
                        {data.length === 0 ? '0.0' : (data.reduce((sum, item) => sum + item.savingsRate, 0) / data.length).toFixed(1)}%
                    </p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                        <p className="text-xs sm:text-sm text-gray-600">Highest Savings Rate</p>
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Best month for saving money from the selected period
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-green-600">
                        {data.length === 0 ? '0.0' : Math.max(...data.map(item => item.savingsRate)).toFixed(1)}%
                    </p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                        <p className="text-xs sm:text-sm text-gray-600">Lowest Savings Rate</p>
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Month with lowest savings rate from the selected period
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-red-600">
                        {data.length === 0 ? '0.0' : Math.min(...data.map(item => item.savingsRate)).toFixed(1)}%
                    </p>
                </div>
            </div>

            <div 
                ref={chartRef}
                className={`${isExpanded ? 'h-[60vh]' : (heightClass ?? 'h-[28rem] sm:h-[36rem]')} w-full`}
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} horizontal={true} strokeWidth={3} />
                        <XAxis 
                            dataKey="month" 
                            tickFormatter={formatMonth}
                            tick={{ fontSize: 12 }}
                            interval={1}
                            dy={10}
                        />
                        <YAxis
                            tickFormatter={(value) => `${value}%`}
                            domain={[-100, 100]}
                            tick={{ fontSize: 12 }}
                            ticks={[-100, -75, -50, -25, 0, 25, 50, 75, 100]}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        
                        {/* Red reference lines at 25% intervals */}
                        {[-75, -50, -25, 25, 50, 75].map((value) => (
                            <ReferenceLine 
                                key={value}
                                y={value} 
                                stroke="#ef4444" 
                                strokeDasharray="2 2"
                                strokeWidth={1}
                                opacity={0.6}
                            />
                        ))}

                        {/* Zero reference line - more prominent */}
                        <ReferenceLine 
                            y={0} 
                            stroke="#374151" 
                            strokeWidth={2}
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

    return (
        <>
            <div 
                className="bg-white rounded-lg shadow p-3 sm:p-6"
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
                    title={totalTransactions > 0 ? `Monthly Savings Rate Trend ${timePeriodText} • ${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''}` : `Monthly Savings Rate Trend ${timePeriodText}`}
                    tooltipText="Tracks your monthly savings as a percentage of income over time with detailed statistics including transaction counts, averages, and financial breakdowns. Hover over data points for detailed information."
                />
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-[95%] w-full max-h-[95%] overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-semibold">
                                    {totalTransactions > 0 ? `Monthly Savings Rate Trend ${timePeriodText} • ${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''}` : `Monthly Savings Rate Trend ${timePeriodText}`}
                                </h2>
                                <p className="text-sm text-gray-500">Tracks your monthly savings as a percentage of income over time with detailed statistics</p>
                            </div>
                            <button
                                onClick={toggleExpanded}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base"
                            >
                                Close
                            </button>
                        </div>
                        <ChartContent />
                    </div>
                </div>
            )}
        </>
    );
});

SavingsRateChart.displayName = 'SavingsRateChart';
