"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, Loader2 } from "lucide-react";
import { Transaction } from "../types/financial";
import { useCurrency } from "../providers/CurrencyProvider";
import { formatDate } from "../utils/date";
import { formatCurrency } from "../utils/currency";

interface TransactionPDFReportGeneratorProps {
    transactions: Transaction[];
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    filteredTransactionCount: number;
    searchTerm?: string;
    selectedType?: string;
    selectedCategory?: string;
    startDate?: string;
    endDate?: string;
}

export function TransactionPDFReportGenerator({ 
    transactions,
    totalIncome,
    totalExpenses,
    netAmount,
    filteredTransactionCount,
    searchTerm = "",
    selectedType = "ALL",
    selectedCategory = "",
    startDate = "",
    endDate = ""
}: TransactionPDFReportGeneratorProps) {
    const { data: session } = useSession();
    const { currency } = useCurrency();
    const [isGenerating, setIsGenerating] = useState(false);

    const formatDateForReport = (date: string | Date) => {
        if (!date) return '';
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getDateRangeText = () => {
        if (!startDate && !endDate) return 'All Time';
        if (startDate && endDate) return `${formatDateForReport(startDate)} - ${formatDateForReport(endDate)}`;
        if (startDate) return `From ${formatDateForReport(startDate)}`;
        if (endDate) return `Until ${formatDateForReport(endDate)}`;
        return 'All Time';
    };

    const getFiltersText = () => {
        const filters: string[] = [];
        if (searchTerm) filters.push(`Search: "${searchTerm}"`);
        if (selectedType !== "ALL") filters.push(`Type: ${selectedType}`);
        if (selectedCategory) filters.push(`Category: ${selectedCategory}`);
        return filters.length > 0 ? filters.join(', ') : 'No filters applied';
    };

    // Calculate category breakdowns
    const getCategoryBreakdown = (type: 'INCOME' | 'EXPENSE') => {
        const categoryTotals = transactions
            .filter(t => t.type === type)
            .reduce((acc, transaction) => {
                acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
                return acc;
            }, {} as Record<string, number>);

        return Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
    };

    const getAccountBreakdown = () => {
        const accountTotals = transactions.reduce((acc, transaction) => {
            const key = transaction.account;
            if (!acc[key]) {
                acc[key] = { income: 0, expense: 0, net: 0, count: 0 };
            }
            if (transaction.type === 'INCOME') {
                acc[key].income += transaction.amount;
            } else {
                acc[key].expense += transaction.amount;
            }
            acc[key].net = acc[key].income - acc[key].expense;
            acc[key].count += 1;
            return acc;
        }, {} as Record<string, { income: number; expense: number; net: number; count: number }>);

        return Object.entries(accountTotals)
            .sort(([,a], [,b]) => Math.abs(b.net) - Math.abs(a.net));
    };

    const generateReport = async () => {
        setIsGenerating(true);
        
        try {
            const expenseCategories = getCategoryBreakdown('EXPENSE');
            const incomeCategories = getCategoryBreakdown('INCOME');
            const accountBreakdown = getAccountBreakdown();

            // Sort transactions by date (most recent first)
            const sortedTransactions = [...transactions].sort((a, b) => {
                const dateA = a.date instanceof Date ? a.date : new Date(a.date);
                const dateB = b.date instanceof Date ? b.date : new Date(b.date);
                return dateB.getTime() - dateA.getTime();
            });

            // Generate HTML content for the report
            const reportHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Transaction Statement</title>
                    <style>
                        body { 
                            font-family: 'Times New Roman', Times, serif; 
                            margin: 40px; 
                            color: #1f2937;
                            line-height: 1.5;
                            font-size: 12px;
                        }
                        .header { 
                            border-bottom: 3px solid #3b82f6; 
                            padding-bottom: 20px; 
                            margin-bottom: 30px; 
                        }
                        .title { 
                            font-size: 24px; 
                            font-weight: bold; 
                            color: #1f2937; 
                            margin: 0;
                        }
                        .subtitle { 
                            color: #6b7280; 
                            margin: 10px 0; 
                            font-size: 11px;
                        }
                        .summary-box { 
                            background: #f9fafb; 
                            border: 1px solid #e5e7eb; 
                            border-radius: 8px; 
                            padding: 25px; 
                            margin: 25px 0; 
                        }
                        .summary-title { 
                            font-size: 16px; 
                            font-weight: bold; 
                            margin-bottom: 15px;
                            color: #1f2937;
                        }
                        .metric { 
                            margin: 8px 0; 
                            font-size: 13px; 
                        }
                        .metric-label { 
                            font-weight: 600; 
                        }
                        .income { color: #10b981; }
                        .expense { color: #ef4444; }
                        .savings { color: #3b82f6; }
                        .loss { color: #f59e0b; }
                        .section-title { 
                            font-size: 14px; 
                            font-weight: bold; 
                            margin: 20px 0 15px 0;
                            color: #1f2937;
                            border-bottom: 1px solid #e5e7eb;
                            padding-bottom: 8px;
                        }
                        .category-list, .account-list { 
                            margin: 12px 0; 
                        }
                        .category-item, .account-item { 
                            display: flex; 
                            justify-content: space-between; 
                            margin: 6px 0; 
                            padding: 8px;
                            background: #ffffff;
                            border: 1px solid #e5e7eb;
                            border-radius: 4px;
                            font-size: 11px;
                        }
                        .category-name, .account-name { 
                            font-weight: 500; 
                        }
                        .category-amount, .account-amount { 
                            font-weight: 600; 
                        }
                        .transaction-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 15px 0;
                            font-size: 10px;
                        }
                        .transaction-table th {
                            background: #f9fafb;
                            border: 1px solid #e5e7eb;
                            padding: 8px 6px;
                            text-align: left;
                            font-weight: 600;
                            color: #374151;
                        }
                        .transaction-table td {
                            border: 1px solid #e5e7eb;
                            padding: 6px 6px;
                        }
                        .transaction-table tr:nth-child(even) {
                            background: #f9fafb;
                        }
                        .transaction-type {
                            display: inline-block;
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-size: 9px;
                            font-weight: 500;
                        }
                        .type-income {
                            background: #dcfce7;
                            color: #166534;
                        }
                        .type-expense {
                            background: #fee2e2;
                            color: #991b1b;
                        }
                        .filters-box {
                            background: #fffbeb;
                            border: 1px solid #fbbf24;
                            border-radius: 6px;
                            padding: 12px;
                            margin: 15px 0;
                        }
                        .filters-title {
                            font-weight: 600;
                            color: #92400e;
                            margin-bottom: 6px;
                            font-size: 12px;
                        }
                        .filters-text {
                            color: #92400e;
                            font-size: 11px;
                        }
                        .footer { 
                            margin-top: 30px; 
                            padding-top: 15px; 
                            border-top: 1px solid #e5e7eb; 
                            text-align: center; 
                            color: #6b7280; 
                            font-size: 10px;
                        }
                        @media print {
                            body { margin: 20px; }
                            .summary-box, .filters-box { page-break-inside: avoid; }
                            .transaction-table { page-break-inside: auto; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 class="title">Transaction Statement</h1>
                        <div class="subtitle">Prepared for: ${session?.user?.email || 'Financial Dashboard User'}</div>
                        <div class="subtitle">Report Period: ${getDateRangeText()}</div>
                        <div class="subtitle">Generated on: ${new Date().toLocaleDateString()}</div>
                    </div>

                    <div class="summary-box">
                        <div class="summary-title">Summary</div>
                        <div class="metric">
                            <span class="metric-label">Total Transactions:</span> 
                            <span>${filteredTransactionCount}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Total Income:</span> 
                            <span class="income">${formatCurrency(totalIncome, currency)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Total Expenses:</span> 
                            <span class="expense">${formatCurrency(totalExpenses, currency)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Net Amount:</span> 
                            <span class="${netAmount >= 0 ? 'savings' : 'loss'}">${formatCurrency(netAmount, currency)}</span>
                        </div>
                    </div>

                    ${(searchTerm || selectedType !== "ALL" || selectedCategory || startDate || endDate) ? `
                    <div class="filters-box">
                        <div class="filters-title">Applied Filters:</div>
                        <div class="filters-text">${getFiltersText()}</div>
                        <div class="filters-text">Date Range: ${getDateRangeText()}</div>
                    </div>
                    ` : ''}

                    ${expenseCategories.length > 0 ? `
                    <div class="section-title">Top Expense Categories</div>
                    <div class="category-list">
                        ${expenseCategories.map(([category, amount]) => `
                            <div class="category-item">
                                <span class="category-name">${category}</span>
                                <div>
                                    <span class="category-amount expense">${formatCurrency(amount, currency)}</span>
                                    <span style="color: #6b7280; margin-left: 10px;">
                                        (${totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0.0'}%)
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}

                    ${incomeCategories.length > 0 ? `
                    <div class="section-title">Top Income Categories</div>
                    <div class="category-list">
                        ${incomeCategories.map(([category, amount]) => `
                            <div class="category-item">
                                <span class="category-name">${category}</span>
                                <div>
                                    <span class="category-amount income">${formatCurrency(amount, currency)}</span>
                                    <span style="color: #6b7280; margin-left: 10px;">
                                        (${totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : '0.0'}%)
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}

                    ${accountBreakdown.length > 0 ? `
                    <div class="section-title">Account Summary</div>
                    <div class="account-list">
                        ${accountBreakdown.map(([account, data]) => `
                            <div class="account-item">
                                <span class="account-name">${account}</span>
                                <div>
                                    <span class="account-amount income">+${formatCurrency(data.income, currency)}</span>
                                    <span class="account-amount expense"> -${formatCurrency(data.expense, currency)}</span>
                                    <span class="account-amount ${data.net >= 0 ? 'savings' : 'loss'}"> = ${formatCurrency(data.net, currency)}</span>
                                    <span style="color: #6b7280; margin-left: 10px;">(${data.count} transactions)</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ` : ''}

                    <div class="section-title">Transaction Details</div>
                    <table class="transaction-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Account</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedTransactions.map(transaction => `
                                <tr>
                                    <td>${formatDate(transaction.date)}</td>
                                    <td><strong>${transaction.title}</strong></td>
                                    <td>
                                        <span class="transaction-type type-${transaction.type.toLowerCase()}">
                                            ${transaction.type}
                                        </span>
                                    </td>
                                    <td>${transaction.category}</td>
                                    <td>${transaction.account}</td>
                                    <td style="text-align: right; font-weight: 600;" class="${transaction.type === 'INCOME' ? 'income' : 'expense'}">
                                        ${transaction.type === 'INCOME' ? '+' : '-'}${formatCurrency(transaction.amount, currency)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer">
                        <div>Generated by Financial Dashboard - Transaction Statement</div>
                        <div>This report contains ${filteredTransactionCount} transactions</div>
                        <div>Report generated on ${new Date().toLocaleString()}</div>
                    </div>
                </body>
                </html>
            `;

            // Create and trigger download
            const blob = new Blob([reportHTML], { type: 'text/html' });
            const link = document.createElement('a');
            const dateRange = getDateRangeText();
            const fileName = `transaction-statement-${dateRange.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.html`;
            
            link.download = fileName;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error('Error generating transaction report:', error);
            alert('Failed to generate transaction report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <button
                onClick={generateReport}
                disabled={isGenerating || transactions.length === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating Statement...
                    </>
                ) : (
                    <>
                        <FileText size={18} />
                        Generate Statement
                    </>
                )}
            </button>
        </div>
    );
}