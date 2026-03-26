"use client";

import { useCallback, useId, useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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

function classifyNeedWant(tags: string[] | null | undefined): "need" | "wants" | "unlabeled" {
  const lowered = new Set((tags || []).map((t) => t.toLowerCase().trim()));
  if (lowered.has("need")) return "need";
  if (lowered.has("wants") || lowered.has("want")) return "wants";
  return "unlabeled";
}

const NEED_WANT_STYLE = {
  Need: { pie: "#3b82f6", solid: "#2563eb" },
  Wants: { pie: "#10b981", solid: "#059669" },
  Unlabeled: { pie: "#94a3b8", solid: "#64748b" },
} as const;

interface AccountBarRow {
  name: string;
  count: number;
  percentOfTotal: number;
  totalAmount: number;
}

interface NeedWantRow {
  name: string;
  value: number;
  percentOfTotal: number;
  totalAmount: number;
  pie: string;
  solid: string;
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
  const needWantPatternPrefix = useId().replace(/:/g, "");
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

  const needWantByFrequency = useMemo((): NeedWantRow[] => {
    let need = 0;
    let wants = 0;
    let unlabeled = 0;
    let needAmt = 0;
    let wantsAmt = 0;
    let unlabeledAmt = 0;
    for (const e of expenses) {
      const amt = convertForDisplaySync(e.amount, e.currency, userCurrency);
      const c = classifyNeedWant(e.tags);
      if (c === "need") {
        need += 1;
        needAmt += amt;
      } else if (c === "wants") {
        wants += 1;
        wantsAmt += amt;
      } else {
        unlabeled += 1;
        unlabeledAmt += amt;
      }
    }
    const denom = expenses.length;
    const pct = (n: number) => (denom > 0 ? (n / denom) * 100 : 0);
    const rows: NeedWantRow[] = [
      {
        name: "Need",
        value: need,
        percentOfTotal: pct(need),
        totalAmount: needAmt,
        pie: NEED_WANT_STYLE.Need.pie,
        solid: NEED_WANT_STYLE.Need.solid,
      },
      {
        name: "Wants",
        value: wants,
        percentOfTotal: pct(wants),
        totalAmount: wantsAmt,
        pie: NEED_WANT_STYLE.Wants.pie,
        solid: NEED_WANT_STYLE.Wants.solid,
      },
      {
        name: "Unlabeled",
        value: unlabeled,
        percentOfTotal: pct(unlabeled),
        totalAmount: unlabeledAmt,
        pie: NEED_WANT_STYLE.Unlabeled.pie,
        solid: NEED_WANT_STYLE.Unlabeled.solid,
      },
    ];
    return rows.filter((r) => r.value > 0);
  }, [expenses, userCurrency]);

  const renderNeedWantLabel = useCallback(
    (entry: {
      cx: number;
      cy: number;
      midAngle: number;
      innerRadius: number;
      outerRadius: number;
      name: string;
      value: number;
    }) => {
      const total = needWantByFrequency.reduce((s, x) => s + x.value, 0);
      const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0";
      const chartDataEntry = needWantByFrequency.find((item) => item.name === entry.name);
      const labelColor = chartDataEntry?.solid ?? "#374151";
      const transactionCount = chartDataEntry?.value ?? 0;

      const RADIAN = Math.PI / 180;
      const radius = entry.outerRadius + 15;
      const x1 = entry.cx + radius * Math.cos(-entry.midAngle * RADIAN);
      const y1 = entry.cy + radius * Math.sin(-entry.midAngle * RADIAN);
      const horizontalLength = 20;
      const isRightSide = x1 > entry.cx;
      const x2 = isRightSide ? x1 + horizontalLength : x1 - horizontalLength;
      const y2 = y1;
      const textX = isRightSide ? x2 + 5 : x2 - 5;
      const textY = y2;

      return (
        <g>
          <polyline
            points={`${entry.cx + entry.outerRadius * Math.cos(-entry.midAngle * RADIAN)},${entry.cy + entry.outerRadius * Math.sin(-entry.midAngle * RADIAN)} ${x1},${y1} ${x2},${y2}`}
            stroke="#9ca3af"
            strokeWidth={2}
            fill="none"
          />
          <text
            x={textX}
            y={textY}
            fill={labelColor}
            textAnchor={isRightSide ? "start" : "end"}
            dominantBaseline="central"
            fontSize={10}
            fontWeight={600}
          >
            {`${entry.name} (${transactionCount}x) [${percentage}%]`}
          </text>
        </g>
      );
    },
    [needWantByFrequency]
  );

  const NeedWantTooltip = useCallback(
    ({
      active,
      payload,
    }: {
      active?: boolean;
      payload?: Array<{ payload?: NeedWantRow }>;
    }) => {
      if (!active || !payload?.length) return null;
      const row = payload[0]?.payload;
      if (!row) return null;
      return (
        <div
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md"
          style={{ minWidth: 220 }}
        >
          <div className="font-semibold text-gray-900">{row.name}</div>
          <div className="mt-1 text-gray-600">
            {row.value} transaction{row.value === 1 ? "" : "s"} ({row.percentOfTotal.toFixed(1)}%)
          </div>
          <div className="mt-1 font-medium text-red-600">{formatCurrency(row.totalAmount, userCurrency)}</div>
        </div>
      );
    },
    [userCurrency]
  );

  /** Same pixel height for bar chart and donut so the two visuals align (no extra empty band under the pie). */
  const sharedChartHeight = useMemo(
    () => Math.min(480, Math.max(240, accountByFrequency.length * 44)),
    [accountByFrequency.length]
  );

  const accountXAxisY = useMemo(() => Math.max(sharedChartHeight - 28, 0), [sharedChartHeight]);

  const accountBarShapeRenderer = useMemo(
    () => createAccountBarShapeRenderer({ userCurrency, xAxisY: accountXAxisY }),
    [accountXAxisY, userCurrency]
  );

  /** Keep both chart cards exactly same container height on desktop. */
  const sharedContainerHeight = useMemo(
    () => sharedChartHeight + 190,
    [sharedChartHeight]
  );

  const accountSpendTotal = useMemo(
    () => accountByFrequency.reduce((s, r) => s + r.totalAmount, 0),
    [accountByFrequency]
  );

  const needWantDominant = useMemo(() => {
    if (needWantByFrequency.length === 0) return null;
    return needWantByFrequency.reduce((a, b) => (a.value >= b.value ? a : b));
  }, [needWantByFrequency]);

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

  const needWantSummaryItems = useMemo((): SummaryStripItem[] => {
    if (expenses.length === 0 || needWantByFrequency.length === 0) return [];
    const avg = totalCount > 0 ? totalAmountInView / totalCount : 0;
    const top = needWantDominant;
    return [
      {
        label: "Total spend (this view)",
        value: formatCurrency(totalAmountInView, userCurrency),
        valueClassName: "text-red-600",
      },
      {
        label: "Transactions",
        value: totalCount,
        hint: "Tagged need / wants / unlabeled",
      },
      {
        label: "Avg per transaction",
        value: formatCurrency(avg, userCurrency),
      },
      {
        label: "Most transactions",
        value: top ? `${top.name} (${top.value}x)` : "—",
        hint: top ? `${top.percentOfTotal.toFixed(1)}% of expenses` : undefined,
      },
    ];
  }, [
    expenses.length,
    needWantByFrequency.length,
    needWantDominant,
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
          <div className="min-w-0 w-full flex-1 overflow-x-auto" style={{ minWidth: 520 }}>
            <SummaryStrip items={accountSummaryItems} />
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
        )}
      </div>

      <div
        className="flex w-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
        style={{ height: sharedContainerHeight }}
      >
        <h3 className="mb-1 text-lg font-semibold text-gray-900">
          Need vs wants
          {totalCount > 0 ? (
            <span className="text-sm font-normal text-gray-500">
              {" "}
              • {totalCount} transaction{totalCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          Frequency share of expenses in this view. Labels follow{" "}
          <span className="font-medium text-gray-700">Name (count×) [percent%]</span> like the category chart.
        </p>
        {expenses.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No expenses in this view.</p>
        ) : needWantByFrequency.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500">No tagged data to display.</p>
        ) : (
          <div className="min-w-0 flex-1 px-0">
            <SummaryStrip items={needWantSummaryItems} />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start lg:gap-3">
              <div
                className="flex w-full items-start justify-center lg:col-span-2"
                role="img"
                aria-label="Need versus wants donut chart"
              >
                <ResponsiveContainer width="100%" height={sharedChartHeight}>
                  <PieChart>
                    <defs>
                      <pattern
                        id={`${needWantPatternPrefix}-need`}
                        patternUnits="userSpaceOnUse"
                        width="6"
                        height="6"
                      >
                        <rect width="6" height="6" fill={NEED_WANT_STYLE.Need.pie} />
                        <path
                          d="M 0,6 l 6,-6 M -1.5,1.5 l 3,-3 M 4.5,7.5 l 3,-3"
                          stroke={NEED_WANT_STYLE.Need.solid}
                          strokeWidth="0.8"
                          opacity="0.35"
                        />
                      </pattern>
                      <pattern
                        id={`${needWantPatternPrefix}-wants`}
                        patternUnits="userSpaceOnUse"
                        width="8"
                        height="8"
                      >
                        <rect width="8" height="8" fill={NEED_WANT_STYLE.Wants.pie} />
                        <circle cx="2" cy="2" r="0.8" fill={NEED_WANT_STYLE.Wants.solid} opacity="0.4" />
                        <circle cx="6" cy="6" r="0.8" fill={NEED_WANT_STYLE.Wants.solid} opacity="0.4" />
                        <circle cx="4" cy="4" r="0.5" fill={NEED_WANT_STYLE.Wants.solid} opacity="0.3" />
                      </pattern>
                      <pattern
                        id={`${needWantPatternPrefix}-unlabeled`}
                        patternUnits="userSpaceOnUse"
                        width="3"
                        height="3"
                      >
                        <rect width="3" height="3" fill="#94a3b8" />
                        <rect x="0" y="0" width="1" height="1" fill="#64748b" opacity="0.4" />
                        <rect x="2" y="2" width="1" height="1" fill="#64748b" opacity="0.4" />
                        <rect x="1" y="1" width="1" height="1" fill="#475569" opacity="0.3" />
                      </pattern>
                    </defs>

                    <Pie
                      data={needWantByFrequency}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderNeedWantLabel}
                      innerRadius={68}
                      outerRadius={112}
                      paddingAngle={0.5}
                      cornerRadius={6}
                      stroke="#ffffff"
                      strokeWidth={3}
                    >
                      {needWantByFrequency.map((entry) => {
                        const fillId =
                          entry.name === "Need"
                            ? `${needWantPatternPrefix}-need`
                            : entry.name === "Wants"
                              ? `${needWantPatternPrefix}-wants`
                              : `${needWantPatternPrefix}-unlabeled`;
                        return (
                          <Cell
                            key={entry.name}
                            fill={`url(#${fillId})`}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip content={<NeedWantTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 lg:col-span-1 lg:max-w-sm lg:self-start">
                <h4 className="text-xs font-medium text-gray-900">Breakdown</h4>
                <div
                  className="space-y-2 overflow-y-auto pr-1"
                  style={{ maxHeight: sharedChartHeight }}
                >
                  {needWantByFrequency.map((entry) => (
                    <div key={entry.name} className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className="h-4 w-4 flex-shrink-0 rounded-full border border-white shadow-sm"
                          style={{ backgroundColor: entry.pie }}
                        />
                        <span className="truncate text-xs font-medium text-gray-700 sm:text-sm">
                          {entry.name} ({entry.value}x)
                        </span>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="text-xs font-medium text-gray-900 sm:text-sm">
                          {formatCurrency(entry.totalAmount, userCurrency)}
                        </div>
                        <div className="text-xs text-gray-500">{entry.percentOfTotal.toFixed(1)}%</div>
                      </div>
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
