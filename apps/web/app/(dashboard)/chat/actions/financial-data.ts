"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getIncomesByDateRange } from "../../incomes/actions/incomes";
import { getExpensesByDateRange } from "../../expenses/actions/expenses";
import { getUserDebts } from "../../debts/actions/debts";
import { getUserInvestments } from "../../investments/actions/investments";
import { getInvestmentTargetProgress } from "../../investments/actions/investment-targets";
import { getUserAccounts } from "../../accounts/actions/accounts";
import { getCurrentNetWorth } from "../../worth/actions/net-worth";
import { getTransactionsByDateRange } from "../../transactions/actions/transactions";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { formatDate } from "../../../utils/date";
import { getUserCurrency } from "../../../actions/currency";
import { calculateRemainingWithInterest } from "../../../utils/interestCalculation";
import { 
  formatFinancialDataAsMarkdown, 
  FinancialDataSummary 
} from "../utils/financial-formatting";

export interface FinancialDataRequest {
  startDate: Date;
  endDate: Date;
  includeIncomes: boolean;
  includeExpenses: boolean;
  includeDebts: boolean;
  includeInvestments: boolean;
  includeNetWorth: boolean;
  includeTransactions: boolean;
  includeInvestmentTargets: boolean;
  includeAccounts: boolean;
}


// Fetch financial data for a specific date range
export async function getFinancialDataForChat(request: FinancialDataRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const { startDate, endDate, includeIncomes, includeExpenses, includeDebts, includeInvestments, includeNetWorth, includeTransactions, includeInvestmentTargets, includeAccounts } = request;
    
    // Get user's preferred currency from database
    const currency = await getUserCurrency();

    // Fetch data in parallel - income/expenses/transactions are date-dependent
    const [incomes, expenses, transactions, debtsResult, investmentsResult, investmentTargetsResult, accountsResult, netWorthResult] = await Promise.all([
      includeIncomes ? getIncomesByDateRange(startDate, endDate) : Promise.resolve([]),
      includeExpenses ? getExpensesByDateRange(startDate, endDate) : Promise.resolve([]),
      includeTransactions ? getTransactionsByDateRange(startDate, endDate) : Promise.resolve([]),
      includeDebts ? getUserDebts() : Promise.resolve({ data: [] }),
      includeInvestments ? getUserInvestments() : Promise.resolve({ data: [] }),
      includeInvestmentTargets ? getInvestmentTargetProgress() : Promise.resolve({ data: [] }),
      includeAccounts ? getUserAccounts() : Promise.resolve([]),
      includeNetWorth ? getCurrentNetWorth() : Promise.resolve({ success: false, data: undefined, error: undefined })
    ]);

    // Extract actual data from results
    const debts = (debtsResult && 'data' in debtsResult && debtsResult.data) ? debtsResult.data : [];
    const investments = (investmentsResult && 'data' in investmentsResult && investmentsResult.data) ? investmentsResult.data : [];
    const investmentTargets = (investmentTargetsResult && 'data' in investmentTargetsResult && investmentTargetsResult.data) ? investmentTargetsResult.data : [];
    const accounts = (Array.isArray(accountsResult)) ? accountsResult : [];

    // Calculate summary
    const totalIncome = incomes.reduce((sum, income) => {
      return sum + convertForDisplaySync(income.amount, income.currency, currency);
    }, 0);

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + convertForDisplaySync(expense.amount, expense.currency, currency);
    }, 0);

    // Calculate debt totals (money lent out) - all current debts
    const totalDebtAmount = debts.reduce((sum, debt) => {
      return sum + debt.amount; // Original amount lent
    }, 0);

    const totalDebtRemaining = debts.reduce((sum, debt) => {
      const remainingWithInterest = calculateRemainingWithInterest(
        debt.amount,
        debt.interestRate,
        debt.lentDate,
        debt.dueDate || undefined,
        debt.repayments || [],
        new Date(),
        debt.status
      );
      return sum + Math.max(0, remainingWithInterest.remainingAmount);
    }, 0);

    // Calculate investment totals - all current investments
    const totalInvestmentCost = investments.reduce((sum, investment) => {
      return sum + (investment.quantity * investment.purchasePrice);
    }, 0);

    const totalInvestmentValue = investments.reduce((sum, investment) => {
      return sum + (investment.quantity * investment.currentPrice);
    }, 0);

    const totalInvestmentGain = totalInvestmentValue - totalInvestmentCost;

    // Calculate investment targets summary
    const totalTargetAmount = investmentTargets.reduce((sum, target) => sum + target.targetAmount, 0);
    const totalTargetProgress = investmentTargets.reduce((sum, target) => sum + target.currentAmount, 0);
    const completedTargets = investmentTargets.filter(target => target.isComplete).length;
    const overdueTargets = investmentTargets.filter(target => target.isOverdue && !target.isComplete).length;
    const averageProgress = investmentTargets.length > 0 
      ? investmentTargets.reduce((sum, target) => sum + target.progress, 0) / investmentTargets.length 
      : 0;

    // Calculate accounts summary
    const totalAccountBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    const accountsCount = accounts.length;

    // Handle net worth data (if requested and successfully fetched)
    let netWorthData = null;
    if (includeNetWorth && netWorthResult && 'success' in netWorthResult && netWorthResult.success && netWorthResult.data) {
      netWorthData = {
        totalAccountBalance: netWorthResult.data.totalAccountBalance,
        totalInvestmentValue: netWorthResult.data.totalInvestmentValue,
        totalInvestmentCost: netWorthResult.data.totalInvestmentCost,
        totalInvestmentGain: netWorthResult.data.totalInvestmentGain,
        totalInvestmentGainPercentage: netWorthResult.data.totalInvestmentGainPercentage,
        totalMoneyLent: netWorthResult.data.totalMoneyLent,
        totalAssets: netWorthResult.data.totalAssets,
        netWorth: netWorthResult.data.netWorth,
        asOfDate: netWorthResult.data.asOfDate
      };
    }

    const summary: FinancialDataSummary = {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount: incomes.length + expenses.length,
      period: `${formatDate(startDate)} to ${formatDate(endDate)}`,
      currency,
      // New fields
      totalDebtAmount,
      totalDebtRemaining,
      totalInvestmentCost,
      totalInvestmentValue,
      totalInvestmentGain,
      netWorthData,
      // Investment targets fields
      totalTargetAmount,
      totalTargetProgress,
      completedTargets,
      overdueTargets,
      averageProgress,
      // Accounts fields
      totalAccountBalance,
      accountsCount
    };

    // Format as markdown
    const markdownData = formatFinancialDataAsMarkdown(incomes, expenses, debts, investments, transactions, investmentTargets, accounts, currency, summary);

    return {
      success: true,
      data: {
        incomes,
        expenses,
        debts,
        investments,
        transactions,
        investmentTargets,
        accounts,
        summary,
        markdownData
      }
    };

  } catch (error) {
    console.error("Error fetching financial data for chat:", error);
    return { success: false, error: "Failed to fetch financial data" };
  }
}

