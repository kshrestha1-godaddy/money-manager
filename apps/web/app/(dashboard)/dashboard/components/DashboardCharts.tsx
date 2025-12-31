"use client";
import { DateFilterButtons } from "../../../components/DateFilterButtons";
import { WaterfallChart } from "../charts/WaterfallChart";
import { SavingsRateChart } from "../charts/SavingsRateChart";
import { MonthlyTrendChart } from "../charts/MonthlyTrendChart";
import { CategoryPieChart } from "../charts/CategoryPieChart";
import { IncomePieChart } from "../charts/IncomePieChart";
import { CategoryTrendChart } from "../charts/CategoryTrendChart";
import { CustomCalendarChart } from "../charts/CustomCalendarChart";
import { CashFlowSankeyChart } from "../charts/CashFlowSankeyChart";
import { RecentTransactions } from "./RecentTransactions";

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
        <div key="waterfall-chart" className="flex flex-col h-full">
          <WaterfallChart currency={currency} heightClass="h-[28rem] md:h-[36rem]" />
        </div>
        <div key="savings-rate-chart" className="flex flex-col h-full">
          <SavingsRateChart currency={currency} heightClass="h-[32rem] md:h-[39rem]" />
        </div>
      </div>

      {/* Second Row: Monthly Trends (Full Width) */}
      <div className="w-full min-h-[500px]">
        <div key="monthly-trend-chart" className="h-full">
          <MonthlyTrendChart currency={currency} />
        </div>
      </div>

      {/* Third Row: Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
        <div key="expense-pie-chart" className="flex flex-col h-full">
          <CategoryPieChart type="expense" currency={currency} heightClass="h-[28rem] md:h-[34rem]" />
        </div>
        <div key="income-pie-chart" className="flex flex-col h-full">
          <IncomePieChart currency={currency} heightClass="h-[28rem] md:h-[34rem]" />
        </div>
      </div>

      {/* Fourth Row: Category Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
        <div key="expense-trend-chart" className="flex flex-col h-full">
          <CategoryTrendChart type="expense" currency={currency} />
        </div>
        <div key="income-trend-chart" className="flex flex-col h-full">
          <CategoryTrendChart type="income" currency={currency} />
        </div>
      </div>

      {/* Fifth Row: Calendar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
        <div key="expense-calendar-chart" className="flex flex-col h-full">
          <CustomCalendarChart type="expense" currency={currency} />
        </div>
        <div key="income-calendar-chart" className="flex flex-col h-full">
          <CustomCalendarChart type="income" currency={currency} />
        </div>
      </div>

      {/* Sixth Row: Cash Flow Analysis (Full Width) */}
      <div className="w-full min-h-[500px]">
        <div key="cash-flow-sankey-chart" className="h-full">
          <CashFlowSankeyChart currency={currency} />
        </div>
      </div>

    </div>
  );
}


