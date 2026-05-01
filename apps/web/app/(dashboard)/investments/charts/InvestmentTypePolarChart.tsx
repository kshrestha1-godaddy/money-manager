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
import { presentValueForPosition } from "../utils/stocksExpenseBasis";
import { ChartControls } from "../../../components/ChartControls";
import { useChartExpansion } from "../../../utils/chartUtils";
import { useChartAnimationState } from "../../../hooks/useChartAnimationContext";
import { PieChart } from "lucide-react";

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
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  description: string;
  percentageOfTotal: number;
  investments: Array<{name: string; amount: number; symbol?: string}>;
}

const TYPE_COLORS: Record<string, string> = {
  STOCKS: "#3b82f6",
  CRYPTO: "#10b981",
  MUTUAL_FUNDS: "#f59e0b",
  BONDS: "#f97316",
  REAL_ESTATE: "#8b5cf6",
  GOLD: "#22c55e",
  SILVER: "#94a3b8",
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
  SILVER: "Silver",
  FIXED_DEPOSIT: "Fixed Deposit",
  EMERGENCY_FUND: "Emergency Fund",
  MARRIAGE: "Marriage",
  VACATION: "Vacation",
  PROVIDENT_FUNDS: "Provident Funds",
  SAFE_KEEPINGS: "Safe Keepings",
  OTHER: "Other",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  STOCKS: "Equity investments in publicly traded companies. Offers potential for capital appreciation and dividends but carries market risk.",
  CRYPTO: "Digital assets and cryptocurrencies. High volatility investments with potential for significant gains or losses.",
  MUTUAL_FUNDS: "Professionally managed investment funds that pool money from multiple investors. Provides diversification across various assets.",
  BONDS: "Fixed-income securities representing loans to corporations or governments. Generally lower risk with steady income potential.",
  REAL_ESTATE: "Property investments including residential, commercial, or REITs. Provides potential rental income and capital appreciation.",
  GOLD: "Precious metal investments as a hedge against inflation and economic uncertainty. Traditional store of value.",
  SILVER: "Silver bullion or silver-backed holdings; spot-based valuation on the investments page.",
  FIXED_DEPOSIT: "Low-risk bank deposits with guaranteed returns. Capital preservation with modest interest income.",
  EMERGENCY_FUND: "Liquid savings reserved for unexpected expenses. Prioritizes accessibility over returns for financial security.",
  MARRIAGE: "Savings allocated for wedding expenses and related costs. Goal-based investment with specific timeline.",
  VACATION: "Travel and leisure fund for planned trips and experiences. Short to medium-term savings goal.",
  PROVIDENT_FUNDS: "Retirement savings through employer-sponsored programs. Long-term wealth building with tax benefits.",
  SAFE_KEEPINGS: "Conservative investments prioritizing capital preservation. Low-risk options for stable value maintenance.",
  OTHER: "Miscellaneous investments not categorized elsewhere. Various alternative investment vehicles and strategies.",
};

