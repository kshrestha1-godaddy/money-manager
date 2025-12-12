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
import { toggleNetWorthInclusion, bulkUpdateNetWorthInclusions } from "../../actions/net-worth-inclusions";
import { TrendingUp, TrendingDown, DollarSign, Target, PiggyBank, BarChart3, RefreshCw, Download, Info, Eye, EyeOff, CheckSquare, XSquare } from "lucide-react";
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

// Worth chart colors (matching dashboard theme)
const WORTH_COLORS = {
    accounts: '#10b981',    // Green (Bank Balance)
    investments: '#3b82f6', // Blue (Investments) 
    moneyLent: '#ef4444',   // Red (Money Lent)
} as const;

// Pattern IDs for textures
const WORTH_PATTERN_IDS = {
    accounts: 'pattern-accounts',
    investments: 'pattern-investments', 
    moneyLent: 'pattern-money-lent',
} as const;

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

    // Track items that are currently being updated
    const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Use the optimized worth hook
    const {
        netWorthStats,
        chartData,
        sections,
        accounts,
        investments,
        debts,
        allAccounts,
        allInvestments,
        allDebts,
        inclusionMaps,
        loading,
        error,
        handleExportCSV,
        refreshData,
        exportData,
        chartColors
    } = useOptimizedWorth();

    // Helper to create unique key for tracking updates
    const getItemKey = (entityType: string, entityId: number) => `${entityType}-${entityId}`;

    // Handler for toggling net worth inclusion
    const handleToggleInclusion = useCallback(async (
        entityType: 'ACCOUNT' | 'INVESTMENT' | 'DEBT',
        entityId: number,
        currentlyIncluded: boolean
    ) => {
        const itemKey = getItemKey(entityType, entityId);
        
        // Mark this item as updating
        setUpdatingItems(prev => new Set(prev).add(itemKey));
        
        try {
            await toggleNetWorthInclusion(entityType, entityId, !currentlyIncluded);
            // Refresh data to update the UI
            refreshData();
        } catch (error) {
            console.error('Error toggling net worth inclusion:', error);
            alert('Failed to update item inclusion. Please try again.');
        } finally {
            // Remove from updating set after a short delay to ensure UI has updated
            setTimeout(() => {
                setUpdatingItems(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(itemKey);
                    return newSet;
                });
            }, 500);
        }
    }, [refreshData]);

    // Bulk operations: Show All
    const handleShowAll = useCallback(async () => {
        setIsBulkUpdating(true);
        try {
            // Collect all items that need to be included
            const updates: Array<{
                entityType: 'ACCOUNT' | 'INVESTMENT' | 'DEBT';
                entityId: number;
                includeInNetWorth: boolean;
            }> = [];

            // Add all accounts
            allAccounts?.forEach(account => {
                updates.push({
                    entityType: 'ACCOUNT',
                    entityId: account.id,
                    includeInNetWorth: true
                });
            });

            // Add all investments
            allInvestments?.forEach(investment => {
                updates.push({
                    entityType: 'INVESTMENT',
                    entityId: investment.id,
                    includeInNetWorth: true
                });
            });

            // Add all debts (only active and partially paid)
            allDebts?.filter(debt => debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID')
                .forEach(debt => {
                    updates.push({
                        entityType: 'DEBT',
                        entityId: debt.id,
                        includeInNetWorth: true
                    });
                });

            if (updates.length > 0) {
                await bulkUpdateNetWorthInclusions(updates);
                refreshData();
            }
        } catch (error) {
            console.error('Error showing all items:', error);
            alert('Failed to show all items. Please try again.');
        } finally {
            setTimeout(() => setIsBulkUpdating(false), 500);
        }
    }, [allAccounts, allInvestments, allDebts, refreshData]);

    // Bulk operations: Hide All
    const handleHideAll = useCallback(async () => {
        setIsBulkUpdating(true);
        try {
            // Collect all items that need to be excluded
            const updates: Array<{
                entityType: 'ACCOUNT' | 'INVESTMENT' | 'DEBT';
                entityId: number;
                includeInNetWorth: boolean;
            }> = [];

            // Add all accounts
            allAccounts?.forEach(account => {
                updates.push({
                    entityType: 'ACCOUNT',
                    entityId: account.id,
                    includeInNetWorth: false
                });
            });

            // Add all investments
            allInvestments?.forEach(investment => {
                updates.push({
                    entityType: 'INVESTMENT',
                    entityId: investment.id,
                    includeInNetWorth: false
                });
            });

            // Add all debts (only active and partially paid)
            allDebts?.filter(debt => debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID')
                .forEach(debt => {
                    updates.push({
                        entityType: 'DEBT',
                        entityId: debt.id,
                        includeInNetWorth: false
                    });
                });

            if (updates.length > 0) {
                await bulkUpdateNetWorthInclusions(updates);
                refreshData();
            }
        } catch (error) {
            console.error('Error hiding all items:', error);
            alert('Failed to hide all items. Please try again.');
        } finally {
            setTimeout(() => setIsBulkUpdating(false), 500);
        }
    }, [allAccounts, allInvestments, allDebts, refreshData]);

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
                                Total profit/loss from included investment positions
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
                    {netWorthStats.totalAssets === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[38rem] w-full">
                            <div className="text-center max-w-md">
                                <EyeOff className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h4 className="text-lg font-semibold text-gray-700 mb-2">All Assets Hidden</h4>
                                <p className="text-sm text-gray-500 mb-4">
                                    You've hidden all items from your net worth calculation. 
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div 
                            ref={chartRef}
                            className="h-[38rem] w-full"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 40, right: 30, left: 20, bottom: 10 }}
                                >
                                    {/* Enhanced SVG Pattern Definitions for Textures */}
                                    <defs>
                                        {/* Bank Balance - Enhanced diagonal lines with grid */}
                                        <pattern id={WORTH_PATTERN_IDS.accounts} patternUnits="userSpaceOnUse" width="6" height="6">
                                            <rect width="6" height="6" fill={WORTH_COLORS.accounts} />
                                            <path d="M 0,6 l 6,-6 M -1.5,1.5 l 3,-3 M 4.5,7.5 l 3,-3" stroke="#059669" strokeWidth="0.8" opacity="0.3" />
                                            <rect x="0" y="0" width="2" height="2" fill="#047857" opacity="0.15" />
                                            <rect x="4" y="4" width="2" height="2" fill="#047857" opacity="0.15" />
                                        </pattern>
                                        
                                        {/* Investments - Enhanced dots with varying sizes */}
                                        <pattern id={WORTH_PATTERN_IDS.investments} patternUnits="userSpaceOnUse" width="8" height="8">
                                            <rect width="8" height="8" fill={WORTH_COLORS.investments} />
                                            <circle cx="2" cy="2" r="1" fill="#1d4ed8" opacity="0.35" />
                                            <circle cx="6" cy="6" r="1" fill="#1d4ed8" opacity="0.35" />
                                            <circle cx="4" cy="4" r="0.6" fill="#1e40af" opacity="0.25" />
                                            <circle cx="0" cy="4" r="0.4" fill="#1e40af" opacity="0.2" />
                                            <circle cx="8" cy="0" r="0.4" fill="#1e40af" opacity="0.2" />
                                        </pattern>
                                        
                                        {/* Money Lent - Enhanced cross-hatch pattern */}
                                        <pattern id={WORTH_PATTERN_IDS.moneyLent} patternUnits="userSpaceOnUse" width="5" height="5">
                                            <rect width="5" height="5" fill={WORTH_COLORS.moneyLent} />
                                            <path d="M 0,5 l 5,-5 M -1.25,1.25 l 2.5,-2.5 M 3.75,6.25 l 2.5,-2.5" stroke="#dc2626" strokeWidth="0.6" opacity="0.3" />
                                            <path d="M 0,0 l 5,5 M -1.25,3.75 l 2.5,2.5 M 3.75,-1.25 l 2.5,2.5" stroke="#dc2626" strokeWidth="0.6" opacity="0.2" />
                                        </pattern>

                                        {/* Additional patterns for other asset types */}
                                        <pattern id="pattern-cash" patternUnits="userSpaceOnUse" width="4" height="4">
                                            <rect width="4" height="4" fill="#10b981" />
                                            <rect x="0" y="0" width="1.5" height="1.5" fill="#059669" opacity="0.3" />
                                            <rect x="2.5" y="2.5" width="1.5" height="1.5" fill="#059669" opacity="0.3" />
                                            <rect x="1.25" y="1.25" width="1.5" height="1.5" fill="#047857" opacity="0.2" />
                                        </pattern>

                                        <pattern id="pattern-property" patternUnits="userSpaceOnUse" width="6" height="6">
                                            <rect width="6" height="6" fill="#f59e0b" />
                                            <polygon points="3,1 5,3 3,5 1,3" fill="#d97706" opacity="0.3" />
                                            <rect x="0" y="0" width="1" height="1" fill="#b45309" opacity="0.25" />
                                            <rect x="5" y="5" width="1" height="1" fill="#b45309" opacity="0.25" />
                                        </pattern>

                                        <pattern id="pattern-crypto" patternUnits="userSpaceOnUse" width="8" height="8">
                                            <rect width="8" height="8" fill="#8b5cf6" />
                                            <path d="M 2,2 L 6,2 L 6,6 L 2,6 Z" fill="#7c3aed" opacity="0.3" stroke="#6d28d9" strokeWidth="0.5" />
                                            <circle cx="4" cy="4" r="1.5" fill="none" stroke="#6d28d9" strokeWidth="0.8" opacity="0.4" />
                                        </pattern>

                                        <pattern id="pattern-other" patternUnits="userSpaceOnUse" width="3" height="3">
                                            <rect width="3" height="3" fill="#6b7280" />
                                            <rect x="0" y="0" width="1" height="1" fill="#4b5563" opacity="0.4" />
                                            <rect x="2" y="2" width="1" height="1" fill="#4b5563" opacity="0.4" />
                                            <rect x="1" y="1" width="1" height="1" fill="#374151" opacity="0.3" />
                                        </pattern>
                                    </defs>
                                    
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
                                        {chartData.map((entry, index) => {
                                            let patternUrl = entry.color; // Default to solid color
                                            
                                            // Map entry names to enhanced pattern URLs
                                            const entryName = entry.name.toLowerCase();
                                            if (entryName.includes('bank') || entryName.includes('account')) {
                                                patternUrl = `url(#${WORTH_PATTERN_IDS.accounts})`;
                                            } else if (entryName.includes('investment') || entryName.includes('stock') || entryName.includes('bond')) {
                                                patternUrl = `url(#${WORTH_PATTERN_IDS.investments})`;
                                            } else if (entryName.includes('lent') || entryName.includes('loan')) {
                                                patternUrl = `url(#${WORTH_PATTERN_IDS.moneyLent})`;
                                            } else if (entryName.includes('cash') || entryName.includes('saving')) {
                                                patternUrl = 'url(#pattern-cash)';
                                            } else if (entryName.includes('property') || entryName.includes('real estate') || entryName.includes('house')) {
                                                patternUrl = 'url(#pattern-property)';
                                            } else if (entryName.includes('crypto') || entryName.includes('bitcoin') || entryName.includes('ethereum')) {
                                                patternUrl = 'url(#pattern-crypto)';
                                            } else if (entryName.includes('other') || entryName.includes('misc')) {
                                                patternUrl = 'url(#pattern-other)';
                                            }
                                            
                                            return (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={patternUrl}
                                                    stroke={entry.color}
                                                    strokeWidth={1}
                                                />
                                            );
                                        })}
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
                    )}
                </div>
            </div>

            {/* Quick Actions for Bulk Operations */}
            {(allAccounts.length > 0 || allInvestments.length > 0 || allDebts.length > 0) && (
                <div className="flex items-center justify-end gap-3 py-2">
                    {isBulkUpdating && (
                        <div className="flex items-center gap-2 text-blue-600">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span className="text-sm font-medium">Updating...</span>
                        </div>
                    )}
                    <button
                        onClick={handleShowAll}
                        disabled={isBulkUpdating}
                        className={`${primaryButton} flex items-center gap-2 ${
                            isBulkUpdating ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <CheckSquare className="w-4 h-4" />
                        Show All
                    </button>
                    <button
                        onClick={handleHideAll}
                        disabled={isBulkUpdating}
                        className={`${secondaryBlueButton} flex items-center gap-2 ${
                            isBulkUpdating ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <XSquare className="w-4 h-4" />
                        Hide All
                    </button>
                </div>
            )}

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
                        {netWorthStats.totalAssets === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[70vh] w-full">
                                <div className="text-center max-w-md">
                                    <EyeOff className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                                    <h4 className="text-xl font-semibold text-gray-700 mb-2">All Assets Hidden</h4>
                                    <p className="text-gray-500 mb-4">
                                        You've hidden all items from your net worth calculation. 
                                        Enable visibility on accounts, investments, or debts to see your asset breakdown.
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                                        <Eye className="w-4 h-4" />
                                        <span>Click the eye icons to include items</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[70vh] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 40, right: 30, left: 20, bottom: 20 }}
                                    >
                                        {/* SVG Pattern Definitions for Textures (Expanded View) */}
                                        <defs>
                                            {/* Bank Balance - Diagonal lines */}
                                            <pattern id="expanded-pattern-accounts" patternUnits="userSpaceOnUse" width="8" height="8">
                                                <rect width="8" height="8" fill={WORTH_COLORS.accounts} />
                                                <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" stroke="#059669" strokeWidth="1" opacity="0.3" />
                                            </pattern>
                                            
                                            {/* Investments - Dots pattern */}
                                            <pattern id="expanded-pattern-investments" patternUnits="userSpaceOnUse" width="8" height="8">
                                                <rect width="8" height="8" fill={WORTH_COLORS.investments} />
                                                <circle cx="4" cy="4" r="1.5" fill="#1d4ed8" opacity="0.3" />
                                            </pattern>
                                            
                                            {/* Money Lent - Horizontal lines */}
                                            <pattern id="expanded-pattern-money-lent" patternUnits="userSpaceOnUse" width="6" height="6">
                                                <rect width="6" height="6" fill={WORTH_COLORS.moneyLent} />
                                                <line x1="0" y1="3" x2="6" y2="3" stroke="#dc2626" strokeWidth="1" opacity="0.25" />
                                            </pattern>
                                        </defs>
                                        
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
                                            {chartData.map((entry, index) => {
                                                let patternUrl = entry.color; // Default to solid color
                                                
                                                // Map entry names to expanded pattern URLs
                                                if (entry.name === 'Bank Balance') {
                                                    patternUrl = 'url(#expanded-pattern-accounts)';
                                                } else if (entry.name === 'Investments') {
                                                    patternUrl = 'url(#expanded-pattern-investments)';
                                                } else if (entry.name === 'Money Lent') {
                                                    patternUrl = 'url(#expanded-pattern-money-lent)';
                                                }
                                                
                                                return (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={patternUrl}
                                                        stroke={entry.color}
                                                        strokeWidth={1}
                                                    />
                                                );
                                            })}
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
                        )}
                    </div>
                </div>
            )}

            {/* Asset Details Sections */}
            {sections.map((section) => {
                // Get all items for this section type (including excluded ones)
                let allSectionItems: any[] = [];
                let entityType: 'ACCOUNT' | 'INVESTMENT' | 'DEBT' = 'ACCOUNT';
                
                if (section.key === 'accounts') {
                    allSectionItems = allAccounts || [];
                    entityType = 'ACCOUNT';
                } else if (section.key === 'investments') {
                    allSectionItems = allInvestments || [];
                    entityType = 'INVESTMENT';
                } else if (section.key === 'debts') {
                    allSectionItems = (allDebts || []).filter((debt: any) => 
                        debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID'
                    );
                    entityType = 'DEBT';
                }
                
                return (
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
                                        {formatCurrency(section.value, currency)}
                                        {section.value > 0 && ` (${section.percentage.toFixed(1)}% of total assets)`}
                                        {section.value === 0 && allSectionItems.length > 0 && (
                                            <span className="text-gray-500 ml-2">
                                                (All items hidden from net worth)
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="text-gray-400">
                                {expandedSections[section.key as SectionKey] ? '▼' : '▶'}
                            </div>
                        </div>
                        
                        {expandedSections[section.key as SectionKey] && (
                            <div className="p-6">
                                {allSectionItems.length === 0 ? (
                                    <p className={`${emptyMessage} text-center py-4`}>No items in this category</p>
                                ) : (
                                    <>
                                        <div className="space-y-3">
                                        {allSectionItems.map((item: any, index: number) => {
                                            // Check if this item is included in net worth
                                            const inclusionMap = entityType === 'ACCOUNT' ? inclusionMaps.accounts :
                                                               entityType === 'INVESTMENT' ? inclusionMaps.investments :
                                                               inclusionMaps.debts;
                                            const isIncluded = inclusionMap.get(item.id) ?? true; // Default to included if no record exists
                                            
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
                                            
                                            // Check if this item is currently being updated
                                            const itemKey = getItemKey(entityType, item.id);
                                            const isUpdating = updatingItems.has(itemKey);
                                            
                                            return (
                                                <div 
                                                    key={item.id || index} 
                                                    className="relative"
                                                >
                                                    <div 
                                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                                                            isIncluded 
                                                                ? 'bg-gray-50 border-gray-200' 
                                                                : 'bg-gray-100 border-gray-300 opacity-60'
                                                        } ${isUpdating ? 'border-blue-400 shadow-sm' : ''}`}
                                                    >
                                                        {/* Eye icon toggle for inclusion/exclusion */}
                                                        <div className="flex-shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={isUpdating}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleToggleInclusion(entityType, item.id, isIncluded);
                                                                }}
                                                                className={`p-1 rounded-md transition-all ${
                                                                    isUpdating 
                                                                        ? 'cursor-wait opacity-50' 
                                                                        : 'cursor-pointer hover:bg-gray-200'
                                                                }`}
                                                                title={isIncluded ? "Exclude from net worth" : "Include in net worth"}
                                                            >
                                                                {isIncluded ? (
                                                                    <Eye className="w-5 h-5 text-blue-600" />
                                                                ) : (
                                                                    <EyeOff className="w-5 h-5 text-gray-400" />
                                                                )}
                                                            </button>
                                                        </div>
                                                        
                                                        <div className="flex-1 flex justify-between items-center">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                <h4 className={`font-medium ${TEXT_COLORS.cardTitle} ${!isIncluded ? 'text-gray-400 line-through' : ''}`}>
                                                                    {item.holderName || item.name || item.borrowerName || 'Unknown'}
                                                                </h4>
                                                                {!isIncluded && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                                                                        <EyeOff className="w-3 h-3" />
                                                                        Hidden
                                                                    </span>
                                                                )}
                                                                    {section.key === 'debts' && (
                                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                            {item.status === 'ACTIVE' ? 'ACTIVE' : 'PARTIALLY PAID'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className={`${cardSubtitle} ${!isIncluded ? 'text-gray-400' : ''}`}>
                                                                    {item.bankName || item.symbol || item.purpose || 'No description'}
                                                                </p>
                                                                {section.key === 'debts' && item.dueDate && (
                                                                    <p className={`text-xs font-medium mt-1 ${!isIncluded ? 'text-gray-400' : 'text-orange-600'}`}>
                                                                        Due: {formatDate(new Date(item.dueDate))}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`font-semibold ${!isIncluded ? 'text-gray-400 line-through' : TEXT_COLORS.cardTitle}`}>
                                                                    {formatCurrency(itemValue, currency)}
                                                                </p>
                                                                {isIncluded && (
                                                                    <p className={`text-xs ${blueIcon} font-medium`}>
                                                                        {itemPercentage}%
                                                                    </p>
                                                                )}
                                                                {section.key === 'investments' && (
                                                                    <p className={`text-xs ${!isIncluded ? 'text-gray-400' : getGainLossClasses(item.currentPrice - item.purchasePrice)}`}>
                                                                        {((item.currentPrice - item.purchasePrice) / item.purchasePrice * 100).toFixed(1)}% gain/loss
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Loading indicator below the item */}
                                                    {isUpdating && (
                                                        <div className="relative mt-2 mb-1 px-2">
                                                            {/* Loading bar with animation */}
                                                            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 rounded-full animate-shimmer"></div>
                                                            </div>
                                                            {/* Status text */}
                                                            <div className="flex items-center justify-center gap-2 mt-2">
                                                                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                                                <span className="text-xs text-blue-600 font-medium">
                                                                    Updating net worth calculations...
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
} 