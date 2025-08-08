"use client";

import React, { useMemo, useRef } from "react";
import { PolarArea } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { formatCurrency } from "../../utils/currency";
import { InvestmentInterface, InvestmentTargetProgress } from "../../types/investments";
import { ChartControls } from "../ChartControls";
import { useChartExpansion } from "../../utils/chartUtils";
import { useChartAnimationState } from "../../hooks/useChartAnimationContext";
import { InvestmentTargetProgressChart } from "./InvestmentTargetProgressChart";

ChartJS.register(RadialLinearScale, ArcElement, ChartTooltip, ChartLegend, ChartDataLabels);

interface InvestmentTypePolarChartProps {
  investments: InvestmentInterface[];
  currency?: string;
  title?: string;
  targets?: InvestmentTargetProgress[];
  onEditTarget?: (investmentType: string) => void;
  onAddTarget?: () => void;
}

interface TypeDatum {
  name: string;
  value: number;
  count: number;
  color: string;
}

const TYPE_COLORS: Record<string, string> = {
  STOCKS: "#3b82f6",
  CRYPTO: "#10b981",
  MUTUAL_FUNDS: "#f59e0b",
  BONDS: "#f97316",
  REAL_ESTATE: "#8b5cf6",
  GOLD: "#22c55e",
  FIXED_DEPOSIT: "#fde047",
  PROVIDENT_FUNDS: "#fb7185",
  SAFE_KEEPINGS: "#60a5fa",
  OTHER: "#a78bfa",
};

const TYPE_LABELS: Record<string, string> = {
  STOCKS: "Stocks",
  CRYPTO: "Cryptocurrency",
  MUTUAL_FUNDS: "Mutual Funds",
  BONDS: "Bonds",
  REAL_ESTATE: "Real Estate",
  GOLD: "Gold",
  FIXED_DEPOSIT: "Fixed Deposit",
  PROVIDENT_FUNDS: "Provident Funds",
  SAFE_KEEPINGS: "Safe Keepings",
  OTHER: "Other",
};

