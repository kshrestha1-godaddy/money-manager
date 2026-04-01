"use client";

import React, { useId, useRef, useMemo, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";
import { useChartExpansion } from "../../../utils/chartUtils";

interface CategoryPieChartProps {
    type: "income" | "expense";
    currency?: string;
    title?: string;
    heightClass?: string;
}

interface CategoryData {
    name: string;
    value: number;
    color: string;
    solidColor?: string;
    count: number;
    average: number;
    minAmount: number;
    maxAmount: number;
    dateRange: string;
}

interface CategoryStats {
    totalAmount: number;
    count: number;
    minAmount: number;
    maxAmount: number;
    earliestDate: Date;
    latestDate: Date;
    amounts: number[];
}

const COLOR_PALETTE = [
    { pie: "#3b82f6", legend: "#3b82f6" },
    { pie: "#ef4444", legend: "#ef4444" },
    { pie: "#10b981", legend: "#10b981" },
    { pie: "#f97316", legend: "#f97316" },
    { pie: "#a16207", legend: "#a16207" },
    { pie: "#ec4899", legend: "#ec4899" },
    { pie: "#14b8a6", legend: "#14b8a6" },
    { pie: "#eab308", legend: "#eab308" },
    { pie: "#8b5cf6", legend: "#8b5cf6" },
    { pie: "#f43f5e", legend: "#f43f5e" },
    { pie: "#22c55e", legend: "#22c55e" },
    { pie: "#f59e0b", legend: "#f59e0b" },
];

function mulberry32(seed: number) {
    return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
    const random = mulberry32(seed);
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        const a = result[i];
        const b = result[j];
        if (a === undefined || b === undefined) continue;
        result[i] = b;
        result[j] = a;
    }
    return result;
}

