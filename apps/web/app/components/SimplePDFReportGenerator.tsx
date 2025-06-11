"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, Loader2 } from "lucide-react";
import { Income, Expense } from "../types/financial";
import { useCurrency } from "../providers/CurrencyProvider";
// @ts-ignore
import html2canvas from "html2canvas";

interface SimplePDFReportGeneratorProps {
    incomes: Income[];
    expenses: Expense[];
    startDate: string;
    endDate: string;
}

export function SimplePDFReportGenerator({ 
    incomes, 
    expenses, 
    startDate, 
    endDate 
}: SimplePDFReportGeneratorProps) {
    const { data: session } = useSession();
    const { currency } = useCurrency();
    const [isGenerating, setIsGenerating] = useState(false);

    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netIncome = totalIncome - totalExpenses;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getDateRangeText = () => {
        if (!startDate && !endDate) return 'All Time';
        if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`;
        if (startDate) return `From ${formatDate(startDate)}`;
        if (endDate) return `Until ${formatDate(endDate)}`;
        return 'All Time';
    };

    const captureChartElement = async (selector: string): Promise<string | null> => {
        try {
            const element = document.querySelector(selector);
            if (!element) {
                console.warn(`Chart element not found: ${selector}`);
                return null;
            }
            
            const canvas = await html2canvas(element as HTMLElement, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true,
                logging: false,
                height: element.clientHeight,
                width: element.clientWidth,
            });
            
            return canvas.toDataURL('image/png', 0.95);
        } catch (error) {
            console.error('Error capturing chart:', error);
            return null;
        }
    };

    const generateReport = async () => {
        setIsGenerating(true);
        
        try {
            // Capture charts first
            console.log('Capturing charts...');
            const chartCaptures = await Promise.all([
                captureChartElement('[data-chart-type="waterfall"]'),
                captureChartElement('[data-chart-type="monthly-trend"]'),
                captureChartElement('[data-chart-type="expense-pie"]'),
                captureChartElement('[data-chart-type="income-pie"]'),
                captureChartElement('[data-chart-type="expense-trend"]'),
                captureChartElement('[data-chart-type="income-trend"]')
            ]);

            const [waterfallChart, monthlyTrendChart, expensePieChart, incomePieChart, expenseTrendChart, incomeTrendChart] = chartCaptures;
            
            // Calculate expense categories
            const expenseCategories = expenses.reduce((acc, expense) => {
                const categoryName = expense.category.name;
                acc[categoryName] = (acc[categoryName] || 0) + expense.amount;
                return acc;
            }, {} as Record<string, number>);

            // Calculate income categories
            const incomeCategories = incomes.reduce((acc, income) => {
                const categoryName = income.category.name;
                acc[categoryName] = (acc[categoryName] || 0) + income.amount;
                return acc;
            }, {} as Record<string, number>);

            // Sort categories by amount
            const sortedExpenseCategories = Object.entries(expenseCategories)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);

            const sortedIncomeCategories = Object.entries(incomeCategories)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);

            // Generate HTML content for the report
            const reportHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Financial Report</title>
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                            margin: 40px; 
                            color: #1f2937;
                            line-height: 1.6;
                        }
                        .header { 
                            border-bottom: 3px solid #3b82f6; 
                            padding-bottom: 20px; 
                            margin-bottom: 30px; 
                        }
                        .title { 
                            font-size: 32px; 
                            font-weight: bold; 
                            color: #1f2937; 
                            margin: 0;
                        }
                        .subtitle { 
                            color: #6b7280; 
                            margin: 10px 0; 
                        }
                        .summary-box { 
                            background: #f9fafb; 
                            border: 1px solid #e5e7eb; 
                            border-radius: 8px; 
                            padding: 25px; 
                            margin: 25px 0; 
                        }
                        .summary-title { 
                            font-size: 24px; 
                            font-weight: bold; 
                            margin-bottom: 20px;
                            color: #1f2937;
                        }
                        .metric { 
                            margin: 12px 0; 
                            font-size: 18px; 
                        }
                        .metric-label { 
                            font-weight: 600; 
                        }
                        .income { color: #10b981; }
                        .expense { color: #ef4444; }
                        .savings { color: #3b82f6; }
                        .loss { color: #f59e0b; }
                        .section-title { 
                            font-size: 20px; 
                            font-weight: bold; 
                            margin: 30px 0 20px 0;
                            color: #1f2937;
                            border-bottom: 2px solid #e5e7eb;
                            padding-bottom: 10px;
                        }
                        .category-list { 
                            margin: 15px 0; 
                        }
                        .category-item { 
                            display: flex; 
                            justify-content: space-between; 
                            margin: 8px 0; 
                            padding: 10px;
                            background: #ffffff;
                            border: 1px solid #e5e7eb;
                            border-radius: 6px;
                        }
                        .category-name { 
                            font-weight: 500; 
                        }
                                                 .category-amount { 
                             font-weight: 600; 
                         }
                         .chart-section { 
                             margin: 40px 0; 
                             page-break-inside: avoid;
                         }
                         .chart-title { 
                             font-size: 18px; 
                             font-weight: bold; 
                             margin-bottom: 15px;
                             color: #1f2937;
                         }
                         .chart-image { 
                             max-width: 100%; 
                             height: auto; 
                             border: 1px solid #e5e7eb;
                             border-radius: 8px;
                             margin: 10px 0;
                         }
                         .chart-placeholder {
                             background: #f3f4f6;
                             border: 2px dashed #d1d5db;
                             border-radius: 8px;
                             padding: 40px;
                             text-align: center;
                             color: #6b7280;
                             margin: 10px 0;
                         }
                         .footer { 
                             margin-top: 50px; 
                             padding-top: 20px; 
                             border-top: 1px solid #e5e7eb; 
                             text-align: center; 
                             color: #6b7280; 
                             font-size: 12px;
                         }
                         @media print {
                             body { margin: 20px; }
                             .summary-box, .chart-section { page-break-inside: avoid; }
                         }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 class="title">Financial Report</h1>
                        <div class="subtitle">Prepared for: ${session?.user?.name || 'User'}</div>
                        <div class="subtitle">Report Period: ${getDateRangeText()}</div>
                        <div class="subtitle">Generated on: ${new Date().toLocaleDateString()}</div>
                    </div>

                    <div class="summary-box">
                        <div class="summary-title">Executive Summary</div>
                        <div class="metric">
                            <span class="metric-label">Total Income:</span> 
                            <span class="income">${formatCurrency(totalIncome)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Total Expenses:</span> 
                            <span class="expense">${formatCurrency(totalExpenses)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Net Income:</span> 
                            <span class="${netIncome >= 0 ? 'savings' : 'loss'}">${formatCurrency(netIncome)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Savings Rate:</span> 
                            <span class="${netIncome >= 0 ? 'savings' : 'loss'}">${totalIncome > 0 ? ((netIncome / totalIncome) * 100).toFixed(1) : '0.0'}%</span>
                        </div>
                    </div>

                    <div class="section-title">Top Expense Categories</div>
                    <div class="category-list">
                        ${sortedExpenseCategories.map(([category, amount]) => `
                            <div class="category-item">
                                <span class="category-name">${category}</span>
                                <div>
                                    <span class="category-amount expense">${formatCurrency(amount)}</span>
                                    <span style="color: #6b7280; margin-left: 10px;">
                                        (${totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0.0'}%)
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                                         <div class="section-title">Top Income Categories</div>
                     <div class="category-list">
                         ${sortedIncomeCategories.map(([category, amount]) => `
                             <div class="category-item">
                                 <span class="category-name">${category}</span>
                                 <div>
                                     <span class="category-amount income">${formatCurrency(amount)}</span>
                                     <span style="color: #6b7280; margin-left: 10px;">
                                         (${totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : '0.0'}%)
                                     </span>
                                 </div>
                             </div>
                         `).join('')}
                     </div>

                     <!-- Financial Overview Chart -->
                     <div class="chart-section">
                         <div class="chart-title">Financial Overview</div>
                         ${waterfallChart ? 
                             `<img src="${waterfallChart}" alt="Financial Waterfall Chart" class="chart-image" />` :
                             `<div class="chart-placeholder">Financial Overview chart could not be captured</div>`
                         }
                     </div>

                     <!-- Monthly Trend Chart -->
                     <div class="chart-section">
                         <div class="chart-title">Monthly Trends</div>
                         ${monthlyTrendChart ? 
                             `<img src="${monthlyTrendChart}" alt="Monthly Trend Chart" class="chart-image" />` :
                             `<div class="chart-placeholder">Monthly trend chart could not be captured</div>`
                         }
                     </div>

                     <!-- Expense Distribution Chart -->
                     <div class="chart-section">
                         <div class="chart-title">Expense Distribution</div>
                         ${expensePieChart ? 
                             `<img src="${expensePieChart}" alt="Expense Distribution Chart" class="chart-image" />` :
                             `<div class="chart-placeholder">Expense distribution chart could not be captured</div>`
                         }
                     </div>

                     <!-- Income Distribution Chart -->
                     <div class="chart-section">
                         <div class="chart-title">Income Distribution</div>
                         ${incomePieChart ? 
                             `<img src="${incomePieChart}" alt="Income Distribution Chart" class="chart-image" />` :
                             `<div class="chart-placeholder">Income distribution chart could not be captured</div>`
                         }
                     </div>

                     <!-- Expense Trend Chart -->
                     <div class="chart-section">
                         <div class="chart-title">Expense Category Trends</div>
                         ${expenseTrendChart ? 
                             `<img src="${expenseTrendChart}" alt="Expense Trend Chart" class="chart-image" />` :
                             `<div class="chart-placeholder">Expense trend chart could not be captured</div>`
                         }
                     </div>

                     <!-- Income Trend Chart -->
                     <div class="chart-section">
                         <div class="chart-title">Income Category Trends</div>
                         ${incomeTrendChart ? 
                             `<img src="${incomeTrendChart}" alt="Income Trend Chart" class="chart-image" />` :
                             `<div class="chart-placeholder">Income trend chart could not be captured</div>`
                         }
                     </div>

                    <div class="footer">
                        <div>Generated by Financial Dashboard</div>
                        <div>Report contains data for ${incomes.length + expenses.length} transactions</div>
                    </div>
                </body>
                </html>
            `;

            // Create and trigger download
            const blob = new Blob([reportHTML], { type: 'text/html' });
            const link = document.createElement('a');
            const dateRange = getDateRangeText();
            const fileName = `financial-report-${dateRange.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.html`;
            
            link.download = fileName;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <button
                onClick={generateReport}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating Report...
                    </>
                ) : (
                    <>
                        <FileText size={18} />
                        Generate Report
                    </>
                )}
            </button>
        </div>
    );
} 