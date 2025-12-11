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
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import type { TooltipProps } from "recharts";
import { ChartControls } from "../../../components/ChartControls";
import { formatCurrency } from "../../../utils/currency";
import { useChartExpansion } from "../../../utils/chartUtils";
import type { DebtInterface } from "../../../types/debts";
import { calculateRemainingWithInterest } from "../../../utils/interestCalculation";

interface DebtDueDatesChartProps {
  debts: DebtInterface[];
  currency: string;
}

interface DueDateDataPoint {
  id: number;
  borrowerName: string;
  amount: number;
  remainingAmount: number;
  dueDate: Date | null;
  daysUntilDue: number;
  status: string;
  purpose: string;
  isOverdue: boolean;
}

// Color based on urgency
function getBarColor(daysUntilDue: number, isOverdue: boolean): string {
  if (isOverdue) return "#ef4444"; // Red - overdue
  if (daysUntilDue <= 7) return "#f97316"; // Orange - due this week
  if (daysUntilDue <= 30) return "#eab308"; // Yellow - due this month
  if (daysUntilDue <= 90) return "#22c55e"; // Green - due in 3 months
  return "#6b7280"; // Gray - due later
}

function getDaysLabel(days: number, isOverdue: boolean): string {
  if (isOverdue) {
    return `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days`;
}

export function DebtDueDatesChart({ debts, currency }: DebtDueDatesChartProps) {
  const { isExpanded, toggleExpanded } = useChartExpansion();
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter for active/partially paid debts with due dates
    const activeDebts = debts.filter(
      (debt) =>
        (debt.status === "ACTIVE" || debt.status === "PARTIALLY_PAID" || debt.status === "OVERDUE") &&
        debt.dueDate
    );

    const data: DueDateDataPoint[] = activeDebts.map((debt) => {
      const dueDate = debt.dueDate instanceof Date ? debt.dueDate : new Date(debt.dueDate!);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntilDue < 0;

      const result = calculateRemainingWithInterest(
        debt.amount,
        debt.interestRate,
        debt.lentDate instanceof Date ? debt.lentDate : new Date(debt.lentDate),
        dueDate,
        debt.repayments || [],
        new Date(),
        debt.status
      );

      return {
        id: debt.id,
        borrowerName: debt.borrowerName,
        amount: debt.amount,
        remainingAmount: result.remainingAmount,
        dueDate,
        daysUntilDue,
        status: debt.status,
        purpose: debt.purpose || "Personal Loan",
        isOverdue,
      };
    });

    // Sort by days until due (overdue first, then soonest)
    data.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return data;
  }, [debts]);

  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0]?.payload as DueDateDataPoint;
    if (!data) return null;

    const dueDateStr = data.dueDate
      ? data.dueDate.toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "No due date";

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 min-w-[220px]">
        <div className="font-semibold text-gray-800 mb-1">{data.borrowerName}</div>
        <div className="text-xs text-gray-500 mb-2">{data.purpose}</div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Due Date:</span>
            <span className="font-medium text-gray-800">{dueDateStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span
              className={`font-medium ${
                data.isOverdue
                  ? "text-red-600"
                  : data.daysUntilDue <= 7
                  ? "text-orange-600"
                  : "text-green-600"
              }`}
            >
              {getDaysLabel(data.daysUntilDue, data.isOverdue)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Original:</span>
            <span className="font-medium text-gray-800">
              {formatCurrency(data.amount, currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Remaining:</span>
            <span className="font-medium text-red-600">
              {formatCurrency(data.remainingAmount, currency)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Calculate dynamic height based on number of items
  const chartHeight = Math.max(400, chartData.length * 60);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 sm:p-6" ref={chartRef}>
        <ChartControls
          chartRef={chartRef}
          isExpanded={isExpanded}
          onToggleExpanded={toggleExpanded}
          title="Lending Due Dates"
          subtitle="Timeline of upcoming due dates for active lendings"
          fileName="lending-due-dates"
          csvData={[["Borrower", "Due Date", "Days Until Due", "Amount"]]}
          csvFileName="lending-due-dates-data"
          tooltipText="Shows when active lendings are due"
        />
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📅</div>
            <p>No active lendings with due dates</p>
          </div>
        </div>
      </div>
    );
  }

  // Stats
  const overdueCount = chartData.filter((d) => d.isOverdue).length;
  const dueThisWeek = chartData.filter((d) => !d.isOverdue && d.daysUntilDue <= 7).length;
  const dueThisMonth = chartData.filter((d) => !d.isOverdue && d.daysUntilDue > 7 && d.daysUntilDue <= 30).length;

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 sm:p-6 ${
        isExpanded ? "fixed inset-4 z-50 overflow-auto" : ""
      }`}
      ref={chartRef}
    >
      <ChartControls
        chartRef={chartRef}
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
        title={`Lending Due Dates • ${chartData.length} active`}
        subtitle="Timeline showing days until due for each lending"
        fileName="lending-due-dates"
        csvData={[
          ["Borrower", "Purpose", "Due Date", "Days Until Due", "Original Amount", "Remaining"],
          ...chartData.map((d) => [
            d.borrowerName,
            d.purpose,
            d.dueDate?.toISOString().split("T")[0] || "",
            d.daysUntilDue,
            d.amount,
            d.remainingAmount,
          ]),
        ]}
        csvFileName="lending-due-dates-data"
        tooltipText="Horizontal bar chart showing days until due for each active lending"
      />

      {/* Summary Stats */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="font-medium">{overdueCount} overdue</span>
          </div>
        )}
        {dueThisWeek > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span className="font-medium">{dueThisWeek} due this week</span>
          </div>
        )}
        {dueThisMonth > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span className="font-medium">{dueThisMonth} due this month</span>
          </div>
        )}
      </div>

      <div
        className={`w-full ${isExpanded ? "h-[75vh]" : ""}`}
        style={{ height: isExpanded ? undefined : chartHeight }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 30, right: 30, left: 10, bottom: 50 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={true} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#9ca3af" }}
              tickLine={{ stroke: "#d1d5db" }}
              label={{
                value: "Days Until Due",
                position: "insideBottom",
                offset: -5,
                fontSize: 12,
                fill: "#6b7280",
              }}
            />
            <YAxis
              type="category"
              dataKey="borrowerName"
              tick={{ fontSize: 11, fill: "#374151" }}
              axisLine={{ stroke: "#9ca3af" }}
              tickLine={false}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />

            {/* Reference line at 0 (today) */}
            <ReferenceLine
              x={0}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="4 4"
              label={{
                value: "Today",
                position: "top",
                fill: "#dc2626",
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Reference line at 7 days */}
            <ReferenceLine 
              x={7} 
              stroke="#f97316" 
              strokeDasharray="3 3" 
              strokeWidth={1} 
              opacity={0.5}
              label={{
                value: "7d",
                position: "top",
                fill: "#f97316",
                fontSize: 9,
                fontWeight: 500,
              }}
            />

            {/* Reference line at 30 days */}
            <ReferenceLine 
              x={30} 
              stroke="#eab308" 
              strokeDasharray="3 3" 
              strokeWidth={1.5} 
              opacity={0.6}
              label={{
                value: "30d",
                position: "top",
                fill: "#eab308",
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Reference line at 60 days */}
            <ReferenceLine 
              x={60} 
              stroke="#22c55e" 
              strokeDasharray="3 3" 
              strokeWidth={1.5} 
              opacity={0.6}
              label={{
                value: "60d",
                position: "top",
                fill: "#22c55e",
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            <Bar dataKey="daysUntilDue" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={600}>
              {/* Label showing amount inside the bar and projection line */}
              <LabelList
                content={(props: any) => {
                  const { x, y, width, height, index } = props;
                  const entry = chartData[index];
                  if (!entry) return null;
                  
                  const barEndX = x + width;
                  const barCenterY = y + height / 2;
                  
                  // Format amount for single line display
                  const amount = formatCurrency(entry.remainingAmount, currency);
                  
                  // Format the days text for bottom label
                  let daysText = "";
                  let textColor = "#374151";
                  if (entry.isOverdue) {
                    daysText = `${Math.abs(entry.daysUntilDue)}d overdue`;
                    textColor = "#dc2626";
                  } else if (entry.daysUntilDue === 0) {
                    daysText = "Due today";
                    textColor = "#dc2626";
                  } else {
                    daysText = `${entry.daysUntilDue}d`;
                  }
                  
                  // Project line to x-axis area - use a consistent bottom position for all bars
                  const chartAreaHeight = Math.max(400, chartData.length * 60) - 80; // Total height minus margins
                  const projectionEndY = chartAreaHeight;
                  const labelY = projectionEndY + 15;
                  
                  return (
                    <g>
                      {/* Amount label inside bar */}
                      <text
                        x={x + width / 2}
                        y={barCenterY + 4}
                        fill="#ffffff"
                        fontSize={11}
                        fontWeight={600}
                        textAnchor="middle"
                      >
                        {amount}
                      </text>
                      {/* Vertical projection line from bar tip DOWN to x-axis area */}
                      <line
                        x1={barEndX}
                        y1={barCenterY}
                        x2={barEndX}
                        y2={projectionEndY}
                        stroke="#9ca3af"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        opacity={0.6}
                      />
                      {/* Days label below x-axis */}
                      <text
                        x={barEndX}
                        y={labelY}
                        fill={textColor}
                        fontSize={10}
                        fontWeight={600}
                        textAnchor="middle"
                      >
                        {daysText}
                      </text>
                    </g>
                  );
                }}
              />
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.daysUntilDue, entry.isOverdue)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span className="text-gray-600">Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-orange-500" />
          <span className="text-gray-600">This Week</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-yellow-500" />
          <span className="text-gray-600">This Month</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span className="text-gray-600">{"< 3 Months"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-500" />
          <span className="text-gray-600">{"> 3 Months"}</span>
        </div>
      </div>
    </div>
  );
}

export default DebtDueDatesChart;

