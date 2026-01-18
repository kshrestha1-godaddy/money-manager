"use client";

import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useCurrency } from "../../../providers/CurrencyProvider";
import { formatCurrency, getCurrencySymbol } from "../../../utils/currency";
import { formatDate } from "../../../utils/date";
import { getNetworthHistory } from "../actions/networth-history";
import { TrendingUp, TrendingDown, Calendar, Activity, Save, RefreshCw } from "lucide-react";
import { 
    getGainLossClasses,
    BUTTON_COLORS,
    TEXT_COLORS,
    CONTAINER_COLORS,
    LOADING_COLORS,
} from "../../../config/colorConfig";

// Extract color variables for better readability
const whiteContainer = CONTAINER_COLORS.whiteWithPadding;
const errorContainer = CONTAINER_COLORS.error;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

const errorTitle = TEXT_COLORS.errorTitle;
const errorMessage = TEXT_COLORS.errorMessage;
const chartTitle = TEXT_COLORS.chartTitle;
const cardTitle = TEXT_COLORS.cardTitle;
const cardValue = TEXT_COLORS.cardValue;
const cardSubtitle = TEXT_COLORS.cardSubtitle;
const emptyTitle = TEXT_COLORS.emptyTitle;
const emptyMessage = TEXT_COLORS.emptyMessage;

const primaryButton = BUTTON_COLORS.primary;

interface ChartDataPoint {
    date: string;
    netWorth: number;
    totalAssets: number;
    totalAccountBalance: number;
    totalInvestmentValue: number;
    totalMoneyLent: number;
    formattedDate: string;
    recordType: string;
}

interface NetworthHistoryChartProps {
    className?: string;
    onRecordNetworth?: () => void;
    isRecording?: boolean;
    refreshTrigger?: number;
}

