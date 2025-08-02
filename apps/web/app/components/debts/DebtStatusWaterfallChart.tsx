"use client";

import { useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList, TooltipProps } from "recharts";
import { Info } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { useChartExpansion } from "../../utils/chartUtils";
import { ChartControls } from "../ChartControls";

interface DebtStatusWaterfallChartProps {
    activeAmount: number;
    partiallyPaidAmount: number;
    partiallyPaidOutstandingAmount: number;
    fullyPaidAmount: number;
    currency?: string;
}

interface WaterfallData {
    name: string;
    value: number;
    base: number;
    total: number;
    type: "total" | "active" | "partial" | "paid";
}

export function DebtStatusWaterfallChart({ 
    activeAmount, 
    partiallyPaidAmount, 
    partiallyPaidOutstandingAmount,
    fullyPaidAmount, 
    currency = "USD" 
}: DebtStatusWaterfallChartProps) {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const totalAmount = activeAmount + partiallyPaidAmount + fullyPaidAmount;
    
    // Calculate the total outstanding amount for percentage calculations
    const totalOutstandingAmount = activeAmount + partiallyPaidOutstandingAmount + fullyPaidAmount;

    // Use the actual outstanding amount passed from parent component

    // Create waterfall data
    const data: WaterfallData[] = [
        {
            name: "Total Lendings",
            value: totalAmount,
            base: 0,
            total: totalAmount,
            type: "total"
        },
        {
            name: "Active",
            value: activeAmount,
            base: 0,
            total: activeAmount,
            type: "active"
        },
        {
            name: "Partially Paid",
            value: partiallyPaidOutstandingAmount, // Only showing outstanding amount
            base: activeAmount,
            total: activeAmount + partiallyPaidOutstandingAmount,
            type: "partial"
        },
        {
            name: "Fully Paid",
            value: fullyPaidAmount,
            base: activeAmount + partiallyPaidOutstandingAmount,
            total: totalAmount,
            type: "paid"
        }
    ];

    const getBarColor = (type: string): string => {
        switch (type) {
            case "total": return "#6b7280"; // Blue for total
            case "active": return "#ef4444"; // Red for active debts
            case "partial": return "#f59e0b"; // Orange for partially paid
            case "paid": return "#10b981"; // Green for fully paid
            default: return "#6b7280"; // Gray
        }
    };

    const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
        if (active && payload && payload.length) {
            const data = payload.find(p => p.dataKey === "value");
            if (!data) return null;
            
            const item = data.payload as WaterfallData;
            const percentage = item.type === 'total' ? '100.0' : ((item.value / totalOutstandingAmount) * 100).toFixed(1);
            
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="text-gray-500">{item.name}</p>
                    <p className="text-sm" style={{ color: getBarColor(item.type) }}>
                        {formatCurrency(item.value, currency)} ({percentage}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    const formatYAxisTick = (value: number): string => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        }
        return formatCurrency(value, currency);
    };

    // Prepare CSV data for chart controls
    const csvData = [
        ['Status', 'Amount', 'Percentage'],
        ...data.map(item => [
            item.name,
            item.value.toString(),
            item.type === 'total' ? '100.0%' : `${((item.value / totalOutstandingAmount) * 100).toFixed(1)}%`
        ])
    ];

    const ChartContent = () => (
        <div>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4">
                <div className="text-center">
                    <p className="text-xs text-gray-600">Active Lendings</p>
                    <p className="text-sm sm:text-xl font-bold text-red-600">
                        {formatCurrency(activeAmount, currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                        {((activeAmount / totalOutstandingAmount) * 100).toFixed(1)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-600">Partially Paid (Outstanding)</p>
                    <p className="text-sm sm:text-xl font-bold text-orange-600">
                        {formatCurrency(partiallyPaidOutstandingAmount, currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                        {((partiallyPaidOutstandingAmount / totalOutstandingAmount) * 100).toFixed(1)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-600">Fully Paid</p>
                    <p className="text-sm sm:text-xl font-bold text-green-600">
                        {formatCurrency(fullyPaidAmount, currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                        {((fullyPaidAmount / totalOutstandingAmount) * 100).toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div 
                ref={chartRef}
                className={`${isExpanded ? 'h-[60vh] w-full' : 'h-[28rem] sm:h-[36rem] w-full'}`}
                role="img"
                aria-label={`Waterfall chart showing debt distribution: Active ${formatCurrency(activeAmount, currency)}, Partially Paid ${formatCurrency(partiallyPaidAmount, currency)}, and Fully Paid ${formatCurrency(fullyPaidAmount, currency)}`}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 30,
                            right: 80, // Further increased right margin
                            left: 20,
                            bottom: 20,
                        }}
                        barCategoryGap="10%"
                        barGap="1%"
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                            interval={0}
                        />
                        <YAxis 
                            tickFormatter={formatYAxisTick}
                            tick={{ fontSize: 12 }}
                            domain={[0, (dataMax: number) => Math.max(dataMax * 1.15, totalAmount * 1.1)]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        
                        {/* Reference lines for better visual separation */}
                        <ReferenceLine 
                            y={totalAmount} 
                            stroke="#3b82f6" 
                            strokeDasharray="5 5" 
                            strokeWidth={2} 
                            label={{ 
                                value: "Total", 
                                position: "right", 
                                fill: "#3b82f6",
                                offset: 25,
                                fontSize: 12
                            }} 
                        />
                        <ReferenceLine 
                            y={activeAmount} 
                            stroke="#ef4444" 
                            strokeDasharray="5 5" 
                            strokeWidth={2} 
                            label={{ 
                                value: "Active", 
                                position: "right", 
                                fill: "#ef4444",
                                offset: 25,
                                fontSize: 12
                            }} 
                        />
                        <ReferenceLine 
                            y={activeAmount + partiallyPaidOutstandingAmount} 
                            stroke="#f59e0b" 
                            strokeDasharray="5 5" 
                            strokeWidth={2} 
                            label={{ 
                                value: "Partial", 
                                position: "right", 
                                fill: "#f59e0b",
                                offset: 25,
                                fontSize: 12
                            }} 
                        />
                        <ReferenceLine 
                            y={activeAmount + partiallyPaidOutstandingAmount + fullyPaidAmount} 
                            stroke="#10b981" 
                            strokeDasharray="5 5" 
                            strokeWidth={2} 
                            label={{ 
                                value: "Fully Paid", 
                                position: "right", 
                                fill: "#10b981",
                                offset: 25,
                                fontSize: 12
                            }} 
                        />
                        
                        {/* Base bars (invisible) to create waterfall effect */}
                        <Bar 
                            dataKey="base" 
                            fill="transparent" 
                            stackId="waterfall"
                        />
                        
                        {/* Value bars with different colors and labels */}
                        <Bar 
                            dataKey="value" 
                            stackId="waterfall"
                            radius={[4, 4, 0, 0]}
                        >
                            {/* Amount label on top */}
                            <LabelList 
                                dataKey="value" 
                                position="top" 
                                fill="#374151"
                                fontSize={12}
                                fontWeight="bold"
                                formatter={(value: number) => formatCurrency(value, currency)}
                                offset={10}
                            />
                            {/* Percentage label inside */}
                            <LabelList 
                                dataKey="value" 
                                position="center" 
                                fill="white" 
                                fontSize={12}
                                fontWeight="bold"
                                formatter={(value: number, entry: any) => {
                                    // For total bar, show 100%
                                    if (entry && entry.payload && entry.payload.type === 'total') {
                                        return '100.0%';
                                    }
                                    // For other bars, calculate percentage based on total outstanding amount
                                    const percentage = ((value / totalOutstandingAmount) * 100).toFixed(1);
                                    return `${percentage}%`;
                                }}
                            />
                            {data.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={getBarColor(entry.type)} 
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Total</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Active</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span>Partially Paid</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Fully Paid</span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div 
                className="bg-white rounded-lg shadow p-3 sm:p-6"
                role="region"
                aria-label="Debt Status Distribution Chart"
                data-chart-type="debt-status-waterfall"
            >
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName="debt-status-chart"
                    csvData={csvData}
                    csvFileName="debt-status-data"
                    title="Debt Status Distribution"
                    tooltipText="Distribution of debts across different payment statuses"
                />
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-lg p-3 sm:p-6 max-w-7xl w-full max-h-full overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-semibold">Debt Status Distribution</h2>
                                <p className="text-sm text-gray-500">Distribution of debts across different payment statuses</p>
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