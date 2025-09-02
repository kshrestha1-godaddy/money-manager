"use client";

import React, { useMemo, useRef, useCallback } from "react";
import { PolarArea } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { formatCurrency } from "../../../utils/currency";
import { InvestmentInterface } from "../../../types/investments";
import { ChartControls } from "../../../components/ChartControls";
import { useChartExpansion } from "../../../utils/chartUtils";
import { useChartAnimationState } from "../../../hooks/useChartAnimationContext";

ChartJS.register(RadialLinearScale, ArcElement, ChartTooltip, ChartLegend, ChartDataLabels);

interface InvestmentTypePolarChartProps {
  investments: InvestmentInterface[];
  currency?: string;
  title?: string;
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
  EMERGENCY_FUND: "#ef4444",
  MARRIAGE: "#f97316", 
  VACATION: "#06b6d4",
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
  EMERGENCY_FUND: "Emergency Fund",
  MARRIAGE: "Marriage",
  VACATION: "Vacation",
  PROVIDENT_FUNDS: "Provident Funds",
  SAFE_KEEPINGS: "Safe Keepings",
  OTHER: "Other",
};

const InvestmentTypePolarChartComponent = ({ investments, currency = "USD", title = "Portfolio Distribution by Investment Type" }: InvestmentTypePolarChartProps) => {
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
    }, [investments]);

    // Download functions for Chart.js (Canvas-based)
    const downloadPNG = useCallback(async (): Promise<void> => {
      const element = chartRef.current;
      if (!element) return;

      try {
        // Chart.js creates canvas elements, not SVG
        const canvas = element.querySelector('canvas');
        if (!canvas) {
          console.error('No canvas element found');
          return;
        }

        // Get the chart data URL from the canvas
        const dataURL = canvas.toDataURL('image/png', 1.0);
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'investment-type-polar-chart.png';
        link.href = dataURL;
        link.click();
      } catch (error) {
        console.error('Error downloading PNG:', error);
      }
    }, []);

    const downloadSVG = useCallback((): void => {
      const element = chartRef.current;
      if (!element) return;

      try {
        // Chart.js doesn't generate SVG, so we convert canvas to SVG
        const canvas = element.querySelector('canvas');
        if (!canvas) {
          console.error('No canvas element found');
          return;
        }

        // Get canvas dimensions
        const { width, height } = canvas;
        
        // Create SVG with embedded image
        const svgData = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <rect width="100%" height="100%" fill="white"/>
            <image href="${canvas.toDataURL('image/png')}" width="${width}" height="${height}"/>
          </svg>
        `;

        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const link = document.createElement('a');
        link.download = 'investment-type-polar-chart.svg';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (error) {
        console.error('Error downloading SVG:', error);
      }
    }, []);

    // Memoize CSV data preparation to avoid duplication and improve performance
    const csvData = useMemo(() => {
      const csvDataArray = [
        ["Investment Type", "Invested Amount", "Percentage", "Positions"],
        ...data.map((d) => [
          d.name,
          d.value.toString(),
          totalInvested > 0 ? ((d.value / totalInvested) * 100).toFixed(1) + "%" : "0.0%",
          d.count.toString(),
        ]),
      ];

      // Add detailed breakdown for all types if "Others" category exists
      const hasOthers = data.some(d => d.name === 'Others');
      if (hasOthers) {
        csvDataArray.push(['', '', '', '']); // Empty row for separation
        csvDataArray.push(['--- Detailed Breakdown ---', '', '', '']);
        csvDataArray.push(['All Types (including < 2%)', '', '', '']);
        
        // Get all original types from investments
        const allTypes = new Map<string, { invested: number; count: number }>();
        investments.forEach((inv) => {
          const key = inv.type || "OTHER";
          const prev = allTypes.get(key) || { invested: 0, count: 0 };
          const invested = (Number(inv.quantity) || 0) * (Number(inv.purchasePrice) || 0);
          allTypes.set(key, { invested: prev.invested + invested, count: prev.count + 1 });
        });

        Array.from(allTypes.entries())
          .map(([type, agg]) => ({
            name: TYPE_LABELS[type] || type,
            value: agg.invested,
            count: agg.count,
          }))
          .sort((a, b) => b.value - a.value)
          .forEach(item => {
            const percentage = totalInvested > 0 ? ((item.value / totalInvested) * 100).toFixed(1) + '%' : '0.0%';
            csvDataArray.push([item.name, item.value.toString(), percentage, item.count.toString()]);
          });
      }

      return csvDataArray;
    }, [data, totalInvested, investments]);

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
        intersect: true,
        mode: 'index',
      },
      scales: {
        r: {
          angleLines: { 
            color: "#d1d5db",
            lineWidth: 1.5,
          },
          grid: { 
            color: "#d1d5db",
            lineWidth: 0.8,
            borderDash: [4, 4],
            borderDashOffset: 2,
            borderWidth: 1,
            borderRadius: 2,
            borderJoinStyle: 'round',
          },
          pointLabels: { display: true, color: "rgb(107, 114, 128)", font: { size: 8 }   },
          ticks: {
            display: true,
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
          borderWidth: 0.8,
          cornerRadius: 8,
          padding: 10,
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
      <div>
        <div className="flex justify-start items-center mb-4">
          <div className="text-left">
            <p className="text-xs text-gray-600">Total Invested</p>
            <p className="text-base font-semibold text-blue-600">
              {formatCurrency(totalInvested, currency)}
            </p>
            <p className="text-xs text-gray-500">{data.reduce((s, d) => s + d.count, 0)} positions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Polar chart - takes up 2/3 of the width */}
          <div
            ref={chartRef}
            className={`${isExpanded ? "h-[50rem]" : "h-[28rem] sm:h-[32rem] md:h-[36rem]"} lg:col-span-2`}
            role="img"
            aria-label={`Investment portfolio distribution polar chart showing ${formatCurrency(
              totalInvested,
              currency
            )} across different investment types`}
          >
            <PolarArea data={chartData} options={chartOptions} />
          </div>

          {/* Legend - takes up 1/3 of the width */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Type Breakdown</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.map((d) => {
                const pct = totalInvested > 0 ? ((d.value / totalInvested) * 100).toFixed(1) : "0.0";
                return (
                  <div key={d.name} className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs sm:text-sm text-gray-700 truncate font-medium">{d.name}</span>
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
            customDownloadPNG={downloadPNG}
            customDownloadSVG={downloadSVG}
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
};

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: InvestmentTypePolarChartProps, nextProps: InvestmentTypePolarChartProps) => {
  // Check if currency or title changed
  if (prevProps.currency !== nextProps.currency || prevProps.title !== nextProps.title) {
    return false;
  }
  
  // Check if investments array length changed
  if (prevProps.investments.length !== nextProps.investments.length) {
    return false;
  }
  
  // Check if any investment data actually changed (deep comparison of relevant fields)
  for (let i = 0; i < prevProps.investments.length; i++) {
    const prev = prevProps.investments[i];
    const next = nextProps.investments[i];
    
    if (
      prev.id !== next.id ||
      prev.type !== next.type ||
      prev.quantity !== next.quantity ||
      prev.purchasePrice !== next.purchasePrice ||
      prev.name !== next.name ||
      prev.symbol !== next.symbol
    ) {
      return false;
    }
  }
  
  return true;
};

export const InvestmentTypePolarChart = React.memo(InvestmentTypePolarChartComponent, arePropsEqual);

InvestmentTypePolarChart.displayName = "InvestmentTypePolarChart";


