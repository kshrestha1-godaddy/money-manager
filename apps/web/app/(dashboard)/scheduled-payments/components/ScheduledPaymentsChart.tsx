"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "../../../utils/currency";
import { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { CONTAINER_COLORS, TEXT_COLORS } from "../../../config/colorConfig";

const card = `${CONTAINER_COLORS.whiteWithPadding} text-left`;
const chartTitle = TEXT_COLORS.chartTitle;

interface ScheduledPaymentsChartProps {
  items: ScheduledPaymentItem[];
  userCurrency: string;
  now: Date;
}

export function ScheduledPaymentsChart({ items, userCurrency, now }: ScheduledPaymentsChartProps) {
  let upcomingTotal = 0;
  let previousTotal = 0;
  let upcomingCount = 0;
  let previousCount = 0;

  for (const item of items) {
    const converted = convertForDisplaySync(item.amount, item.currency, userCurrency);
    if (item.scheduledAt > now) {
      upcomingTotal += converted;
      upcomingCount += 1;
    } else {
      previousTotal += converted;
      previousCount += 1;
    }
  }

  const data = [
    {
      name: "Upcoming",
      amount: Math.round(upcomingTotal * 100) / 100,
      count: upcomingCount,
      fill: "#3b82f6",
    },
    {
      name: "Previous",
      amount: Math.round(previousTotal * 100) / 100,
      count: previousCount,
      fill: "#64748b",
    },
  ];

  return (
    <div className={`${card} mb-6`}>
      <h3 className={chartTitle}>Scheduled payments overview</h3>
      <p className="text-sm text-gray-600 mb-4">
        Total amounts in {userCurrency} for items in your current filter.{" "}
        <span className="text-gray-700">
          Upcoming: future-dated schedules ({upcomingCount}). Previous: on or before today (
          {previousCount}).
        </span>
      </p>
      <div className="h-[280px] w-full min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            barCategoryGap="28%"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => formatCurrency(typeof v === "number" ? v : Number(v), userCurrency)}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value, userCurrency)}
              labelFormatter={(label) => String(label)}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={120}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
