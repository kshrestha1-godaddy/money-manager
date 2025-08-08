"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine, Legend } from 'recharts';
import { Income, Expense, Category } from "../../types/financial";
import { getIncomes } from "../incomes/actions/incomes";
import { getExpenses } from "../expenses/actions/expenses";
import { getCategories } from "../../actions/categories";
import { useCurrency } from "../../providers/CurrencyProvider";
import { formatCurrency } from "../../utils/currency";
import { formatDate } from "../../utils/date";
import { 
    getSummaryCardClasses,
    BUTTON_COLORS,
    TEXT_COLORS,
    CONTAINER_COLORS,
    LOADING_COLORS,
    UI_STYLES,
} from "../../config/colorConfig";

// Extract color variables for better readability
const pageContainer = CONTAINER_COLORS.page;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

const pageTitle = TEXT_COLORS.title;
const pageSubtitle = TEXT_COLORS.subtitle;
const emptyTitle = TEXT_COLORS.emptyTitle;
const emptyMessage = TEXT_COLORS.emptyMessage;

type SortField = 'category' | 'period1' | 'period2' | 'delta';
type SortDirection = 'asc' | 'desc';

interface ComparisonPeriod {
    label: string;
    value: string;
    getPeriods: () => { period1: { start: Date; end: Date; label: string }, period2: { start: Date; end: Date; label: string } };
}

interface PeriodData {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    incomeByCategory: Record<string, number>;
    expensesByCategory: Record<string, number>;
    savingsRate: number;
}

interface ComparisonData {
    period1: PeriodData & { label: string };
    period2: PeriodData & { label: string };
}

