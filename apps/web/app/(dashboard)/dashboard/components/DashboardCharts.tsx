"use client";

import { Suspense } from "react";
import { DateFilterButtons } from "../../../components/DateFilterButtons";
import { WaterfallChart } from "../charts/WaterfallChart";
import { SavingsRateChart } from "../charts/SavingsRateChart";
import { MonthlyTrendChart } from "../charts/MonthlyTrendChart";
import { CategoryPieChart } from "../charts/CategoryPieChart";
import { IncomeSankeyChart } from "../charts/IncomeSankeyChart";
import { CategoryTrendChart } from "../charts/CategoryTrendChart";
import { CustomCalendarChart } from "../charts/CustomCalendarChart";
import { RecentTransactions } from "./RecentTransactions";
import { ChartSkeleton } from "./ChartSkeleton";

interface DashboardChartsProps {
  currency: string;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  onClearFilters: () => void;
}

export function DashboardCharts({
  currency,
  startDate,
  endDate,
  onDateChange,
  onClearFilters,
}: DashboardChartsProps) {
  return (
    <div id="dashboard-content">
      <DateFilterButtons
        startDate={startDate}
        endDate={endDate}
        onDateChange={onDateChange}
        onClearFilters={onClearFilters}
      />

      <div className="grid grid-cols-2 gap-4">
        <Suspense fallback={<ChartSkeleton title="Financial Overview" />}>
          <div key="waterfall-chart">
            <WaterfallChart currency={currency} />
          </div>
        </Suspense>
        <Suspense fallback={<ChartSkeleton title="Savings Rate Trend" />}>
          <div key="savings-rate-chart">
            <SavingsRateChart currency={currency} />
          </div>
        </Suspense>
      </div>

      <Suspense fallback={<ChartSkeleton title="Monthly Trends" />}>
        <div key="monthly-trend-chart">
          <MonthlyTrendChart currency={currency} />
        </div>
      </Suspense>

      <div className="grid grid-cols-2 gap-4">
        <Suspense fallback={<ChartSkeleton title="Expense Distribution" height="h-[24rem]" />}>
          <div key="expense-pie-chart">
            <CategoryPieChart type="expense" currency={currency} />
          </div>
        </Suspense>
        <Suspense fallback={<ChartSkeleton title="Income Distribution" height="h-[24rem]" />}>
          <div key="income-sankey-chart">
            <IncomeSankeyChart currency={currency} />
          </div>
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Suspense fallback={<ChartSkeleton title="Expense Category Trends" height="h-[32rem]" />}>
          <div key="expense-trend-chart">
            <CategoryTrendChart type="expense" currency={currency} />
          </div>
        </Suspense>
        <Suspense fallback={<ChartSkeleton title="Income Category Trends" height="h-[32rem]" />}>
          <div key="income-trend-chart">
            <CategoryTrendChart type="income" currency={currency} />
          </div>
        </Suspense>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Suspense fallback={<ChartSkeleton title="Expense Transaction Calendar" height="h-[32rem]" />}>
          <div key="expense-calendar-chart">
            <CustomCalendarChart type="expense" currency={currency} />
          </div>
        </Suspense>
        <Suspense fallback={<ChartSkeleton title="Income Transaction Calendar" height="h-[32rem]" />}>
          <div key="income-calendar-chart">
            <CustomCalendarChart type="income" currency={currency} />
          </div>
        </Suspense>
      </div>

      <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>}>
        <RecentTransactions />
      </Suspense>
    </div>
  );
}


