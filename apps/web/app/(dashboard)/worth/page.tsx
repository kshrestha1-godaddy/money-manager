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
import { TrendingUp, TrendingDown, DollarSign, Target, PiggyBank, BarChart3, RefreshCw, Download, Info } from "lucide-react";
import { 
    getSummaryCardClasses,
    getGainLossClasses,
    BUTTON_COLORS,
    TEXT_COLORS,
    CONTAINER_COLORS,
    INPUT_COLORS,
    LOADING_COLORS,
    ICON_COLORS,
    UI_STYLES,
} from "../../config/colorConfig";

// Extract color variables for better readability
const pageContainer = CONTAINER_COLORS.page;
const errorContainer = CONTAINER_COLORS.error;
const whiteContainer = CONTAINER_COLORS.whiteWithPadding;
const cardContainer = CONTAINER_COLORS.card;
const cardLargeContainer = CONTAINER_COLORS.cardLarge;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

const pageTitle = TEXT_COLORS.title;
const pageSubtitle = TEXT_COLORS.subtitle;
const errorTitle = TEXT_COLORS.errorTitle;
const errorMessage = TEXT_COLORS.errorMessage;
const cardTitle = TEXT_COLORS.cardTitle;
const cardValue = TEXT_COLORS.cardValue;
const cardValueLarge = TEXT_COLORS.cardValueLarge;
const cardSubtitle = TEXT_COLORS.cardSubtitle;
const emptyTitle = TEXT_COLORS.emptyTitle;
const emptyMessage = TEXT_COLORS.emptyMessage;
const labelText = TEXT_COLORS.label;
const chartTitle = TEXT_COLORS.chartTitle;

const primaryButton = BUTTON_COLORS.primary;
const secondaryBlueButton = BUTTON_COLORS.secondaryBlue;
const secondaryGreenButton = BUTTON_COLORS.secondaryGreen;
const clearButton = BUTTON_COLORS.clear;

