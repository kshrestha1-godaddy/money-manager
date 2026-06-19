"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Expense } from "../../../types/financial";
import { AccountInterface } from "../../../types/accounts";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { useCurrency } from "../../../providers/CurrencyProvider";

interface ExpenseFrequencyChartsProps {
  expenses: Expense[];
}

function normalizeAccountLabel(raw: string): string {
  const s = raw
    .replace(/\u200b/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/\s+/g, " ");
  return s;
}

function getAccountDisplayName(account: AccountInterface | null | undefined): string {
  if (!account) return "No account";
  const nick = normalizeAccountLabel(account.nickname ?? "");
  if (nick) return nick;
  const bank = normalizeAccountLabel(account.bankName ?? "");
  const holder = normalizeAccountLabel(account.holderName ?? "");
  const combined = `${bank} - ${holder}`.trim();
  if (combined === "-" || combined === "") return "Unnamed account";
  return combined;
}

const CATEGORY_FALLBACK_COLORS = [
  "#6366f1", "#f59e0b", "#ef4444", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
  "#06b6d4", "#a855f7", "#d946ef", "#22c55e", "#e11d48",
];

interface CategoryRow {
  name: string;
  color: string;
  transactionCount: number;
  percentOfTotal: number;
  totalAmount: number;
  /** Categories grouped under Others (< 1% spend each). */
  memberCategories?: CategoryRow[];
}

interface AccountBarRow {
  name: string;
  count: number;
  percentOfTotal: number;
  totalAmount: number;
}

const CATEGORY_MIN_DISPLAY_PERCENT = 1;
const OTHERS_CATEGORY_COLOR = "#94a3b8";

