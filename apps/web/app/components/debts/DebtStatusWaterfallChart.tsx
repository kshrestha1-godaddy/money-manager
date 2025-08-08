"use client";

import React, { useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
  Cell,
} from "recharts";
import type { TooltipProps } from "recharts";
import { ChartControls } from "../ChartControls";
import { formatCurrency } from "../../utils/currency";
import { useChartExpansion } from "../../utils/chartUtils";
import type { DebtInterface } from "../../types/debts";
import { calculateRemainingWithInterest } from "../../utils/interestCalculation";

interface DebtStatusWaterfallChartProps {
  debts: DebtInterface[];
  currency: string;
}

interface ChartRow {
  name: string;
  value: number;
  key: "TOTAL" | "ACTIVE" | "PARTIAL" | "FULL";
}

function getColor(key: ChartRow["key"]): string {
  switch (key) {
    case "TOTAL":
      return "#6b7280"; // gray
    case "ACTIVE":
      return "#ef4444"; // red
    case "PARTIAL":
      return "#f59e0b"; // amber
    case "FULL":
      return "#10b981"; // emerald
  }
}

export function DebtStatusWaterfallChart({ debts, currency }: DebtStatusWaterfallChartProps) {
  const { isExpanded, toggleExpanded } = useChartExpansion();
  const chartRef = useRef<HTMLDivElement>(null);

  const metrics = useMemo(() => {
    let totalWithInterest = 0;
    let activeOutstanding = 0;
    let partialOutstanding = 0;
    let fullyPaidAmount = 0;

    debts.forEach((debt) => {
      const result = calculateRemainingWithInterest(
        debt.amount,
        debt.interestRate,
        debt.lentDate instanceof Date ? debt.lentDate : new Date(debt.lentDate),
        debt.dueDate ? (debt.dueDate instanceof Date ? debt.dueDate : new Date(debt.dueDate)) : undefined,
        debt.repayments || [],
        new Date(),
        debt.status
      );

      const total = result.totalWithInterest;
      totalWithInterest += total;

      if (debt.status === "FULLY_PAID") {
        // For fully paid, the repaid amount equals total with interest
        fullyPaidAmount += total;
      } else if (debt.status === "PARTIALLY_PAID") {
        partialOutstanding += result.remainingAmount;
      } else {
        // Treat ACTIVE/OVERDUE/DEFAULTED as active bucket for visualization
        activeOutstanding += result.remainingAmount;
      }
    });

    const safeTotal = totalWithInterest || 1; // avoid divide-by-zero

    const rows: ChartRow[] = [
      { name: "Total Lendings", value: totalWithInterest, key: "TOTAL" },
      { name: "Active", value: activeOutstanding, key: "ACTIVE" },
      { name: "Partially Paid", value: partialOutstanding, key: "PARTIAL" },
      { name: "Fully Paid", value: fullyPaidAmount, key: "FULL" },
    ];

    const csvData: (string | number)[][] = [
      ["Category", "Amount", "Percent"],
      ...rows.map((r) => [r.name, r.value, Number(((r.value / safeTotal) * 100).toFixed(2))]),
    ];

    return { rows, totalWithInterest, csvData };
  }, [debts]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;
    const value = payload[0]?.value as number;
    const percent = metrics.totalWithInterest
      ? ((value / metrics.totalWithInterest) * 100).toFixed(1)
      : "0.0";

    return (
      <div className="bg-white border border-gray-200 shadow-md rounded-md p-2 text-xs">
        <div className="font-medium text-gray-800">{label}</div>
        <div className="text-gray-600 mt-1">{formatCurrency(value, currency)} ({percent}%)</div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6" role="region" aria-label="Debt Status Waterfall Chart" ref={chartRef}>
      <ChartControls
        chartRef={chartRef}
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
        title="Debts Waterfall"
        subtitle="Distribution of lendings by status"
        fileName="debts-waterfall"
        csvData={metrics.csvData}
        csvFileName="debts-waterfall-data"
        tooltipText="Shows total lendings split across Active, Partially Paid, and Fully Paid (with interest)."
      />

      <div className="w-full h-[320px] sm:h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={metrics.rows} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
            <YAxis tickFormatter={(v) => formatCurrency(Number(v), currency)} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />

            {/* Reference lines per category to emulate dashed levels */}
            {metrics.rows.slice(1).map((r) => (
              <ReferenceLine key={r.key} y={r.value} stroke={getColor(r.key)} strokeDasharray="4 4" />
            ))}

            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              <LabelList
                position="insideTop"
                formatter={(v: number, _n: any, entry: any) => {
                  const percent = metrics.totalWithInterest
                    ? ((v / metrics.totalWithInterest) * 100).toFixed(1)
                    : "0.0";
                  return `${formatCurrency(v, currency)}\n(${percent}%)`;
                }}
                className="fill-white text-[10px] leading-tight"
              />
              {metrics.rows.map((row, index) => (
                <Cell key={row.key} fill={getColor(row.key)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-6 text-xs sm:text-sm">
        {["TOTAL", "ACTIVE", "PARTIAL", "FULL"].map((k) => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: getColor(k as ChartRow["key"]) }} />
            <span>
              {k === "TOTAL" ? "Total" : k === "ACTIVE" ? "Active" : k === "PARTIAL" ? "Partially Paid" : "Fully Paid"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DebtStatusWaterfallChart;


