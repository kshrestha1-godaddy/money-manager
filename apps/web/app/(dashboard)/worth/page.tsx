"use client";

import React, { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency, getCurrencySymbol } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { useChartExpansion } from "../../utils/chartUtils";
import { calculateRemainingWithInterest } from "../../utils/interestCalculation";
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

    // Enhanced custom tooltip for assets chart
    const CustomAssetTooltip = useCallback(({ active, payload, label }: any) => {
        if (!active || !payload || payload.length === 0) return null;
        
        const data = payload[0].payload;
        const value = payload[0].value;
        const percentage = typeof data.percentage === 'number' ? data.percentage : parseFloat(data.percentage) || 0;
        
        // Get asset type descriptions and insights
        const getAssetDescription = (assetName: string) => {
            switch (assetName.toLowerCase()) {
                case 'bank accounts':
                    return {
                        description: "Liquid cash holdings in bank accounts. Provides immediate accessibility for expenses and emergencies but typically offers lower returns.",
                        insights: netWorthStats.liquidityRatio > 70 ? "High liquidity - consider investing some cash for better returns" :
                                netWorthStats.liquidityRatio < 30 ? "Low liquidity - ensure adequate emergency funds" :
                                "Good liquidity balance for financial flexibility",
                        riskLevel: "Very Low Risk",
                        riskColor: "text-green-600"
                    };
                case 'investments':
                    return {
                        description: "Portfolio of stocks, bonds, mutual funds, and other investment vehicles. Offers potential for growth but carries market risk.",
                        insights: netWorthStats.investmentAllocation > 30 ? "Strong investment allocation - diversification is key" :
                                netWorthStats.investmentAllocation < 10 ? "Low investment allocation - consider increasing for long-term growth" :
                                "Moderate investment allocation - room for growth-focused expansion",
                        riskLevel: "Medium-High Risk",
                        riskColor: "text-yellow-600"
                    };
                case 'money lent':
                    return {
                        description: "Outstanding loans to individuals or entities. Represents money owed to you with potential interest income.",
                        insights: value > netWorthStats.totalAssets * 0.2 ? "High lending exposure - monitor repayment schedules closely" :
                                value > 0 ? "Active lending portfolio - track due dates and payments" :
                                "No outstanding loans - consider peer-to-peer lending for additional income",
                        riskLevel: "Medium Risk",
                        riskColor: "text-orange-600"
                    };
                default:
                    return {
                        description: "Asset category contributing to your overall net worth and financial position.",
                        insights: "Monitor this asset class for optimal portfolio balance",
                        riskLevel: "Variable Risk",
                        riskColor: "text-gray-600"
                    };
            }
        };

        const assetInfo = getAssetDescription(label);
        const totalAssets = netWorthStats.totalAssets || 1; // Prevent division by zero
        
        // Calculate additional metrics with safety checks
        const averageAssetValue = chartData.length > 0 ? totalAssets / chartData.length : 0;
        const isAboveAverage = value > averageAssetValue;
        const contributionLevel = percentage > 50 ? "Dominant" :
                                percentage > 30 ? "Major" :
                                percentage > 15 ? "Significant" :
                                percentage > 5 ? "Minor" : "Minimal";
        
        // Ensure netWorthStats.netWorth is not zero for percentage calculations
        const netWorth = netWorthStats.netWorth || 1;

        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-5 min-w-96 max-w-lg">
                <div className="font-bold text-gray-900 mb-3 text-base">{label}</div>
                
                {/* Main Amount and Percentage */}
                <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-700">Asset Value:</span>
                    <span className="font-bold text-lg text-blue-600">
                        {formatCurrency(value, currency)}
                    </span>
                </div>

                {/* Asset Statistics */}
                <div className="space-y-2 mb-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Portfolio Share:</span>
                        <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    
                    <div className="flex justify-between">
                        <span className="text-gray-600">Contribution Level:</span>
                        <span className={`font-medium ${
                            contributionLevel === 'Dominant' ? 'text-red-600' :
                            contributionLevel === 'Major' ? 'text-orange-600' :
                            contributionLevel === 'Significant' ? 'text-blue-600' :
                            contributionLevel === 'Minor' ? 'text-green-600' : 'text-gray-600'
                        }`}>
                            {contributionLevel}
                        </span>
                    </div>
                    
                        <div className="flex justify-between">
                            <span className="text-gray-600">vs Average Asset:</span>
                            <span className={`font-medium ${isAboveAverage ? 'text-green-600' : 'text-orange-600'}`}>
                                {averageAssetValue > 0 ? 
                                    `${isAboveAverage ? '+' : ''}${((value / averageAssetValue - 1) * 100).toFixed(1)}%` :
                                    'N/A'
                                }
                            </span>
                        </div>
                </div>

                {/* Risk Assessment */}
                <div className="border-t border-gray-200 pt-3 mb-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Risk Level:</span>
                        <span className={`font-medium ${assetInfo.riskColor}`}>{assetInfo.riskLevel}</span>
                    </div>
                </div>

                {/* Portfolio Context */}
                <div className="border-t border-gray-200 pt-3 mb-3">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total Assets:</span>
                            <span className="font-medium">{formatCurrency(totalAssets, currency)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                            <span className="text-gray-600">Net Worth Impact:</span>
                            <span className="font-medium text-purple-600">
                                {((value / netWorth) * 100).toFixed(1)}% of net worth
                            </span>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="border-t border-gray-200 pt-3 mb-3">
                    <div className="text-xs text-gray-600 leading-relaxed">
                        <div className="font-medium text-gray-700 mb-1">About this asset class:</div>
                        {assetInfo.description}
                    </div>
                </div>

                {/* Insights and Recommendations */}
                <div className="border-t border-gray-200 pt-3">
                    <div className="text-xs leading-relaxed">
                        <div className="font-medium text-gray-700 mb-1">💡 Financial Insight:</div>
                        <div className="text-gray-600">{assetInfo.insights}</div>
                    </div>
                </div>

                {/* Action Context */}
                {percentage > 60 && (
                    <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="text-xs text-orange-600 text-center">
                            ⚠️ High concentration - Consider diversification across asset classes
                        </div>
                    </div>
                )}
                
                {percentage < 5 && label.toLowerCase() !== 'money lent' && (
                    <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="text-xs text-blue-600 text-center">
                            📈 Small allocation - Consider increasing if aligned with financial goals
                        </div>
                    </div>
                )}
            </div>
        );
    }, [currency, netWorthStats, chartData]);

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
                <div className={`${cardLargeContainer} relative`}>
                    {netWorthStats.savingsRate >= 0 ? 
                        <PiggyBank className={`absolute top-4 left-4 h-4 w-4 ${greenPositiveIcon}`} /> : 
                        <PiggyBank className={`absolute top-4 left-4 h-4 w-4 ${redNegativeIcon}`} />
                    }
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Percentage of income saved this month
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Savings Rate</h3>
                        <p className={`${cardValueLarge} ${getGainLossClasses(netWorthStats.savingsRate)} mb-1`}>
                            {netWorthStats.savingsRate.toFixed(1)}%
                        </p>
                        <p className={cardSubtitle}>This month</p>
                    </div>
                </div>

                <div className={`${cardLargeContainer} relative`}>
                    {netWorthStats.investmentAllocation >= 20 ? 
                        <BarChart3 className={`absolute top-4 left-4 h-4 w-4 ${greenPositiveIcon}`} /> : 
                        netWorthStats.investmentAllocation >= 10 ?
                        <BarChart3 className={`absolute top-4 left-4 h-4 w-4 ${purpleIcon}`} /> :
                        <BarChart3 className={`absolute top-4 left-4 h-4 w-4 ${redNegativeIcon}`} />
                    }
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Percentage of total assets allocated to investments
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Investment Allocation</h3>
                        <p className={`${cardValueLarge} ${
                            netWorthStats.investmentAllocation >= 20 ? getGainLossClasses(1) :
                            netWorthStats.investmentAllocation >= 10 ? getSummaryCardClasses('investmentAllocation', 'investments').text :
                            getGainLossClasses(-1)
                        } mb-1`}>
                            {netWorthStats.investmentAllocation.toFixed(1)}%
                        </p>
                        <p className={cardSubtitle}>Of total assets</p>
                    </div>
                </div>

                <div className={`${cardLargeContainer} relative`}>
                    {netWorthStats.liquidityRatio >= 50 ? 
                        <DollarSign className={`absolute top-4 left-4 h-4 w-4 ${greenPositiveIcon}`} /> : 
                        netWorthStats.liquidityRatio >= 30 ?
                        <DollarSign className={`absolute top-4 left-4 h-4 w-4 ${greenIcon}`} /> :
                        <DollarSign className={`absolute top-4 left-4 h-4 w-4 ${redNegativeIcon}`} />
                    }
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Percentage of assets in easily accessible cash/bank accounts
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Liquidity Ratio</h3>
                        <p className={`${cardValueLarge} ${
                            netWorthStats.liquidityRatio >= 50 ? getGainLossClasses(1) :
                            netWorthStats.liquidityRatio >= 30 ? getSummaryCardClasses('liquidityRatio', 'investments').text :
                            getGainLossClasses(-1)
                        } mb-1`}>
                            {netWorthStats.liquidityRatio.toFixed(1)}%
                        </p>
                        <p className={cardSubtitle}>Cash accessible</p>
                    </div>
                </div>

                <div className={`${cardLargeContainer} relative`}>
                    {netWorthStats.totalInvestmentGain >= 0 ? 
                        <TrendingUp className={`absolute top-4 left-4 h-4 w-4 ${greenPositiveIcon}`} /> : 
                        <TrendingDown className={`absolute top-4 left-4 h-4 w-4 ${redNegativeIcon}`} />
                    }
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Total profit/loss from all investment positions
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Investment Gain</h3>
                        <p className={`${cardValueLarge} ${getGainLossClasses(netWorthStats.totalInvestmentGain)} mb-1`}>
                            {formatCurrencyAbbreviated(netWorthStats.totalInvestmentGain)}
                        </p>
                        <p className={cardSubtitle}>
                            {netWorthStats.totalInvestmentGainPercentage.toFixed(1)}% return
                        </p>
                    </div>
                </div>
            </div>

            {/* Asset Breakdown Chart */}
            {chartData.length > 0 && (
                <>
                    <div className={whiteContainer}>
                        <div className="flex items-center justify-between p-2 border-b border-gray-200">
                            <div>
                                <h3 className={chartTitle}>Asset Breakdown</h3>
                            </div>
                            <ChartControls
                                chartRef={chartRef}
                                onToggleExpanded={toggleChartExpansion}
                                isExpanded={isChartExpanded}
                                csvData={exportData}
                                fileName="net_worth_breakdown"
                                title=""
                                tooltipText="Distribution of your total assets with detailed analytics including risk assessments, portfolio insights, and personalized financial recommendations. Hover over bars for comprehensive asset analysis."
                            />
                        </div>
                        <div className="p-2">
                            <div 
                                ref={chartRef}
                                className="h-[38rem] w-full"
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 40, right: 30, left: 20, bottom: 10 }}
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
                                        <Tooltip content={<CustomAssetTooltip />} />
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

                    {/* Full screen modal */}
                    {isChartExpanded && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
                            <div className="bg-white rounded-lg p-3 sm:p-6 max-w-7xl w-full max-h-full overflow-auto">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                                    <div>
                                        <h2 className="text-lg sm:text-2xl font-semibold">Asset Breakdown</h2>
                                        <p className="text-sm text-gray-500">Distribution of your total assets</p>
                                    </div>
                                    <button
                                        onClick={toggleChartExpansion}
                                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base"
                                    >
                                        Close
                                    </button>
                                </div>
                                <div 
                                    className="h-[70vh] w-full"
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
                                            <Tooltip content={<CustomAssetTooltip />} />
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
                </>
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
                                        let itemValue: number;
                                        if (section.key === 'investments') {
                                            itemValue = item.quantity * item.currentPrice;
                                        } else if (section.key === 'debts') {
                                            // For debts, calculate the remaining amount after partial payments
                                            const remainingWithInterest = calculateRemainingWithInterest(
                                                item.amount,
                                                item.interestRate,
                                                item.lentDate,
                                                item.dueDate,
                                                item.repayments || [],
                                                new Date(),
                                                item.status
                                            );
                                            itemValue = Math.max(0, remainingWithInterest.remainingAmount);
                                        } else {
                                            itemValue = item.balance || item.amount || 0;
                                        }
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