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

const TYPE_DESCRIPTIONS: Record<string, string> = {
  STOCKS: "Equity investments in publicly traded companies. Offers potential for capital appreciation and dividends but carries market risk.",
  CRYPTO: "Digital assets and cryptocurrencies. High volatility investments with potential for significant gains or losses.",
  MUTUAL_FUNDS: "Professionally managed investment funds that pool money from multiple investors. Provides diversification across various assets.",
  BONDS: "Fixed-income securities representing loans to corporations or governments. Generally lower risk with steady income potential.",
  REAL_ESTATE: "Property investments including residential, commercial, or REITs. Provides potential rental income and capital appreciation.",
  GOLD: "Precious metal investments as a hedge against inflation and economic uncertainty. Traditional store of value.",
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

    const { data, totalInvested } = useMemo(() => {
      const typeToAgg = new Map<string, { 
        invested: number; 
        count: number; 
        amounts: number[];
        investments: Array<{name: string; amount: number; symbol?: string}>;
      }>();

      investments.forEach((inv) => {
        const key = inv.type || "OTHER";
        const invested = (Number(inv.quantity) || 0) * (Number(inv.purchasePrice) || 0);
        const prev = typeToAgg.get(key) || { invested: 0, count: 0, amounts: [], investments: [] };
        
        typeToAgg.set(key, { 
          invested: prev.invested + invested, 
          count: prev.count + 1,
          amounts: [...prev.amounts, invested],
          investments: [...prev.investments, {
            name: inv.name || 'Unnamed Investment',
            amount: invested,
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

      const finalData: TypeDatum[] = [...major];
      if (minor.length) {
        const minorInvestments = minor.flatMap(m => m.investments);
        const minorAmounts = minor.flatMap(m => m.investments.map(inv => inv.amount));
        const minorTotal = minor.reduce((s, e) => s + e.value, 0);
        const minorCount = minor.reduce((s, e) => s + e.count, 0);
        
        finalData.push({
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

    // Enhanced CSV data preparation with detailed statistics
    const csvData = useMemo(() => {
      const csvDataArray = [
        ["Investment Type", "Invested Amount", "Percentage", "Positions", "Average per Position", "Min Amount", "Max Amount", "Risk Level", "Description"],
        ...data.map((d) => {
          const riskLevel = d.name === 'Cryptocurrency' ? 'High Risk' :
                           d.name === 'Stocks' ? 'Medium-High Risk' :
                           d.name === 'Mutual Funds' ? 'Medium Risk' :
                           d.name === 'Bonds' ? 'Low-Medium Risk' :
                           d.name === 'Fixed Deposit' || d.name === 'Emergency Fund' ? 'Low Risk' :
                           'Variable Risk';
          
          return [
            d.name,
            d.value.toString(),
            totalInvested > 0 ? ((d.value / totalInvested) * 100).toFixed(1) + "%" : "0.0%",
            d.count.toString(),
            d.averageAmount.toFixed(2),
            d.minAmount.toFixed(2),
            d.maxAmount.toFixed(2),
            riskLevel,
            d.description
          ];
        }),
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
          const invested = (Number(inv.quantity) || 0) * (Number(inv.purchasePrice) || 0);
          const prev = allTypes.get(key) || { invested: 0, count: 0, amounts: [] };
          allTypes.set(key, { 
            invested: prev.invested + invested, 
            count: prev.count + 1,
            amounts: [...prev.amounts, invested]
          });
        });

        Array.from(allTypes.entries())
          .map(([type, agg]) => {
            const averageAmount = agg.count > 0 ? agg.invested / agg.count : 0;
            const minAmount = agg.amounts.length > 0 ? Math.min(...agg.amounts) : 0;
            const maxAmount = agg.amounts.length > 0 ? Math.max(...agg.amounts) : 0;
            const riskLevel = type === 'CRYPTO' ? 'High Risk' :
                             type === 'STOCKS' ? 'Medium-High Risk' :
                             type === 'MUTUAL_FUNDS' ? 'Medium Risk' :
                             type === 'BONDS' ? 'Low-Medium Risk' :
                             type === 'FIXED_DEPOSIT' || type === 'EMERGENCY_FUND' ? 'Low Risk' :
                             'Variable Risk';
            
            return {
              name: TYPE_LABELS[type] || type,
              value: agg.invested,
              count: agg.count,
              averageAmount,
              minAmount,
              maxAmount,
              riskLevel,
              description: TYPE_DESCRIPTIONS[type] || "Investment category with various financial instruments."
            };
          })
          .sort((a, b) => b.value - a.value)
          .forEach(item => {
            const percentage = totalInvested > 0 ? ((item.value / totalInvested) * 100).toFixed(1) + '%' : '0.0%';
            csvDataArray.push([
              item.name, 
              item.value.toString(), 
              percentage, 
              item.count.toString(),
              item.averageAmount.toFixed(2),
              item.minAmount.toFixed(2),
              item.maxAmount.toFixed(2),
              item.riskLevel,
              item.description
            ]);
          });
      }

      return csvDataArray;
    }, [data, totalInvested, investments]);

    if (!data.length) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8" data-chart-type="investment-type-polar">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <PieChart className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
          </div>
          
          <div className="text-center py-12">
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
          enabled: false, // Disable default tooltip
          external: (context: any) => {
            // Custom HTML tooltip
            const { chart, tooltip } = context;
            
            // Get or create tooltip element
            let tooltipEl = chart.canvas.parentNode.querySelector('#chartjs-tooltip');
            if (!tooltipEl) {
              tooltipEl = document.createElement('div');
              tooltipEl.id = 'chartjs-tooltip';
              tooltipEl.style.position = 'absolute';
              tooltipEl.style.pointerEvents = 'none';
              tooltipEl.style.zIndex = '1000';
              chart.canvas.parentNode.appendChild(tooltipEl);
            }

            // Hide if no tooltip
            if (tooltip.opacity === 0) {
              tooltipEl.style.opacity = '0';
              return;
            }

            // Get the data for this tooltip
            if (tooltip.dataPoints && tooltip.dataPoints.length > 0) {
              const dataPoint = tooltip.dataPoints[0];
              const labelName = dataPoint.label;
              const item = data.find((d) => d.name === labelName);
              
              if (item) {
                const riskLevel = item.name === 'Cryptocurrency' ? 'High Risk' :
                               item.name === 'Stocks' ? 'Medium-High Risk' :
                               item.name === 'Mutual Funds' ? 'Medium Risk' :
                               item.name === 'Bonds' ? 'Low-Medium Risk' :
                               item.name === 'Fixed Deposit' || item.name === 'Emergency Fund' ? 'Low Risk' :
                               'Variable Risk';

                const riskColor = riskLevel.includes('High') ? 'text-red-600' :
                                riskLevel.includes('Medium') ? 'text-yellow-600' : 'text-green-600';

                tooltipEl.innerHTML = `
                  <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80 max-w-md">
                    <div class="font-bold text-gray-900 mb-3 text-base">${item.name}</div>
                    
                    <!-- Main Amount -->
                    <div class="flex items-center justify-between mb-3">
                      <span class="font-medium text-gray-700">Total Invested:</span>
                      <span class="font-bold text-lg text-blue-600">
                        ${formatCurrency(item.value, currency)}
                      </span>
                    </div>

                    <!-- Portfolio Statistics -->
                    <div class="space-y-2 mb-3 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600">Portfolio Share:</span>
                        <span class="font-medium">${item.percentageOfTotal.toFixed(1)}%</span>
                      </div>
                      
                      <div class="flex justify-between">
                        <span class="text-gray-600">Number of Positions:</span>
                        <span class="font-medium">${item.count}</span>
                      </div>
                      
                      ${item.count > 0 ? `
                        <div class="flex justify-between">
                          <span class="text-gray-600">Average per Position:</span>
                          <span class="font-medium">${formatCurrency(item.averageAmount, currency)}</span>
                        </div>
                        
                        ${item.count > 1 ? `
                          <div class="flex justify-between">
                            <span class="text-gray-600">Range:</span>
                            <span class="font-medium">
                              ${formatCurrency(item.minAmount, currency)} - ${formatCurrency(item.maxAmount, currency)}
                            </span>
                          </div>
                        ` : ''}
                      ` : ''}
                    </div>

                    <!-- Risk Assessment -->
                    <div class="border-t border-gray-200 pt-3 mb-3">
                      <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Risk Level:</span>
                        <span class="font-medium ${riskColor}">${riskLevel}</span>
                      </div>
                    </div>

                    <!-- Top Investments Preview -->
                    ${item.investments.length > 0 ? `
                      <div class="border-t border-gray-200 pt-3 mb-3">
                        <div class="text-xs text-gray-600 mb-2">
                          ${item.investments.length > 3 ? 'Top 3 Investments:' : 'Investments:'}
                        </div>
                        <div class="space-y-1">
                          ${item.investments.slice(0, 3).map(investment => `
                            <div class="flex justify-between text-xs">
                              <span class="text-gray-600 truncate max-w-32">
                                ${investment.name}${investment.symbol ? ` (${investment.symbol})` : ''}
                              </span>
                              <span class="font-medium ml-2">
                                ${formatCurrency(investment.amount, currency)}
                              </span>
                            </div>
                          `).join('')}
                          ${item.investments.length > 3 ? `
                            <div class="text-xs text-gray-400 text-center pt-1">
                              +${item.investments.length - 3} more position${item.investments.length - 3 !== 1 ? 's' : ''}
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    ` : ''}

                    <!-- Description -->
                    <div class="border-t border-gray-200 pt-3">
                      <div class="text-xs text-gray-600 leading-relaxed">
                        <div class="font-medium text-gray-700 mb-1">About this investment type:</div>
                        ${item.description}
                      </div>
                    </div>

                    <!-- Action Context -->
                    ${item.percentageOfTotal > 50 ? `
                      <div class="border-t border-gray-200 pt-2 mt-2">
                        <div class="text-xs text-orange-600 text-center">
                          ⚠️ High concentration - Consider diversification
                        </div>
                      </div>
                    ` : item.percentageOfTotal < 5 && item.name !== 'Others' ? `
                      <div class="border-t border-gray-200 pt-2 mt-2">
                        <div class="text-xs text-blue-600 text-center">
                          💡 Small allocation - Consider increasing if aligned with goals
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }
            }

            // Position tooltip
            const position = chart.canvas.getBoundingClientRect();
            tooltipEl.style.opacity = '1';
            tooltipEl.style.left = position.left + window.pageXOffset + tooltip.caretX + 'px';
            tooltipEl.style.top = position.top + window.pageYOffset + tooltip.caretY + 'px';
          }
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
            title={`${title}${data.reduce((s, d) => s + d.count, 0) > 0 ? ` • ${data.reduce((s, d) => s + d.count, 0)} position${data.reduce((s, d) => s + d.count, 0) !== 1 ? 's' : ''}` : ''}`}
            tooltipText="Distribution of your portfolio across investment types with detailed statistics including position counts, averages, ranges, risk assessments, and investment insights. Hover over segments for comprehensive portfolio analytics."
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
      prev?.id !== next?.id ||
      prev?.type !== next?.type ||
      prev?.quantity !== next?.quantity ||
      prev?.purchasePrice !== next?.purchasePrice ||
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