const COMPARISON_PERIODS: ComparisonPeriod[] = [
    {
        label: "Past week vs. previous week",
        value: "week_vs_prev_week",
        getPeriods: () => {
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            
            return {
                period1: {
                    start: oneWeekAgo,
                    end: now,
                    label: `Past Week (${oneWeekAgo.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en', { month: 'short', day: 'numeric' })})`
                },
                period2: {
                    start: twoWeeksAgo,
                    end: oneWeekAgo,
                    label: `Previous Week (${twoWeeksAgo.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${oneWeekAgo.toLocaleDateString('en', { month: 'short', day: 'numeric' })})`
                }
            };
        }
    },
    {
        label: "Past 2 weeks vs. same period last year",
        value: "2weeks_vs_last_year",
        getPeriods: () => {
            const now = new Date();
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            const lastYearSameEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            const lastYearSameStart = new Date(lastYearSameEnd.getTime() - 14 * 24 * 60 * 60 * 1000);
            
            return {
                period1: {
                    start: twoWeeksAgo,
                    end: now,
                    label: `Past 2 Weeks ${now.getFullYear()} (${twoWeeksAgo.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en', { month: 'short', day: 'numeric' })})`
                },
                period2: {
                    start: lastYearSameStart,
                    end: lastYearSameEnd,
                    label: `Same Period ${lastYearSameEnd.getFullYear()} (${lastYearSameStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${lastYearSameEnd.toLocaleDateString('en', { month: 'short', day: 'numeric' })})`
                }
            };
        }
    },
    {
        label: "Latest month vs. previous month",
        value: "month_vs_prev_month",
        getPeriods: () => {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            
            return {
                period1: {
                    start: thisMonthStart,
                    end: thisMonthEnd,
                    label: thisMonthStart.toLocaleDateString('en', { month: 'long', year: 'numeric' })
                },
                period2: {
                    start: lastMonthStart,
                    end: lastMonthEnd,
                    label: lastMonthStart.toLocaleDateString('en', { month: 'long', year: 'numeric' })
                }
            };
        }
    },
    {
        label: "Latest month vs. same month last year",
        value: "month_vs_last_year",
        getPeriods: () => {
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const lastYearSameMonthStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
            const lastYearSameMonthEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
            
            return {
                period1: {
                    start: thisMonthStart,
                    end: thisMonthEnd,
                    label: thisMonthStart.toLocaleDateString('en', { month: 'long', year: 'numeric' })
                },
                period2: {
                    start: lastYearSameMonthStart,
                    end: lastYearSameMonthEnd,
                    label: lastYearSameMonthStart.toLocaleDateString('en', { month: 'long', year: 'numeric' })
                }
            };
        }
    },
    {
        label: "Current quarter vs. previous quarter",
        value: "quarter_vs_prev_quarter",
        getPeriods: () => {
            const now = new Date();
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const currentQuarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
            const currentQuarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
            
            const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
            const prevQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
            const prevQuarterStart = new Date(prevQuarterYear, prevQuarter * 3, 1);
            const prevQuarterEnd = new Date(prevQuarterYear, (prevQuarter + 1) * 3, 0);
            
            const getQuarterName = (quarter: number, year: number) => `Q${quarter + 1} ${year}`;
            
            return {
                period1: {
                    start: currentQuarterStart,
                    end: currentQuarterEnd,
                    label: getQuarterName(currentQuarter, now.getFullYear())
                },
                period2: {
                    start: prevQuarterStart,
                    end: prevQuarterEnd,
                    label: getQuarterName(prevQuarter, prevQuarterYear)
                }
            };
        }
    },
    {
        label: "Current quarter vs. same quarter last year",
        value: "quarter_vs_last_year",
        getPeriods: () => {
            const now = new Date();
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const currentQuarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
            const currentQuarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
            
            const lastYearQuarterStart = new Date(now.getFullYear() - 1, currentQuarter * 3, 1);
            const lastYearQuarterEnd = new Date(now.getFullYear() - 1, (currentQuarter + 1) * 3, 0);
            
            const getQuarterName = (quarter: number, year: number) => `Q${quarter + 1} ${year}`;
            
            return {
                period1: {
                    start: currentQuarterStart,
                    end: currentQuarterEnd,
                    label: getQuarterName(currentQuarter, now.getFullYear())
                },
                period2: {
                    start: lastYearQuarterStart,
                    end: lastYearQuarterEnd,
                    label: getQuarterName(currentQuarter, now.getFullYear() - 1)
                }
            };
        }
    },
    {
        label: "Past 3 months vs. same period last year",
        value: "3months_vs_last_year",
        getPeriods: () => {
            const now = new Date();
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            
            const lastYearThreeMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth() - 2, 1);
            const lastYearLastMonthEnd = new Date(now.getFullYear() - 1, now.getMonth(), 0);
            
            return {
                period1: {
                    start: threeMonthsAgo,
                    end: lastMonthEnd,
                    label: `${threeMonthsAgo.toLocaleDateString('en', { month: 'short', year: 'numeric' })} to ${lastMonthEnd.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`
                },
                period2: {
                    start: lastYearThreeMonthsAgo,
                    end: lastYearLastMonthEnd,
                    label: `${lastYearThreeMonthsAgo.toLocaleDateString('en', { month: 'short', year: 'numeric' })} to ${lastYearLastMonthEnd.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`
                }
            };
        }
    },
    {
        label: "Past 6 months vs. same period last year",
        value: "6months_vs_last_year",
        getPeriods: () => {
            const now = new Date();
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            
            const lastYearSixMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth() - 5, 1);
            const lastYearLastMonthEnd = new Date(now.getFullYear() - 1, now.getMonth(), 0);
            
            return {
                period1: {
                    start: sixMonthsAgo,
                    end: lastMonthEnd,
                    label: `${sixMonthsAgo.toLocaleDateString('en', { month: 'short', year: 'numeric' })} to ${lastMonthEnd.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`
                },
                period2: {
                    start: lastYearSixMonthsAgo,
                    end: lastYearLastMonthEnd,
                    label: `${lastYearSixMonthsAgo.toLocaleDateString('en', { month: 'short', year: 'numeric' })} to ${lastYearLastMonthEnd.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`
                }
            };
        }
    },
    {
        label: "Past 12 months vs. previous 12 months",
        value: "12months_vs_prev_12months",
        getPeriods: () => {
            const now = new Date();
            const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            
            const twentyFourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 23, 1);
            const thirteenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 0);
            
            return {
                period1: {
                    start: twelveMonthsAgo,
                    end: lastMonthEnd,
                    label: `${twelveMonthsAgo.toLocaleDateString('en', { month: 'short', year: 'numeric' })} to ${lastMonthEnd.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`
                },
                period2: {
                    start: twentyFourMonthsAgo,
                    end: thirteenMonthsAgo,
                    label: `${twentyFourMonthsAgo.toLocaleDateString('en', { month: 'short', year: 'numeric' })} to ${thirteenMonthsAgo.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`
                }
            };
        }
    },
    {
        label: "Year to date vs. same period last year",
        value: "ytd_vs_last_year",
        getPeriods: () => {
            const now = new Date();
            const yearStart = new Date(now.getFullYear(), 0, 1);
            const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
            const lastYearSameDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            
            // Create more descriptive labels
            const currentYearLabel = `${yearStart.getFullYear()} Year-to-Date (${yearStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en', { month: 'short', day: 'numeric' })})`;
            const lastYearLabel = `${lastYearStart.getFullYear()} Year-to-Date (${lastYearStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${lastYearSameDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })})`;
            
            return {
                period1: {
                    start: yearStart,
                    end: now,
                    label: currentYearLabel
                },
                period2: {
                    start: lastYearStart,
                    end: lastYearSameDate,
                    label: lastYearLabel
                }
            };
        }
    },
    {
        label: "Custom date range",
        value: "custom",
        getPeriods: () => {
            // This will be handled by custom state
            return {
                period1: { start: new Date(), end: new Date(), label: "Period 1" },
                period2: { start: new Date(), end: new Date(), label: "Period 2" }
            };
        }
    }
];

