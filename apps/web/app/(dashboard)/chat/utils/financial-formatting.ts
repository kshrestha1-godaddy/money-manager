import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { formatDate } from "../../../utils/date";
import { calculateRemainingWithInterest } from "../../../utils/interestCalculation";

export interface FinancialDataSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  period: string;
  currency: string;
  // New fields for debts, investments, and net worth
  totalDebtAmount?: number;
  totalDebtRemaining?: number;
  totalInvestmentCost?: number;
  totalInvestmentValue?: number;
  totalInvestmentGain?: number;
  netWorthData?: {
    totalAccountBalance: number;
    totalInvestmentValue: number;
    totalInvestmentCost: number;
    totalInvestmentGain: number;
    totalInvestmentGainPercentage: number;
    totalMoneyLent: number;
    totalAssets: number;
    netWorth: number;
    asOfDate: Date;
  } | null;
}

// Convert financial data to markdown table format for LLM consumption
export function formatFinancialDataAsMarkdown(
  incomes: any[],
  expenses: any[],
  debts: any[],
  investments: any[],
  currency: string = "USD",
  summary: FinancialDataSummary
): string {
  let markdown = `# Financial Data for ${summary.period}\n\n`;
  
  // Add income table if data exists
  if (incomes.length > 0) {
    markdown += `## Income Transactions (${incomes.length} items)\n\n`;
    markdown += `| Date | Title | Category | Amount |\n`;
    markdown += `|------|-------|----------|--------|\n`;
    
    incomes.forEach(income => {
      const convertedAmount = convertForDisplaySync(income.amount, income.currency, currency);
      const formattedAmount = formatCurrency(convertedAmount, currency);
      
      markdown += `| ${formatDate(income.date)} | ${income.title} | ${income.category.name} | ${formattedAmount} |\n`;
    });
    markdown += `\n`;
  }

  // Add expense table if data exists
  if (expenses.length > 0) {
    markdown += `## Expense Transactions (${expenses.length} items)\n\n`;
    markdown += `| Date | Title | Category | Amount |\n`;
    markdown += `|------|-------|----------|--------|\n`;
    
    expenses.forEach(expense => {
      const convertedAmount = convertForDisplaySync(expense.amount, expense.currency, currency);
      const formattedAmount = formatCurrency(convertedAmount, currency);
      
      markdown += `| ${formatDate(expense.date)} | ${expense.title} | ${expense.category.name} | ${formattedAmount} |\n`;
    });
    markdown += `\n`;
  }

  // Add debts table if data exists
  if (debts.length > 0) {
    markdown += `## Debt Transactions (${debts.length} items)\n\n`;
    markdown += `| Lent Date | Borrower | Purpose | Amount | Status | Remaining |\n`;
    markdown += `|-----------|----------|---------|--------|--------|----------|\n`;
    
    debts.forEach(debt => {
      const remainingWithInterest = calculateRemainingWithInterest(
        debt.amount,
        debt.interestRate,
        debt.lentDate,
        debt.dueDate,
        debt.repayments || [],
        new Date(),
        debt.status
      );
      const remainingAmount = Math.max(0, remainingWithInterest.remainingAmount);
      
      markdown += `| ${formatDate(debt.lentDate)} | ${debt.borrowerName} | ${debt.purpose || 'N/A'} | ${formatCurrency(debt.amount, currency)} | ${debt.status} | ${formatCurrency(remainingAmount, currency)} |\n`;
    });
    markdown += `\n`;
  }

  // Add investments table if data exists
  if (investments.length > 0) {
    markdown += `## Investment Transactions (${investments.length} items)\n\n`;
    markdown += `| Purchase Date | Name | Type | Symbol | Quantity | Purchase Price | Current Price | Current Value | Gain/Loss |\n`;
    markdown += `|---------------|------|------|--------|----------|----------------|---------------|---------------|----------|\n`;
    
    investments.forEach(investment => {
      const currentValue = investment.quantity * investment.currentPrice;
      const purchaseValue = investment.quantity * investment.purchasePrice;
      const gainLoss = currentValue - purchaseValue;
      
      markdown += `| ${formatDate(investment.purchaseDate)} | ${investment.name} | ${investment.type} | ${investment.symbol || 'N/A'} | ${investment.quantity} | ${formatCurrency(investment.purchasePrice, currency)} | ${formatCurrency(investment.currentPrice, currency)} | ${formatCurrency(currentValue, currency)} | ${formatCurrency(gainLoss, currency)} |\n`;
    });
    markdown += `\n`;
  }

  // Add category breakdown
  if (incomes.length > 0 || expenses.length > 0) {
    markdown += `## Category Breakdown\n\n`;
    
    if (incomes.length > 0) {
      const incomeCategories = incomes.reduce((acc, income) => {
        const categoryName = income.category.name;
        const convertedAmount = convertForDisplaySync(income.amount, income.currency, currency);
        acc[categoryName] = (acc[categoryName] || 0) + convertedAmount;
        return acc;
      }, {} as Record<string, number>);
      
      markdown += `### Income by Category\n`;
      Object.entries(incomeCategories)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .forEach(([category, amount]) => {
          markdown += `- **${category}**: ${formatCurrency(amount as number, currency)}\n`;
        });
      markdown += `\n`;
    }
    
    if (expenses.length > 0) {
      const expenseCategories = expenses.reduce((acc, expense) => {
        const categoryName = expense.category.name;
        const convertedAmount = convertForDisplaySync(expense.amount, expense.currency, currency);
        acc[categoryName] = (acc[categoryName] || 0) + convertedAmount;
        return acc;
      }, {} as Record<string, number>);
      
      markdown += `### Expenses by Category\n`;
      Object.entries(expenseCategories)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .forEach(([category, amount]) => {
          markdown += `- **${category}**: ${formatCurrency(amount as number, currency)}\n`;
        });
      markdown += `\n`;
    }
  }

  // Add investment breakdown by type
  if (investments.length > 0) {
    const investmentTypes = investments.reduce((acc, investment) => {
      const currentValue = investment.quantity * investment.currentPrice;
      acc[investment.type] = (acc[investment.type] || 0) + currentValue;
      return acc;
    }, {} as Record<string, number>);
    
    markdown += `## Investment Breakdown by Type\n`;
    Object.entries(investmentTypes)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .forEach(([type, value]) => {
        markdown += `- **${type}**: ${formatCurrency(value as number, currency)}\n`;
      });
    markdown += `\n`;
  }

  // Add debt status breakdown
  if (debts.length > 0) {
    const debtStatuses = debts.reduce((acc, debt) => {
      const remainingWithInterest = calculateRemainingWithInterest(
        debt.amount,
        debt.interestRate,
        debt.lentDate,
        debt.dueDate,
        debt.repayments || [],
        new Date(),
        debt.status
      );
      const remainingAmount = Math.max(0, remainingWithInterest.remainingAmount);
      acc[debt.status] = (acc[debt.status] || 0) + remainingAmount;
      return acc;
    }, {} as Record<string, number>);
    
    markdown += `## Debt Status Breakdown\n`;
    Object.entries(debtStatuses)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .forEach(([status, amount]) => {
        markdown += `- **${status}**: ${formatCurrency(amount as number, currency)}\n`;
      });
    markdown += `\n`;
  }

  // Add summary section with all totals
  markdown += `## Financial Summary\n\n`;
  markdown += `- **Total Income**: ${formatCurrency(summary.totalIncome, currency)}\n`;
  markdown += `- **Total Expenses**: ${formatCurrency(summary.totalExpenses, currency)}\n`;
  markdown += `- **Net Cash Flow**: ${formatCurrency(summary.netAmount, currency)}\n`;
  
  if (summary.totalDebtAmount !== undefined) {
    markdown += `- **Total Money Lent**: ${formatCurrency(summary.totalDebtAmount, currency)}\n`;
    markdown += `- **Outstanding Debt**: ${formatCurrency(summary.totalDebtRemaining || 0, currency)}\n`;
  }
  
  if (summary.totalInvestmentCost !== undefined) {
    markdown += `- **Total Investment Cost**: ${formatCurrency(summary.totalInvestmentCost, currency)}\n`;
    markdown += `- **Total Investment Value**: ${formatCurrency(summary.totalInvestmentValue || 0, currency)}\n`;
    markdown += `- **Investment Gain/Loss**: ${formatCurrency(summary.totalInvestmentGain || 0, currency)}\n`;
  }
  
  if (summary.netWorthData) {
    markdown += `\n### Net Worth Snapshot (as of ${formatDate(summary.netWorthData.asOfDate)})\n`;
    markdown += `- **Account Balance**: ${formatCurrency(summary.netWorthData.totalAccountBalance, currency)}\n`;
    markdown += `- **Investment Value**: ${formatCurrency(summary.netWorthData.totalInvestmentValue, currency)}\n`;
    markdown += `- **Investment Cost**: ${formatCurrency(summary.netWorthData.totalInvestmentCost, currency)}\n`;
    markdown += `- **Investment Gain/Loss**: ${formatCurrency(summary.netWorthData.totalInvestmentGain, currency)} (${summary.netWorthData.totalInvestmentGainPercentage.toFixed(2)}%)\n`;
    markdown += `- **Money Lent Out**: ${formatCurrency(summary.netWorthData.totalMoneyLent, currency)}\n`;
    markdown += `- **Total Assets**: ${formatCurrency(summary.netWorthData.totalAssets, currency)}\n`;
    markdown += `- **Net Worth**: ${formatCurrency(summary.netWorthData.netWorth, currency)}\n`;
  }

  return markdown;
}

// Predefined date range helpers
export function getDateRangePresets() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  return {
    thisMonth: {
      startDate: new Date(currentYear, currentMonth, 1),
      endDate: new Date(currentYear, currentMonth + 1, 0),
      label: "This Month"
    },
    lastMonth: {
      startDate: new Date(currentYear, currentMonth - 1, 1),
      endDate: new Date(currentYear, currentMonth, 0),
      label: "Last Month"
    },
    thisQuarter: {
      startDate: new Date(currentYear, Math.floor(currentMonth / 3) * 3, 1),
      endDate: new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0),
      label: "This Quarter"
    },
    thisYear: {
      startDate: new Date(currentYear, 0, 1),
      endDate: new Date(currentYear, 11, 31),
      label: "This Year"
    },
    lastYear: {
      startDate: new Date(currentYear - 1, 0, 1),
      endDate: new Date(currentYear - 1, 11, 31),
      label: "Last Year"
    },
    last30Days: {
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: now,
      label: "Last 30 Days"
    },
    last90Days: {
      startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      endDate: now,
      label: "Last 90 Days"
    }
  };
}
