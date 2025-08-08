import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { Income, Expense } from '../types/financial';

interface MonthlyAggregatedData {
  monthKey: string;
  formattedMonth: string;
  date: Date;
  income: number;
  expenses: number;
  savings: number;
  incomeCount: number;
  expenseCount: number;
}

interface CategoryAggregatedData {
  [categoryName: string]: {
    income: number;
    expenses: number;
    count: number;
    items: (Income | Expense)[];
  };
}

interface TimeRangeData {
  hasExplicitRange: boolean;
  startDate: Date | null;
  endDate: Date | null;
  timePeriodText: string;
}

interface ProcessedChartData {
  // Filtered data
  filteredIncomes: Income[];
  filteredExpenses: Expense[];
  
  // Time range info
  timeRange: TimeRangeData;
  
  // Pre-aggregated monthly data
  monthlyData: MonthlyAggregatedData[];
  
  // Pre-aggregated category data
  categoryData: CategoryAggregatedData;
  
  // Quick calculations
  totals: {
    income: number;
    expenses: number;
    savings: number;
    count: number;
  };
  
  // Monthly averages
  averages: {
    income: number;
    expenses: number;
    savings: number;
  };
  
  // Data ranges for chart scaling
  ranges: {
    maxIncome: number;
    maxExpenses: number;
    maxSavings: number;
    minSavings: number;
  };
}

interface ChartDataContextType extends ProcessedChartData {
  // Utility functions
  formatTimePeriod: () => string;
  getCategoryList: (type?: 'income' | 'expense') => string[];
  getMonthlyDataForCategory: (categoryName: string, type: 'income' | 'expense') => MonthlyAggregatedData[];
}

const ChartDataContext = createContext<ChartDataContextType | null>(null);

// Optimized date utilities - centralized for consistent usage across all charts
const createMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const normalizeDate = (date: Date | string): Date => {
  return date instanceof Date ? date : new Date(date);
};

const formatMonthDisplay = (date: Date): string => {
  return date.toLocaleDateString('en', { month: 'short', year: 'numeric' });
};

// Generate time period text
const generateTimePeriodText = (startDate?: string, endDate?: string, defaultRange?: { start: Date; end: Date }): string => {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startMonth = start.toLocaleDateString('en', { month: 'short', year: 'numeric' });
    const endMonth = end.toLocaleDateString('en', { month: 'short', year: 'numeric' });
    return `(${startMonth} - ${endMonth})`;
  } else if (startDate) {
    const start = new Date(startDate);
    const startMonth = start.toLocaleDateString('en', { month: 'short', year: 'numeric' });
    return `(From ${startMonth})`;
  } else if (endDate) {
    const end = new Date(endDate);
    const endMonth = end.toLocaleDateString('en', { month: 'short', year: 'numeric' });
    return `(Until ${endMonth})`;
  } else if (defaultRange) {
    const startMonth = defaultRange.start.toLocaleDateString('en', { month: 'short', year: 'numeric' });
    const endMonth = defaultRange.end.toLocaleDateString('en', { month: 'short', year: 'numeric' });
    return `(${startMonth} - ${endMonth})`;
  }
  return '';
};

