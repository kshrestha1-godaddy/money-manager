"use server";

import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession } from "../utils/auth";
import { convertForDisplaySync } from "../utils/currencyDisplay";

export interface CategoryTrendData {
  categoryName: string;
  categoryType: 'EXPENSE' | 'INCOME';
  color: string;
  dataPoints: {
    period: string;
    periodLabel: string;
    targetAmount: number;
    actualAmount: number;
  }[];
}

export async function getCategoryHistoricalTrends(
  selectedMonth: number,
  selectedYear: number,
  monthsBack: number = 6
): Promise<{ data?: CategoryTrendData[], error?: string }> {
  try {
    const session = await getAuthenticatedSession();
    const userId = getUserIdFromSession(session.user.id);

    // Get user's preferred currency
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true }
    });
    const userCurrency = user?.currency || 'USD';

    // Get categories that are included in budget
    const categories = await prisma.category.findMany({
      where: {
        userId: userId,
        includedInBudget: true,
      },
    });

    // Get active budget targets
    const budgetTargets = await prisma.budgetTarget.findMany({
      where: {
        userId: userId,
        isActive: true,
        period: 'MONTHLY', // For now, focus on monthly targets
      },
    });

    // Create a map of budget targets by category name
    const budgetTargetsMap = new Map(
      budgetTargets.map(target => [target.name, parseFloat(target.targetAmount.toString())])
    );

    // Generate month ranges for the historical data
    interface MonthRange {
      period: string;
      periodLabel: string;
      startDate: Date;
      endDate: Date;
      month: number;
      year: number;
    }
    
    const monthRanges: MonthRange[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const targetDate = new Date(selectedYear, selectedMonth - i, 1);
      const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      monthRanges.push({
        period: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
        periodLabel: targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        startDate,
        endDate,
        month: targetDate.getMonth(),
        year: targetDate.getFullYear()
      });
    }

    // Return early if no month ranges generated
    if (monthRanges.length === 0) {
      return { data: [] };
    }

    // Fetch all expenses and incomes for all months at once
    const firstRange = monthRanges[0]!;
    const lastRange = monthRanges[monthRanges.length - 1]!;
    
    const allExpenses = await prisma.expense.findMany({
      where: {
        userId: userId,
        date: {
          gte: firstRange.startDate,
          lte: lastRange.endDate,
        },
      },
      include: {
        category: true,
      },
    });

    const allIncomes = await prisma.income.findMany({
      where: {
        userId: userId,
        date: {
          gte: firstRange.startDate,
          lte: lastRange.endDate,
        },
      },
      include: {
        category: true,
      },
    });

    // Create category trend data
    const categoryColors = [
      "#ef4444", "#3b82f6", "#10b981", "#f59e0b", 
      "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
      "#f97316", "#6366f1", "#14b8a6", "#eab308"
    ];

    const trendData: CategoryTrendData[] = [];

    // Process each category (include all categories with includedInBudget: true, like getBudgetComparison does)
    categories.forEach((category, categoryIndex) => {
        const dataPoints = monthRanges.map(monthRange => {
          // Get or create budget target (same logic as getBudgetComparison)
          const targetAmount = budgetTargetsMap.get(category.name) || 0;
          
          // Calculate actual spending/earning for this category in this month (same logic as getBudgetComparison)
          let actualAmount = 0;
          
          if (category.type === 'EXPENSE') {
            const monthExpenses = allExpenses.filter(expense => 
              expense.category?.name === category.name &&
              expense.date >= monthRange.startDate &&
              expense.date <= monthRange.endDate
            );
            
            // Sum expenses with currency conversion (identical to getBudgetComparison logic)
            actualAmount = monthExpenses.reduce((sum, expense) => {
              const amount = parseFloat(expense.amount.toString());
              const transactionCurrency = expense.currency || 'USD';
              const convertedAmount = convertForDisplaySync(amount, transactionCurrency, userCurrency);
              return sum + convertedAmount;
            }, 0);
          } else if (category.type === 'INCOME') {
            const monthIncomes = allIncomes.filter(income => 
              income.category?.name === category.name &&
              income.date >= monthRange.startDate &&
              income.date <= monthRange.endDate
            );
            
            // Sum incomes with currency conversion (identical to getBudgetComparison logic)
            actualAmount = monthIncomes.reduce((sum, income) => {
              const amount = parseFloat(income.amount.toString());
              const transactionCurrency = income.currency || 'USD';
              const convertedAmount = convertForDisplaySync(amount, transactionCurrency, userCurrency);
              return sum + convertedAmount;
            }, 0);
          }

          return {
            period: monthRange.period,
            periodLabel: monthRange.periodLabel,
            targetAmount,
            actualAmount: Math.round(actualAmount) // Round to match getBudgetComparison
          };
        });

        trendData.push({
          categoryName: category.name,
          categoryType: category.type as 'EXPENSE' | 'INCOME',
          color: categoryColors[categoryIndex % categoryColors.length] ?? '#94a3b8',
          dataPoints
        });
      });

    // Sort by average spending to show most significant categories first
    trendData.sort((a, b) => {
      const avgA = a.dataPoints.reduce((sum, point) => sum + point.actualAmount, 0) / a.dataPoints.length;
      const avgB = b.dataPoints.reduce((sum, point) => sum + point.actualAmount, 0) / b.dataPoints.length;
      return avgB - avgA;
    });

    return { data: trendData };
  } catch (error) {
    console.error("Error fetching category historical trends:", error);
    return { error: "Failed to fetch historical trend data" };
  }
}
