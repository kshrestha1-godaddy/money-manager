"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { formatCurrency } from "../../../utils/currency";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { useChartAnimationState } from "../../../hooks/useChartAnimationContext";
import { loadGoogleCharts } from "../../../utils/googleCharts";

interface CashFlowSankeyChartProps {
    currency?: string;
    title?: string;
    heightClass?: string;
}

interface SankeyFlowData {
    from: string;
    to: string;
    size: number;
    count: number;
    average: number;
    percentage: number;
    type: 'income' | 'expense' | 'savings' | 'flow';
    subCategories?: Array<{
        name: string;
        amount: number;
        count: number;
        percentage: number;
    }>;
}

interface CategoryFlowStats {
    totalAmount: number;
    count: number;
    average: number;
    percentage: number;
    type: 'income' | 'expense';
}

export const CashFlowSankeyChart = React.memo<CashFlowSankeyChartProps>(({ 
    currency = "USD", 
    title, 
    heightClass 
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const { filteredIncomes, filteredExpenses, totals, formatTimePeriod } = useChartData();
    
    // Animation control
    const chartId = "cash-flow-sankey";
    const { hasAnimated } = useChartAnimationState(chartId);
    
    // Simple minimal color palette
    const getMinimalColor = useMemo(() => {
        return (type: 'income' | 'expense' | 'savings' | 'central') => {
            switch (type) {
                case 'income':
                    return '#10b981'; // emerald-500 - consistent green for all income
                case 'expense':
                    return '#6b7280'; // gray-500 - consistent gray for all expenses
                case 'savings':
                    return '#8b5cf6'; // violet-500 - consistent purple for savings
                case 'central':
                    return '#e2e8f0'; // slate-200 - light gray for central node
                default:
                    return '#6b7280'; // gray-500 fallback
            }
        };
    }, []);

    // Process data for cash flow visualization
    const { sankeyData, csvData, flowSummary } = useMemo(() => {
        const incomeCategories = new Map<string, CategoryFlowStats>();
        const expenseCategories = new Map<string, CategoryFlowStats>();
        
        // Process income categories
        filteredIncomes.forEach(income => {
            const categoryName = income.category?.name || 'Unknown Income';
            const convertedAmount = convertForDisplaySync(income.amount, income.currency, currency || 'USD');
            
            if (!incomeCategories.has(categoryName)) {
                incomeCategories.set(categoryName, {
                    totalAmount: 0,
                    count: 0,
                    average: 0,
                    percentage: 0,
                    type: 'income'
                });
            }
            
            const stats = incomeCategories.get(categoryName)!;
            stats.totalAmount += convertedAmount;
            stats.count += 1;
        });

        // Process expense categories
        filteredExpenses.forEach(expense => {
            const categoryName = expense.category?.name || 'Unknown Expense';
            const convertedAmount = convertForDisplaySync(expense.amount, expense.currency, currency || 'USD');
            
            if (!expenseCategories.has(categoryName)) {
                expenseCategories.set(categoryName, {
                    totalAmount: 0,
                    count: 0,
                    average: 0,
                    percentage: 0,
                    type: 'expense'
                });
            }
            
            const stats = expenseCategories.get(categoryName)!;
            stats.totalAmount += convertedAmount;
            stats.count += 1;
        });

        // Calculate averages and percentages
        incomeCategories.forEach((stats, categoryName) => {
            stats.average = stats.totalAmount / stats.count;
            stats.percentage = totals.income > 0 ? (stats.totalAmount / totals.income) * 100 : 0;
        });

        expenseCategories.forEach((stats, categoryName) => {
            stats.average = stats.totalAmount / stats.count;
            stats.percentage = totals.expenses > 0 ? (stats.totalAmount / totals.expenses) * 100 : 0;
        });

        // Create Sankey flow data
        const flows: SankeyFlowData[] = [];
        
        // Income flows directly to central node (no "System" label)
        const sortedIncomeCategories = Array.from(incomeCategories.entries())
            .sort(([,a], [,b]) => b.totalAmount - a.totalAmount);
        
        const significantIncomeCategories: Array<[string, CategoryFlowStats]> = [];
        const minorIncomeCategories: Array<[string, CategoryFlowStats]> = [];
        
        sortedIncomeCategories.forEach(([categoryName, stats]) => {
            if (stats.percentage >= 5) {
                significantIncomeCategories.push([categoryName, stats]);
            } else {
                minorIncomeCategories.push([categoryName, stats]);
            }
        });
        
        // Add significant income categories
        significantIncomeCategories.forEach(([categoryName, stats]) => {
            flows.push({
                from: `${categoryName} | ${formatCurrency(stats.totalAmount, currency || 'USD')} [${stats.percentage.toFixed(1)}%]`,
                to: "Available Funds",
                size: stats.totalAmount,
                count: stats.count,
                average: stats.average,
                percentage: stats.percentage,
                type: 'income'
            });
        });
        
        // Combine minor income categories into "Others"
        if (minorIncomeCategories.length > 0) {
            const othersIncomeTotal = minorIncomeCategories.reduce((sum, [, stats]) => sum + stats.totalAmount, 0);
            const othersIncomeCount = minorIncomeCategories.reduce((sum, [, stats]) => sum + stats.count, 0);
            const othersIncomePercentage = totals.income > 0 ? (othersIncomeTotal / totals.income) * 100 : 0;
            
            flows.push({
                from: `Others (Income) | ${formatCurrency(othersIncomeTotal, currency || 'USD')} [${othersIncomePercentage.toFixed(1)}%]`,
                to: "Available Funds",
                size: othersIncomeTotal,
                count: othersIncomeCount,
                average: othersIncomeTotal / othersIncomeCount,
                percentage: othersIncomePercentage,
                type: 'income',
                subCategories: minorIncomeCategories
                    .filter(([, stats]) => stats.totalAmount > 0)
                    .map(([name, stats]) => ({
                        name,
                        amount: stats.totalAmount,
                        count: stats.count,
                        percentage: stats.percentage
                    }))
            });
        }

        // Central node to expense categories
        const sortedExpenseCategories = Array.from(expenseCategories.entries())
            .sort(([,a], [,b]) => b.totalAmount - a.totalAmount);
        
        const significantExpenseCategories: Array<[string, CategoryFlowStats]> = [];
        const minorExpenseCategories: Array<[string, CategoryFlowStats]> = [];
        
        sortedExpenseCategories.forEach(([categoryName, stats]) => {
            if (stats.percentage >= 5) {
                significantExpenseCategories.push([categoryName, stats]);
            } else {
                minorExpenseCategories.push([categoryName, stats]);
            }
        });
        
        // Add significant expense categories
        significantExpenseCategories.forEach(([categoryName, stats]) => {
            flows.push({
                from: "Available Funds",
                to: `${categoryName} | ${formatCurrency(stats.totalAmount, currency || 'USD')} [${stats.percentage.toFixed(1)}%]`,
                size: stats.totalAmount,
                count: stats.count,
                average: stats.average,
                percentage: stats.percentage,
                type: 'expense'
            });
        });
        
        // Combine minor expense categories into "Others"
        if (minorExpenseCategories.length > 0) {
            const othersExpenseTotal = minorExpenseCategories.reduce((sum, [, stats]) => sum + stats.totalAmount, 0);
            const othersExpenseCount = minorExpenseCategories.reduce((sum, [, stats]) => sum + stats.count, 0);
            const othersExpensePercentage = totals.expenses > 0 ? (othersExpenseTotal / totals.expenses) * 100 : 0;
            
            flows.push({
                from: "Available Funds",
                to: `Others (Expense) | ${formatCurrency(othersExpenseTotal, currency || 'USD')} [${othersExpensePercentage.toFixed(1)}%]`,
                size: othersExpenseTotal,
                count: othersExpenseCount,
                average: othersExpenseTotal / othersExpenseCount,
                percentage: othersExpensePercentage,
                type: 'expense',
                subCategories: minorExpenseCategories
                    .filter(([, stats]) => stats.totalAmount > 0)
                    .map(([name, stats]) => ({
                        name,
                        amount: stats.totalAmount,
                        count: stats.count,
                        percentage: stats.percentage
                    }))
            });
        }

        // Central node to "Net Savings" (if positive)
        if (totals.savings > 0) {
            const savingsPercentage = totals.income > 0 ? (totals.savings / totals.income) * 100 : 0;
            flows.push({
                from: "Available Funds",
                to: `Net Savings | ${formatCurrency(totals.savings, currency || 'USD')} [${savingsPercentage.toFixed(1)}%]`,
                size: totals.savings,
                count: 1,
                average: totals.savings,
                percentage: savingsPercentage,
                type: 'savings'
            });
        }

        // Prepare CSV data
        const csvRows: (string | number)[][] = [
            ['Flow Type', 'From', 'To', 'Amount', 'Percentage', 'Transactions', 'Average Amount', 'Sub-Categories']
        ];
        
        flows.forEach((flow) => {
            const baseRow = [
                flow.type.charAt(0).toUpperCase() + flow.type.slice(1),
                flow.from.replace(/ \| .* \[[\d.]+%\]$/, '').replace(/ \(\d+x\)$/, ''),
                flow.to.replace(/ \| .* \[[\d.]+%\]$/, '').replace(/ \(\d+x\)$/, ''),
                flow.size.toString(),
                flow.percentage.toFixed(1) + '%',
                flow.count.toString(),
                flow.average.toFixed(2),
                flow.subCategories ? 
                    flow.subCategories.map(sub => `${sub.name}: ${formatCurrency(sub.amount, currency || 'USD')} (${sub.percentage.toFixed(1)}%)`).join('; ') 
                    : ''
            ];
            csvRows.push(baseRow);
        });
        
        const csvData = csvRows;

        const flowSummary = {
            totalIncome: totals.income,
            totalExpenses: totals.expenses,
            netSavings: totals.savings,
            savingsRate: totals.income > 0 ? (totals.savings / totals.income) * 100 : 0,
            incomeCategories: incomeCategories.size,
            expenseCategories: expenseCategories.size,
            totalTransactions: filteredIncomes.length + filteredExpenses.length
        };

        return { sankeyData: flows, csvData, flowSummary };
    }, [
        filteredIncomes.length,
        filteredExpenses.length,
        currency,
        totals.income,
        totals.expenses,
        totals.savings,
        // Add checksums to detect actual data changes
        filteredIncomes.reduce((sum, income) => sum + income.amount + income.id, 0),
        filteredExpenses.reduce((sum, expense) => sum + expense.amount + expense.id, 0)
    ]);

    // Google Charts rendering
    useEffect(() => {
        if (sankeyData.length === 0 || !chartRef.current) return;

        let isMounted = true;
        let currentChart: any = null;

        const drawChart = () => {
            if (!chartRef.current || !isMounted || !window.google?.visualization) return;

            try {
                const container = chartRef.current;
                
                // Wait for container to be properly sized
                const containerRect = container.getBoundingClientRect();
                if (containerRect.width === 0 || containerRect.height === 0) {
                    setTimeout(() => {
                        if (isMounted) drawChart();
                    }, 100);
                    return;
                }

                const width = Math.max(Math.floor(containerRect.width) || 800, 600);
                const height = undefined;

                // Validate data
                const validData = sankeyData.filter(item => {
                    return item.size && !isNaN(item.size) && item.size > 0 && item.from && item.to;
                });

                if (validData.length === 0) {
                    console.log('No valid data for cash flow chart');
                    return;
                }

                // Clear container
                container.innerHTML = '';

                // Create data table
                const data = new window.google.visualization.DataTable();
                data.addColumn('string', 'From');
                data.addColumn('string', 'To');
                data.addColumn('number', 'Weight');
                data.addColumn({type: 'string', role: 'tooltip', p: {html: true}});

                // Create node colors based on flow percentages
                const nodeColors: string[] = [];
                const nodeNames = new Set<string>();
                
                // Collect all unique node names and their flow data
                validData.forEach(item => {
                    nodeNames.add(item.from);
                    nodeNames.add(item.to);
                });
                
                // Create color mapping for each node
                const nodeColorMap = new Map<string, string>();
                
                validData.forEach(item => {
                    // Assign simple colors based on flow type
                    if (item.type === 'income') {
                        nodeColorMap.set(item.from, getMinimalColor('income'));
                    } else if (item.type === 'expense') {
                        nodeColorMap.set(item.to, getMinimalColor('expense'));
                    } else if (item.type === 'savings') {
                        nodeColorMap.set(item.to, getMinimalColor('savings'));
                    }
                });
                
                // Set central node color
                nodeColorMap.set('Available Funds', getMinimalColor('central'));
                
                // Convert to array format expected by Google Charts
                Array.from(nodeNames).forEach(nodeName => {
                    nodeColors.push(nodeColorMap.get(nodeName) || '#6b7280');
                });

                // Add rows with enhanced tooltips
                const rows = validData.map((item) => {
                    const validSize = Math.max(item.size, 0.01);
                    
                    // Create detailed HTML tooltip
                    const formattedAmount = formatCurrency(item.size, currency || 'USD');
                    const formattedAverage = formatCurrency(item.average, currency || 'USD');
                    
                    const getFlowTypeColor = (type: string) => {
                        switch (type) {
                            case 'income': return getMinimalColor('income');
                            case 'expense': return getMinimalColor('expense');
                            case 'savings': return getMinimalColor('savings');
                            case 'flow': return getMinimalColor('central');
                            default: return '#374151';
                        }
                    };

                    const getFlowTypeLabel = (type: string) => {
                        switch (type) {
                            case 'income': return 'Income Source';
                            case 'expense': return 'Expense Category';
                            case 'savings': return 'Net Savings';
                            case 'flow': return 'Cash Flow';
                            default: return 'Transaction';
                        }
                    };

                    // Clean up labels for tooltip display
                    const cleanFromLabel = item.from.replace(/ \| .* \[[\d.]+%\]$/, '').replace(/ \(\d+x\)$/, '');
                    const cleanToLabel = item.to.replace(/ \| .* \[[\d.]+%\]$/, '').replace(/ \(\d+x\)$/, '');
                    
                    // Generate subcategories breakdown for "Others" flows
                    const subCategoriesHtml = item.subCategories ? `
                        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
                            <div style="font-weight: 600; margin-bottom: 4px; color: #374151; font-size: 12px;">Breakdown:</div>
                            ${item.subCategories.map(sub => `
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; padding: 2px 4px; background: #f8fafc; border-radius: 3px;">
                                    <span style="color: #6b7280; font-size: 11px; font-weight: 500;">${sub.name}</span>
                                    <div style="text-align: right;">
                                        <div style="font-weight: 600; color: ${getFlowTypeColor(item.type)}; font-size: 11px;">${formatCurrency(sub.amount, currency || 'USD')}</div>
                                        <div style="color: #9ca3af; font-size: 9px;">${sub.percentage.toFixed(1)}% • ${sub.count}tx</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '';

                    const tooltip = `<div style="padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; border-radius: 6px; box-shadow: 0 3px 8px rgba(0,0,0,0.12); border: 1px solid #e5e7eb; min-width: 240px; max-width: 320px;">
                        <div style="font-weight: 600; margin-bottom: 6px; color: #111827; font-size: 13px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px;">
                            ${cleanFromLabel} → ${cleanToLabel}
                        </div>
                        <div style="display: grid; gap: 3px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #6b7280; font-weight: 500; font-size: 11px;">Flow Type:</span>
                                <span style="font-weight: 600; color: ${getFlowTypeColor(item.type)}; font-size: 11px;">${getFlowTypeLabel(item.type)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #6b7280; font-weight: 500; font-size: 11px;">Amount:</span>
                                <span style="font-weight: 600; color: ${getFlowTypeColor(item.type)}; font-size: 12px;">${formattedAmount}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #6b7280; font-weight: 500; font-size: 11px;">Percentage • Transactions:</span>
                                <span style="font-weight: 600; color: #374151; font-size: 11px;">${item.percentage.toFixed(1)}% • ${item.count}tx</span>
                            </div>
                            ${item.count > 1 ? `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #6b7280; font-weight: 500; font-size: 11px;">Average:</span>
                                <span style="font-weight: 600; color: #374151; font-size: 11px;">${formattedAverage}</span>
                            </div>
                            ` : ''}
                        </div>
                        ${subCategoriesHtml}
                    </div>`;
                    
                    return [item.from, item.to, validSize, tooltip];
                });

                data.addRows(rows);

                // Chart options
                const options = {
                    width: width,
                    height: height,
                    tooltip: {
                        isHtml: true,
                        textStyle: {
                            fontName: 'Arial',
                            fontSize: 11,
                            padding: 10
                        }
                    },
                    sankey: {
                        node: {
                            colors: nodeColors,
                            label: {
                                fontName: 'Arial',
                                fontSize: 14,
                                color: '#333'
                            },
                            width: 12,
                            nodePadding: 15
                        },
                        link: {
                            colorMode: 'source',
                        },
                        iterations: 64
                    }
                };

                // Create and draw chart
                currentChart = new window.google.visualization.Sankey(container);
                currentChart.draw(data, options);
                
            } catch (error) {
                console.error('Error drawing Cash Flow Sankey chart:', error);
            }
        };

        const initChart = async () => {
            try {
                await loadGoogleCharts(['sankey']);
                if (!isMounted) return;

                setTimeout(() => {
                    if (isMounted) {
                        drawChart();
                    }
                }, 300);
            } catch (error) {
                console.error('Error initializing cash flow chart:', error);
            }
        };

        initChart();

        // Handle window resize
        const handleResize = () => {
            if (isMounted && chartRef.current && window.google?.visualization) {
                setTimeout(() => {
                    if (isMounted) {
                        drawChart();
                    }
                }, 300);
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            isMounted = false;
            window.removeEventListener('resize', handleResize);
            currentChart = null;
        };
    }, [sankeyData, currency, hasAnimated]);

    const timePeriodText = formatTimePeriod();
    const baseTitle = title || `Cash Flow Analysis ${timePeriodText}`;
    const chartTitle = flowSummary.totalTransactions > 0 
        ? `${baseTitle} • ${flowSummary.totalTransactions} transaction${flowSummary.totalTransactions !== 1 ? 's' : ''}`
        : baseTitle;
    
    const tooltipText = 'Comprehensive cash flow visualization showing how income flows through various categories to expenses and savings. Similar to an income statement, this shows the complete financial picture with detailed breakdowns.';

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-chart-type="cash-flow-sankey">
            <ChartControls
                title={chartTitle}
                tooltipText={tooltipText}
                csvData={csvData}
                csvFileName="cash-flow-analysis"
                chartRef={chartRef}
                showExpandButton={false}
            />
            
            {/* Summary Statistics */}
            {flowSummary.totalTransactions > 0 && (
                <div className="px-8 py-4 bg-gray-50 rounded-lg mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                            <div className="text-sm font-medium text-gray-500">Available Funds</div>
                            <div className="text-lg font-semibold" style={{ color: '#10b981' }}>
                                {formatCurrency(flowSummary.totalIncome, currency)}
                            </div>
                            <div className="text-xs text-gray-400">
                                from {flowSummary.incomeCategories} income sources
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-500">Total Expenses</div>
                            <div className="text-lg font-semibold" style={{ color: '#6b7280' }}>
                                {formatCurrency(flowSummary.totalExpenses, currency)}
                            </div>
                            <div className="text-xs text-gray-400">
                                across {flowSummary.expenseCategories} categories
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-500">Net Savings</div>
                            <div className="text-lg font-semibold" style={{ color: flowSummary.netSavings >= 0 ? '#8b5cf6' : '#6b7280' }}>
                                {formatCurrency(flowSummary.netSavings, currency)}
                            </div>
                            <div className="text-xs text-gray-400">
                                {flowSummary.savingsRate >= 0 ? '+' : ''}{flowSummary.savingsRate.toFixed(1)}% rate
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-500">Transactions</div>
                            <div className="text-lg font-semibold text-gray-600">
                                {flowSummary.totalTransactions}
                            </div>
                            <div className="text-xs text-gray-400">
                                total entries
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-8">
                {sankeyData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <h3 className="text-lg font-medium mb-2">No Cash Flow Data</h3>
                        <p className="text-sm text-center max-w-sm">
                            Add income and expense entries to see the complete cash flow visualization.
                        </p>
                    </div>
                ) : (
                    <div
                        ref={chartRef}
                        className={`w-full max-w-8xl mx-auto overflow-hidden ${heightClass ?? 'h-[32rem] sm:h-[40rem]'}`}
                        style={{
                            minWidth: '600px',
                            width: '100%',
                            display: 'block',
                            position: 'relative',
                            boxSizing: 'border-box'
                        }}
                    />
                )}
            </div>
        </div>
    );
});

CashFlowSankeyChart.displayName = 'CashFlowSankeyChart';