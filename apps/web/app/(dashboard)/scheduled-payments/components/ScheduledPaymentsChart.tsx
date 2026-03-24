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
import { RefreshCw } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { ScheduledPaymentItem } from "../../../types/scheduled-payment";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { BUTTON_COLORS, CONTAINER_COLORS } from "../../../config/colorConfig";

const card = `${CONTAINER_COLORS.whiteWithPadding} text-left`;

interface ScheduledPaymentsChartProps {
  items: ScheduledPaymentItem[];
  userCurrency: string;
  now: Date;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

interface StatusSlice {
  count: number;
  amount: number;
}

function aggregateByStatus(
  items: ScheduledPaymentItem[],
  userCurrency: string,
  now: Date
): {
  upcoming: StatusSlice;
  awaiting: StatusSlice;
  accepted: StatusSlice;
  rejected: StatusSlice;
} {
  const upcoming: StatusSlice = { count: 0, amount: 0 };
  const awaiting: StatusSlice = { count: 0, amount: 0 };
  const accepted: StatusSlice = { count: 0, amount: 0 };
  const rejected: StatusSlice = { count: 0, amount: 0 };

  for (const item of items) {
    const converted = convertForDisplaySync(item.amount, item.currency, userCurrency);
    if (item.scheduledAt > now) {
      upcoming.count += 1;
      upcoming.amount += converted;
    } else if (item.resolution === "ACCEPTED") {
      accepted.count += 1;
      accepted.amount += converted;
    } else if (item.resolution === "REJECTED") {
      rejected.count += 1;
      rejected.amount += converted;
    } else {
      awaiting.count += 1;
      awaiting.amount += converted;
    }
  }

  return { upcoming, awaiting, accepted, rejected };
}

export function ScheduledPaymentsChart({
  items,
  userCurrency,
  now,
  onRefresh,
  isRefreshing = false,
}: ScheduledPaymentsChartProps) {
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

  const byStatus = aggregateByStatus(items, userCurrency, now);

  const secondaryOutline = BUTTON_COLORS.secondaryBlue;

  const summaryRows: {
    key: string;
    label: string;
    slice: StatusSlice;
    barClass: string;
    dotClass: string;
  }[] = [
    {
      key: "upcoming",
      label: "Upcoming",
      slice: byStatus.upcoming,
      barClass: "border-blue-200 bg-blue-50/80",
      dotClass: "bg-blue-500",
    },
    {
      key: "awaiting",
      label: "Awaiting action",
      slice: byStatus.awaiting,
      barClass: "border-amber-200 bg-amber-50/80",
      dotClass: "bg-amber-500",
    },
    {
      key: "accepted",
      label: "Accepted",
      slice: byStatus.accepted,
      barClass: "border-emerald-200 bg-emerald-50/80",
      dotClass: "bg-emerald-500",
    },
    {
      key: "rejected",
      label: "Rejected",
      slice: byStatus.rejected,
      barClass: "border-gray-200 bg-white",
      dotClass: "bg-gray-400 ring-1 ring-gray-300",
    },
  ];

  return (
    <div className={`${card} flex h-full min-h-0 flex-col`}>
      <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 m-0">Overview</h3>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`${secondaryOutline} inline-flex items-center gap-2 shrink-0 disabled:opacity-50`}
            aria-busy={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 shrink-0 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
        ) : null}
      </div>
      <div className="mt-4 h-[260px] w-full shrink-0 min-h-[200px]">
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

      <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-gray-100 pt-4">
        <h4 className="text-sm font-semibold text-gray-900">Summary</h4>
        <ul className="mt-3 grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          {summaryRows.map((row) => (
            <li
              key={row.key}
              className={`flex flex-col rounded-lg border px-3 py-2.5 ${row.barClass}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${row.dotClass}`} aria-hidden />
                <span className="text-xs font-medium text-gray-800">{row.label}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-lg font-semibold tabular-nums text-gray-900">
                  {formatCurrency(Math.round(row.slice.amount * 100) / 100, userCurrency)}
                </span>
                <span className="text-xs text-gray-600">
                  {row.slice.count} {row.slice.count === 1 ? "payment" : "payments"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
