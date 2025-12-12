import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { formatDate } from "../../../utils/date";

export interface FinancialDataSummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
  period: string;
  currency: string;
}

// Convert financial data to markdown table format for LLM consumption
export function formatFinancialDataAsMarkdown(
  incomes: any[],
  expenses: any[],
  currency: string = "USD",
  summary: FinancialDataSummary
): string {
  let markdown = `# Financial Data Summary\n\n`;
  
  // Add summary section
  markdown += `## Summary for ${summary.period}\n`;
  markdown += `- **Total Income**: ${formatCurrency(summary.totalIncome, currency)}\n`;
  markdown += `- **Total Expenses**: ${formatCurrency(summary.totalExpenses, currency)}\n`;
  markdown += `- **Net Amount**: ${formatCurrency(summary.netAmount, currency)}\n`;
  markdown += `- **Total Transactions**: ${summary.transactionCount}\n`;
  markdown += `- **Currency**: ${currency}\n\n`;

  // Add income table if data exists
  if (incomes.length > 0) {
    markdown += `## Income Transactions (${incomes.length} items)\n\n`;
    markdown += `| Date | Title | Category | Account | Amount | Tags | Notes |\n`;
    markdown += `|------|-------|----------|---------|---------|------|-------|\n`;
    
    incomes.forEach(income => {
      const convertedAmount = convertForDisplaySync(income.amount, income.currency, currency);
      const formattedAmount = formatCurrency(convertedAmount, currency);
      const tags = income.tags.length > 0 ? income.tags.join(', ') : 'None';
      const notes = income.notes || 'None';
      const account = income.account ? `${income.account.bankName} (${income.account.accountType})` : 'Cash';
      
      markdown += `| ${formatDate(income.date)} | ${income.title} | ${income.category.name} | ${account} | ${formattedAmount} | ${tags} | ${notes} |\n`;
    });
    markdown += `\n`;
  }

  // Add expense table if data exists
  if (expenses.length > 0) {
    markdown += `## Expense Transactions (${expenses.length} items)\n\n`;
    markdown += `| Date | Title | Category | Account | Amount | Tags | Notes |\n`;
    markdown += `|------|-------|----------|---------|---------|------|-------|\n`;
    
    expenses.forEach(expense => {
      const convertedAmount = convertForDisplaySync(expense.amount, expense.currency, currency);
      const formattedAmount = formatCurrency(convertedAmount, currency);
      const tags = expense.tags.length > 0 ? expense.tags.join(', ') : 'None';
      const notes = expense.notes || 'None';
      const account = expense.account ? `${expense.account.bankName} (${expense.account.accountType})` : 'Cash';
      
      markdown += `| ${formatDate(expense.date)} | ${expense.title} | ${expense.category.name} | ${account} | ${formattedAmount} | ${tags} | ${notes} |\n`;
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