// Simple chart component following dashboard pattern - receives minimal props
interface ComparisonChartProps {
    period1Income: number;
    period1Expenses: number;
    period1Savings: number;
    period2Income: number;
    period2Expenses: number;
    period2Savings: number;
    period1Label: string;
    period2Label: string;
    currency: string;
}

function ComparisonChart({ 
    period1Income, 
    period1Expenses, 
    period1Savings,
    period2Income, 
    period2Expenses, 
    period2Savings,
    period1Label, 
    period2Label,
    currency 
}: ComparisonChartProps) {
    // Create chart data inside the component - this is the only thing that changes
    const data = [
        {
            name: "Income",
            period1: period1Income,
            period2: period2Income
        },
        {
            name: "Expenses", 
            period1: period1Expenses,
            period2: period2Expenses
        },
        {
            name: "Savings",
            period1: period1Savings,
            period2: period2Savings
        }
    ];

    // Simple formatting functions
    const formatDataLabel = (value: number) => {
        if (value === 0) return '';
        if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
        return Math.abs(value) >= 100 ? Math.round(value).toString() : formatCurrency(value, currency);
    };

    const formatYAxisTick = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
        return value.toString();
    };

    // Calculate percentage change for labels
    const calculatePercentageChange = (current: number, previous: number): string => {
        if (previous === 0) {
            return current > 0 ? '+∞%' : current < 0 ? '-∞%' : '0%';
        }
        const change = ((current - previous) / Math.abs(previous)) * 100;
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(1)}%`;
    };

    // Custom label component to show percentage between bars
    const PercentageLabel = ({ payload, x, y, width, height }: any) => {
        if (!payload) return null;
        
        const period1Value = payload.period1 || 0;
        const period2Value = payload.period2 || 0;
        const percentageChange = calculatePercentageChange(period1Value, period2Value);
        
        // Position the label between the two bars
        const labelX = x + width / 2;
        const labelY = y - 5; // Slightly above the bars
        
        // Color based on change
        const isPositive = period1Value > period2Value;
        const color = isPositive ? '#059669' : period1Value < period2Value ? '#dc2626' : '#6b7280';
        
        return (
            <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                fill={color}
                fontSize="11"
                fontWeight="bold"
            >
                {percentageChange}
            </text>
        );
    };

    return (
        <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 60, right: 30, left: 20, bottom: 60 }}
                    barCategoryGap="30%"
                    barGap="1%"
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12, fontWeight: 500 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                    />
                    <YAxis 
                        tick={{ fontSize: 11 }}
                        axisLine={{ stroke: '#d1d5db' }}
                        tickLine={{ stroke: '#d1d5db' }}
                        tickFormatter={formatYAxisTick}
                    />
                    <Tooltip 
                        formatter={(value: number, name: string, props: any) => [
                            formatCurrency(value, currency),
                            props.dataKey === 'period1' ? period1Label : period2Label
                        ]}
                        labelFormatter={(label) => `${label} Comparison`}
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                    />
                    
                    <Legend 
                        verticalAlign="top" 
                        height={60}
                        iconType="rect"
                        wrapperStyle={{
                            paddingBottom: '20px',
                            fontSize: '13px',
                            fontWeight: '500',
                            lineHeight: '1.4'
                        }}
                    />
                    
                    <ReferenceLine y={0} stroke="#374151" strokeWidth={2} />
                    
                    <Bar 
                        dataKey="period1" 
                        name={period1Label}
                        fill="#8b5cf6" 
                        radius={[2, 2, 0, 0]}
                        maxBarSize={80}
                    >
                        <LabelList 
                            dataKey="period1" 
                            position="top" 
                            formatter={formatDataLabel}
                            style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                fill: '#374151'
                            }}
                        />
                    </Bar>
                    <Bar 
                        dataKey="period2" 
                        name={period2Label}
                        fill="#64748b" 
                        radius={[2, 2, 0, 0]}
                        maxBarSize={80}
                    >
                        <LabelList 
                            dataKey="period2" 
                            position="top" 
                            formatter={formatDataLabel}
                            style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                fill: '#374151'
                            }}
                        />
                        {/* Add percentage change labels on period2 bar */}
                        <LabelList 
                            content={(props: any) => {
                                const { payload, x, y, width } = props;
                                if (!payload) return null;
                                
                                const period1Value = payload.period1 || 0;
                                const period2Value = payload.period2 || 0;
                                const percentageChange = calculatePercentageChange(period1Value, period2Value);
                                
                                // Position the label above the highest bar
                                const maxValue = Math.max(period1Value, period2Value);
                                const labelX = x + width / 2;
                                const labelY = y - 35; // Above the value labels
                                
                                // Color based on change
                                const isPositive = period1Value > period2Value;
                                const color = isPositive ? '#059669' : period1Value < period2Value ? '#dc2626' : '#6b7280';
                                
                                return (
                                    <text
                                        x={labelX}
                                        y={labelY}
                                        textAnchor="middle"
                                        fill={color}
                                        fontSize="12"
                                        fontWeight="bold"
                                        style={{
                                            textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
                                        }}
                                    >
                                        {percentageChange}
                                    </text>
                                );
                            }}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function History() {
    const { data: session } = useSession();
    const { currency } = useCurrency();
    
    const [selectedPeriod, setSelectedPeriod] = useState<string>("3months_vs_last_year");
    const [loading, setLoading] = useState(true);
    const [allIncomes, setAllIncomes] = useState<Income[]>([]);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    
    // Custom date range states
    const [customPeriod1Start, setCustomPeriod1Start] = useState<string>("");
    const [customPeriod1End, setCustomPeriod1End] = useState<string>("");
    const [customPeriod2Start, setCustomPeriod2Start] = useState<string>("");
    const [customPeriod2End, setCustomPeriod2End] = useState<string>("");

    // Sorting state for income table
    const [incomeSortField, setIncomeSortField] = useState<SortField>('delta');
    const [incomeSortDirection, setIncomeSortDirection] = useState<SortDirection>('desc');

    // Sorting state for expense table
    const [expenseSortField, setExpenseSortField] = useState<SortField>('delta');
    const [expenseSortDirection, setExpenseSortDirection] = useState<SortDirection>('desc');

    // Column resizing state for income table
    const [incomeColumnWidths, setIncomeColumnWidths] = useState({
        category: 200,
        period1: 120,
        period2: 120,
        delta: 120
    });

    // Column resizing state for expense table
    const [expenseColumnWidths, setExpenseColumnWidths] = useState({
        category: 200,
        period1: 120,
        period2: 120,
        delta: 120
    });

    // Resizing state
    const [resizing, setResizing] = useState<{ table: 'income' | 'expense'; column: string } | null>(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    // Load ALL data once on mount - no dependencies on selectedPeriod
    useEffect(() => {
        const loadAllData = async () => {
            if (!session) return;
            try {
                setLoading(true);
                const [incomesData, expensesData, categoriesData] = await Promise.all([
                    getIncomes(),
                    getExpenses(),
                    getCategories()
                ]);
                setAllIncomes(incomesData);
                setAllExpenses(expensesData);
                setCategories(categoriesData);
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, [session]);

    // Filter data locally based on date range - same as dashboard pattern
    const getFilteredData = (data: (Income | Expense)[], startDate: Date, endDate: Date) => {
        return data.filter(item => {
            const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
            let matchesDateRange = true;
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchesDateRange = itemDate >= start && itemDate <= end;
            } else if (startDate) {
                const start = new Date(startDate);
                matchesDateRange = itemDate >= start;
            } else if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchesDateRange = itemDate <= end;
            }
            return matchesDateRange;
        });
    };

    // Calculate period data from filtered arrays
    const calculatePeriodDataFromArrays = (incomes: Income[], expenses: Expense[]): PeriodData => {
        const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalSavings = totalIncome - totalExpenses;
        const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

        const incomeByCategory: Record<string, number> = {};
        const expensesByCategory: Record<string, number> = {};

        incomes.forEach(income => {
            const categoryName = income.category.name;
            incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + income.amount;
        });

        expenses.forEach(expense => {
            const categoryName = expense.category.name;
            expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + expense.amount;
        });

        return {
            totalIncome,
            totalExpenses,
            totalSavings,
            incomeByCategory,
            expensesByCategory,
            savingsRate
        };
    };

    // Calculate comparison data locally - this doesn't trigger re-renders
    const comparisonData = useMemo(() => {
        if (loading || !allIncomes.length || !allExpenses.length) return null;
        
        let periods;
        
        if (selectedPeriod === 'custom') {
            if (!customPeriod1Start || !customPeriod1End || !customPeriod2Start || !customPeriod2End) {
                return null;
            }
            
            periods = {
                period1: {
                    start: new Date(customPeriod1Start),
                    end: new Date(customPeriod1End),
                    label: `${new Date(customPeriod1Start).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(customPeriod1End).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
                },
                period2: {
                    start: new Date(customPeriod2Start),
                    end: new Date(customPeriod2End),
                    label: `${new Date(customPeriod2Start).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(customPeriod2End).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`
                }
            };
        } else {
            const selectedComparisonPeriod = COMPARISON_PERIODS.find(p => p.value === selectedPeriod);
            if (!selectedComparisonPeriod) return null;
            periods = selectedComparisonPeriod.getPeriods();
        }
        
        // Filter data locally instead of re-fetching
        const period1Incomes = getFilteredData(allIncomes, periods.period1.start, periods.period1.end) as Income[];
        const period1Expenses = getFilteredData(allExpenses, periods.period1.start, periods.period1.end) as Expense[];
        const period2Incomes = getFilteredData(allIncomes, periods.period2.start, periods.period2.end) as Income[];
        const period2Expenses = getFilteredData(allExpenses, periods.period2.start, periods.period2.end) as Expense[];

        const period1Data = calculatePeriodDataFromArrays(period1Incomes, period1Expenses);
        const period2Data = calculatePeriodDataFromArrays(period2Incomes, period2Expenses);

        return {
            period1: { ...period1Data, label: periods.period1.label },
            period2: { ...period2Data, label: periods.period2.label }
        };
    }, [allIncomes, allExpenses, selectedPeriod, customPeriod1Start, customPeriod1End, customPeriod2Start, customPeriod2End, loading]);

    // Sorted categories for income table
    const sortedIncomeCategories = useMemo(() => {
        if (!comparisonData) return [];
        
        const allIncomeCategories = new Set([
            ...Object.keys(comparisonData.period1.incomeByCategory),
            ...Object.keys(comparisonData.period2.incomeByCategory)
        ]);

        return Array.from(allIncomeCategories).sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (incomeSortField) {
                case 'category':
                    aValue = a.toLowerCase();
                    bValue = b.toLowerCase();
                    break;
                case 'period1':
                    aValue = comparisonData.period1.incomeByCategory[a] || 0;
                    bValue = comparisonData.period1.incomeByCategory[b] || 0;
                    break;
                case 'period2':
                    aValue = comparisonData.period2.incomeByCategory[a] || 0;
                    bValue = comparisonData.period2.incomeByCategory[b] || 0;
                    break;
                case 'delta':
                    aValue = (comparisonData.period1.incomeByCategory[a] || 0) - (comparisonData.period2.incomeByCategory[a] || 0);
                    bValue = (comparisonData.period1.incomeByCategory[b] || 0) - (comparisonData.period2.incomeByCategory[b] || 0);
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) {
                return incomeSortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return incomeSortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [comparisonData, incomeSortField, incomeSortDirection]);

    // Sorted categories for expense table
    const sortedExpenseCategories = useMemo(() => {
        if (!comparisonData) return [];
        
        const allExpenseCategories = new Set([
            ...Object.keys(comparisonData.period1.expensesByCategory),
            ...Object.keys(comparisonData.period2.expensesByCategory)
        ]);

        return Array.from(allExpenseCategories).sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (expenseSortField) {
                case 'category':
                    aValue = a.toLowerCase();
                    bValue = b.toLowerCase();
                    break;
                case 'period1':
                    aValue = comparisonData.period1.expensesByCategory[a] || 0;
                    bValue = comparisonData.period1.expensesByCategory[b] || 0;
                    break;
                case 'period2':
                    aValue = comparisonData.period2.expensesByCategory[a] || 0;
                    bValue = comparisonData.period2.expensesByCategory[b] || 0;
                    break;
                case 'delta':
                    aValue = (comparisonData.period1.expensesByCategory[a] || 0) - (comparisonData.period2.expensesByCategory[a] || 0);
                    bValue = (comparisonData.period1.expensesByCategory[b] || 0) - (comparisonData.period2.expensesByCategory[b] || 0);
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) {
                return expenseSortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return expenseSortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [comparisonData, expenseSortField, expenseSortDirection]);

    // Format delta values - memoized
    const formatDelta = useCallback((current: number, previous: number) => {
        const delta = current - previous;
        const sign = delta >= 0 ? '+' : '';
        const percentage = previous !== 0 ? ((delta / Math.abs(previous)) * 100) : 0;
        
        return {
            value: `${sign}${formatCurrency(delta, currency)} (${sign}${percentage.toFixed(1)}%)`,
            isPositive: delta > 0,
            isNeutral: delta === 0
        };
    }, [currency, formatCurrency]);

    // Event handlers - memoized
    const handlePeriodChange = useCallback((value: string) => {
        setSelectedPeriod(value);
    }, []);

    const handleCustomDateChange = useCallback((field: string, value: string) => {
        switch (field) {
            case 'period1Start': setCustomPeriod1Start(value); break;
            case 'period1End': setCustomPeriod1End(value); break;
            case 'period2Start': setCustomPeriod2Start(value); break;
            case 'period2End': setCustomPeriod2End(value); break;
        }
    }, []);

    const setQuickPreset = useCallback((preset: string) => {
        const now = new Date();
        
        if (preset === 'last30vs30') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            setCustomPeriod1Start(thirtyDaysAgo.toISOString().split('T')[0] || '');
            setCustomPeriod1End(now.toISOString().split('T')[0] || '');
            setCustomPeriod2Start(sixtyDaysAgo.toISOString().split('T')[0] || '');
            setCustomPeriod2End(thirtyDaysAgo.toISOString().split('T')[0] || '');
        } else if (preset === 'quarterVsQuarter') {
            const thisQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            const lastQuarterEnd = new Date(thisQuarterStart.getTime() - 1);
            const lastQuarterStart = new Date(lastQuarterEnd.getFullYear(), Math.floor(lastQuarterEnd.getMonth() / 3) * 3, 1);
            setCustomPeriod1Start(thisQuarterStart.toISOString().split('T')[0] || '');
            setCustomPeriod1End(now.toISOString().split('T')[0] || '');
            setCustomPeriod2Start(lastQuarterStart.toISOString().split('T')[0] || '');
            setCustomPeriod2End(lastQuarterEnd.toISOString().split('T')[0] || '');
        }
    }, []);

    // Sorting handlers
    const handleIncomeSort = useCallback((field: SortField) => {
        if (incomeSortField === field) {
            setIncomeSortDirection(incomeSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setIncomeSortField(field);
            setIncomeSortDirection('asc');
        }
    }, [incomeSortField, incomeSortDirection]);

    const handleExpenseSort = useCallback((field: SortField) => {
        if (expenseSortField === field) {
            setExpenseSortDirection(expenseSortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setExpenseSortField(field);
            setExpenseSortDirection('asc');
        }
    }, [expenseSortField, expenseSortDirection]);

    // Column resizing handlers
    const handleMouseDown = useCallback((e: React.MouseEvent, table: 'income' | 'expense', column: string) => {
        e.preventDefault();
        setResizing({ table, column });
        setStartX(e.pageX);
        const currentWidths = table === 'income' ? incomeColumnWidths : expenseColumnWidths;
        setStartWidth(currentWidths[column as keyof typeof currentWidths]);
    }, [incomeColumnWidths, expenseColumnWidths]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizing) return;
        
        const diff = e.pageX - startX;
        const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px
        
        if (resizing.table === 'income') {
            setIncomeColumnWidths(prev => ({
                ...prev,
                [resizing.column]: newWidth
            }));
        } else {
            setExpenseColumnWidths(prev => ({
                ...prev,
                [resizing.column]: newWidth
            }));
        }
    }, [resizing, startX, startWidth]);

    const handleMouseUp = useCallback(() => {
        setResizing(null);
    }, []);

    // Add global mouse events for resizing
    useEffect(() => {
        if (resizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, handleMouseMove, handleMouseUp]);

    // Helper function to get sort icon
    const getSortIcon = (field: SortField, currentField: SortField, direction: SortDirection) => {
        if (currentField !== field) {
            return <span className="text-gray-400" aria-label="Sort">↕</span>;
        }
        return direction === 'asc' ? 
            <span className="text-blue-600" aria-label="Sorted ascending">↑</span> : 
            <span className="text-blue-600" aria-label="Sorted descending">↓</span>;
    };

    // Render loading skeleton instead of hiding components completely
    const renderLoadingSkeleton = () => (
        <>
            {/* Time Period Selection Skeleton */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded w-64"></div>
                </div>
            </div>

            {/* Chart Skeleton */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-64 mb-6"></div>
                    <div className="h-96 bg-gray-100 rounded"></div>
                </div>
            </div>

            {/* Summary Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-6">
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                            <div className="h-6 bg-gray-200 rounded w-20 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-12"></div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );

    // Loading state
    if (loading) {
        return (
            <div className={loadingContainer}>
                <div className={loadingSpinner}></div>
                <p className={loadingText}>Loading history data...</p>
            </div>
        );
    }

    if (!comparisonData) {
        return (
            <div className={pageContainer}>
                <h1 className={pageTitle}>History & Comparison</h1>
                <div className={UI_STYLES.empty.container}>
                    <div className={UI_STYLES.empty.icon}>📊</div>
                    <h3 className={emptyTitle}>No data available</h3>
                    <p className={emptyMessage}>Add some transactions to see your financial comparison.</p>
                </div>
            </div>
        );
    }

    const incomeDelta = comparisonData.period1.totalIncome - comparisonData.period2.totalIncome;
    const expensesDelta = comparisonData.period1.totalExpenses - comparisonData.period2.totalExpenses;
    const savingsDelta = comparisonData.period1.totalSavings - comparisonData.period2.totalSavings;
    const savingsRateDelta = comparisonData.period1.savingsRate - comparisonData.period2.savingsRate;

    // Combine all categories for comparison tables
    const allIncomeCategories = new Set([
        ...Object.keys(comparisonData.period1.incomeByCategory),
        ...Object.keys(comparisonData.period2.incomeByCategory)
    ]);

    const allExpenseCategories = new Set([
        ...Object.keys(comparisonData.period1.expensesByCategory),
        ...Object.keys(comparisonData.period2.expensesByCategory)
    ]);

    return (
        <div className={pageContainer}>
            {/* Header */}
            <div className={UI_STYLES.header.container}>
                <div>
                    <h1 className={pageTitle}>History & Comparison</h1>
                    <p className={pageSubtitle}>Compare your financial performance across different time periods</p>
                </div>
            </div>

            {/* Time Period Selection */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">Time period comparison:</label>
                    <select
                        value={selectedPeriod}
                        onChange={(e) => handlePeriodChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-yellow-50"
                    >
                        {COMPARISON_PERIODS.map((period) => (
                            <option key={period.value} value={period.value}>
                                {period.label}
                            </option>
                        ))}
                    </select>
                </div>
                
                {/* Custom Date Range Selection */}
                {selectedPeriod === 'custom' && (
                    <div className="mt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Period 1 */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-blue-900 mb-3">Period 1</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-blue-700 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={customPeriod1Start}
                                            onChange={(e) => handleCustomDateChange('period1Start', e.target.value)}
                                            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-blue-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={customPeriod1End}
                                            onChange={(e) => handleCustomDateChange('period1End', e.target.value)}
                                            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Period 2 */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Period 2</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={customPeriod2Start}
                                            onChange={(e) => handleCustomDateChange('period2Start', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={customPeriod2End}
                                            onChange={(e) => handleCustomDateChange('period2End', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Quick Custom Date Presets */}
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                            <span className="text-xs font-medium text-gray-600">Quick presets:</span>
                            <button
                                onClick={() => setQuickPreset('last30vs30')}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
                            >
                                Last 30 vs Previous 30 days
                            </button>
                            <button
                                onClick={() => setQuickPreset('quarterVsQuarter')}
                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
                            >
                                This quarter vs Last quarter
                            </button>
                        </div>
                    </div>
                )}
                
                {comparisonData && (
                    <div className="mt-4 text-sm text-gray-600">
                        <span className="font-medium">Comparing:</span> {comparisonData.period1.label} <span className="italic">versus</span> {comparisonData.period2.label}
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-600">Total Income</h3>
                    <div className="mt-2">
                        <div className="text-lg font-semibold">{formatCurrency(comparisonData.period1.totalIncome, currency)}</div>
                        <div className="text-sm text-gray-500">{formatCurrency(comparisonData.period2.totalIncome, currency)}</div>
                        <div className={`text-sm font-medium ${incomeDelta > 0 ? 'text-green-600' : incomeDelta < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            {formatDelta(comparisonData.period1.totalIncome, comparisonData.period2.totalIncome).value}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-600">Total Expenses</h3>
                    <div className="mt-2">
                        <div className="text-lg font-semibold">{formatCurrency(comparisonData.period1.totalExpenses, currency)}</div>
                        <div className="text-sm text-gray-500">{formatCurrency(comparisonData.period2.totalExpenses, currency)}</div>
                        <div className={`text-sm font-medium ${-expensesDelta > 0 ? 'text-green-600' : -expensesDelta < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            {formatDelta(comparisonData.period1.totalExpenses, comparisonData.period2.totalExpenses).value}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-600">Total Savings</h3>
                    <div className="mt-2">
                        <div className="text-lg font-semibold">{formatCurrency(comparisonData.period1.totalSavings, currency)}</div>
                        <div className="text-sm text-gray-500">{formatCurrency(comparisonData.period2.totalSavings, currency)}</div>
                        <div className={`text-sm font-medium ${savingsDelta > 0 ? 'text-green-600' : savingsDelta < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            {formatDelta(comparisonData.period1.totalSavings, comparisonData.period2.totalSavings).value}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-600">Savings Rate</h3>
                    <div className="mt-2">
                        <div className="text-lg font-semibold">{comparisonData.period1.savingsRate.toFixed(1)}%</div>
                        <div className="text-sm text-gray-500">{comparisonData.period2.savingsRate.toFixed(1)}%</div>
                        <div className={`text-sm font-medium ${savingsRateDelta > 0 ? 'text-green-600' : savingsRateDelta < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            {(() => {
                                const sign = savingsRateDelta >= 0 ? '+' : '';
                                return `${sign}${savingsRateDelta.toFixed(1)}%`;
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison Chart */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Financial Overview Comparison</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Comparing {comparisonData.period1.label} vs {comparisonData.period2.label}
                    </p>
                </div>
                
                <ComparisonChart 
                    period1Income={comparisonData.period1.totalIncome}
                    period1Expenses={comparisonData.period1.totalExpenses}
                    period1Savings={comparisonData.period1.totalSavings}
                    period2Income={comparisonData.period2.totalIncome}
                    period2Expenses={comparisonData.period2.totalExpenses}
                    period2Savings={comparisonData.period2.totalSavings}
                    period1Label={comparisonData.period1.label}
                    period2Label={comparisonData.period2.label}
                    currency={currency}
                />
                
                {/* Chart Key/Delta Summary */}
                <div className="mt-4 flex justify-center">
                    <div className="flex items-center space-x-8 text-sm">
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <span>Positive Change</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-red-500 rounded"></div>
                            <span>Negative Change</span>
                        </div>
                        <div className="text-gray-600">
                            Delta values shown in summary cards above
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income Breakdown */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Income by Category</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                        style={{ width: `${incomeColumnWidths.category}px` }}
                                        onClick={() => handleIncomeSort('category')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>Category</span>
                                            {getSortIcon('category', incomeSortField, incomeSortDirection)}
                                        </div>
                                        <div 
                                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                            onMouseDown={(e) => handleMouseDown(e, 'income', 'category')}
                                        />
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                        style={{ width: `${incomeColumnWidths.period1}px` }}
                                        onClick={() => handleIncomeSort('period1')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{comparisonData.period1.label}</span>
                                            {getSortIcon('period1', incomeSortField, incomeSortDirection)}
                                        </div>
                                        <div 
                                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                            onMouseDown={(e) => handleMouseDown(e, 'income', 'period1')}
                                        />
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                        style={{ width: `${incomeColumnWidths.period2}px` }}
                                        onClick={() => handleIncomeSort('period2')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{comparisonData.period2.label}</span>
                                            {getSortIcon('period2', incomeSortField, incomeSortDirection)}
                                        </div>
                                        <div 
                                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                            onMouseDown={(e) => handleMouseDown(e, 'income', 'period2')}
                                        />
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        style={{ width: `${incomeColumnWidths.delta}px` }}
                                        onClick={() => handleIncomeSort('delta')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>Delta</span>
                                            {getSortIcon('delta', incomeSortField, incomeSortDirection)}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sortedIncomeCategories.map((category) => {
                                    const period1Amount = comparisonData.period1.incomeByCategory[category] || 0;
                                    const period2Amount = comparisonData.period2.incomeByCategory[category] || 0;
                                    const delta = period1Amount - period2Amount;
                                    
                                    return (
                                        <tr key={category}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900" style={{ width: `${incomeColumnWidths.category}px` }}>
                                                <div className="break-words">{category}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-900" style={{ width: `${incomeColumnWidths.period1}px` }}>
                                                {formatCurrency(period1Amount, currency)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-900" style={{ width: `${incomeColumnWidths.period2}px` }}>
                                                {formatCurrency(period2Amount, currency)}
                                            </td>
                                            <td className={`px-6 py-4 text-sm text-right font-medium ${
                                                delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-600'
                                            }`} style={{ width: `${incomeColumnWidths.delta}px` }}>
                                                {formatDelta(period1Amount, period2Amount).value}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Expenses Breakdown */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Expenses by Category</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                        style={{ width: `${expenseColumnWidths.category}px` }}
                                        onClick={() => handleExpenseSort('category')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>Category</span>
                                            {getSortIcon('category', expenseSortField, expenseSortDirection)}
                                        </div>
                                        <div 
                                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                            onMouseDown={(e) => handleMouseDown(e, 'expense', 'category')}
                                        />
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                        style={{ width: `${expenseColumnWidths.period1}px` }}
                                        onClick={() => handleExpenseSort('period1')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{comparisonData.period1.label}</span>
                                            {getSortIcon('period1', expenseSortField, expenseSortDirection)}
                                        </div>
                                        <div 
                                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                            onMouseDown={(e) => handleMouseDown(e, 'expense', 'period1')}
                                        />
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative border-r border-gray-200"
                                        style={{ width: `${expenseColumnWidths.period2}px` }}
                                        onClick={() => handleExpenseSort('period2')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{comparisonData.period2.label}</span>
                                            {getSortIcon('period2', expenseSortField, expenseSortDirection)}
                                        </div>
                                        <div 
                                            className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                            onMouseDown={(e) => handleMouseDown(e, 'expense', 'period2')}
                                        />
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                        style={{ width: `${expenseColumnWidths.delta}px` }}
                                        onClick={() => handleExpenseSort('delta')}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>Delta</span>
                                            {getSortIcon('delta', expenseSortField, expenseSortDirection)}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sortedExpenseCategories.map((category) => {
                                    const period1Amount = comparisonData.period1.expensesByCategory[category] || 0;
                                    const period2Amount = comparisonData.period2.expensesByCategory[category] || 0;
                                    const delta = period1Amount - period2Amount;
                                    
                                    return (
                                        <tr key={category}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900" style={{ width: `${expenseColumnWidths.category}px` }}>
                                                <div className="break-words">{category}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-900" style={{ width: `${expenseColumnWidths.period1}px` }}>
                                                {formatCurrency(period1Amount, currency)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right text-gray-900" style={{ width: `${expenseColumnWidths.period2}px` }}>
                                                {formatCurrency(period2Amount, currency)}
                                            </td>
                                            <td className={`px-6 py-4 text-sm text-right font-medium ${
                                                -delta > 0 ? 'text-green-600' : -delta < 0 ? 'text-red-600' : 'text-gray-600'
                                            }`} style={{ width: `${expenseColumnWidths.delta}px` }}>
                                                {formatDelta(period1Amount, period2Amount).value}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}