// Process and aggregate data efficiently - pure function without hooks
const processChartData = (
  incomes: Income[],
  expenses: Expense[],
  startDate?: string,
  endDate?: string,
  isAllTime?: boolean
): ProcessedChartData => {
  // Calculate date range
  let timeRange: TimeRangeData;
  if (startDate || endDate) {
    timeRange = {
      hasExplicitRange: true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      timePeriodText: generateTimePeriodText(startDate, endDate)
    };
  } else if (isAllTime) {
    // Explicit All Time selection - show all data
    timeRange = {
      hasExplicitRange: true,
      startDate: null,
      endDate: null,
      timePeriodText: '(All Time)'
    };
  } else {
    // Default range (last 6 months)
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let targetMonth = currentMonth - 5;
    let targetYear = currentYear;
    
    if (targetMonth < 0) {
      targetMonth += 12;
      targetYear -= 1;
    }
    
    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0);
    
    timeRange = {
      hasExplicitRange: false,
      startDate: start,
      endDate: end,
      timePeriodText: generateTimePeriodText(undefined, undefined, { start, end })
    };
  }

  // Filter data efficiently
  const filterItems = <T extends Income | Expense>(items: T[]): T[] => {
    if (!timeRange.startDate && !timeRange.endDate) return items;
    
    return items.filter(item => {
      const itemDate = normalizeDate(item.date);
      
      if (timeRange.startDate && timeRange.endDate) {
        const start = new Date(timeRange.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(timeRange.endDate);
        end.setHours(23, 59, 59, 999);
        return itemDate >= start && itemDate <= end;
      } else if (timeRange.startDate) {
        const start = new Date(timeRange.startDate);
        start.setHours(0, 0, 0, 0);
        return itemDate >= start;
      } else if (timeRange.endDate) {
        const end = new Date(timeRange.endDate);
        end.setHours(23, 59, 59, 999);
        return itemDate <= end;
      }
      
      return true;
    });
  };

  const filteredIncomes = filterItems(incomes);
  const filteredExpenses = filterItems(expenses);

  // Aggregate monthly data efficiently using Maps
  const monthlyMap = new Map<string, MonthlyAggregatedData>();

  // Process incomes
  for (const income of filteredIncomes) {
    const date = normalizeDate(income.date);
    const monthKey = createMonthKey(date);
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        monthKey,
        formattedMonth: formatMonthDisplay(date),
        date: new Date(date.getFullYear(), date.getMonth(), 1),
        income: 0,
        expenses: 0,
        savings: 0,
        incomeCount: 0,
        expenseCount: 0
      });
    }
    
    const monthData = monthlyMap.get(monthKey)!;
    monthData.income += income.amount;
    monthData.incomeCount += 1;
  }

  // Process expenses
  for (const expense of filteredExpenses) {
    const date = normalizeDate(expense.date);
    const monthKey = createMonthKey(date);
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        monthKey,
        formattedMonth: formatMonthDisplay(date),
        date: new Date(date.getFullYear(), date.getMonth(), 1),
        income: 0,
        expenses: 0,
        savings: 0,
        incomeCount: 0,
        expenseCount: 0
      });
    }
    
    const monthData = monthlyMap.get(monthKey)!;
    monthData.expenses += expense.amount;
    monthData.expenseCount += 1;
  }

  // Calculate savings and sort
  const monthlyData = Array.from(monthlyMap.values())
    .map(month => ({
      ...month,
      savings: month.income - month.expenses
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  // Aggregate category data efficiently
  const categoryData: CategoryAggregatedData = {};

  // Process incomes
  for (const income of filteredIncomes) {
    const categoryName = income.category?.name || 'Unknown Category';
    if (!categoryData[categoryName]) {
      categoryData[categoryName] = {
        income: 0,
        expenses: 0,
        count: 0,
        items: []
      };
    }
    categoryData[categoryName].income += income.amount;
    categoryData[categoryName].count += 1;
    categoryData[categoryName].items.push(income);
  }

  // Process expenses
  for (const expense of filteredExpenses) {
    const categoryName = expense.category?.name || 'Unknown Category';
    if (!categoryData[categoryName]) {
      categoryData[categoryName] = {
        income: 0,
        expenses: 0,
        count: 0,
        items: []
      };
    }
    categoryData[categoryName].expenses += expense.amount;
    categoryData[categoryName].count += 1;
    categoryData[categoryName].items.push(expense);
  }

  // Calculate totals and ranges in single pass
  let totalIncome = 0;
  let totalExpenses = 0;
  let maxIncome = 0;
  let maxExpenses = 0;
  let maxSavings = -Infinity;
  let minSavings = Infinity;

  for (const month of monthlyData) {
    totalIncome += month.income;
    totalExpenses += month.expenses;
    maxIncome = Math.max(maxIncome, month.income);
    maxExpenses = Math.max(maxExpenses, month.expenses);
    maxSavings = Math.max(maxSavings, month.savings);
    minSavings = Math.min(minSavings, month.savings);
  }

  const totalSavings = totalIncome - totalExpenses;
  const monthCount = monthlyData.length || 1; // Prevent division by zero

  const totals = {
    income: totalIncome,
    expenses: totalExpenses,
    savings: totalSavings,
    count: filteredIncomes.length + filteredExpenses.length
  };

  const averages = {
    income: totalIncome / monthCount,
    expenses: totalExpenses / monthCount,
    savings: totalSavings / monthCount
  };

  const ranges = {
    maxIncome,
    maxExpenses,
    maxSavings: maxSavings === -Infinity ? 0 : maxSavings,
    minSavings: minSavings === Infinity ? 0 : minSavings
  };

  return {
    filteredIncomes,
    filteredExpenses,
    timeRange,
    monthlyData,
    categoryData,
    totals,
    averages,
    ranges
  };
};

interface ChartDataProviderProps {
  children: ReactNode;
  incomes: Income[];
  expenses: Expense[];
  startDate?: string;
  endDate?: string;
  isAllTime?: boolean;
}

export function ChartDataProvider({ 
  children, 
  incomes, 
  expenses, 
  startDate, 
  endDate,
  isAllTime = false
}: ChartDataProviderProps) {
  // Use useMemo with stable dependencies and deep comparison for arrays
  const processedData = useMemo(
    () => {
      // Only recalculate if data actually changed, not just reference
      return processChartData(incomes, expenses, startDate, endDate, isAllTime);
    },
    [
      incomes.length, 
      expenses.length, 
      startDate, 
      endDate,
      isAllTime,
      // Add checksums to detect actual data changes
      incomes.reduce((sum, income) => sum + income.amount + income.id, 0),
      expenses.reduce((sum, expense) => sum + expense.amount + expense.id, 0)
    ]
  );

  const contextValue: ChartDataContextType = useMemo(() => ({
    ...processedData,
    
    formatTimePeriod: () => processedData.timeRange.timePeriodText,
    
    getCategoryList: (type?: 'income' | 'expense') => {
      const categories = Object.keys(processedData.categoryData);
      if (!type) return categories.sort();
      
      return categories.filter(categoryName => {
        const data = processedData.categoryData[categoryName];
        return data && (type === 'income' ? data.income > 0 : data.expenses > 0);
      }).sort();
    },
    
    getMonthlyDataForCategory: (categoryName: string, type: 'income' | 'expense') => {
      const categoryItems = processedData.categoryData[categoryName]?.items || [];
      const filteredItems = categoryItems.filter(item => {
        if (type === 'income') {
          return (item as Income).amount && item.category?.name === categoryName;
        } else {
          return (item as Expense).amount && item.category?.name === categoryName;
        }
      });

      const monthlyMap = new Map<string, MonthlyAggregatedData>();
      
      for (const item of filteredItems) {
        const date = normalizeDate(item.date);
        const monthKey = createMonthKey(date);
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            monthKey,
            formattedMonth: formatMonthDisplay(date),
            date: new Date(date.getFullYear(), date.getMonth(), 1),
            income: 0,
            expenses: 0,
            savings: 0,
            incomeCount: 0,
            expenseCount: 0
          });
        }
        
        const monthData = monthlyMap.get(monthKey)!;
        if (type === 'income') {
          monthData.income += item.amount;
          monthData.incomeCount += 1;
        } else {
          monthData.expenses += item.amount;
          monthData.expenseCount += 1;
        }
      }

      return Array.from(monthlyMap.values())
        .map(month => ({
          ...month,
          savings: month.income - month.expenses
        }))
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    }
  }), [processedData]);

  return (
    <ChartDataContext.Provider value={contextValue}>
      {children}
    </ChartDataContext.Provider>
  );
}

export function useChartData(): ChartDataContextType {
  const context = useContext(ChartDataContext);
  if (!context) {
    throw new Error('useChartData must be used within a ChartDataProvider');
  }
  return context;
}