"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getIncomesByDateRange } from "../../incomes/actions/incomes";
import { getExpensesByDateRange } from "../../expenses/actions/expenses";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { formatDate } from "../../../utils/date";
import { getUserCurrency } from "../../../actions/currency";
import { 
  formatFinancialDataAsMarkdown, 
  FinancialDataSummary 
} from "../utils/financial-formatting";

export interface FinancialDataRequest {
  startDate: Date;
  endDate: Date;
  includeIncomes: boolean;
  includeExpenses: boolean;
}


// Fetch financial data for a specific date range
export async function getFinancialDataForChat(request: FinancialDataRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const { startDate, endDate, includeIncomes, includeExpenses } = request;
    
    // Get user's preferred currency from database
    const currency = await getUserCurrency();

    // Fetch data in parallel
    const [incomes, expenses] = await Promise.all([
      includeIncomes ? getIncomesByDateRange(startDate, endDate) : Promise.resolve([]),
      includeExpenses ? getExpensesByDateRange(startDate, endDate) : Promise.resolve([])
    ]);

    // Calculate summary
    const totalIncome = incomes.reduce((sum, income) => {
      return sum + convertForDisplaySync(income.amount, income.currency, currency);
    }, 0);

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + convertForDisplaySync(expense.amount, expense.currency, currency);
    }, 0);

    const summary: FinancialDataSummary = {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount: incomes.length + expenses.length,
      period: `${formatDate(startDate)} to ${formatDate(endDate)}`,
      currency
    };

    // Format as markdown
    const markdownData = formatFinancialDataAsMarkdown(incomes, expenses, currency, summary);

    return {
      success: true,
      data: {
        incomes,
        expenses,
        summary,
        markdownData
      }
    };

  } catch (error) {
    console.error("Error fetching financial data for chat:", error);
    return { success: false, error: "Failed to fetch financial data" };
  }
}

