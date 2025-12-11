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
import { formatCurrency, getCurrencySymbol } from "../../../utils/currency";
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

// Subtle/muted colors for each urgency type
const COLORS = {
  overdue: "#f87171",     // Soft coral for overdue
  thisWeek: "#fb923c",   // Soft orange for this week
  thisMonth: "#fbbf24",  // Soft amber for this month
  withinQuarter: "#009933", // Soft green for within 3 months
  later: "#9ca3af"       // Soft gray for later
};

// Pattern IDs for textures
const PATTERN_IDS = {
  overdue: "pattern-overdue",
  thisWeek: "pattern-thisweek",
  thisMonth: "pattern-thismonth",
  withinQuarter: "pattern-withinquarter",
  later: "pattern-later"
};

// Get pattern type based on urgency
function getPatternType(daysUntilDue: number, isOverdue: boolean): keyof typeof PATTERN_IDS {
  if (isOverdue) return "overdue";
  if (daysUntilDue <= 7) return "thisWeek";
  if (daysUntilDue <= 30) return "thisMonth";
  if (daysUntilDue <= 90) return "withinQuarter";
  return "later";
}

// Color based on urgency
function getBarColor(daysUntilDue: number, isOverdue: boolean): string {
  const patternType = getPatternType(daysUntilDue, isOverdue);
  return COLORS[patternType];
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

    // Calculate total active amount for percentage calculations
    const totalActiveAmount = data.reduce((sum, item) => sum + item.remainingAmount, 0);

    return { data, totalActiveAmount };
  }, [debts]);

  // Get currency symbol for the user's selected currency
  const currencySymbol = getCurrencySymbol(currency);

  // Format large numbers compactly with proper currency symbol
  const formatCompact = (value: number): string => {
    if (value >= 1000000) {
      return `${currencySymbol}${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${currencySymbol}${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value, currency);
  };

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
            <span className="text-gray-600">Days Count:</span>
            <span className={`font-medium ${data.isOverdue ? "text-red-600" : "text-gray-800"}`}>
              {data.isOverdue ? `-${Math.abs(data.daysUntilDue)}` : data.daysUntilDue === 0 ? "0 (Today)" : `+${data.daysUntilDue}`}
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
  const chartHeight = Math.max(400, chartData.data.length * 60);

  if (chartData.data.length === 0) {
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
  const overdueCount = chartData.data.filter((d) => d.isOverdue).length;
  const dueThisWeek = chartData.data.filter((d) => !d.isOverdue && d.daysUntilDue <= 7).length;
  const dueThisMonth = chartData.data.filter((d) => !d.isOverdue && d.daysUntilDue > 7 && d.daysUntilDue <= 30).length;

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
        title={`Lending Due Dates • ${chartData.data.length} active`}
        subtitle="Timeline showing days until due for each lending"
        fileName="lending-due-dates"
        csvData={[
          ["Borrower", "Purpose", "Due Date", "Days Until Due", "Original Amount", "Remaining"],
          ...chartData.data.map((d) => [
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
            data={chartData.data}
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

            {/* SVG Pattern Definitions for Textures */}
            <defs>
              {/* Overdue - Diagonal lines */}
              <pattern id={PATTERN_IDS.overdue} patternUnits="userSpaceOnUse" width="8" height="8">
                <rect width="8" height="8" fill={COLORS.overdue} />
                <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#dc2626" strokeWidth="1" opacity="0.4" />
              </pattern>
              
              {/* This Week - Vertical lines */}
              <pattern id={PATTERN_IDS.thisWeek} patternUnits="userSpaceOnUse" width="6" height="6">
                <rect width="6" height="6" fill={COLORS.thisWeek} />
                <line x1="3" y1="0" x2="3" y2="6" stroke="#ea580c" strokeWidth="1" opacity="0.3" />
              </pattern>
              
              {/* This Month - Dots pattern */}
              <pattern id={PATTERN_IDS.thisMonth} patternUnits="userSpaceOnUse" width="8" height="8">
                <rect width="8" height="8" fill={COLORS.thisMonth} />
                <circle cx="4" cy="4" r="1.5" fill="#d97706" opacity="0.3" />
              </pattern>
              
              {/* Within Quarter - Horizontal lines */}
              <pattern id={PATTERN_IDS.withinQuarter} patternUnits="userSpaceOnUse" width="6" height="6">
                <rect width="6" height="6" fill={COLORS.withinQuarter} />
                <line x1="0" y1="3" x2="6" y2="3" stroke="#16a34a" strokeWidth="1" opacity="0.25" />
              </pattern>
              
              {/* Later - Crosshatch */}
              <pattern id={PATTERN_IDS.later} patternUnits="userSpaceOnUse" width="8" height="8">
                <rect width="8" height="8" fill={COLORS.later} />
                <path d="M0,0 l8,8 M8,0 l-8,8" stroke="#6b7280" strokeWidth="0.8" opacity="0.2" />
              </pattern>
            </defs>

            <Bar dataKey="daysUntilDue" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={600}>
              {/* Label showing amount inside the bar and projection line */}
              <LabelList
                content={(props: any) => {
                  const { x, y, width, height, index } = props;
                  const entry = chartData.data[index];
                  if (!entry) return null;
                  
                  const barEndX = x + width;
                  const barCenterY = y + height / 2;
                  
                  // Format amount compactly for single line display
                  const amount = formatCompact(entry.remainingAmount);
                  
                  // Calculate percentage of total active amount
                  const percentage = chartData.totalActiveAmount > 0 
                    ? ((entry.remainingAmount / chartData.totalActiveAmount) * 100).toFixed(1)
                    : "0.0";
                  
                  // Format the days text for bottom label with date
                  const dateString = entry.dueDate 
                    ? entry.dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
                    : '';
                  
                  let daysText = "";
                  let textColor = "#374151";
                  if (entry.isOverdue) {
                    daysText = `${Math.abs(entry.daysUntilDue)}d overdue${dateString ? ` (${dateString})` : ''}`;
                    textColor = "#dc2626";
                  } else if (entry.daysUntilDue === 0) {
                    daysText = `Due today${dateString ? ` [${dateString}]` : ''}`;
                    textColor = "#dc2626";
                  } else {
                    daysText = `${entry.daysUntilDue}d${dateString ? ` (${dateString})` : ''}`;
                  }
                  
                  // Project line to x-axis area - use a consistent bottom position for all bars
                  const chartAreaHeight = Math.max(400, chartData.data.length * 60) - 80; // Total height minus margins
                  const projectionEndY = chartAreaHeight;
                  const labelY = projectionEndY + 15;
                  
                  return (
                    <g>
                      {/* Single line label with borrower name, amount, and percentage */}
                      <text
                        x={x + width / 2}
                        y={barCenterY + 4}
                        fill="#ffffff"
                        fontSize={11}
                        fontWeight={600}
                        textAnchor="middle"
                      >
                        {`${entry.borrowerName} | ${amount} | ${percentage}%  `}
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
              {chartData.data.map((entry, index) => {
                const patternType = getPatternType(entry.daysUntilDue, entry.isOverdue);
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#${PATTERN_IDS[patternType]})`}
                    stroke={COLORS[patternType]}
                    strokeWidth={1}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.overdue }} />
          <span className="text-gray-600">Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.thisWeek }} />
          <span className="text-gray-600">This Week</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.thisMonth }} />
          <span className="text-gray-600">This Month</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.withinQuarter }} />
          <span className="text-gray-600">{"< 3 Months"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.later }} />
          <span className="text-gray-600">{"> 3 Months"}</span>
        </div>
      </div>
    </div>
  );
}

export default DebtDueDatesChart;

