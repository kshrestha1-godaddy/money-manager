"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, getCurrencySymbol } from "../../../utils/currency";

/** Short axis labels: ₹500K, ₹1M, $2M — not full currency strings */
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

export interface MobileAccountFreeWithheldBarProps {
  freeAmount: number;
  withheldAmount: number;
  displayCurrency: string;
}

export function MobileAccountFreeWithheldBar({
  freeAmount,
  withheldAmount,
  displayCurrency,
}: MobileAccountFreeWithheldBarProps) {
  const free = Math.max(0, freeAmount);
  const withheld = Math.max(0, withheldAmount);
  const total = free + withheld;

  if (total <= 0) return null;

  const data = [{ name: "Balance", free, withheld }];

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      role="img"
      aria-label={`Balance breakdown: ${formatCurrency(free, displayCurrency)} free, ${formatCurrency(withheld, displayCurrency)} withheld`}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Free vs withheld
      </h3>
      <div className="h-44 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              type="number"
              tickFormatter={(v) => formatCompactAxisValue(Number(v), displayCurrency)}
              width={52}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const row = payload[0]?.payload as { free: number; withheld: number };
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-emerald-700">
                      Free: {formatCurrency(row.free, displayCurrency)}
                    </p>
                    <p className="font-medium text-amber-700">
                      Withheld: {formatCurrency(row.withheld, displayCurrency)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="free"
              stackId="stack"
              fill="#10b981"
              name="Free"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="withheld"
              stackId="stack"
              fill="#f59e0b"
              name="Withheld"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-700">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
          <span>Free</span>
          <span className="font-semibold tabular-nums text-gray-900">
            {formatCurrency(free, displayCurrency)}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-amber-500" aria-hidden />
          <span>Withheld</span>
          <span className="font-semibold tabular-nums text-gray-900">
            {formatCurrency(withheld, displayCurrency)}
          </span>
        </span>
      </div>
    </div>
  );
}