function groupSmallCategoriesIntoOthers(rows: CategoryRow[], totalSpend: number): CategoryRow[] {
  if (rows.length === 0 || totalSpend <= 0) return rows;

  const mainRows: CategoryRow[] = [];
  const othersMembers: CategoryRow[] = [];
  let othersAmount = 0;
  let othersCount = 0;

  for (const row of rows) {
    if (row.percentOfTotal < CATEGORY_MIN_DISPLAY_PERCENT) {
      othersAmount += row.totalAmount;
      othersCount += row.transactionCount;
      othersMembers.push(row);
    } else {
      mainRows.push(row);
    }
  }

  if (othersAmount <= 0) return mainRows;

  othersMembers.sort((a, b) => b.totalAmount - a.totalAmount);

  mainRows.push({
    name: "Others",
    color: OTHERS_CATEGORY_COLOR,
    transactionCount: othersCount,
    totalAmount: othersAmount,
    percentOfTotal: (othersAmount / totalSpend) * 100,
    memberCategories: othersMembers,
  });

  return mainRows.sort((a, b) => b.totalAmount - a.totalAmount);
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

interface AccountBarShapeContext {
  userCurrency: string;
  xAxisY: number;
}

function createAccountBarShapeRenderer(context: AccountBarShapeContext) {
  return function AccountBarShape(props: Record<string, unknown>) {
    const { userCurrency, xAxisY } = context;
    const x = toNum(props.x);
    const y = toNum(props.y);
    const width = toNum(props.width);
    const height = toNum(props.height);
    const value = toNum(props.value);
    const payload = props.payload as AccountBarRow | undefined;
    if (!payload || width <= 0 || height <= 0) return null;

    const count = payload.count ?? value ?? 0;
    const amtStr = formatBarAmount(payload.totalAmount, userCurrency);
    const labelText = `${amtStr} (${count} x)`;
    const cy = y + height / 2;
    const shadow = "0 1px 2px rgba(0,0,0,0.45)";
    const minInsidePx = 108;
    const lineX = x + width;
    const hasGuideLine = xAxisY > y;
    const axisValueY = xAxisY + 14;
    const fill = (props.fill as string | undefined) ?? "#6366f1";
    const radius = Math.min(6, height / 2);

    const tight = width < 170;
    const labelSize = tight ? 9 : 10;
    const tx = x + width / 2;

    return (
      <g className="pointer-events-none">
        <path
          d={`
            M ${x},${y}
            h ${Math.max(width - radius, 0)}
            q ${radius},0 ${radius},${radius}
            v ${Math.max(height - 2 * radius, 0)}
            q 0,${radius} -${radius},${radius}
            h -${Math.max(width - radius, 0)}
            z
          `}
          fill={fill}
        />

        {hasGuideLine ? (
          <g>
            <line
              x1={lineX}
              y1={y}
              x2={lineX}
              y2={xAxisY}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.9}
            />
            <text
              x={lineX}
              y={axisValueY}
              textAnchor="middle"
              dominantBaseline="hanging"
              fill="#6b7280"
              fontSize={9}
              fontWeight={600}
            >
              {count}
            </text>
          </g>
        ) : null}

        {width >= minInsidePx ? (
          <text
            x={tx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize={labelSize}
            fontWeight={700}
            style={{ textShadow: shadow }}
          >
            {labelText}
          </text>
        ) : null}
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
    <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-gray-100 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm sm:grid-cols-4">
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

export function ExpenseFrequencyCharts({ expenses }: ExpenseFrequencyChartsProps) {
  const { currency: userCurrency } = useCurrency();
  const totalCount = expenses.length;

  const accountByFrequency = useMemo((): AccountBarRow[] => {
    const byKey = new Map<string, { count: number; totalAmount: number }>();
    for (const e of expenses) {
      let label = normalizeAccountLabel(getAccountDisplayName(e.account ?? undefined));
      if (!label) label = "Unnamed account";
      const amt = convertForDisplaySync(e.amount, e.currency, userCurrency);
      const prev = byKey.get(label) ?? { count: 0, totalAmount: 0 };
      byKey.set(label, {
        count: prev.count + 1,
        totalAmount: prev.totalAmount + amt,
      });
    }
    const denom = expenses.length;
    return Array.from(byKey.entries())
      .map(([name, { count, totalAmount }]) => ({
        name,
        count,
        totalAmount,
        percentOfTotal: denom > 0 ? (count / denom) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [expenses, userCurrency]);

  const accountYTicks = useMemo(() => accountByFrequency.map((d) => d.name), [accountByFrequency]);

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

  const totalAmountInView = useMemo(
    () =>
      expenses.reduce(
        (sum, e) => sum + convertForDisplaySync(e.amount, e.currency, userCurrency),
        0
      ),
    [expenses, userCurrency]
  );

  const categoryByFrequency = useMemo((): CategoryRow[] => {
    const byKey = new Map<string, { count: number; totalAmount: number; color: string }>();
    let colorIdx = 0;
    for (const e of expenses) {
      const name = e.category?.name ?? "Uncategorized";
      const rawColor = e.category?.color ?? "";
      const amt = convertForDisplaySync(e.amount, e.currency, userCurrency);
      if (!byKey.has(name)) {
        const color = rawColor || CATEGORY_FALLBACK_COLORS[colorIdx % CATEGORY_FALLBACK_COLORS.length]!;
        colorIdx++;
        byKey.set(name, { count: 1, totalAmount: amt, color });
      } else {
        const prev = byKey.get(name)!;
        byKey.set(name, { count: prev.count + 1, totalAmount: prev.totalAmount + amt, color: prev.color });
      }
    }
    const totalSpend = Array.from(byKey.values()).reduce((sum, row) => sum + row.totalAmount, 0);
    const rows = Array.from(byKey.entries())
      .map(([name, { count, totalAmount, color }]) => ({
        name,
        color,
        transactionCount: count,
        percentOfTotal: totalSpend > 0 ? (totalAmount / totalSpend) * 100 : 0,
        totalAmount,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return groupSmallCategoriesIntoOthers(rows, totalSpend);
  }, [expenses, userCurrency]);

  const renderCategoryLabel = useCallback(
    (entry: {
      cx: number;
      cy: number;
      midAngle: number;
      innerRadius: number;
      outerRadius: number;
      name: string;
    }) => {
      const chartDataEntry = categoryByFrequency.find((item) => item.name === entry.name);
      if (!chartDataEntry || chartDataEntry.name === "Others") return null;

      const labelColor = chartDataEntry.color;
      const percentage = chartDataEntry.percentOfTotal.toFixed(1);
      const transactionCount = chartDataEntry.transactionCount;

      const RADIAN = Math.PI / 180;
      const radius = entry.outerRadius + 32;
      const x1 = entry.cx + radius * Math.cos(-entry.midAngle * RADIAN);
      const y1 = entry.cy + radius * Math.sin(-entry.midAngle * RADIAN);
      const horizontalLength = 32;
      const isRightSide = x1 > entry.cx;
      const x2 = isRightSide ? x1 + horizontalLength : x1 - horizontalLength;
      const y2 = y1;
      const textX = isRightSide ? x2 + 8 : x2 - 8;
      const textY = y2;

      return (
        <g>
          <polyline
            points={`${entry.cx + entry.outerRadius * Math.cos(-entry.midAngle * RADIAN)},${entry.cy + entry.outerRadius * Math.sin(-entry.midAngle * RADIAN)} ${x1},${y1} ${x2},${y2}`}
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
            fontSize={11}
            fontWeight={600}
          >
            {`${entry.name} (${transactionCount}x) [${percentage}%]`}
          </text>
        </g>
      );
    },
    [categoryByFrequency]
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
            {row.name === "Others"
              ? `${row.transactionCount} transactions in ${row.memberCategories?.length ?? 0} categories (< ${CATEGORY_MIN_DISPLAY_PERCENT}% each)`
              : `${row.transactionCount} transaction${row.transactionCount === 1 ? "" : "s"}`}{" "}
            ({row.percentOfTotal.toFixed(1)}% of spend)
          </div>
          {row.name === "Others" && row.memberCategories && row.memberCategories.length > 0 ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto border-t border-gray-100 pt-2 text-xs text-gray-500">
              {row.memberCategories.map((member) => (
                <li key={member.name} className="flex items-start justify-between gap-2">
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

  /** Same pixel height for bar chart and donut so the two visuals align. */
  const sharedChartHeight = useMemo(() => {
    const accountHeight = Math.min(480, Math.max(240, accountByFrequency.length * 44));
    return Math.max(accountHeight, 280);
  }, [accountByFrequency.length]);

  const accountXAxisY = useMemo(() => Math.max(sharedChartHeight - 28, 0), [sharedChartHeight]);

  const accountBarShapeRenderer = useMemo(
    () => createAccountBarShapeRenderer({ userCurrency, xAxisY: accountXAxisY }),
    [accountXAxisY, userCurrency]
  );

  /** Keep both chart cards exactly same container height on desktop. */
  const sharedContainerHeight = useMemo(
    () => sharedChartHeight + 260,
    [sharedChartHeight]
  );

  const accountSpendTotal = useMemo(
    () => accountByFrequency.reduce((s, r) => s + r.totalAmount, 0),
    [accountByFrequency]
  );

  const categoryDominant = useMemo(() => {
    if (categoryByFrequency.length === 0) return null;
    return categoryByFrequency.reduce((a, b) => (a.totalAmount >= b.totalAmount ? a : b));
  }, [categoryByFrequency]);

  const accountSummaryItems = useMemo((): SummaryStripItem[] => {
    if (accountByFrequency.length === 0) return [];
    const avg = totalCount > 0 ? accountSpendTotal / totalCount : 0;
    return [
      {
        label: "Total spend (this view)",
        value: formatCurrency(accountSpendTotal, userCurrency),
        valueClassName: "text-red-600",
      },
      {
        label: "Transactions",
        value: totalCount,
        hint: "In current filter",
      },
      {
        label: "Accounts",
        value: accountByFrequency.length,
        hint: "With at least one expense",
      },
      {
        label: "Avg per transaction",
        value: formatCurrency(avg, userCurrency),
      },
    ];
  }, [accountByFrequency.length, accountSpendTotal, totalCount, userCurrency]);

  const categorySummaryItems = useMemo((): SummaryStripItem[] => {
    if (expenses.length === 0 || categoryByFrequency.length === 0) return [];
    const avg = totalCount > 0 ? totalAmountInView / totalCount : 0;
    const top = categoryDominant;
    return [
      {
        label: "Total spend (this view)",
        value: formatCurrency(totalAmountInView, userCurrency),
        valueClassName: "text-red-600",
      },
      {
        label: "Transactions",
        value: totalCount,
        hint: `Across ${categoryByFrequency.length} categories`,
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
    expenses.length,
    categoryByFrequency,
    categoryDominant,
    totalAmountInView,
    totalCount,
    userCurrency,
  ]);

  return (
    <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
      <div
        className="flex w-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
        style={{ height: sharedContainerHeight }}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Expenses by account</h3>
        <p className="mb-4 text-sm text-gray-500">
          Frequency and total spend per account (converted to {userCurrency}). Bar labels follow the waterfall style:{" "}
          <span className="font-medium text-gray-700">count (×) and amount inside each bar</span> when space allows.
        </p>
        {accountByFrequency.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No expenses in this view.</p>
        ) : (
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-auto" style={{ minWidth: 520 }}>
            <SummaryStrip items={accountSummaryItems} />
            <div className="min-h-0 flex-1" style={{ height: sharedChartHeight }}>
            <ResponsiveContainer width="100%" height={sharedChartHeight}>
              <BarChart
                layout="vertical"
                data={accountByFrequency}
                margin={{ top: 12, right: 28, left: 28, bottom: 20 }}
                barCategoryGap="14%"
              >
                <CartesianGrid
                  vertical
                  horizontal={false}
                  strokeDasharray="4 4"
                  stroke="#cbd5e1"
                  strokeOpacity={0.95}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  domain={[0, accountXDomainMax]}
                  ticks={accountXTicks}
                  tick={{ fontSize: 11, fill: "#4b5563" }}
                  tickLine={{ stroke: "#94a3b8" }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  label={{ value: "Transaction count", position: "insideBottom", offset: 2, fill: "#6b7280", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  ticks={accountYTicks}
                  width={292}
                  interval={0}
                  tick={(tickProps) => (
                    <AccountYAxisTick x={tickProps.x} y={tickProps.y} payload={tickProps.payload} />
                  )}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number, _name, item) => {
                    const row = item?.payload as AccountBarRow | undefined;
                    const pct = row?.percentOfTotal.toFixed(1) ?? "0";
                    const spend = row
                      ? formatCurrency(row.totalAmount, userCurrency)
                      : "";
                    return [
                      `${value} txns (${pct}% of ${totalCount}) · ${spend}`,
                      "",
                    ];
                  }}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                />
                <Bar
                  dataKey="count"
                  name="Count"
                  fill="#6366f1"
                  maxBarSize={34}
                  shape={accountBarShapeRenderer as never}
                />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div
        className="flex w-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
        style={{ height: sharedContainerHeight }}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Expenses by category
          {totalCount > 0 ? (
            <span className="text-sm font-normal text-gray-500">
              {" "}
              • {totalCount} transaction{totalCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Spend share per category in this view. Slice size and percentages are based on{" "}
          <span className="font-medium text-gray-700">amount spent</span>. Categories under{" "}
          {CATEGORY_MIN_DISPLAY_PERCENT}% are grouped as{" "}
          <span className="font-medium text-gray-700">Others</span> in the chart and breakdown.
        </p>
        {expenses.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No expenses in this view.</p>
        ) : categoryByFrequency.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No category data to display.</p>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <SummaryStrip items={categorySummaryItems} />

            <div
              className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-5 lg:items-stretch lg:gap-8"
              style={{ height: sharedChartHeight }}
            >
              <div
                className="flex h-full w-full items-center justify-center lg:col-span-3"
                role="img"
                aria-label="Expenses by category donut chart"
              >
                <ResponsiveContainer width="100%" height={sharedChartHeight}>
                  <PieChart margin={{ top: 28, right: 64, left: 64, bottom: 28 }}>
                    <Pie
                      data={categoryByFrequency}
                      dataKey="totalAmount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCategoryLabel}
                      innerRadius="42%"
                      outerRadius="68%"
                      paddingAngle={1}
                      cornerRadius={6}
                      stroke="#ffffff"
                      strokeWidth={3}
                    >
                      {categoryByFrequency.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CategoryTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex h-full min-h-0 flex-col lg:col-span-2 lg:max-w-md">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Breakdown</h4>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
                  {categoryByFrequency.map((entry) => (
                    <div key={entry.name} className="space-y-1.5">
                      <div className="flex items-start justify-between gap-4 py-1">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div
                            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: entry.color }}
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-gray-700 sm:text-sm">
                              {entry.name === "Others"
                                ? `Others (${entry.transactionCount})`
                                : `${entry.name} (${entry.transactionCount}x)`}
                            </span>
                            {entry.name === "Others" && entry.memberCategories && entry.memberCategories.length > 0 ? (
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
                          <div className="text-xs text-gray-500">{entry.percentOfTotal.toFixed(1)}%</div>
                        </div>
                      </div>

                      {entry.name === "Others" && entry.memberCategories && entry.memberCategories.length > 0 ? (
                        <ul className="ml-6 space-y-1 border-l border-gray-200 pl-3">
                          {entry.memberCategories.map((member) => (
                            <li
                              key={member.name}
                              className="flex items-start justify-between gap-3 text-xs text-gray-500"
                            >
                              <span className="min-w-0 truncate">{member.name}</span>
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
        )}
      </div>
    </div>
  );
}
