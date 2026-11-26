"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  type PieLabelRenderProps,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Expense } from "../../../types/financial";
import {
  buildExpenseBreakdown,
  CATEGORY_MIN_DISPLAY_PERCENT,
  type AccountBarRow,
  type CategoryRow,
} from "../utils/expenseBreakdown";
import { formatCurrency } from "../../../utils/currency";
import { convertTransactionForDisplaySync } from "../../../utils/currencyDisplay";
interface ExpenseFrequencyChartsProps {
  expenses: Expense[];
  currency: string;
}

function renderCategoryLabel({
  cx, cy, outerRadius, midAngle, payload,
}: PieLabelRenderProps) {
  const category = payload as CategoryRow | undefined;
  if (!category || midAngle === undefined) return null;

  const centerX = Number(cx);
  const centerY = Number(cy);
  const radius = Number(outerRadius);
  const angle = -midAngle * Math.PI / 180;
  const edgeX = centerX + radius * Math.cos(angle);
  const edgeY = centerY + radius * Math.sin(angle);
  const elbowX = centerX + (radius + 8) * Math.cos(angle);
  const labelY = centerY + (radius + 8) * Math.sin(angle);
  const onRight = elbowX >= centerX;
  const lineEndX = elbowX + (onRight ? 10 : -10);
  const textWidth = centerX - Math.abs(lineEndX - centerX) - 5;
  if (textWidth <= 0) return null;

  const percentage = `${category.percentOfTotal.toFixed(1)}%`;

  return (
    <g pointerEvents="none">
      <polyline
        points={`${edgeX},${edgeY} ${elbowX},${labelY} ${lineEndX},${labelY}`}
        stroke="#9ca3af"
        strokeWidth={1.5}
        fill="none"
      />
      <foreignObject
        x={onRight ? lineEndX + 4 : 1}
        y={labelY - 8}
        width={textWidth}
        height={16}
      >
        <div
          className={`flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold leading-4 ${onRight ? "" : "justify-end"}`}
          style={{ color: category.color }}
        >
          {textWidth >= 72 && <span className="min-w-0 truncate">{category.name}</span>}
          <span className="shrink-0">
            {textWidth >= 72 ? `(${category.transactionCount}x) [${percentage}]` : percentage}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

function formatBarAmount(amount: number, currencyCode: string): string {
  // Use user's selected currency formatting instead of hardcoded prefix.
  return formatCurrency(amount, currencyCode).replace(/\u00A0/g, " ");
}

function createAccountBarShapeRenderer(currency: string) {
  return function AccountBarShape(props: Record<string, unknown>) {
    const x = toNum(props.x);
    const y = toNum(props.y);
    const width = toNum(props.width);
    const height = toNum(props.height);
    const row = props.payload as AccountBarRow | undefined;
    if (!row || width <= 0 || height <= 0) return null;

    const label = `${formatBarAmount(row.totalAmount, currency)} · ${row.count}×`;
    const radius = Math.min(5, width / 2, height / 2);
    const labelFits = width >= label.length * 6.5 + 20;

    return (
      <g className="pointer-events-none">
        <rect x={x} y={y} width={width} height={height} rx={radius} fill="#4f46e5" />
        {labelFits && (
          <text
            x={x + 10}
            y={y + height / 2}
            dominantBaseline="middle"
            fill="#fff"
            fontSize={11}
            fontWeight={600}
          >
            {label}
          </text>
        )}
      </g>
    );
  };
}

function buildCountAxisTicks(maxCount: number): number[] {
  const max = Math.max(1, maxCount);
  const padded = Math.ceil(max * 1.08);
  const step = Math.max(1, Math.ceil(padded / 6));
  const ticks: number[] = [0];
  for (let v = step; v < padded; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== padded) ticks.push(padded);
  return ticks;
}

function accountTickValue(payload: unknown): string {
  if (payload == null) return "";
  if (typeof payload === "string" || typeof payload === "number") return String(payload);
  if (typeof payload === "object" && "value" in payload) {
    const v = (payload as { value?: unknown }).value;
    return v == null ? "" : String(v);
  }
  return "";
}

interface SummaryStripItem {
  label: string;
  value: ReactNode;
  hint?: string;
  valueClassName?: string;
}

function SummaryStrip({ items }: { items: SummaryStripItem[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-gray-100 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm sm:grid-cols-4">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{item.label}</p>
          <p
            className={`mt-1 truncate text-sm font-semibold sm:text-base ${
              item.valueClassName ?? "text-gray-900"
            }`}
          >
            {item.value}
          </p>
          {item.hint ? <p className="mt-0.5 text-xs text-gray-500">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

function AccountYAxisTick(props: {
  x?: number;
  y?: number;
  payload?: unknown;
}) {
  const { x = 0, y = 0, payload } = props;
  const raw = accountTickValue(payload);
  const text = raw.trim() === "" ? "Unnamed account" : raw;
  return (
    <text x={x} y={y} dy={3} textAnchor="end" fill="#374151" fontSize={10}>
      <title>{text}</title>
      <tspan style={{ wordBreak: "break-word" }}>{text}</tspan>
    </text>
  );
}

export function ExpenseFrequencyCharts({ expenses, currency: userCurrency }: ExpenseFrequencyChartsProps) {
  const totalCount = expenses.length;

  const { accountRows, categoryRows, displayedCategories, totalAmount } = useMemo(
    () => buildExpenseBreakdown(expenses, (expense) => convertTransactionForDisplaySync(expense, userCurrency)),
    [expenses, userCurrency]
  );
  const accountByFrequency = accountRows;
  const categoryByFrequency = displayedCategories;
  const donutRows = displayedCategories.filter((row) => row.totalAmount > 0);
  const accountLabels = useMemo(
    () => new Map(accountByFrequency.map(({ key, name }) => [key, name])),
    [accountByFrequency]
  );
  const accountYTicks = useMemo(() => accountByFrequency.map(({ key }) => key), [accountByFrequency]);
  const accountYAxisWidth = useMemo(
    () => Math.max(72, ...Array.from(accountLabels.values(), (name) => name.length * 6 + 16)),
    [accountLabels]
  );

  const accountChartMaxCount = useMemo(
    () => accountByFrequency.reduce((m, r) => Math.max(m, r.count), 0),
    [accountByFrequency]
  );

  const accountXTicks = useMemo(
    () => buildCountAxisTicks(accountChartMaxCount),
    [accountChartMaxCount]
  );

  const accountXDomainMax = useMemo(
    () => Math.max(accountXTicks[accountXTicks.length - 1] ?? 1, 1),
    [accountXTicks]
  );

  const CategoryTooltip = useCallback(
    ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: Array<{ payload?: CategoryRow }>;
    }) => {
      if (!active || !payload?.length) return null;
      const row = payload[0]?.payload;
      if (!row) return null;
      return (
        <div
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md"
          style={{ minWidth: 220 }}
        >
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
            <div className="font-semibold text-gray-900">{row.name}</div>
          </div>
          <div className="mt-1 text-gray-600">
            {row.memberCategories
              ? `${row.transactionCount} transactions in ${row.memberCategories?.length ?? 0} categories (< ${CATEGORY_MIN_DISPLAY_PERCENT}% each)`
              : `${row.transactionCount} transaction${row.transactionCount === 1 ? "" : "s"}`}{" "}
            ({row.percentOfTotal.toFixed(1)}% of spend)
          </div>
          {row.memberCategories?.length ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto border-t border-gray-100 pt-2 text-xs text-gray-500">
              {row.memberCategories.map((member) => (
                <li key={member.key} className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate">{member.name}</span>
                  <span className="flex-shrink-0 tabular-nums text-gray-600">
                    {formatCurrency(member.totalAmount, userCurrency)} ({member.percentOfTotal.toFixed(1)}%)
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-1 font-medium text-red-600">{formatCurrency(row.totalAmount, userCurrency)}</div>
        </div>
      );
    },
    [userCurrency]
  );

  const accountRowsHeight = accountByFrequency.length * 56 + 72;
  const categoryRowsHeight = categoryByFrequency.length * 64 + 28;
  const plotHeight = Math.min(680, Math.max(520, accountRowsHeight, categoryRowsHeight));
  const accountChartHeight = Math.max(plotHeight, accountRowsHeight);
  const accountBarShapeRenderer = useMemo(
    () => createAccountBarShapeRenderer(userCurrency),
    [userCurrency]
  );

  const categoryDominant = categoryRows.find((row) => row.totalAmount > 0);

  const accountSummaryItems = useMemo((): SummaryStripItem[] => {
    const avg = totalCount > 0 ? totalAmount / totalCount : 0;
    return [
      {
        label: "Total spend (this view)",
        value: formatCurrency(totalAmount, userCurrency),
        valueClassName: "text-red-600",
      },
      {
        label: "Transactions",
        value: totalCount,
        hint: "In current filter",
      },
      {
        label: "Accounts",
        value: accountByFrequency.filter(({ key }) => key !== "unassigned").length,
        hint: "With at least one expense",
      },
      {
        label: "Avg per transaction",
        value: formatCurrency(avg, userCurrency),
      },
    ];
  }, [accountByFrequency, totalAmount, totalCount, userCurrency]);

  const categorySummaryItems = useMemo((): SummaryStripItem[] => {
    const avg = totalCount > 0 ? totalAmount / totalCount : 0;
    const top = categoryDominant;
    return [
      {
        label: "Total spend (this view)",
        value: formatCurrency(totalAmount, userCurrency),
        valueClassName: "text-red-600",
      },
      {
        label: "Transactions",
        value: totalCount,
        hint: `Across ${categoryRows.length} categories`,
      },
      {
        label: "Avg per transaction",
        value: formatCurrency(avg, userCurrency),
      },
      {
        label: "Top category",
        value: top ? top.name : "—",
        hint: top ? `${formatCurrency(top.totalAmount, userCurrency)} (${top.percentOfTotal.toFixed(1)}%)` : undefined,
      },
    ];
  }, [
    categoryDominant,
    categoryRows.length,
    totalAmount,
    totalCount,
    userCurrency,
  ]);

  return (
    <div className="mb-6 grid min-w-0 grid-cols-1 gap-6 2xl:grid-cols-2 2xl:items-stretch">
      <div
        className="flex w-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Expenses by account</h3>
        <p className="mb-4 text-sm text-gray-500">
          Bars show transaction counts. Amounts are in {userCurrency}.
        </p>
        <div className="min-w-0">
          <SummaryStrip items={accountSummaryItems} />
          <div
            className="overflow-auto rounded-md"
            style={{ maxHeight: plotHeight }}
            role="region"
            aria-label="Expense account chart"
            tabIndex={0}
          >
              <div className="relative min-w-[340px]">
                  <ResponsiveContainer width="100%" height={accountChartHeight}>
                    <BarChart
                      layout="vertical"
                      data={accountByFrequency}
                      margin={{ top: 12, right: 18, left: 4, bottom: 8 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid
                        vertical
                        horizontal={false}
                        strokeDasharray="3 4"
                        stroke="#e2e8f0"
                        strokeOpacity={0.95}
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        height={40}
                        domain={[0, accountXDomainMax]}
                        ticks={accountXTicks}
                        tick={{ fontSize: 11, fill: "#4b5563" }}
                        tickLine={{ stroke: "#94a3b8" }}
                        axisLine={{ stroke: "#e5e7eb" }}
                        label={{ value: "Transaction count", position: "insideBottom", offset: 0, fill: "#6b7280", fontSize: 11 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="key"
                        ticks={accountYTicks}
                        width={Math.min(156, accountYAxisWidth)}
                        interval={0}
                        tick={(tickProps) => (
                          <AccountYAxisTick x={tickProps.x} y={tickProps.y} payload={{ value: accountLabels.get(String(tickProps.payload?.value)) }} />
                        )}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#eef2ff" }}
                        content={({ active, payload }) => {
                          const row = payload?.[0]?.payload as AccountBarRow | undefined;
                          if (!active || !row) return null;

                          return (
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                              <p className="font-semibold text-slate-900">{row.name}</p>
                              <p className="mt-1 tabular-nums text-slate-700">
                                {formatCurrency(row.totalAmount, userCurrency)}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {row.count} {row.count === 1 ? "transaction" : "transactions"} · {row.percentOfTotal.toFixed(1)}%
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="Count"
                        fill="#6366f1"
                        maxBarSize={38}
                        shape={accountBarShapeRenderer as never}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  {accountByFrequency.length === 0 && (
                    <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-gray-500">
                      No expenses in this view
                    </p>
                  )}
              </div>
          </div>
        </div>
      </div>

      <div
        className="flex w-full min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Expenses by category</h3>
        <p className="mb-4 text-sm text-gray-500">
          Share of positive category totals. Categories below {CATEGORY_MIN_DISPLAY_PERCENT}% are grouped under Others.
        </p>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <SummaryStrip items={categorySummaryItems} />

          <div
            className="grid min-w-0 grid-cols-1 items-center gap-x-4 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)]"
          >
              <div
                className="relative mx-auto w-full min-w-0"
                role="img"
                aria-label="Expenses by category donut chart"
              >
                <ResponsiveContainer width="100%" height={plotHeight}>
                  <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <Pie
                      data={donutRows}
                      dataKey="totalAmount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCategoryLabel}
                      innerRadius="40%"
                      outerRadius="63%"
                      paddingAngle={1}
                      cornerRadius={6}
                      stroke="#ffffff"
                      strokeWidth={3}
                    >
                      {donutRows.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.color}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CategoryTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                {donutRows.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="grid aspect-square w-4/5 max-w-[22rem] place-items-center rounded-full border-[clamp(1.25rem,4vw,3.5rem)] border-slate-100">
                      <p role="status" className="px-2 text-center text-sm text-gray-500">
                        {expenses.length ? "No positive spending" : "No expenses in this view"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            <div className="w-full min-w-0 max-w-[22rem]">
              <h4 id="expense-category-breakdown" className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Breakdown</h4>
              <div
                role="region"
                aria-labelledby="expense-category-breakdown"
                tabIndex={0}
                className="divide-y divide-slate-100 overflow-y-auto pr-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                style={{ maxHeight: plotHeight - 28 }}
              >
                {categoryByFrequency.map((entry) => (
                  <div key={entry.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div
                          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-gray-700 sm:text-sm">
                            {entry.memberCategories
                              ? `Others (${entry.transactionCount})`
                              : `${entry.name} (${entry.transactionCount}x)`}
                          </span>
                          {entry.memberCategories?.length ? (
                            <span className="ml-1.5 text-xs font-normal text-gray-400">
                              {entry.memberCategories.length} categories
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs font-medium text-gray-900 sm:text-sm">
                          {formatCurrency(entry.totalAmount, userCurrency)}
                        </div>
                        <div className="text-xs text-gray-500">{entry.totalAmount > 0 ? `${entry.percentOfTotal.toFixed(1)}%` : "—"}</div>
                      </div>
                    </div>

                    {entry.memberCategories?.length ? (
                      <ul className="ml-6 space-y-1 border-l border-gray-200 pl-3">
                        {entry.memberCategories.map((member) => (
                          <li
                            key={member.key}
                            className="flex items-start justify-between gap-3 text-xs text-gray-500"
                          >
                            <span className="min-w-0 break-words">{member.name}</span>
                            <span className="flex-shrink-0 tabular-nums">
                              {formatCurrency(member.totalAmount, userCurrency)} ({member.percentOfTotal.toFixed(1)}%)
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