export const CategoryPieChart = React.memo<CategoryPieChartProps>(({ type, currency = "USD", title, heightClass }) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const { formatTimePeriod, filteredIncomes, filteredExpenses } = useChartData();
    const patternPrefix = useId().replace(/:/g, "");
    const paletteSeedRef = useRef<number>(Math.floor(Math.random() * 2 ** 31));

    const { chartData, rawChartData, total, smallCategories } = useMemo(() => {
        const transactions = type === "income" ? filteredIncomes : filteredExpenses;
        const shuffledPalette = shuffleWithSeed(COLOR_PALETTE, paletteSeedRef.current);

        const categoryStatsMap = new Map<string, CategoryStats>();

        transactions.forEach((transaction) => {
            const categoryName = transaction.category?.name || "Unknown Category";
            const transactionDate = new Date(transaction.date);
            const amount = convertForDisplaySync(transaction.amount, transaction.currency, currency);

            const existingStats = categoryStatsMap.get(categoryName);

            if (!existingStats) {
                categoryStatsMap.set(categoryName, {
                    totalAmount: amount,
                    count: 1,
                    minAmount: amount,
                    maxAmount: amount,
                    earliestDate: transactionDate,
                    latestDate: transactionDate,
                    amounts: [amount],
                });
            } else {
                existingStats.totalAmount += amount;
                existingStats.count += 1;
                existingStats.minAmount = Math.min(existingStats.minAmount, amount);
                existingStats.maxAmount = Math.max(existingStats.maxAmount, amount);
                existingStats.earliestDate =
                    transactionDate < existingStats.earliestDate ? transactionDate : existingStats.earliestDate;
                existingStats.latestDate =
                    transactionDate > existingStats.latestDate ? transactionDate : existingStats.latestDate;
                existingStats.amounts.push(amount);
            }
        });

        const formatDateRange = (earliest: Date, latest: Date): string => {
            const options: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
            if (earliest.getTime() === latest.getTime()) {
                return earliest.toLocaleDateString("en", options);
            }
            return `${earliest.toLocaleDateString("en", options)} - ${latest.toLocaleDateString("en", options)}`;
        };

        const rawChartData: CategoryData[] = Array.from(categoryStatsMap.entries())
            .map(([name, stats], index) => {
                const colorConfig = shuffledPalette[index % shuffledPalette.length];
                const average = stats.totalAmount / stats.count;
                const dateRange = formatDateRange(stats.earliestDate, stats.latestDate);

                return {
                    name,
                    value: stats.totalAmount,
                    color: colorConfig?.pie || "#8884d8",
                    solidColor: colorConfig?.legend || "#6b7280",
                    count: stats.count,
                    average,
                    minAmount: stats.minAmount,
                    maxAmount: stats.maxAmount,
                    dateRange,
                };
            })
            .sort((a, b) => b.value - a.value);

        const totalAmount = rawChartData.reduce((sum, item) => sum + item.value, 0);

        const significantCategories = rawChartData.filter((item) => {
            const percentage = totalAmount > 0 ? (item.value / totalAmount) * 100 : 0;
            return percentage >= 2.5;
        });

        const smallCats = rawChartData.filter((item) => {
            const percentage = totalAmount > 0 ? (item.value / totalAmount) * 100 : 0;
            return percentage < 2.5;
        });

        const aggregated: CategoryData[] = [...significantCategories];
        if (smallCats.length > 0) {
            const othersValue = smallCats.reduce((sum, item) => sum + item.value, 0);
            const othersCount = smallCats.reduce((sum, item) => sum + item.count, 0);
            const othersAverage = othersCount > 0 ? othersValue / othersCount : 0;
            const othersMin = Math.min(...smallCats.map((item) => item.minAmount));
            const othersMax = Math.max(...smallCats.map((item) => item.maxAmount));

            const allDates = smallCats.flatMap((item) => {
                if (item.dateRange.includes(" - ")) {
                    const parts = item.dateRange.split(" - ");
                    const start = parts[0] ? new Date(`${parts[0]} 1, 2000`) : new Date();
                    const end = parts[1] ? new Date(`${parts[1]} 1, 2000`) : new Date();
                    return [start, end];
                }
                const date = new Date(`${item.dateRange} 1, 2000`);
                return [date, date];
            });
            const validDates = allDates.filter((d) => d instanceof Date && !isNaN(d.getTime()));
            const othersEarliest =
                validDates.length > 0 ? new Date(Math.min(...validDates.map((d) => d.getTime()))) : new Date();
            const othersLatest =
                validDates.length > 0 ? new Date(Math.max(...validDates.map((d) => d.getTime()))) : new Date();
            const othersDateRange = formatDateRange(othersEarliest, othersLatest);

            aggregated.push({
                name: "Others",
                value: othersValue,
                color: "#94a3b8",
                solidColor: "#64748b",
                count: othersCount,
                average: othersAverage,
                minAmount: othersMin,
                maxAmount: othersMax,
                dateRange: othersDateRange,
            });
        }

        return { chartData: aggregated, rawChartData, total: totalAmount, smallCategories: smallCats };
    }, [filteredIncomes, filteredExpenses, type, currency]);

    const CustomTooltip = useCallback(({ active, payload }: { active?: boolean; payload?: any[] }) => {
            if (!active || !payload?.length) return null;

            const data = payload[0];
            if (!data || data.value === undefined) return null;

            const name = String(data.name ?? "");
            const value = data.value as number;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

            const categoryItem = chartData.find((item) => item.name === name);

            if (!categoryItem) {
                return (
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg min-w-[280px] max-w-[400px]">
                        <div className="mb-2 text-base font-semibold text-gray-900">{name}</div>
                        <div className="text-sm text-gray-500">
                            {formatCurrency(value, currency)} [{percentage}%]
                        </div>
                    </div>
                );
            }

            const formattedTotal = formatCurrency(categoryItem.value, currency);
            const formattedAverage = formatCurrency(categoryItem.average, currency);
            const formattedMin = formatCurrency(categoryItem.minAmount, currency);
            const formattedMax = formatCurrency(categoryItem.maxAmount, currency);
            const accentClass = type === "income" ? "text-green-600" : "text-red-600";

            return (
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg min-w-[320px] max-w-[440px]">
                    <div className="mb-3 border-b border-gray-100 pb-2 text-base font-semibold text-gray-900">
                        {name}
                    </div>
                    <div className="grid gap-2 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-500">Total Amount</span>
                            <span className={`font-semibold ${accentClass}`}>
                                {formattedTotal}{" "}
                                <span className="text-xs font-normal text-gray-400">({percentage}%)</span>
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-500">Transactions</span>
                            <span className="font-medium text-gray-800">{categoryItem.count}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-500">Average</span>
                            <span className="font-medium text-gray-800">{formattedAverage}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-500">Range</span>
                            <span className="font-medium text-gray-800">
                                {formattedMin} – {formattedMax}
                            </span>
                        </div>
                        <div className="mt-1 flex justify-between gap-4 border-t border-gray-100 pt-2">
                            <span className="text-gray-500">Period</span>
                            <span className="text-xs font-medium text-indigo-600">{categoryItem.dateRange}</span>
                        </div>
                        {name === "Others" && smallCategories.length > 0 && (
                            <div className="mt-2 border-t border-gray-100 pt-2">
                                <div className="mb-1 text-xs font-medium text-gray-500">Includes</div>
                                <div className="text-xs leading-relaxed text-gray-700">
                                    {smallCategories.map((cat) => cat.name).join(", ")}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }, [total, smallCategories, currency, chartData, type]);

    const renderCustomizedLabel = useCallback(
        (entry: {
            cx: number;
            cy: number;
            midAngle: number;
            outerRadius: number;
            innerRadius: number;
            name: string;
            value: number;
            fill?: string;
        }) => {
            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0";
            const chartDataEntry = chartData.find((item) => item.name === entry.name);
            const labelColor = chartDataEntry?.solidColor ?? entry.fill ?? "#374151";
            const transactionCount = chartDataEntry?.count ?? 0;

            const RADIAN = Math.PI / 180;
            const radialGap = 10;
            const radius = entry.outerRadius + radialGap;
            const x1 = entry.cx + radius * Math.cos(-entry.midAngle * RADIAN);
            const y1 = entry.cy + radius * Math.sin(-entry.midAngle * RADIAN);

            const horizontalLength = isExpanded ? 28 : 22;
            const isRightSide = x1 > entry.cx;
            const x2 = isRightSide ? x1 + horizontalLength : x1 - horizontalLength;
            const y2 = y1;

            const textPadding = 6;
            const textX = isRightSide ? x2 + textPadding : x2 - textPadding;
            const textY = y2;

            const edgeX = entry.cx + entry.outerRadius * Math.cos(-entry.midAngle * RADIAN);
            const edgeY = entry.cy + entry.outerRadius * Math.sin(-entry.midAngle * RADIAN);

            return (
                <g>
                    <polyline
                        points={`${edgeX},${edgeY} ${x1},${y1} ${x2},${y2}`}
                        stroke="#9ca3af"
                        strokeWidth={1.5}
                        fill="none"
                    />
                    <text
                        x={textX}
                        y={textY}
                        fill={labelColor}
                        textAnchor={isRightSide ? "start" : "end"}
                        dominantBaseline="central"
                        fontSize={isExpanded ? 11 : 10}
                        fontWeight={600}
                    >
                        {`${entry.name} (${transactionCount}x) [${percentage}%]`}
                    </text>
                </g>
            );
        },
        [total, chartData, isExpanded],
    );

    const csvDataForControls = useMemo(() => {
        const csvData: (string | number)[][] = [
            [
                "Category",
                "Total Amount",
                "Percentage",
                "Transactions",
                "Average Amount",
                "Min Amount",
                "Max Amount",
                "Date Range",
            ],
            ...chartData.map((item) => [
                item.name || "Unknown Category",
                item.value.toString(),
                total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : "0.0%",
                item.count.toString(),
                item.average.toFixed(2),
                item.minAmount.toFixed(2),
                item.maxAmount.toFixed(2),
                item.dateRange,
            ]),
        ];

        if (smallCategories.length > 0) {
            csvData.push(["", "", "", "", "", "", "", ""]);
            csvData.push(["--- Detailed Breakdown ---", "", "", "", "", "", "", ""]);
            csvData.push(["All Categories (including < 2.5%)", "", "", "", "", "", "", ""]);
            rawChartData.forEach((item) => {
                const pct = total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : "0.0%";
                csvData.push([
                    item.name,
                    item.value.toString(),
                    pct,
                    item.count.toString(),
                    item.average.toFixed(2),
                    item.minAmount.toFixed(2),
                    item.maxAmount.toFixed(2),
                    item.dateRange,
                ]);
            });
        }

        return csvData;
    }, [chartData, total, smallCategories, rawChartData]);

    const totalTransactions = chartData.reduce((sum, item) => sum + item.count, 0);
    const timePeriodText = useMemo(() => formatTimePeriod(), [formatTimePeriod]);
    const defaultTitle = type === "income" ? "Income by Category" : "Expenses by Category";
    const baseTitle = `${title || defaultTitle} ${timePeriodText}`;
    const chartTitle =
        totalTransactions > 0
            ? `${baseTitle} • ${totalTransactions} transaction${totalTransactions !== 1 ? "s" : ""}`
            : baseTitle;
    const totalLabel = type === "income" ? "Total Income" : "Total Expenses";
    const tooltipText =
        type === "income"
            ? "Breakdown of your income sources by category with detailed statistics including transaction counts, averages, and date ranges. Hover over slices for detailed information."
            : "Analysis of your spending patterns by category with detailed statistics including transaction counts, averages, and date ranges. Hover over slices for detailed information.";
    const totalAccentClass = type === "income" ? "text-green-600" : "text-red-600";

    const chartAreaHeight = isExpanded
        ? "h-[min(70rem,92vh)] min-h-[32rem]"
        : (heightClass ?? "h-80 sm:h-96");

    const piePatterns = useMemo(() => {
        return chartData.map((entry, index) => {
            const patternId = `${patternPrefix}-piePattern${index}`;
            const baseColor = entry.color;
            const darkerColor = entry.solidColor || baseColor;
            const patterns = [
                <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="6" height="6">
                    <rect width="6" height="6" fill={baseColor} />
                    <path
                        d="M 0,6 l 6,-6 M -1.5,1.5 l 3,-3 M 4.5,7.5 l 3,-3"
                        stroke={darkerColor}
                        strokeWidth="0.8"
                        opacity="0.3"
                    />
                </pattern>,
                <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="8" height="8">
                    <rect width="8" height="8" fill={baseColor} />
                    <circle cx="2" cy="2" r="0.8" fill={darkerColor} opacity="0.4" />
                    <circle cx="6" cy="6" r="0.8" fill={darkerColor} opacity="0.4" />
                    <circle cx="4" cy="4" r="0.5" fill={darkerColor} opacity="0.3" />
                </pattern>,
                <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="5" height="5">
                    <rect width="5" height="5" fill={baseColor} />
                    <rect x="0" y="0" width="1.5" height="1.5" fill={darkerColor} opacity="0.25" />
                    <rect x="3.5" y="3.5" width="1.5" height="1.5" fill={darkerColor} opacity="0.25" />
                    <rect x="1.75" y="1.75" width="1.5" height="1.5" fill={darkerColor} opacity="0.2" />
                </pattern>,
                <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill={baseColor} />
                    <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke={darkerColor} strokeWidth="0.6" opacity="0.3" />
                    <path d="M 0,0 l 4,4 M -1,3 l 2,2 M 3,-1 l 2,2" stroke={darkerColor} strokeWidth="0.6" opacity="0.2" />
                </pattern>,
                <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="8" height="4">
                    <rect width="8" height="4" fill={baseColor} />
                    <path d="M 0,2 Q 2,0 4,2 T 8,2" stroke={darkerColor} strokeWidth="0.8" fill="none" opacity="0.35" />
                    <path d="M 0,3 Q 2,1 4,3 T 8,3" stroke={darkerColor} strokeWidth="0.6" fill="none" opacity="0.25" />
                </pattern>,
                <pattern key={patternId} id={patternId} patternUnits="userSpaceOnUse" width="6" height="6">
                    <rect width="6" height="6" fill={baseColor} />
                    <polygon points="3,0.5 5,1.5 5,3.5 3,4.5 1,3.5 1,1.5" fill={darkerColor} opacity="0.25" />
                </pattern>,
            ];
            return patterns[index % patterns.length];
        });
    }, [chartData, patternPrefix]);

    const ChartContent = () => (
        <div className="px-1 py-4 sm:px-2 sm:py-5">
            <div className="mb-3 sm:mb-4">
                <p className="text-xs text-gray-600 sm:text-sm">{totalLabel}</p>
                <p className={`text-lg font-semibold sm:text-xl ${totalAccentClass}`}>{formatCurrency(total, currency)}</p>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-3">
                <div
                    ref={chartRef}
                    className={`relative w-full min-w-0 flex-1 ${chartAreaHeight}`}
                    role="img"
                    aria-label={`${type === "income" ? "Income" : "Expense"} categories pie chart showing distribution of ${formatCurrency(total, currency)} across different categories`}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart
                            margin={
                                isExpanded
                                    ? { top: 24, right: 28, bottom: 24, left: 28 }
                                    : { top: 12, right: 14, bottom: 12, left: 14 }
                            }
                        >
                            <defs>
                                {piePatterns}
                                <pattern
                                    id={`${patternPrefix}-othersPattern`}
                                    patternUnits="userSpaceOnUse"
                                    width="3"
                                    height="3"
                                >
                                    <rect width="3" height="3" fill="#94a3b8" />
                                    <rect x="0" y="0" width="1" height="1" fill="#64748b" opacity="0.4" />
                                    <rect x="2" y="2" width="1" height="1" fill="#64748b" opacity="0.4" />
                                    <rect x="1" y="1" width="1" height="1" fill="#475569" opacity="0.3" />
                                </pattern>
                            </defs>

                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                label={renderCustomizedLabel}
                                labelLine={false}
                                outerRadius="62%"
                                innerRadius="36%"
                                fill="#8884d8"
                                dataKey="value"
                                paddingAngle={1}
                                cornerRadius={8}
                                stroke="#ffffff"
                                strokeWidth={2}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            entry.name === "Others"
                                                ? `url(#${patternPrefix}-othersPattern)`
                                                : `url(#${patternPrefix}-piePattern${index})`
                                        }
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={CustomTooltip} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="w-full shrink-0 border-t border-gray-100 pt-3 lg:w-[min(100%,22rem)] lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0 xl:w-96">
                    <h4 className="mb-2 text-xs font-semibold text-gray-900">Category Breakdown</h4>
                    <div className="max-h-[min(55vh,24rem)] space-y-2 overflow-y-auto pr-1 sm:max-h-[min(50vh,28rem)]">
                        {chartData.map((entry) => {
                            const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0";
                            const isOthers = entry.name === "Others";

                            return (
                                <div key={entry.name}>
                                    <div className="flex items-start justify-between gap-8 sm:gap-10">
                                        <div className="flex min-w-0 flex-1 items-start gap-2 pr-2">
                                            <div
                                                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-white shadow-sm sm:h-4 sm:w-4"
                                                style={{ backgroundColor: entry.color }}
                                            />
                                            <span className="text-xs font-medium leading-snug text-gray-800 sm:text-sm">
                                                {entry.name}{" "}
                                                <span className="font-normal text-gray-500">({entry.count})</span>
                                                {isOthers && smallCategories.length > 0 && (
                                                    <span className="block text-[10px] text-gray-400 sm:inline sm:ml-1">
                                                        {smallCategories.length} categories
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="shrink-0 pl-4 text-right sm:pl-5">
                                            <div className="text-xs font-semibold text-gray-900 sm:text-sm">
                                                {formatCurrency(entry.value, currency)}
                                            </div>
                                            <div className="text-[10px] text-gray-500 sm:text-xs">{percentage}%</div>
                                        </div>
                                    </div>

                                    {isOthers && smallCategories.length > 0 && (
                                        <div className="ml-5 mt-1.5 space-y-1 border-l border-gray-100 pl-2">
                                            {smallCategories.map((smallCat) => {
                                                const smallPct =
                                                    total > 0 ? ((smallCat.value / total) * 100).toFixed(1) : "0.0";
                                                return (
                                                    <div
                                                        key={smallCat.name}
                                                        className="flex items-center justify-between gap-6 text-[11px] text-gray-500 sm:gap-8 sm:text-xs"
                                                    >
                                                        <span className="truncate">{smallCat.name}</span>
                                                        <span className="shrink-0 tabular-nums">
                                                            {formatCurrency(smallCat.value, currency)} ({smallPct}%)
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6" data-chart-type={type === "expense" ? "expense-pie" : "income-pie"}>
                <div className="mb-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{chartTitle}</h3>
                </div>
                <div className="flex h-64 items-center justify-center text-gray-500">No data available</div>
            </div>
        );
    }

    return (
        <>
            <div
                className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6"
                data-chart-type={type === "expense" ? "expense-pie" : "income-pie"}
            >
                <ChartControls
                    chartRef={chartRef}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    fileName={`${type}-category-chart`}
                    csvData={csvDataForControls}
                    csvFileName={`${type}-category-data`}
                    title={chartTitle}
                    tooltipText={tooltipText}
                />
                <ChartContent />
            </div>

            {isExpanded && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
                    <div className="max-h-full w-full max-w-6xl overflow-auto rounded-lg bg-white p-4 sm:p-6">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold sm:text-2xl">{chartTitle}</h2>
                                <p className="mt-1 text-sm text-gray-500">{tooltipText}</p>
                            </div>
                            <button
                                type="button"
                                onClick={toggleExpanded}
                                className="rounded-md bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-800"
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

CategoryPieChart.displayName = "CategoryPieChart";
