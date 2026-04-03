"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, getCurrencySymbol } from "../../../utils/currency";

function formatCompactAxisValue(value: number, currencyCode: string): string {
  const sym = getCurrencySymbol(currencyCode).trimEnd();
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const nb = "\u00A0";
  if (abs >= 1_000_000_000) {
    const n = abs / 1_000_000_000;
    return `${sign}${sym}${nb}${n >= 10 || n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    const n = abs / 1_000_000;
    return `${sign}${sym}${nb}${n >= 10 || n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const n = abs / 1_000;
    return `${sign}${sym}${nb}${n >= 100 || n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}K`;
  }
  return `${sign}${sym}${nb}${abs.toFixed(0)}`;
}

export interface InvestmentSavingsTargetChartProps {
  targetAmount: number;
  fulfilledAmount: number;
  currency: string;
}

export function InvestmentSavingsTargetChart({
  targetAmount,
  fulfilledAmount,
  currency,
}: InvestmentSavingsTargetChartProps) {
  const target = Math.max(0, targetAmount);
  const fulfilled = Math.max(0, fulfilledAmount);
  const chartData = [
    { name: "Target", value: target, fill: "#d1d5db" },
    { name: "Fulfilled", value: fulfilled, fill: "#7c3aed" },
  ];
  const maxY = Math.max(target, fulfilled, 1) * 1.08;

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
      role="img"
      aria-label={`Savings target ${formatCurrency(target, currency)}, fulfilled ${formatCurrency(fulfilled, currency)}`}
    >
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
        Target vs fulfilled
      </h3>
      <p className="mb-3 text-[11px] text-gray-500">
        Fulfilled = total cost basis linked to this goal (all positions).
      </p>
      <div className="h-48 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#374151" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              domain={[0, maxY]}
              tickFormatter={(v) => formatCompactAxisValue(Number(v), currency)}
              width={56}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <Tooltip
              cursor={{ fill: "rgba(243, 244, 246, 0.6)" }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const row = payload[0]?.payload as { name: string; value: number };
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-gray-900">{row.name}</p>
                    <p className="tabular-nums text-gray-800">
                      {formatCurrency(row.value, currency)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-gray-100 pt-3 text-xs text-gray-800">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-gray-300" aria-hidden />
          <span>Target</span>
          <span className="font-semibold tabular-nums text-gray-900">
            {formatCurrency(target, currency)}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-violet-600" aria-hidden />
          <span>Fulfilled</span>
          <span className="font-semibold tabular-nums text-gray-900">
            {formatCurrency(fulfilled, currency)}
          </span>
        </span>
        {target > 0 ? (
          <span className="w-full text-center text-[11px] text-gray-600 sm:w-auto">
            {Math.min(100, (fulfilled / target) * 100).toFixed(1)}% of target
          </span>
        ) : null}
      </div>
    </div>
  );
}
