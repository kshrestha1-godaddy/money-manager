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
  // Investment targets fields
  totalTargetAmount?: number;
  totalTargetProgress?: number;
  completedTargets?: number;
  overdueTargets?: number;
  averageProgress?: number;
  // Accounts fields
  totalAccountBalance?: number;
  accountsCount?: number;
  // Budget targets fields
  totalBudgetTargets?: number;
  totalBudgetAmount?: number;
  totalBudgetUtilization?: number;
  activeBudgetTargets?: number;
  overBudgetTargets?: number;
}

// Convert financial data to markdown table format for LLM consumption
export function formatFinancialDataAsMarkdown(
  incomes: any[],
  expenses: any[],
  debts: any[],
  investments: any[],
  transactions: any[],
  investmentTargets: any[],
  accounts: any[],
  budgetTargets: any[],
  currency: string = "INR",
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

  // Add transactions table if data exists (combined view)
  if (transactions.length > 0) {
    markdown += `## All Transactions (${transactions.length} items)\n\n`;
    markdown += `| Date | Type | Title | Category | Account | Amount |\n`;
    markdown += `|------|------|-------|----------|---------|--------|\n`;
    
    transactions.forEach(transaction => {
      const convertedAmount = convertForDisplaySync(transaction.amount, transaction.currency, currency);
      const formattedAmount = formatCurrency(convertedAmount, currency);
      const typeIcon = transaction.type === 'INCOME' ? '💰' : '💸';
      
      markdown += `| ${formatDate(transaction.date)} | ${typeIcon} ${transaction.type} | ${transaction.title} | ${transaction.category} | ${transaction.account} | ${formattedAmount} |\n`;
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

  // Add investment targets table if data exists
  if (investmentTargets.length > 0) {
    markdown += `## Investment Targets (${investmentTargets.length} items)\n\n`;
    markdown += `| Investment Type | Nickname | Target Amount | Current Amount | Progress | Status | Target Date | Days Remaining |\n`;
    markdown += `|----------------|----------|---------------|----------------|----------|--------|-------------|----------------|\n`;
    
    investmentTargets.forEach(target => {
      const nickname = target.nickname || target.investmentType;
      const targetDate = target.targetCompletionDate 
        ? formatDate(target.targetCompletionDate) 
        : 'Not Set';
      const daysRemaining = target.daysRemaining !== undefined 
        ? (target.daysRemaining < 0 ? 'Overdue' : `${target.daysRemaining} days`)
        : 'N/A';
      const status = target.isComplete 
        ? '✅ Complete' 
        : target.isOverdue 
          ? '⚠️ Overdue' 
          : '🔄 In Progress';
      
      markdown += `| ${target.investmentType} | ${nickname} | ${formatCurrency(target.targetAmount, currency)} | ${formatCurrency(target.currentAmount, currency)} | ${target.progress.toFixed(1)}% | ${status} | ${targetDate} | ${daysRemaining} |\n`;
    });
    markdown += `\n`;
  }

  // Add accounts table if data exists
  if (accounts.length > 0) {
    markdown += `## Bank Accounts (${accounts.length} items)\n\n`;
    markdown += `| Bank Name | Account Type | Holder Name | Account Number | Balance | Opening Date | Nickname |\n`;
    markdown += `|-----------|--------------|-------------|----------------|---------|--------------|----------|\n`;
    
    accounts.forEach(account => {
      const balance = account.balance !== undefined 
        ? formatCurrency(account.balance, currency) 
        : 'Not Set';
      const nickname = account.nickname || 'N/A';
      const maskedAccountNumber = account.accountNumber 
        ? `****${account.accountNumber.slice(-4)}` 
        : 'N/A';
      
      markdown += `| ${account.bankName} | ${account.accountType} | ${account.holderName} | ${maskedAccountNumber} | ${balance} | ${formatDate(account.accountOpeningDate)} | ${nickname} |\n`;
    });
    markdown += `\n`;
  }

  // Add budget targets table if data exists
  if (budgetTargets.length > 0) {
    markdown += `## Budget Targets (${budgetTargets.length} items)\n\n`;
    markdown += `| Category Name | Category Type | Target Amount | Current Amount | Period | Progress | Status | Start Date | End Date |\n`;
    markdown += `|---------------|---------------|---------------|----------------|--------|----------|--------|------------|----------|\n`;
    
    budgetTargets.forEach(target => {
      const targetAmount = formatCurrency(target.targetAmount, currency);
      const currentAmount = formatCurrency(target.currentAmount, currency);
      const progress = target.targetAmount > 0 
        ? `${((target.currentAmount / target.targetAmount) * 100).toFixed(1)}%`
        : '0%';
      const status = target.isActive ? 'Active' : 'Inactive';
      const isOverBudget = target.currentAmount > target.targetAmount;
      const statusIcon = isOverBudget ? '⚠️ Over Budget' : target.currentAmount >= target.targetAmount ? '✅ Met' : '🔄 In Progress';
      const categoryType = target.categoryType || 'UNKNOWN';
      const categoryTypeIcon = categoryType === 'INCOME' ? '💰' : categoryType === 'EXPENSE' ? '💸' : '❓';
      
      markdown += `| ${target.name} | ${categoryTypeIcon} ${categoryType} | ${targetAmount} | ${currentAmount} | ${target.period} | ${progress} | ${status} ${statusIcon} | ${formatDate(target.startDate)} | ${formatDate(target.endDate)} |\n`;
    });
    markdown += `\n`;
    
    // Add budget targets summary
    if (summary.totalBudgetTargets && summary.totalBudgetTargets > 0) {
      markdown += `### Budget Targets Summary\n\n`;
      markdown += `- **Total Budget Targets**: ${summary.totalBudgetTargets}\n`;
      markdown += `- **Total Budget Amount**: ${formatCurrency(summary.totalBudgetAmount || 0, currency)}\n`;
      markdown += `- **Active Targets**: ${summary.activeBudgetTargets || 0}\n`;
      markdown += `- **Over Budget Targets**: ${summary.overBudgetTargets || 0}\n`;
      markdown += `- **Average Utilization**: ${(summary.totalBudgetUtilization || 0).toFixed(1)}%\n\n`;
      
      // Add breakdown by category type
      const incomeTargets = budgetTargets.filter(target => target.categoryType === 'INCOME');
      const expenseTargets = budgetTargets.filter(target => target.categoryType === 'EXPENSE');
      
      if (incomeTargets.length > 0 || expenseTargets.length > 0) {
        markdown += `#### Budget Targets by Type\n\n`;
        
        if (incomeTargets.length > 0) {
          const totalIncomeTargetAmount = incomeTargets.reduce((sum, target) => sum + target.targetAmount, 0);
          const totalIncomeCurrentAmount = incomeTargets.reduce((sum, target) => sum + target.currentAmount, 0);
          const incomeUtilization = totalIncomeTargetAmount > 0 ? (totalIncomeCurrentAmount / totalIncomeTargetAmount) * 100 : 0;
          
          markdown += `**Income Targets (${incomeTargets.length} items)**\n`;
          markdown += `- Target Amount: ${formatCurrency(totalIncomeTargetAmount, currency)}\n`;
          markdown += `- Current Amount: ${formatCurrency(totalIncomeCurrentAmount, currency)}\n`;
          markdown += `- Utilization: ${incomeUtilization.toFixed(1)}%\n\n`;
        }
        
        if (expenseTargets.length > 0) {
          const totalExpenseTargetAmount = expenseTargets.reduce((sum, target) => sum + target.targetAmount, 0);
          const totalExpenseCurrentAmount = expenseTargets.reduce((sum, target) => sum + target.currentAmount, 0);
          const expenseUtilization = totalExpenseTargetAmount > 0 ? (totalExpenseCurrentAmount / totalExpenseTargetAmount) * 100 : 0;
          
          markdown += `**Expense Targets (${expenseTargets.length} items)**\n`;
          markdown += `- Target Amount: ${formatCurrency(totalExpenseTargetAmount, currency)}\n`;
          markdown += `- Current Amount: ${formatCurrency(totalExpenseCurrentAmount, currency)}\n`;
          markdown += `- Utilization: ${expenseUtilization.toFixed(1)}%\n\n`;
        }
      }
    }
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