export const InvestmentTypePolarChart = React.memo<InvestmentTypePolarChartProps>(
  ({ investments, currency = "USD", title = "Portfolio Distribution by Investment Type", targets = [], onEditTarget, onAddTarget }) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);

    const { animationDuration, isAnimationActive } = useChartAnimationState(
      "investment-type-polar"
    );

    const { data, totalInvested } = useMemo(() => {
      const typeToAgg = new Map<string, { invested: number; count: number }>();

      investments.forEach((inv) => {
        const key = inv.type || "OTHER";
        const prev = typeToAgg.get(key) || { invested: 0, count: 0 };
        const invested = (Number(inv.quantity) || 0) * (Number(inv.purchasePrice) || 0);
        typeToAgg.set(key, { invested: prev.invested + invested, count: prev.count + 1 });
      });

      const entries: TypeDatum[] = Array.from(typeToAgg.entries())
        .map(([type, agg]) => ({
          name: TYPE_LABELS[type] || type,
          value: agg.invested,
          count: agg.count,
          color: TYPE_COLORS[type] || "#9ca3af",
        }))
        .sort((a, b) => b.value - a.value);

      const total = entries.reduce((s, e) => s + e.value, 0);

      // Keep categories <2% grouped as Others (for clarity)
      const major: TypeDatum[] = [];
      const minor: TypeDatum[] = [];
      entries.forEach((e) => {
        const pct = total > 0 ? (e.value / total) * 100 : 0;
        (pct >= 2 ? major : minor).push(e);
      });

      const finalData: TypeDatum[] = [...major];
      if (minor.length) {
        finalData.push({
          name: "Others",
          value: minor.reduce((s, e) => s + e.value, 0),
          count: minor.reduce((s, e) => s + e.count, 0),
          color: "#9ca3af",
        });
      }

      return { data: finalData, totalInvested: total };
    }, [
      investments.length,
      investments.reduce((s, inv) => s + inv.id + inv.quantity + inv.purchasePrice, 0),
    ]);

    const csvData = [
      ["Investment Type", "Invested Amount", "Percentage", "Positions"],
      ...data.map((d) => [
        d.name,
        d.value.toString(),
        totalInvested > 0 ? ((d.value / totalInvested) * 100).toFixed(1) + "%" : "0.0%",
        d.count.toString(),
      ]),
    ];

    if (!data.length) {
      return (
        <div className="bg-white rounded-lg shadow p-4" data-chart-type="investment-type-polar">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No investment data available
          </div>
        </div>
      );
    }

    const labels = data.map((d) => d.name);
    const values = data.map((d) => d.value);
    const backgroundColor = data.map((d) => d.color);

    const chartData: any = {
      labels,
      datasets: [
        {
          label: "Invested",
          data: values,
          backgroundColor,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    };

    const chartOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: isAnimationActive ? animationDuration : 0,
        easing: 'easeInOutQuart',
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
      scales: {
        r: {
          angleLines: { 
            color: "#e5e7eb",
            lineWidth: 1,
          },
          grid: { 
            color: "#f3f4f6",
            lineWidth: 1,
          },
          pointLabels: { display: false },
          ticks: {
            display: false,
            backdropColor: "transparent",
          },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#374151',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: true,
          callbacks: {
            title: (tooltipItems: any[]) => {
              return tooltipItems[0]?.label || '';
            },
            label: (ctx: any) => {
              // For polar area chart, the value is in ctx.raw
              const value = Number(ctx.raw) || 0;
              const pct = totalInvested > 0 ? ((value / totalInvested) * 100).toFixed(1) : "0.0";
              const labelName = ctx.label;
              const item = data.find((d) => d.name === labelName);
              const count = item?.count ?? 0;
              
              // Debug: log the context to understand structure
              console.log('Tooltip context:', { ctx, value, labelName, item });
              
              return [
                `Amount: ${formatCurrency(value, currency)}`,
                `Percentage: ${pct}%`,
                `Positions: ${count}`
              ];
            },
            labelColor: (ctx: any) => {
              return {
                borderColor: ctx.dataset.backgroundColor[ctx.dataIndex],
                backgroundColor: ctx.dataset.backgroundColor[ctx.dataIndex],
                borderWidth: 2,
                borderRadius: 2,
              };
            },
          },
        },
        datalabels: {
          display: true,
          color: "#ffffff",
          font: {
            size: 10,
            weight: "bold",
          },
          formatter: (value: number, ctx: any) => {
            const pct = totalInvested > 0 ? ((value / totalInvested) * 100).toFixed(0) : "0";
            const label = ctx.chart.data.labels[ctx.dataIndex];
            // Only show label if percentage is > 5% to avoid clutter
            if (parseFloat(pct) < 5) return '';
            return `${label}\n(${pct}%)`;
          },
          anchor: "center",
          align: "center",
          textAlign: "center",
          textStrokeColor: "#000000",
          textStrokeWidth: 1,
        },
      },
    };

    const ChartContent = () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Polar Chart */}
        <div className="space-y-4">
          <div className="flex justify-start items-center">
            <div className="text-left">
              <p className="text-xs text-gray-600">Total Invested</p>
              <p className="text-base font-semibold text-blue-600">
                {formatCurrency(totalInvested, currency)}
              </p>
              <p className="text-xs text-gray-500">{data.reduce((s, d) => s + d.count, 0)} positions</p>
            </div>
          </div>

          {/* Larger Polar chart */}
          <div
            ref={chartRef}
            className={`${isExpanded ? "h-[50rem]" : "h-[28rem] sm:h-[32rem] md:h-[36rem]"}`}
            role="img"
            aria-label={`Investment portfolio distribution polar chart showing ${formatCurrency(
              totalInvested,
              currency
            )} across different investment types`}
          >
            <PolarArea data={chartData} options={chartOptions} />
          </div>

          {/* Legend below chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Type Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.map((d) => {
                const pct = totalInvested > 0 ? ((d.value / totalInvested) * 100).toFixed(1) : "0.0";
                return (
                  <div key={d.name} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs sm:text-sm text-gray-700 truncate">{d.name}</span>
                      <span className="text-xs text-gray-500">({d.count})</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                        {formatCurrency(d.value, currency)}
                      </div>
                      <div className="text-xs text-gray-500">{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side - Investment Target Progress Chart */}
        <div className="space-y-4">
          <InvestmentTargetProgressChart
            targets={targets}
            currency={currency}
            title="Investment Target Progress"
            onEditTarget={onEditTarget}
            onAddTarget={onAddTarget}
          />
        </div>
      </div>
    );

    return (
      <>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-5" data-chart-type="investment-type-polar">
          <ChartControls
            chartRef={chartRef}
            isExpanded={isExpanded}
            onToggleExpanded={toggleExpanded}
            fileName="investment-type-polar-chart"
            csvData={csvData}
            csvFileName="investment-type-polar-data"
            title={title}
            tooltipText="Distribution of your portfolio across investment types (based on invested amount)"
          />
          <ChartContent />
        </div>

        {isExpanded && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-7xl w-full max-h-full overflow-auto">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                <div>
                  <h2 className="text-lg sm:text-2xl font-semibold truncate">{title}</h2>
                  <p className="text-sm text-gray-500">
                    Distribution of your portfolio across investment types (based on invested amount)
                  </p>
                </div>
                <button
                  onClick={toggleExpanded}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
              <ChartContent />
            </div>
          </div>
        )}
      </>
    );
  }
);

InvestmentTypePolarChart.displayName = "InvestmentTypePolarChart";


