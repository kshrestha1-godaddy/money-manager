"use client";

import { useCallback, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Income, Expense } from "../../../types/financial";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";

export interface MobileCategoryPieChartProps {
  type: "income" | "expense";
  transactions: (Income | Expense)[];
  displayCurrency: string;
}

interface CategoryStats {
  totalAmount: number;
  count: number;
  minAmount: number;
  maxAmount: number;
  earliestDate: Date;
  latestDate: Date;
  categoryColor?: string | null;
}

interface CategoryDatum {
  name: string;
  value: number;
  color: string;
  count: number;
  average: number;
  minAmount: number;
  maxAmount: number;
  dateRange: string;
}

const COLOR_PALETTE = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f97316",
  "#a16207",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#8b5cf6",
  "#f43f5e",
  "#22c55e",
  "#f59e0b",
];

function formatDateRange(earliest: Date, latest: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
  if (earliest.getTime() === latest.getTime()) return earliest.toLocaleDateString("en", options);
  return `${earliest.toLocaleDateString("en", options)} – ${latest.toLocaleDateString("en", options)}`;
}

export function MobileCategoryPieChart({
  type,
  transactions,
  displayCurrency,
}: MobileCategoryPieChartProps) {
  const { chartData, total, smallCategories } = useMemo(() => {
    const categoryStatsMap = new Map<string, CategoryStats>();

    transactions.forEach((transaction) => {
      const categoryName = transaction.category?.name || "Unknown";
      const transactionDate = new Date(transaction.date);
      const amount = convertForDisplaySync(
        transaction.amount,
        transaction.currency,
        displayCurrency
      );
      const catColor = transaction.category?.color;

      const existing = categoryStatsMap.get(categoryName);
      if (!existing) {
        categoryStatsMap.set(categoryName, {
          totalAmount: amount,
          count: 1,
          minAmount: amount,
          maxAmount: amount,
          earliestDate: transactionDate,
          latestDate: transactionDate,
          categoryColor: catColor ?? null,
        });
      } else {
        existing.totalAmount += amount;
        existing.count += 1;
        existing.minAmount = Math.min(existing.minAmount, amount);
        existing.maxAmount = Math.max(existing.maxAmount, amount);
        existing.earliestDate =
          transactionDate < existing.earliestDate ? transactionDate : existing.earliestDate;
        existing.latestDate =
          transactionDate > existing.latestDate ? transactionDate : existing.latestDate;
        if (!existing.categoryColor && catColor) existing.categoryColor = catColor;
      }
    });

    const rawChartData: CategoryDatum[] = Array.from(categoryStatsMap.entries())
      .map(([name, stats], index) => {
        const average = stats.totalAmount / stats.count;
        const color =
          stats.categoryColor && /^#/.test(stats.categoryColor)
            ? stats.categoryColor
            : COLOR_PALETTE[index % COLOR_PALETTE.length]!;
        return {
          name,
          value: stats.totalAmount,
          color,
          count: stats.count,
          average,
          minAmount: stats.minAmount,
          maxAmount: stats.maxAmount,
          dateRange: formatDateRange(stats.earliestDate, stats.latestDate),
        };
      })
      .sort((a, b) => b.value - a.value);

    const totalSum = rawChartData.reduce((sum, item) => sum + item.value, 0);

    const significant = rawChartData.filter((item) => {
      const pct = totalSum > 0 ? (item.value / totalSum) * 100 : 0;
      return pct >= 2.5;
    });

    const small = rawChartData.filter((item) => {
      const pct = totalSum > 0 ? (item.value / totalSum) * 100 : 0;
      return pct < 2.5;
    });

    const merged: CategoryDatum[] = [...significant];
    if (small.length > 0) {
      const othersValue = small.reduce((s, item) => s + item.value, 0);
      const othersCount = small.reduce((s, item) => s + item.count, 0);
      merged.push({
        name: "Others",
        value: othersValue,
        color: "#94a3b8",
        count: othersCount,
        average: othersCount > 0 ? othersValue / othersCount : 0,
        minAmount: Math.min(...small.map((item) => item.minAmount)),
        maxAmount: Math.max(...small.map((item) => item.maxAmount)),
        dateRange: "",
      });
    }

    return { chartData: merged, total: totalSum, smallCategories: small };
  }, [transactions, displayCurrency]);

  const renderCustomizedLabel = useCallback(
    (entry: {
      cx?: number;
      cy?: number;
      outerRadius?: number;
      midAngle?: number;
      name?: string;
      value?: number;
    }) => {
      const percentage =
        total > 0 && entry.value != null ? ((entry.value / total) * 100).toFixed(1) : "0.0";
      const chartDataEntry = chartData.find((item) => item.name === entry.name);
      const labelColor = chartDataEntry?.color ?? "#374151";
      const transactionCount = chartDataEntry?.count ?? 0;
      const cx = entry.cx ?? 0;
      const cy = entry.cy ?? 0;
      const outerRadius = entry.outerRadius ?? 0;
      const midAngle = entry.midAngle ?? 0;

      const RADIAN = Math.PI / 180;
      const radius = outerRadius + 8;
      const x1 = cx + radius * Math.cos(-midAngle * RADIAN);
      const y1 = cy + radius * Math.sin(-midAngle * RADIAN);

      const horizontalLength = 10;
      const isRightSide = x1 > cx;
      const x2 = isRightSide ? x1 + horizontalLength : x1 - horizontalLength;
      const y2 = y1;

      const textX = isRightSide ? x2 + 3 : x2 - 3;
      const line2 = `(${transactionCount}x) [${percentage}%]`;

      const edgeX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
      const edgeY = cy + outerRadius * Math.sin(-midAngle * RADIAN);

      let labelName = String(entry.name ?? "");
      if (labelName.length > 14) labelName = `${labelName.slice(0, 12)}…`;

      return (
        <g>
          <polyline
            points={`${edgeX},${edgeY} ${x1},${y1} ${x2},${y2}`}
            stroke="#9ca3af"
            strokeWidth={1.5}
            fill="none"
          />
          <text
            fill={labelColor}
            textAnchor={isRightSide ? "start" : "end"}
            fontWeight={600}
          >
            <tspan x={textX} y={y2} dy="-0.35em" fontSize={9} style={{ fill: labelColor }}>
              {labelName}
            </tspan>
            <tspan
              x={textX}
              y={y2}
              dy="0.95em"
              fontSize={8}
              fontWeight={600}
              style={{ fill: labelColor }}
            >
              {line2}
            </tspan>
          </text>
        </g>
      );
    },
    [total, chartData]
  );

  const accentClass = type === "income" ? "text-emerald-600" : "text-red-600";
  const label = type === "income" ? "Income by category" : "Expenses by category";

  if (transactions.length === 0 || chartData.length === 0 || total <= 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <p className="mt-2 text-center text-sm text-gray-500 py-6">No category data for this view.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Based on filtered list</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Total</p>
          <p className={`text-base font-semibold tabular-nums ${accentClass}`}>
            {formatCurrency(total, displayCurrency)}
          </p>
        </div>
      </div>

      <div
        className="h-[min(360px,78vw)] min-h-[300px] w-full min-w-0 [&_.recharts-surface]:overflow-visible [&_.recharts-wrapper]:overflow-visible"
        role="img"
        aria-label={`${label} pie chart`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 12, right: 4, bottom: 12, left: 4 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="34%"
              outerRadius="56%"
              paddingAngle={2}
              cornerRadius={6}
              dataKey="value"
              nameKey="name"
              stroke="#fff"
              strokeWidth={2}
              labelLine={false}
              label={renderCustomizedLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as CategoryDatum | undefined;
                if (!row) return null;
                const pct = total > 0 ? ((row.value / total) * 100).toFixed(1) : "0.0";
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-gray-900">{row.name}</p>
                    <p className="text-gray-600 mt-1">
                      {formatCurrency(row.value, displayCurrency)}{" "}
                      <span className="text-gray-400">({pct}%)</span>
                    </p>
                    <p className="text-gray-500 mt-0.5">{row.count} transaction{row.count !== 1 ? "s" : ""}</p>
                    {row.name === "Others" && smallCategories.length > 0 ? (
                      <p className="mt-1.5 max-w-[220px] text-[11px] text-gray-500 leading-snug">
                        {smallCategories.map((c) => c.name).join(", ")}
                      </p>
                    ) : null}
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