const InvestmentTypePolarChartComponent = ({ investments, currency = "USD", title = "Portfolio Distribution by Investment Type" }: InvestmentTypePolarChartProps) => {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);

    const { animationDuration, isAnimationActive } = useChartAnimationState(
      "investment-type-polar"
    );

    // Groups by inv.type (not savings-target links). Present value: quantity × currentPrice.
    const { data, legendData, totalPresentValue } = useMemo(() => {
      const typeToAgg = new Map<string, { 
        invested: number; 
        count: number; 
        amounts: number[];
        investments: Array<{name: string; amount: number; symbol?: string}>;
      }>();

      investments.forEach((inv) => {
        const key = inv.type || "OTHER";
        const pv = presentValueForPosition(inv);
        const prev = typeToAgg.get(key) || { invested: 0, count: 0, amounts: [], investments: [] };
        
        typeToAgg.set(key, { 
          invested: prev.invested + pv, 
          count: prev.count + 1,
          amounts: [...prev.amounts, pv],
          investments: [...prev.investments, {
            name: inv.name || 'Unnamed Investment',
            amount: pv,
            symbol: inv.symbol
          }]
        });
      });

      const entries: TypeDatum[] = Array.from(typeToAgg.entries())
        .map(([type, agg]) => {
          const averageAmount = agg.count > 0 ? agg.invested / agg.count : 0;
          const minAmount = agg.amounts.length > 0 ? Math.min(...agg.amounts) : 0;
          const maxAmount = agg.amounts.length > 0 ? Math.max(...agg.amounts) : 0;
          
          return {
            name: TYPE_LABELS[type] || type,
            value: agg.invested,
            count: agg.count,
            color: TYPE_COLORS[type] || "#9ca3af",
            averageAmount,
            minAmount,
            maxAmount,
            description: TYPE_DESCRIPTIONS[type] || "Investment category with various financial instruments.",
            percentageOfTotal: 0, // Will be calculated after total is known
            investments: agg.investments.sort((a, b) => b.amount - a.amount)
          };
        })
        .sort((a, b) => b.value - a.value);

      const total = entries.reduce((s, e) => s + e.value, 0);

      // Update percentages
      entries.forEach(entry => {
        entry.percentageOfTotal = total > 0 ? (entry.value / total) * 100 : 0;
      });

      // Keep categories <2% grouped as Others (for clarity)
      const major: TypeDatum[] = [];
      const minor: TypeDatum[] = [];
      entries.forEach((e) => {
        const pct = total > 0 ? (e.value / total) * 100 : 0;
        (pct >= 2 ? major : minor).push(e);
      });

      const chartData: TypeDatum[] = [...major];
      const legendData: TypeDatum[] = [...major].sort((a, b) => b.value - a.value);
      if (minor.length) {
        const minorInvestments = minor.flatMap(m => m.investments);
        const minorAmounts = minor.flatMap(m => m.investments.map(inv => inv.amount));
        const minorTotal = minor.reduce((s, e) => s + e.value, 0);
        const minorCount = minor.reduce((s, e) => s + e.count, 0);
        
        const othersData = {
          name: "Others",
          value: minorTotal,
          count: minorCount,
          color: "#9ca3af",
          averageAmount: minorCount > 0 ? minorTotal / minorCount : 0,
          minAmount: minorAmounts.length > 0 ? Math.min(...minorAmounts) : 0,
          maxAmount: minorAmounts.length > 0 ? Math.max(...minorAmounts) : 0,
          description: `Combined smaller investment categories (${minor.map(m => m.name).join(', ')}). Each category represents less than 2% of total portfolio.`,
          percentageOfTotal: total > 0 ? (minorTotal / total) * 100 : 0,
          investments: minorInvestments.sort((a, b) => b.amount - a.amount)
        };
        
        chartData.push(othersData);
        legendData.push(othersData);
      }

      return { data: chartData, legendData, totalPresentValue: total };
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

    // Enhanced CSV data preparation with detailed statistics
    const csvData = useMemo(() => {
      const csvDataArray = [
        ["Investment Type", "Present value", "Percentage", "Positions", "Average per Position", "Min Amount", "Max Amount", "Description"],
        ...data.map((d) => [
          d.name,
          d.value.toString(),
          totalPresentValue > 0 ? ((d.value / totalPresentValue) * 100).toFixed(1) + "%" : "0.0%",
          d.count.toString(),
          d.averageAmount.toFixed(2),
          d.minAmount.toFixed(2),
          d.maxAmount.toFixed(2),
          d.description,
        ]),
      ];

      // Add detailed breakdown for all types if "Others" category exists
      const hasOthers = data.some(d => d.name === 'Others');
      if (hasOthers) {
        csvDataArray.push(['', '', '', '', '', '', '', '', '']); // Empty row for separation
        csvDataArray.push(['--- Detailed Breakdown ---', '', '', '', '', '', '', '', '']);
        csvDataArray.push(['All Types (including < 2%)', '', '', '', '', '', '', '', '']);
        
        // Get all original types from investments with enhanced stats
        const allTypes = new Map<string, { invested: number; count: number; amounts: number[] }>();
        investments.forEach((inv) => {
          const key = inv.type || "OTHER";
          const pv = presentValueForPosition(inv);
          const prev = allTypes.get(key) || { invested: 0, count: 0, amounts: [] };
          allTypes.set(key, { 
            invested: prev.invested + pv, 
            count: prev.count + 1,
            amounts: [...prev.amounts, pv]
          });
        });

        Array.from(allTypes.entries())
          .map(([type, agg]) => {
            const averageAmount = agg.count > 0 ? agg.invested / agg.count : 0;
            const minAmount = agg.amounts.length > 0 ? Math.min(...agg.amounts) : 0;
            const maxAmount = agg.amounts.length > 0 ? Math.max(...agg.amounts) : 0;
            return {
              name: TYPE_LABELS[type] || type,
              value: agg.invested,
              count: agg.count,
              averageAmount,
              minAmount,
              maxAmount,
              description: TYPE_DESCRIPTIONS[type] || "Investment category with various financial instruments."
            };
          })
          .sort((a, b) => b.value - a.value)
          .forEach(item => {
            const percentage = totalPresentValue > 0 ? ((item.value / totalPresentValue) * 100).toFixed(1) + '%' : '0.0%';
            csvDataArray.push([
              item.name,
              item.value.toString(),
              percentage,
              item.count.toString(),
              item.averageAmount.toFixed(2),
              item.minAmount.toFixed(2),
              item.maxAmount.toFixed(2),
              item.description,
            ]);
          });
      }

      return csvDataArray;
    }, [data, totalPresentValue, investments]);

    if (!data.length) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 h-[45rem] flex flex-col" data-chart-type="investment-type-polar">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <PieChart className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
          </div>
          
          <div className="text-center py-12 flex-1 flex flex-col justify-center">
            <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Investment Data Available</h4>
            <p className="text-gray-500 mb-6">
              Add investments to see your portfolio distribution across different investment types.
            </p>
          </div>
          
          {/* Empty state legend */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Chart will display when investments are added
            </p>
          </div>
        </div>
      );
    }

    const labels = data.map((d) => d.name);
    const values = data.map((d) => {
      const v = Number(d.value);
      return Number.isFinite(v) ? v : 0;
    });
    const backgroundColor = data.map((d) => d.color);
    const radialDataMax = values.length > 0 ? Math.max(...values, 0) : 0;
    /** Explicit max so each wedge radius = value / max (linear); avoids scale/tick quirks with suggestedMax only. */
    const radialScaleMax = radialDataMax > 0 ? radialDataMax * 1.02 : 1;

    const chartData: any = {
      labels,
      datasets: [
        {
          label: "Present value",
          data: values,
          backgroundColor,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    };

    const formatTickValue = (value: number): string => {
      if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
      return value.toFixed(0);
    };

    const chartOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 8,
          bottom: 8,
          left: 8,
          right: 8,
        },
      },
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
          z: 1,
          angleLines: {
            color: "#e5e7eb",
            lineWidth: 1,
          },
          grid: {
            color: "#e5e7eb",
            lineWidth: 0.8,
            z: 1,
          },
          pointLabels: {
            display: true,
            color: "rgb(55, 65, 81)",
            font: { size: 11, weight: '600' },
            padding: 6,
          },
          ticks: {
            display: true,
            backdropColor: "transparent",
            backdropPadding: 0,
            stepSize: 500000,
            color: "gray",
            font: { size: 10, weight: '600' },
            callback: (value: number) => formatTickValue(value),
            z: 1,
          },
          beginAtZero: true,
          min: 0,
          max: radialScaleMax,
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: (context: any) => {
            const { chart, tooltip } = context;

            let tooltipEl = chart.canvas.parentNode.querySelector('#chartjs-tooltip');
            if (!tooltipEl) {
              tooltipEl = document.createElement('div');
              tooltipEl.id = 'chartjs-tooltip';
              tooltipEl.style.position = 'absolute';
              tooltipEl.style.pointerEvents = 'none';
              tooltipEl.style.zIndex = '1000';
              tooltipEl.style.transition = 'opacity 0.15s ease';
              chart.canvas.parentNode.appendChild(tooltipEl);
            }

            if (tooltip.opacity === 0) {
              tooltipEl.style.opacity = '0';
              return;
            }

            if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
              const dataPoint = tooltip.dataPoints[0];
              const item = data.find((d) => d.name === dataPoint.label);

              if (item) {
                tooltipEl.innerHTML = `
                  <div style="background:white;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.12);padding:14px 16px;min-width:260px;max-width:340px;font-family:inherit">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                      <div style="width:12px;height:12px;border-radius:50%;background:${item.color};flex-shrink:0"></div>
                      <span style="font-weight:700;font-size:14px;color:#111827">${item.name}</span>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:baseline;background:#eff6ff;border-radius:6px;padding:8px 10px;margin-bottom:10px">
                      <span style="font-size:12px;color:#3b82f6;font-weight:500">Present Value</span>
                      <span style="font-size:16px;font-weight:700;color:#1d4ed8">${formatCurrency(item.value, currency)}</span>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
                      <div style="background:#f9fafb;border-radius:6px;padding:6px 8px">
                        <div style="font-size:10px;color:#6b7280;margin-bottom:2px">Portfolio Share</div>
                        <div style="font-size:13px;font-weight:600;color:#111827">${item.percentageOfTotal.toFixed(1)}%</div>
                      </div>
                      <div style="background:#f9fafb;border-radius:6px;padding:6px 8px">
                        <div style="font-size:10px;color:#6b7280;margin-bottom:2px">Positions</div>
                        <div style="font-size:13px;font-weight:600;color:#111827">${item.count}</div>
                      </div>
                      ${item.count > 0 ? `
                      <div style="background:#f9fafb;border-radius:6px;padding:6px 8px">
                        <div style="font-size:10px;color:#6b7280;margin-bottom:2px">Avg / Position</div>
                        <div style="font-size:13px;font-weight:600;color:#111827">${formatCurrency(item.averageAmount, currency)}</div>
                      </div>
                      ` : ''}
                      ${item.count > 1 ? `
                      <div style="background:#f9fafb;border-radius:6px;padding:6px 8px">
                        <div style="font-size:10px;color:#6b7280;margin-bottom:2px">Range</div>
                        <div style="font-size:11px;font-weight:600;color:#111827">${formatCurrency(item.minAmount, currency)} – ${formatCurrency(item.maxAmount, currency)}</div>
                      </div>
                      ` : ''}
                    </div>

                    ${item.investments.length > 0 ? `
                    <div style="border-top:1px solid #f3f4f6;padding-top:8px">
                      <div style="font-size:10px;color:#9ca3af;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">
                        ${item.investments.length > 3 ? 'Top 3 positions' : 'Positions'}
                      </div>
                      ${item.investments.slice(0, 3).map(inv => `
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                          <span style="font-size:11px;color:#4b5563;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                            ${inv.name}${inv.symbol ? ` <span style="color:#9ca3af">(${inv.symbol})</span>` : ''}
                          </span>
                          <span style="font-size:11px;font-weight:600;color:#374151;margin-left:8px">${formatCurrency(inv.amount, currency)}</span>
                        </div>
                      `).join('')}
                      ${item.investments.length > 3 ? `
                        <div style="font-size:10px;color:#9ca3af;text-align:center;margin-top:2px">+${item.investments.length - 3} more</div>
                      ` : ''}
                    </div>
                    ` : ''}

                    ${item.percentageOfTotal > 50 ? `
                      <div style="border-top:1px solid #f3f4f6;margin-top:8px;padding-top:6px;font-size:11px;color:#d97706;text-align:center">
                        High concentration — consider diversifying
                      </div>
                    ` : ''}
                  </div>
                `;
              }
            }

            const canvasRect = chart.canvas.getBoundingClientRect();
            const containerRect = chart.canvas.parentNode.getBoundingClientRect();
            const x = tooltip.caretX;
            const y = tooltip.caretY;
            const tooltipWidth = 280;
            const leftOverflow = x + tooltipWidth > containerRect.width;

            tooltipEl.style.opacity = '1';
            tooltipEl.style.left = (leftOverflow ? x - tooltipWidth - 10 : x + 12) + 'px';
            tooltipEl.style.top = Math.max(0, y - 20) + 'px';
          },
        },
        datalabels: {
          display: (ctx: any) => {
            const value = ctx.dataset.data[ctx.dataIndex];
            const pct = totalPresentValue > 0 ? (value / totalPresentValue) * 100 : 0;
            return pct >= 12;
          },
          color: "#ffffff",
          font: { size: 11, weight: 'bold' },
          formatter: (value: number) => {
            const pct = totalPresentValue > 0 ? ((value / totalPresentValue) * 100).toFixed(0) : "0";
            return `${pct}%`;
          },
          anchor: "center",
          align: "center",
          textAlign: "center",
          textStrokeColor: "rgba(0,0,0,0.4)",
          textStrokeWidth: 2,
        },
      },
    };

    const totalPositions = data.reduce((s, d) => s + d.count, 0);

    const ChartContent = () => (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex justify-start items-center mb-3 flex-shrink-0">
          <div className="text-left">
            <p className="text-xs text-gray-500">Total present value</p>
            <p className="text-lg font-bold text-blue-600">
              {formatCurrency(totalPresentValue, currency)}
            </p>
            <p className="text-xs text-gray-400">{totalPositions} position{totalPositions !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
          {/* Polar chart — 3/5 width */}
          <div
            ref={chartRef}
            className={`${isExpanded ? "h-[52rem]" : "h-full min-h-[320px]"} lg:col-span-3 relative`}
            role="img"
            aria-label={`Investment portfolio distribution polar chart showing ${formatCurrency(
              totalPresentValue,
              currency
            )} total present value across investment types`}
          >
            <PolarArea
              key={`polar-${values.join("|")}-${radialScaleMax}`}
              data={chartData}
              options={chartOptions}
            />
          </div>

          {/* Legend — 2/5 width */}
          <div className="lg:col-span-2 flex flex-col min-h-0 gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-shrink-0">Type Breakdown</p>
            <div className="space-y-1.5 flex-1 overflow-y-auto min-h-0 pr-1">
              {legendData.map((d) => {
                const pct = totalPresentValue > 0 ? ((d.value / totalPresentValue) * 100) : 0;
                return (
                  <div key={d.name} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-gray-800 truncate">{d.name}</span>
                        <span className="text-xs font-bold text-gray-700 flex-shrink-0">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="text-xs text-gray-400">{d.count} position{d.count !== 1 ? 's' : ''}</span>
                        <span className="text-xs text-gray-500">{formatCurrency(d.value, currency)}</span>
                      </div>
                      {/* Mini progress bar */}
                      <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: d.color }}
                        />
                      </div>
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
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-5 h-[50rem] flex flex-col overflow-hidden" data-chart-type="investment-type-polar">
          <ChartControls
            chartRef={chartRef}
            isExpanded={isExpanded}
            onToggleExpanded={toggleExpanded}
            fileName="investment-type-polar-chart"
            csvData={csvData}
            csvFileName="investment-type-polar-data"
            title={`${title}${totalPositions > 0 ? ` • ${totalPositions} position${totalPositions !== 1 ? 's' : ''}` : ''}`}
            tooltipText="Distribution by investment type using present value (quantity × current price). Cost basis and P/L are in the investments table."
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
                    Distribution by type using present value (quantity × current price). Cost basis and gains are shown in the investments table.
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
      prev?.id !== next?.id ||
      prev?.type !== next?.type ||
      prev?.quantity !== next?.quantity ||
      prev?.purchasePrice !== next?.purchasePrice ||
      prev?.currentPrice !== next?.currentPrice ||
      prev?.name !== next?.name ||
      prev?.symbol !== next?.symbol
    ) {
      return false;
    }
  }
  
  return true;
};

export const InvestmentTypePolarChart = React.memo(InvestmentTypePolarChartComponent, arePropsEqual);

InvestmentTypePolarChart.displayName = "InvestmentTypePolarChart";


