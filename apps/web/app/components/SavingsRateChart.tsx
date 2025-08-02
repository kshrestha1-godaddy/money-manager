import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from "recharts";
import { Info } from "lucide-react";
import { Income, Expense } from "../types/financial";
import { useChartExpansion } from "../utils/chartUtils";
import { useChartData } from "../hooks/useChartDataContext";
import { ChartControls } from "./ChartControls";
import { useRef } from "react";

interface SavingsRateChartProps {
    currency: string;
}

interface MonthlyData {
    month: string;
    savingsRate: number;
    totalIncome: number;
    totalExpenses: number;
    savings: number;
}

export function SavingsRateChart({ currency }: SavingsRateChartProps) {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const { monthlyData, formatTimePeriod } = useChartData();

    const timePeriodText = formatTimePeriod();

    const data = useMemo(() => {
        // Transform monthly data to savings rate format
        const monthlyData_ = monthlyData.map(month => ({
            month: month.monthKey,
            totalIncome: month.income,
            totalExpenses: month.expenses,
            savings: month.savings,
            savingsRate: month.income > 0 
                ? Math.max(-100, (month.savings / month.income) * 100)
                : -100
        }));

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
                    title={`Monthly Savings Rate Trend ${timePeriodText}`}
                    tooltipText="Tracks your monthly savings as a percentage of income over time"
                />
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg p-3 sm:p-6 max-w-7xl w-full max-h-full overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-semibold">Monthly Savings Rate Trend {timePeriodText}</h2>
                                <p className="text-sm text-gray-500">Tracks your monthly savings as a percentage of income over time</p>
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
}