// Icon colors
const blueIcon = ICON_COLORS.blue;
const greenIcon = ICON_COLORS.green;
const redIcon = ICON_COLORS.red;
const purpleIcon = ICON_COLORS.purple;
const greenPositiveIcon = ICON_COLORS.greenPositive;
const redNegativeIcon = ICON_COLORS.redNegative;

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
                <div className={errorContainer}>
                    <h3 className={errorTitle}>Error Loading Net Worth Data</h3>
                    <p className={errorMessage}>{String(error)}</p>
                    <div className="flex gap-2 mt-4 justify-center">
                        <button 
                            onClick={refreshData} 
                            className={primaryButton}
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
            <div className={loadingContainer}>
                <div className={loadingSpinner}></div>
                <p className={loadingText}>Loading net worth data...</p>
            </div>
        );
    }

    return (
        <div className={`${pageContainer} max-w-full min-w-0`}>
            {/* Header */}
            <div className={UI_STYLES.header.container}>
                <div>
                    <h1 className={pageTitle}>Net Worth</h1>
                    <p className={pageSubtitle}>Track your overall financial position and growth</p>
                </div>
                <div className={UI_STYLES.header.buttonGroup}>
                    <button
                        onClick={refreshData}
                        className={primaryButton}
                    >
                        Refresh
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className={secondaryBlueButton} 
                    >
                        Export
                    </button>
                </div>
            </div>

            {/* Net Worth Overview */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">Total Net Worth</h2>
                    <p className="text-5xl font-bold mb-4">{formatCurrency(netWorthStats.netWorth, currency)}</p>
                    <div className="grid grid-cols-2 gap-8 mt-8">
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
                            <div className="text-sm text-green-100 mt-1">
                                Projected yearly: {netWorthStats.projectedYearlyGrowth >= 0 ? '+' : ''}{netWorthStats.projectedYearlyGrowth.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Health Metrics - Card Style */}
            <div className="grid grid-cols-4 gap-6">
                <div className={cardLargeContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className="flex items-center space-x-1">
                            <h3 className={`${cardTitle} mr-2`}>Savings Rate</h3>
                            <div className="relative group">
                                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                    Percentage of income saved this month
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                </div>
                            </div>
                        </div>
                        {netWorthStats.savingsRate >= 0 ? 
                            <PiggyBank className={`h-4 w-4 ${greenPositiveIcon}`} /> : 
                            <PiggyBank className={`h-4 w-4 ${redNegativeIcon}`} />
                        }
                    </div>
                    <p className={`${cardValueLarge} ${getGainLossClasses(netWorthStats.savingsRate)}`}>
                        {netWorthStats.savingsRate.toFixed(1)}%
                    </p>
                    <p className={cardSubtitle}>This month</p>
                </div>

                <div className={cardLargeContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className="flex items-center space-x-1">
                            <h3 className={`${cardTitle} mr-2`}>Investment Allocation</h3>
                            <div className="relative group">
                                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                    Percentage of total assets allocated to investments
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                </div>
                            </div>
                        </div>
                        {netWorthStats.investmentAllocation >= 20 ? 
                            <BarChart3 className={`h-4 w-4 ${greenPositiveIcon}`} /> : 
                            netWorthStats.investmentAllocation >= 10 ?
                            <BarChart3 className={`h-4 w-4 ${purpleIcon}`} /> :
                            <BarChart3 className={`h-4 w-4 ${redNegativeIcon}`} />
                        }
                    </div>
                    <p className={`${cardValueLarge} ${
                        netWorthStats.investmentAllocation >= 20 ? getGainLossClasses(1) :
                        netWorthStats.investmentAllocation >= 10 ? getSummaryCardClasses('investmentAllocation', 'investments').text :
                        getGainLossClasses(-1)
                    }`}>
                        {netWorthStats.investmentAllocation.toFixed(1)}%
                    </p>
                    <p className={cardSubtitle}>Of total assets</p>
                </div>

                <div className={cardLargeContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className="flex items-center space-x-1">
                            <h3 className={`${cardTitle} mr-2`}>Liquidity Ratio</h3>
                            <div className="relative group">
                                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                    Percentage of assets in easily accessible cash/bank accounts
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                </div>
                            </div>
                        </div>
                        {netWorthStats.liquidityRatio >= 50 ? 
                            <DollarSign className={`h-4 w-4 ${greenPositiveIcon}`} /> : 
                            netWorthStats.liquidityRatio >= 30 ?
                            <DollarSign className={`h-4 w-4 ${greenIcon}`} /> :
                            <DollarSign className={`h-4 w-4 ${redNegativeIcon}`} />
                        }
                    </div>
                    <p className={`${cardValueLarge} ${
                        netWorthStats.liquidityRatio >= 50 ? getGainLossClasses(1) :
                        netWorthStats.liquidityRatio >= 30 ? getSummaryCardClasses('liquidityRatio', 'investments').text :
                        getGainLossClasses(-1)
                    }`}>
                        {netWorthStats.liquidityRatio.toFixed(1)}%
                    </p>
                    <p className={cardSubtitle}>Cash accessible</p>
                </div>

                <div className={cardLargeContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className="flex items-center space-x-1">
                            <h3 className={`${cardTitle} mr-2`}>Investment Gain</h3>
                            <div className="relative group">
                                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                    Total profit/loss from all investment positions
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                </div>
                            </div>
                        </div>
                        {netWorthStats.totalInvestmentGain >= 0 ? 
                            <TrendingUp className={`h-4 w-4 ${greenPositiveIcon}`} /> : 
                            <TrendingDown className={`h-4 w-4 ${redNegativeIcon}`} />
                        }
                    </div>
                    <p className={`${cardValueLarge} ${getGainLossClasses(netWorthStats.totalInvestmentGain)}`}>
                        {formatCurrencyAbbreviated(netWorthStats.totalInvestmentGain)}
                    </p>
                    <p className={cardSubtitle}>
                        {netWorthStats.totalInvestmentGainPercentage.toFixed(1)}% return
                    </p>
                </div>
            </div>

            {/* Asset Breakdown Chart */}
            {chartData.length > 0 && (
                <div className={`${whiteContainer} ${isChartExpanded ? 'fixed inset-4 z-50 overflow-auto' : ''}`}>
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div>
                            <h3 className={chartTitle}>Asset Breakdown</h3>
                            <p className={cardSubtitle}>Distribution of your total assets</p>
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
                                isChartExpanded ? 'h-[70vh] w-full' : 'h-[32rem] w-full'
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
                                                fontSize: '15px', 
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
                                                fontSize: '13px', 
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
                <div key={section.key} className={whiteContainer}>
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
                                <h3 className={`text-lg font-semibold ${TEXT_COLORS.cardTitle}`}>{section.title}</h3>
                                <p className={cardSubtitle}>
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
                                <p className={`${emptyMessage} text-center py-4`}>No items in this category</p>
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
                                                        <h4 className={`font-medium ${TEXT_COLORS.cardTitle}`}>
                                                            {item.holderName || item.name || item.borrowerName || 'Unknown'}
                                                        </h4>
                                                        {section.key === 'debts' && (
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                {item.status === 'ACTIVE' ? 'ACTIVE' : 'PARTIALLY PAID'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={cardSubtitle}>
                                                        {item.bankName || item.symbol || item.purpose || 'No description'}
                                                    </p>
                                                    {section.key === 'debts' && item.dueDate && (
                                                        <p className="text-xs text-orange-600 font-medium mt-1">
                                                            Due: {formatDate(new Date(item.dueDate))}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-semibold ${TEXT_COLORS.cardTitle}`}>
                                                        {formatCurrency(itemValue, currency)}
                                                    </p>
                                                    <p className={`text-xs ${blueIcon} font-medium`}>
                                                        {itemPercentage}%
                                                    </p>
                                                    {section.key === 'investments' && (
                                                        <p className={`text-xs ${getGainLossClasses(item.currentPrice - item.purchasePrice)}`}>
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