export function NetworthHistoryChart({ 
    className = "", 
    onRecordNetworth, 
    isRecording = false,
    refreshTrigger = 0
}: NetworthHistoryChartProps) {
    const { currency } = useCurrency();
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<'30' | '90' | '180' | '365' | 'all'>('90');
    const [retryKey, setRetryKey] = useState(0);

    // Chart statistics
    const [stats, setStats] = useState({
        totalGrowth: 0,
        totalGrowthPercentage: 0,
        averageMonthlyGrowth: 0,
        highestNetWorth: 0,
        lowestNetWorth: 0,
        daysTracked: 0,
        latestNetWorth: 0,
        previousNetWorth: 0,
        recentChange: 0,
        recentChangePercentage: 0
    });

    const divergence = stats.highestNetWorth - stats.lowestNetWorth;
    const divergencePercentage = stats.lowestNetWorth > 0 ? (divergence / stats.lowestNetWorth) * 100 : 0;

    useEffect(() => {
        let isActive = true;

        const loadNetworthHistory = async () => {
            setLoading(true);
            setError(null);

            try {
                const endDate = new Date();
                const startDate = new Date();

                if (selectedPeriod !== 'all') {
                    startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));
                } else {
                    startDate.setFullYear(startDate.getFullYear() - 2);
                }

                const result = await getNetworthHistory(startDate, endDate, 365);
                if (!isActive) return;

                if (result.success && result.data) {
                    const historyData = result.data.sort((a, b) =>
                        new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
                    );

                    const transformedData: ChartDataPoint[] = historyData.map(record => ({
                        date: record.snapshotDate.toISOString().split('T')[0] || '',
                        netWorth: record.netWorth,
                        totalAssets: record.totalAssets,
                        totalAccountBalance: record.totalAccountBalance,
                        totalInvestmentValue: record.totalInvestmentValue,
                        totalMoneyLent: record.totalMoneyLent,
                        formattedDate: formatDate(record.snapshotDate),
                        recordType: record.recordType as string
                    }));

                    setChartData(transformedData);

                    if (transformedData.length > 0) {
                        const sortedByNetWorth = [...transformedData].sort((a, b) => a.netWorth - b.netWorth);
                        const latest = transformedData[transformedData.length - 1];
                        const first = transformedData[0];
                        const previous = transformedData.length > 1 ? transformedData[transformedData.length - 2] : first;

                        if (latest && first && previous) {
                            const totalGrowth = latest.netWorth - first.netWorth;
                            const totalGrowthPercentage = first.netWorth !== 0 ? (totalGrowth / first.netWorth) * 100 : 0;
                            const daysDiff = Math.max(1, Math.ceil((new Date(latest.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)));
                            const monthlyGrowthRate = daysDiff > 30 ? (totalGrowthPercentage / daysDiff) * 30 : totalGrowthPercentage;

                            const recentChange = latest.netWorth - previous.netWorth;
                            const recentChangePercentage = previous.netWorth !== 0 ? (recentChange / previous.netWorth) * 100 : 0;

                            setStats({
                                totalGrowth,
                                totalGrowthPercentage,
                                averageMonthlyGrowth: monthlyGrowthRate,
                                highestNetWorth: sortedByNetWorth[sortedByNetWorth.length - 1]?.netWorth || 0,
                                lowestNetWorth: sortedByNetWorth[0]?.netWorth || 0,
                                daysTracked: daysDiff,
                                latestNetWorth: latest.netWorth,
                                previousNetWorth: previous.netWorth,
                                recentChange,
                                recentChangePercentage
                            });
                        }
                    }
                } else {
                    setError(result.error || "Failed to load net worth history");
                }
            } catch (err) {
                console.error("Error loading net worth history:", err);
                setError("Failed to load net worth history");
            } finally {
                if (isActive) setLoading(false);
            }
        };

        loadNetworthHistory();
        return () => {
            isActive = false;
        };
    }, [selectedPeriod, refreshTrigger, retryKey]);

    // Format currency for abbreviated display
    const formatCurrencyAbbreviated = (amount: number) => {
        if (Math.abs(amount) >= 1000000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000000).toFixed(1)}M`;
        } else if (Math.abs(amount) >= 1000) {
            return `${getCurrencySymbol(currency)}${(amount / 1000).toFixed(1)}K`;
        }
        return formatCurrency(amount, currency);
    };

    const getYAxisDomain = () => {
        if (chartData.length === 0) return undefined;
        const values = chartData.map(point => point.netWorth);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const range = maxValue - minValue;
        const padding = range > 0 ? range * 0.08 : maxValue * 0.05;
        const lowerBound = minValue - padding;
        const upperBound = maxValue + padding;
        return [lowerBound, upperBound];
    };

    const yAxisDomain = getYAxisDomain();

    // Custom tooltip for the chart
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || payload.length === 0) return null;
        
        const data = payload[0].payload;
        
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64">
                <div className="font-bold text-gray-900 mb-2">
                    {data.formattedDate}
                </div>
                
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Net Worth:</span>
                        <span className="font-semibold text-blue-600">
                            {formatCurrency(data.netWorth, currency)}
                        </span>
                    </div>
                    
                    <div className="flex justify-between">
                        <span className="text-gray-600">Bank Balance:</span>
                        <span className="font-medium text-green-600">
                            {formatCurrency(data.totalAccountBalance, currency)}
                        </span>
                    </div>
                    
                    <div className="flex justify-between">
                        <span className="text-gray-600">Investments:</span>
                        <span className="font-medium text-blue-600">
                            {formatCurrency(data.totalInvestmentValue, currency)}
                        </span>
                    </div>
                    
                    <div className="flex justify-between">
                        <span className="text-gray-600">Money Lent:</span>
                        <span className="font-medium text-red-600">
                            {formatCurrency(data.totalMoneyLent, currency)}
                        </span>
                    </div>
                    
                    <div className="border-t pt-2 flex justify-between items-center">
                        <span className="text-gray-600">Record Type:</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            data.recordType === 'MANUAL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                            {data.recordType === 'MANUAL' ? 'Manual' : 'Automatic'}
                        </span>
                    </div>
                </div>
            </div>
        );
    };


    // Initial loading state (only show full loading on first load)
    if (loading && chartData.length === 0) {
        return (
            <div className={`${whiteContainer} ${className}`}>
                <div className={loadingContainer}>
                    <div className={loadingSpinner}></div>
                    <p className={loadingText}>Loading net worth history...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`${whiteContainer} ${className}`}>
                <div className="p-8 text-center">
                    <div className={errorContainer}>
                        <h3 className={errorTitle}>Error Loading Net Worth History</h3>
                        <p className={errorMessage}>{error}</p>
                        <div className="flex gap-2 mt-4 justify-center">
                            <button 
                                onClick={() => setRetryKey(prev => prev + 1)} 
                                className={primaryButton}
                            >
                                Retry       
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Empty state
    if (chartData.length === 0) {
        return (
            <div className={`${whiteContainer} ${className}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 border-b border-gray-200">
                    {/* Period selector - on the left (disabled in empty state) */}
                    <div className="flex items-center gap-2 opacity-50">
                        {(['30', '90', '180', '365', 'all'] as const).map((period) => (
                            <button
                                key={period}
                                disabled
                                className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-400 cursor-not-allowed"
                            >
                                {period === 'all' ? 'All' : period === '180' ? '6mo' : `${period}d`}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                        <h3 className={chartTitle}>Net Worth Over Time</h3>
                    </div>

                    {/* Record button - on the right */}
                    {onRecordNetworth && (
                        <button
                            onClick={onRecordNetworth}
                            disabled={isRecording}
                            className={`${primaryButton} flex items-center gap-2 ${isRecording ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {isRecording ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isRecording ? 'Recording...' : 'Record Now'}
                        </button>
                    )}
                </div>
                <div className="flex flex-col items-center justify-center h-96 w-full">
                    <div className="text-center max-w-md">
                        <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h4 className={emptyTitle}>No Net Worth History</h4>
                        <p className={emptyMessage}>
                            Start recording your net worth to see your financial progress over time. 
                            Click the "Record Now" button above to create your first snapshot.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${whiteContainer} ${className}`}>
            <div className="flex-1 text-center sm:text-left">
                <h3 className={chartTitle}>Net Worth Over Time</h3>
            </div>
            
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 border-b border-gray-200">
                {/* Period selector - on the left */}
                <div className="flex items-center gap-2">
                    {(['30', '90', '180', '365', 'all'] as const).map((period) => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${
                                selectedPeriod === period
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {period === 'all' ? 'All' : period === '180' ? '6mo' : `${period}d`}
                        </button>
                    ))}
                </div>



                {/* Record button - on the right */}
                {onRecordNetworth && (
                    <button
                        onClick={onRecordNetworth}
                        disabled={isRecording}
                        className={`${primaryButton} flex items-center gap-2 ${isRecording ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {isRecording ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            "Record Now"
                        )}
                    </button>
                )}

            </div>

            {/* Stats cards - arranged to tell a story */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-gray-50 border-b border-gray-200">
                {/* 1. Time Context - How long have we been tracking */}
                <div className="text-center">
                    <div className={`flex items-center justify-center gap-2 mb-1`}>
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className={`${cardTitle} text-xs`}>Days Tracked</span>
                    </div>
                    <p className={`font-bold text-base ${cardValue}`}>
                        {stats.daysTracked}
                    </p>
                    <p className={`text-xs ${cardSubtitle}`}>
                        {stats.averageMonthlyGrowth >= 0 ? '+' : ''}{stats.averageMonthlyGrowth.toFixed(1)}% monthly avg
                    </p>
                </div>

                {/* 2. Overall Progress - The main story */}
                <div className="text-center">
                    <div className={`flex items-center justify-center gap-2 mb-1`}>
                        {stats.totalGrowthPercentage >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`${cardTitle} text-xs`}>Total Growth</span>
                    </div>
                    <p className={`font-bold text-base ${getGainLossClasses(stats.totalGrowth)}`}>
                        {stats.totalGrowthPercentage >= 0 ? '+' : ''}{stats.totalGrowthPercentage.toFixed(1)}%
                    </p>
                    <p className={`text-xs ${cardSubtitle}`}>
                        {formatCurrencyAbbreviated(stats.totalGrowth)}
                    </p>
                </div>

                {/* 3. Peak Achievement - Highest point reached */}
                <div className="text-center">
                    <div className={`flex items-center justify-center gap-2 mb-1`}>
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className={`${cardTitle} text-xs`}>Peak Worth</span>
                    </div>
                    <p className="font-bold text-base text-gray-900">{formatCurrencyAbbreviated(stats.highestNetWorth)}</p>
                    <p className={`text-xs ${cardSubtitle}`}>
                        All-time high
                    </p>
                </div>

                {/* 4. Lowest Point - For perspective */}
                <div className="text-center">
                    <div className={`flex items-center justify-center gap-2 mb-1`}>
                        <TrendingDown className="w-4 h-4 text-orange-600" />
                        <span className={`${cardTitle} text-xs`}>Least Worth</span>
                    </div>
                    <p className="font-bold text-base text-gray-900">{formatCurrencyAbbreviated(stats.lowestNetWorth)}</p>
                    <p className={`text-xs ${cardSubtitle}`}>
                        All-time low
                    </p>
                </div>

                {/* 5. Journey Range - The magnitude of the journey */}
                <div className="text-center">
                    <div className={`flex items-center justify-center gap-2 mb-1`}>
                        <Activity className="w-4 h-4 text-purple-600" />
                        <span className={`${cardTitle} text-xs`}>Range</span>
                    </div>
                    <p className="font-bold text-base">{formatCurrencyAbbreviated(divergence)}</p>
                    <p className={`text-xs ${divergencePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {divergencePercentage >= 0 ? '+' : ''}{divergencePercentage.toFixed(1)}% span
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="p-2">
                <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return `${date.getMonth() + 1}/${date.getDate()}`;
                                }}
                            />
                            <YAxis 
                                tick={{ fontSize: 12 }}
                                tickFormatter={formatCurrencyAbbreviated}
                                domain={yAxisDomain}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            
                            {/* Reference line for zero (if applicable) */}
                            {stats.lowestNetWorth < 0 && (
                                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="2 2" />
                            )}
                            {stats.highestNetWorth > 0 && (
                                <ReferenceLine
                                    y={stats.highestNetWorth}
                                    stroke="#10b981"
                                    strokeDasharray="4 4"
                                />
                            )}
                            {stats.lowestNetWorth > 0 && (
                                <ReferenceLine
                                    y={stats.lowestNetWorth}
                                    stroke="#f97316"
                                    strokeDasharray="4 4"
                                />
                            )}
                            
                            {/* Net worth line */}
                            <Line
                                type="monotone"
                                dataKey="netWorth"
                                stroke="#6b7280"
                                strokeWidth={3}
                                dot={{ fill: "#6b7280", strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: "#6b7280", strokeWidth: 2, fill: "#ffffff" }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}