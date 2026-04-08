"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, getCurrencySymbol } from "../../../utils/currency";
import { useChartData } from "../../../hooks/useChartDataContext";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { ChartControls } from "../../../components/ChartControls";

interface CashflowCandlestickChartProps {
  currency: string;
}

interface CashflowTransaction {
  monthKey: string;
  date: Date;
  amount: number;
}

interface CandlestickPoint {
  monthKey: string;
  formattedMonth: string;
  open: number;
  high: number;
  low: number;
  close: number;
  movement: number;
  totalIncome: number;
  totalExpenses: number;
  wickRange: [number, number];
  bodyRange: [number, number];
}

type RangePreset = "3m" | "4m" | "6m" | "1y" | "all";

interface DateRange {
  start: Date | null;
  end: Date | null;
  label: string;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCurrentRange(months: number): DateRange {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let targetMonth = currentMonth - months + 2;
  let targetYear = currentYear;
  while (targetMonth <= 0) {
    targetMonth += 12;
    targetYear -= 1;
  }

  const start = new Date(targetYear, targetMonth - 1, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(currentYear, currentMonth + 1, 0);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
    label: `${months === 12 ? "1 year" : `${months} months`}`,
  };
}

function getPresetRange(preset: RangePreset): DateRange {
  if (preset === "all") return { start: null, end: null, label: "All Time" };
  if (preset === "1y") return getCurrentRange(12);
  if (preset === "6m") return getCurrentRange(6);
  if (preset === "4m") return getCurrentRange(4);
  return getCurrentRange(3);
}

function isInRange(date: Date, range: DateRange): boolean {
  if (!range.start && !range.end) return true;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

function buildCandlestickData(transactions: CashflowTransaction[], openingBalance = 0): CandlestickPoint[] {
  const monthMap = new Map<
    string,
    {
      monthDate: Date;
      transactions: Array<{ date: Date; amount: number }>;
      income: number;
      expenses: number;
    }
  >();

  for (const transaction of transactions) {
    if (!monthMap.has(transaction.monthKey)) {
      monthMap.set(transaction.monthKey, {
        monthDate: getMonthStart(transaction.date),
        transactions: [],
        income: 0,
        expenses: 0,
      });
    }

    const monthData = monthMap.get(transaction.monthKey)!;
    monthData.transactions.push({ date: transaction.date, amount: transaction.amount });
    if (transaction.amount >= 0) monthData.income += transaction.amount;
    else monthData.expenses += Math.abs(transaction.amount);
  }

  const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const chartData: CandlestickPoint[] = [];
  let previousClose = openingBalance;

  for (const [monthKey, monthData] of sortedMonths) {
    const monthTransactions = monthData.transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    const open = previousClose;
    let runningValue = open;
    let high = open;
    let low = open;

    for (const transaction of monthTransactions) {
      runningValue += transaction.amount;
      if (runningValue > high) high = runningValue;
      if (runningValue < low) low = runningValue;
    }

    const close = runningValue;
    const monthLabel = monthData.monthDate.toLocaleDateString("en", { month: "short", year: "2-digit" });
    const bodyStart = Math.min(open, close);
    const bodyEnd = Math.max(open, close);

    chartData.push({
      monthKey,
      formattedMonth: monthLabel,
      open,
      high,
      low,
      close,
      movement: close - open,
      totalIncome: monthData.income,
      totalExpenses: monthData.expenses,
      wickRange: [low, high],
      bodyRange: [bodyStart, bodyEnd],
    });

    previousClose = close;
  }

  return chartData;
}

export const CashflowCandlestickChart = React.memo<CashflowCandlestickChartProps>(({ currency }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedRange, setSelectedRange] = useState<RangePreset>("1y");
  const { rawIncomes, rawExpenses } = useChartData();

  const activeDateRange = useMemo(() => getPresetRange(selectedRange), [selectedRange]);

  const chartData = useMemo(() => {
    const incomeTransactions: CashflowTransaction[] = rawIncomes.map((income) => ({
      monthKey: `${new Date(income.date).getFullYear()}-${String(new Date(income.date).getMonth() + 1).padStart(2, "0")}`,
      date: new Date(income.date),
      amount: convertForDisplaySync(income.amount, income.currency, currency),
    }));

    const expenseTransactions: CashflowTransaction[] = rawExpenses.map((expense) => ({
      monthKey: `${new Date(expense.date).getFullYear()}-${String(new Date(expense.date).getMonth() + 1).padStart(2, "0")}`,
      date: new Date(expense.date),
      amount: -convertForDisplaySync(expense.amount, expense.currency, currency),
    }));

    const allTransactions = [...incomeTransactions, ...expenseTransactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    const openingBalance = allTransactions
      .filter((transaction) => activeDateRange.start && transaction.date < activeDateRange.start)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const rangeTransactions = allTransactions.filter((transaction) => isInRange(transaction.date, activeDateRange));
    return buildCandlestickData(rangeTransactions, openingBalance);
  }, [rawIncomes, rawExpenses, currency, activeDateRange]);

  const csvData = useMemo(
    () => [
      ["Month", "Open", "High", "Low", "Close", "Net Movement", "Income", "Expenses"],
      ...chartData.map((point) => [
        point.formattedMonth,
        point.open.toString(),
        point.high.toString(),
        point.low.toString(),
        point.close.toString(),
        point.movement.toString(),
        point.totalIncome.toString(),
        point.totalExpenses.toString(),
      ]),
    ],
    [chartData],
  );

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [-1000, 1000];
    const lows = chartData.map((point) => point.low);
    const highs = chartData.map((point) => point.high);
    const minValue = Math.min(...lows);
    const maxValue = Math.max(...highs);
    const range = Math.max(maxValue - minValue, 1);
    const padding = range * 0.12;
    return [minValue - padding, maxValue + padding];
  }, [chartData]);

  const summary = useMemo(() => {
    if (chartData.length === 0) {
      return {
        monthCount: 0,
        bullishMonths: 0,
        bearishMonths: 0,
        netChange: 0,
        averageMonthlyNet: 0,
        bestMonth: null as CandlestickPoint | null,
        worstMonth: null as CandlestickPoint | null,
      };
    }

    const bullishMonths = chartData.filter((point) => point.movement >= 0).length;
    const bearishMonths = chartData.length - bullishMonths;
    const firstPoint = chartData[0];
    const lastPoint = chartData[chartData.length - 1];
    const netChange = firstPoint && lastPoint ? lastPoint.close - firstPoint.open : 0;
    const averageMonthlyNet = chartData.reduce((sum, point) => sum + point.movement, 0) / chartData.length;
    let bestMonth: CandlestickPoint | null = firstPoint ?? null;
    let worstMonth: CandlestickPoint | null = firstPoint ?? null;

    for (const point of chartData) {
      if (!bestMonth || point.movement > bestMonth.movement) bestMonth = point;
      if (!worstMonth || point.movement < worstMonth.movement) worstMonth = point;
    }

    return {
      monthCount: chartData.length,
      bullishMonths,
      bearishMonths,
      netChange,
      averageMonthlyNet,
      bestMonth: bestMonth ?? null,
      worstMonth: worstMonth ?? null,
    };
  }, [chartData]);

  const formatYAxisTick = (value: number) => {
    const symbol = getCurrencySymbol(currency).trimEnd();
    if (Math.abs(value) >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${symbol}${(value / 1000).toFixed(1)}K`;
    return `${symbol}${Math.round(value)}`;
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: CandlestickPoint }>;
  }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-72">
        <div className="font-semibold text-gray-900 mb-3">{point.formattedMonth}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Open:</span>
            <span className="font-medium">{formatCurrency(point.open, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">High:</span>
            <span className="font-medium">{formatCurrency(point.high, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Low:</span>
            <span className="font-medium">{formatCurrency(point.low, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Close:</span>
            <span className="font-medium">{formatCurrency(point.close, currency)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-100">
            <span className="text-gray-600">Monthly Net:</span>
            <span className={`font-semibold ${point.movement >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {formatCurrency(point.movement, currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Income:</span>
            <span className="font-medium text-emerald-600">{formatCurrency(point.totalIncome, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Expenses:</span>
            <span className="font-medium text-rose-600">{formatCurrency(point.totalExpenses, currency)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6" data-chart-type="cashflow-candlestick">
        <div className="text-lg font-semibold text-gray-900 mb-2">Monthly Cashflow Candlestick ({activeDateRange.label})</div>
        <div className="text-sm text-gray-500">
          No data available for this period. Add income or expense transactions to render candlesticks.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-6" data-chart-type="cashflow-candlestick">
      <ChartControls
        chartRef={chartRef}
        fileName="cashflow-candlestick-chart"
        csvData={csvData}
        csvFileName="cashflow-candlestick-data"
        title={`Monthly Cashflow Candlestick (${activeDateRange.label})`}
        tooltipText="Each candle shows monthly cashflow behavior: open is prior month net position and close is end-of-month position, using only income and expense transactions."
        showExpandButton={false}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { id: "3m", label: "3M" },
          { id: "4m", label: "4M" },
          { id: "6m", label: "6M" },
          { id: "1y", label: "1 Year" },
          { id: "all", label: "All Time" },
        ].map((preset) => {
          const isActive = selectedRange === (preset.id as RangePreset);
          return (
            <button
              key={preset.id}
              onClick={() => setSelectedRange(preset.id as RangePreset)}
              className={
                isActive
                  ? "px-3 py-1 text-xs border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm"
                  : "px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              }
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="mb-4 text-sm text-gray-600">
        <span className="font-medium text-gray-800">How to read:</span> green body = month closed higher than it opened, red body = month closed lower.
      </div>

      <div className="mt-2 grid grid-cols-1 lg:grid-cols-[minmax(0,4fr)_minmax(260px,1.1fr)] gap-4">
        <div
          ref={chartRef}
          className="h-[30rem] sm:h-[36rem] w-full"
          role="img"
          aria-label="Candlestick chart of monthly cashflow movement from income and expense transactions"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 18, right: 8, left: 10, bottom: 14 }}
              barCategoryGap="4%"
              barGap={-20}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1.5} />

              <XAxis dataKey="formattedMonth" tick={{ fontSize: 12 }} padding={{ left: 0, right: 0 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatYAxisTick} domain={yDomain as [number, number]} />
              <Tooltip content={<CustomTooltip />} />

              <Bar dataKey="bodyRange" barSize={22} name="Open-Close" radius={[2, 2, 2, 2]}>
                {chartData.map((point) => (
                  <Cell key={`${point.monthKey}-body`} fill={point.close >= point.open ? "#10b981" : "#ef4444"} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4 space-y-3 h-fit">
          <div className="text-sm font-semibold text-gray-900">Summary</div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Months</div>
            <div className="text-sm font-semibold text-gray-900">{summary.monthCount}</div>
          </div>
          <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
            <div className="text-xs text-emerald-700">Bullish Months</div>
            <div className="text-sm font-semibold text-emerald-700">{summary.bullishMonths}</div>
          </div>
          <div className="rounded-md border border-rose-100 bg-rose-50 p-3">
            <div className="text-xs text-rose-700">Bearish Months</div>
            <div className="text-sm font-semibold text-rose-700">{summary.bearishMonths}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Net Change</div>
            <div className={`text-sm font-semibold ${summary.netChange >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {formatCurrency(summary.netChange, currency)}
            </div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Best Month</div>
            <div className="text-sm font-semibold text-emerald-700">
              {summary.bestMonth ? `${summary.bestMonth.formattedMonth} (${formatCurrency(summary.bestMonth.movement, currency)})` : "-"}
            </div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <div className="text-xs text-gray-500">Avg Monthly Net</div>
            <div className={`text-sm font-semibold ${summary.averageMonthlyNet >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {formatCurrency(summary.averageMonthlyNet, currency)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CashflowCandlestickChart.displayName = "CashflowCandlestickChart";
