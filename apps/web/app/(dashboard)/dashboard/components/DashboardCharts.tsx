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
  onSetAllTime: () => void;
}

export function DashboardCharts({
  currency,
  startDate,
  endDate,
  onDateChange,
  onClearFilters,
  onSetAllTime,
}: DashboardChartsProps) {
  return (
    <div id="dashboard-content" className="space-y-5">
      <DateFilterButtons
        startDate={startDate}
        endDate={endDate}
        onDateChange={onDateChange}
        onClearFilters={onClearFilters}
        onSetAllTime={onSetAllTime}
      />

      {/* First Row: Financial Overview Charts */}
      <div className="grid grid-cols-2 gap-4">

        <Suspense fallback={<ChartSkeleton title="Financial Overview" height="h-[28rem] md:h-[36rem]" />}>
          <div key="waterfall-chart" className="flex flex-col h-full">
            <WaterfallChart currency={currency} heightClass="h-[28rem] md:h-[36rem]" />
          </div>
        </Suspense>

        <Suspense fallback={<ChartSkeleton title="Savings Rate Trend" height="h-[28rem] md:h-[38rem]" />}>
        
          <div key="savings-rate-chart" className="flex flex-col h-full">
            <SavingsRateChart currency={currency} heightClass="h-[32rem] md:h-[39rem]" />
          </div>

        </Suspense>
      </div>

      {/* Second Row: Monthly Trends (Full Width) */}
      <div className="w-full min-h-[500px]">
        <Suspense fallback={<ChartSkeleton title="Monthly Trends" />}>
          <div key="monthly-trend-chart" className="h-full">
            <MonthlyTrendChart currency={currency} />
          </div>
        </Suspense>
      </div>

      {/* Third Row: Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
        <Suspense fallback={<ChartSkeleton title="Expense Distribution" height="h-[28rem] md:h-[34rem]" />}>
          <div key="expense-pie-chart" className="flex flex-col h-full">
            <CategoryPieChart type="expense" currency={currency} heightClass="h-[28rem] md:h-[34rem]" />
          </div>
        </Suspense>
        <Suspense fallback={<ChartSkeleton title="Income Distribution" height="h-[28rem] md:h-[34rem]" />}>
          <div key="income-sankey-chart" className="flex flex-col h-full">
            <IncomeSankeyChart currency={currency} heightClass="h-[32rem] md:h-[38rem]" />
          </div>
        </Suspense>
      </div>

      {/* Fourth Row: Category Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
        <Suspense fallback={<ChartSkeleton title="Expense Category Trends" height="h-[32rem]" />}>
          <div key="expense-trend-chart" className="flex flex-col h-full">
            <CategoryTrendChart type="expense" currency={currency} />
          </div>
        </Suspense>
        <Suspense fallback={<ChartSkeleton title="Income Category Trends" height="h-[32rem]" />}>
          <div key="income-trend-chart" className="flex flex-col h-full">
            <CategoryTrendChart type="income" currency={currency} />
          </div>
        </Suspense>
      </div>

      {/* Fifth Row: Calendar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
        <Suspense fallback={<ChartSkeleton title="Expense Transaction Calendar" height="h-[32rem]" />}>
          <div key="expense-calendar-chart" className="flex flex-col h-full">
            <CustomCalendarChart type="expense" currency={currency} />
          </div>
        </Suspense>
        <Suspense fallback={<ChartSkeleton title="Income Transaction Calendar" height="h-[32rem]" />}>
          <div key="income-calendar-chart" className="flex flex-col h-full">
            <CustomCalendarChart type="income" currency={currency} />
          </div>
        </Suspense>
      </div>

      {/* Sixth Row: Recent Transactions (Full Width) */}
      <div className="w-full min-h-[500px]">
        <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>}>
          <div className="h-full">
            <RecentTransactions />
          </div>
        </Suspense>
      </div>
    </div>
  );
}


