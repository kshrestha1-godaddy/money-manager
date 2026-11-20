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
import { CashflowCandlestickChart } from "../charts/CashflowCandlestickChart";
import { LocationChart } from "../charts/LocationChart";
import Link from "next/link";
import { useChartData } from "../../../hooks/useChartDataContext";

interface DashboardChartsProps {
  currency: string;
  startDate: string;
  endDate: string;
  isAllTime: boolean;
  availableYears: number[];
  onDateChange: (start: string, end: string) => void;
  onClearFilters: () => void;
  onSetAllTime: () => void;
}

export function DashboardCharts({
  currency,
  startDate,
  endDate,
  isAllTime,
  availableYears,
  onDateChange,
  onClearFilters,
  onSetAllTime,
}: DashboardChartsProps) {
  const { rawIncomes, rawExpenses, filteredIncomes, filteredExpenses } = useChartData();
  const hasTransactions = rawIncomes.length > 0 || rawExpenses.length > 0;
  const hasTransactionsInRange = filteredIncomes.length > 0 || filteredExpenses.length > 0;

  return (
    <div id="dashboard-content" className="space-y-5">
      <DateFilterButtons
        startDate={startDate}
        endDate={endDate}
        isAllTime={isAllTime}
        availableYears={availableYears}
        onDateChange={onDateChange}
        onClearFilters={onClearFilters}
        onSetAllTime={onSetAllTime}
      />

      {!hasTransactions ? (
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">No transactions yet</h2>
          <p className="mt-1 text-sm text-gray-600">Record income or expenses to see your dashboard charts.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium text-brand-700">
            <Link href="/incomes" className="underline">Go to Incomes</Link>
            <Link href="/expenses" className="underline">Go to Expenses</Link>
          </div>
        </section>
      ) : !hasTransactionsInRange ? (
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">No transactions in this date range</h2>
          <button type="button" onClick={onSetAllTime} className="mt-3 text-sm font-medium text-brand-700 underline">
            Show all time
          </button>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="flex h-full min-w-0 flex-col">
              <WaterfallChart currency={currency} heightClass="h-[28rem] md:h-[36rem]" />
            </div>
            <div className="flex h-full min-w-0 flex-col">
              <SavingsRateChart currency={currency} heightClass="h-[32rem] md:h-[39rem]" />
            </div>
          </div>

          <div className="w-full min-h-[500px]">
            <div className="h-full">
              <MonthlyTrendChart currency={currency} />
            </div>
          </div>

          <div className="w-full min-h-[500px]">
            <div className="h-full">
              <CashflowCandlestickChart currency={currency} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
            <div className="flex h-full min-w-0 flex-col">
              <IncomePieChart currency={currency} heightClass="h-[32rem] md:h-[40rem]" />
            </div>
            <div className="flex h-full min-w-0 flex-col">
              <CategoryPieChart type="expense" currency={currency} heightClass="h-[32rem] md:h-[40rem]" />
            </div>
          </div>

          <div className="w-full min-h-[500px]">
            <div className="h-full">
              <CashFlowSankeyChart currency={currency} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
            <div className="flex h-full min-w-0 flex-col">
              <CategoryTrendChart type="expense" currency={currency} />
            </div>
            <div className="flex h-full min-w-0 flex-col">
              <CategoryTrendChart type="income" currency={currency} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
            <div className="flex h-full min-w-0 flex-col">
              <CustomCalendarChart type="expense" currency={currency} />
            </div>
            <div className="flex h-full min-w-0 flex-col">
              <CustomCalendarChart type="income" currency={currency} />
            </div>
          </div>

          <div className="w-full min-h-[500px]">
            <div className="h-full">
              <LocationChart currency={currency} heightClass="h-[850px] sm:h-[950px]" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
