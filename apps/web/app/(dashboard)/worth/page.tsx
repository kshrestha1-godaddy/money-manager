"use client";

import React, { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency, getCurrencySymbol } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { useChartExpansion } from "../../utils/chartUtils";
import { ChartControls } from "../../components/ChartControls";
import { useOptimizedWorth } from "../../hooks/useOptimizedWorth";
import { TrendingUp, TrendingDown, DollarSign, Target, PiggyBank, BarChart3, RefreshCw, Download } from "lucide-react";

type SectionKey = 'accounts' | 'investments' | 'debts';

export default function NetWorthPage() {
    const session = useSession();
    const { currency } = useCurrency();
    const { isExpanded: isChartExpanded, toggleExpanded: toggleChartExpansion } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
        accounts: false,
        investments: false,
        debts: false
    });

    // Use the optimized worth hook
    const {
        netWorthStats,
        chartData,
        sections,
        accounts,
        investments,
        debts,
        loading,
        error,
        handleExportCSV,
        refreshData,
        exportData,
        chartColors
    } = useOptimizedWorth();

    // Helper functions
    const formatCurrencyAbbreviated = (amount: number) => {
        if (amount >= 1000000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000).toFixed(1)}K`;
        }
        return formatCurrency(amount, currency);
    };

    const calculateItemPercentage = (itemValue: number, sectionValue: number) => {
        if (sectionValue === 0) return 0;
        return ((itemValue / sectionValue) * 100).toFixed(1);
    };

    const formatDataLabel = (amount: number) => {
        if (amount >= 1000000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000000).toFixed(3)}M`;
        } else if (amount >= 1000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000).toFixed(3)}K`;
        }
        return formatCurrency(amount, currency);
    };

    const toggleSection = (section: SectionKey) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Display error if there's one
    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Net Worth Data</h3>
                    <p className="text-red-600">{String(error)}</p>
                    <div className="flex gap-2 mt-4 justify-center">
                        <button 
                            onClick={refreshData} 
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Retry       
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="animate-spin mb-4 h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <div className="text-gray-500">Loading net worth data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-full min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Net Worth</h1>
                    <p className="text-gray-600 mt-1">Track your overall financial position and growth</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={refreshData}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-gray-600 border border-gray-200 rounded-md flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-gray-50 hover:bg-green-100 text-gray-600 border border-gray-200 rounded-md flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Net Worth Overview */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">Total Net Worth</h2>
                    <p className="text-5xl font-bold mb-4">{formatCurrency(netWorthStats.netWorth, currency)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Total Assets</h3>
                            <p className="text-2xl font-semibold text-green-200">{formatCurrency(netWorthStats.totalAssets, currency)}</p>
                            <div className="text-sm text-green-100 mt-1">
                                Bank: {formatCurrencyAbbreviated(netWorthStats.totalAccountBalance)} | 
                                Investments: {formatCurrencyAbbreviated(netWorthStats.totalInvestmentValue)} | 
                                Lent: {formatCurrencyAbbreviated(netWorthStats.totalMoneyLent)}
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium mb-2">Monthly Growth</h3>
                            <p className={`text-2xl font-semibold ${netWorthStats.monthlyGrowthRate >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                                {netWorthStats.monthlyGrowthRate >= 0 ? '+' : ''}{netWorthStats.monthlyGrowthRate.toFixed(1)}%
                            </p>
                            <div className="text-sm text-gray-100 mt-1">
                                Projected yearly: {netWorthStats.projectedYearlyGrowth >= 0 ? '+' : ''}{netWorthStats.projectedYearlyGrowth.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Health Metrics - Card Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Savings Rate</h3>
                        <PiggyBank className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                        {netWorthStats.savingsRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">This month</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Investment Allocation</h3>
                        <BarChart3 className="h-4 w-4 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                        {netWorthStats.investmentAllocation.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Of total assets</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Liquidity Ratio</h3>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                        {netWorthStats.liquidityRatio.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Cash accessible</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Investment Gain</h3>
                        {netWorthStats.totalInvestmentGain >= 0 ? 
                            <TrendingUp className="h-4 w-4 text-green-500" /> : 
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        }
                    </div>
                    <p className={`text-2xl font-bold ${netWorthStats.totalInvestmentGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrencyAbbreviated(netWorthStats.totalInvestmentGain)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {netWorthStats.totalInvestmentGainPercentage.toFixed(1)}% return
                    </p>
                </div>
            </div>


            {/* Asset Breakdown Chart */}
            {chartData.length > 0 && (
                <div className={`bg-white rounded-lg shadow-sm border ${isChartExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Asset Breakdown</h3>
                            <p className="text-sm text-gray-600 mt-1">Distribution of your total assets</p>
                        </div>
                        <ChartControls
                            chartRef={chartRef}
                            onToggleExpanded={toggleChartExpansion}
                            isExpanded={isChartExpanded}
                            csvData={exportData}
                            fileName="net_worth_breakdown"
                        />
                    </div>
                    <div className="p-6">
                        <div 
                            ref={chartRef}
                            className={`${
                                isChartExpanded ? 'h-[70vh] w-full' : 'h-[32rem] sm:h-[36rem] w-full'
                            }`}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 40, right: 30, left: 20, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 12 }}
                                        height={40}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={formatCurrencyAbbreviated}
                                    />
                                    <Tooltip 
                                        formatter={(value: number) => [formatCurrency(value, currency), 'Amount']}
                                        labelStyle={{ fontWeight: 'bold' }}
                                        contentStyle={{ 
                                            backgroundColor: '#f9fafb', 
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px' 
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                        {/* Total value labels at the top */}
                                        <LabelList 
                                            dataKey="value" 
                                            position="top" 
                                            formatter={(value: number) => formatCurrencyAbbreviated(value)}
                                            style={{ 
                                                fontSize: '11px', 
                                                fontWeight: 'bold',
                                                fill: '#374151'
                                            }}
                                        />
                                        {/* Percentage labels inside the bars */}
                                        <LabelList 
                                            dataKey="percentage" 
                                            position="center" 
                                            formatter={(value: string) => `${value}%`}
                                            style={{ 
                                                fontSize: '12px', 
                                                fontWeight: 'bold',
                                                fill: '#ffffff'
                                            }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Asset Details Sections */}
            {sections.map((section) => (
                <div key={section.key} className="bg-white rounded-lg shadow-sm border">
                    <div 
                        className="flex items-center justify-between p-6 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleSection(section.key as SectionKey)}
                    >
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: section.color }}
                            ></div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                                <p className="text-sm text-gray-600">
                                    {formatCurrency(section.value, currency)} ({section.percentage.toFixed(1)}% of total assets)
                                </p>
                            </div>
                        </div>
                        <div className="text-gray-400">
                            {expandedSections[section.key as SectionKey] ? '▼' : '▶'}
                        </div>
                    </div>
                    
                    {expandedSections[section.key as SectionKey] && (
                        <div className="p-6">
                            {section.items.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No items in this category</p>
                            ) : (
                                <div className="space-y-3">
                                    {section.items.map((item: any, index: number) => {
                                        const itemValue = section.key === 'investments' 
                                            ? item.quantity * item.currentPrice
                                            : item.balance || item.amount || 0;
                                        const itemPercentage = calculateItemPercentage(itemValue, section.value);
                                        
                                        return (
                                            <div key={item.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-medium text-gray-900">
                                                            {item.holderName || item.name || item.borrowerName || 'Unknown'}
                                                        </h4>
                                                        {section.key === 'debts' && (
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                {item.status === 'ACTIVE' ? 'ACTIVE' : 'PARTIALLY PAID'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        {item.bankName || item.symbol || item.purpose || 'No description'}
                                                    </p>
                                                    {section.key === 'debts' && item.dueDate && (
                                                        <p className="text-xs text-orange-600 font-medium mt-1">
                                                            Due: {formatDate(new Date(item.dueDate))}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-gray-900">
                                                        {formatCurrency(itemValue, currency)}
                                                    </p>
                                                    <p className="text-xs text-blue-600 font-medium">
                                                        {itemPercentage}%
                                                    </p>
                                                    {section.key === 'investments' && (
                                                        <p className={`text-xs ${
                                                            (item.currentPrice - item.purchasePrice) >= 0 
                                                                ? 'text-green-600' 
                                                                : 'text-red-600'
                                                        }`}>
                                                            {((item.currentPrice - item.purchasePrice) / item.purchasePrice * 100).toFixed(1)}% gain/loss
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
} 