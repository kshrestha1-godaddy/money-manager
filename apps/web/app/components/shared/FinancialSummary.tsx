import React from "react";
import { formatCurrency } from "../../utils/currency";

interface FinancialSummaryProps {
  totalAmount: number;
  currency: string;
  items: any[];
  itemType: "income" | "expense";
}

export function FinancialSummary({ totalAmount, currency, items, itemType }: FinancialSummaryProps) {
  // Get current month's start and end dates
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  // Get last month's start and end dates
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Get current quarter's start and end dates
  const currentQuarter = Math.floor(now.getMonth() / 3);
  const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
  const endOfQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);

  // Get previous quarter's start and end dates
  const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
  const prevQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const startOfPrevQuarter = new Date(prevQuarterYear, prevQuarter * 3, 1);
  const endOfPrevQuarter = new Date(prevQuarterYear, (prevQuarter + 1) * 3, 0, 23, 59, 59, 999);
  
  // Format dates for display
  const startDateStr = startOfMonth.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  const endDateStr = endOfMonth.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  // Format quarter dates for display
  const quarterStartStr = startOfQuarter.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  const quarterEndStr = endOfQuarter.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  const lastMonthStr = startOfLastMonth.toLocaleDateString('en-US', { month: 'long' });
  
  const thisMonthAmount = items
    .filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startOfMonth && itemDate <= endOfMonth;
    })
    .reduce((sum, item) => sum + item.amount, 0);

  const lastMonthAmount = items
    .filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startOfLastMonth && itemDate <= endOfLastMonth;
    })
    .reduce((sum, item) => sum + item.amount, 0);

  const quarterAmount = items
    .filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startOfQuarter && itemDate <= endOfQuarter;
    })
    .reduce((sum, item) => sum + item.amount, 0);

  const prevQuarterAmount = items
    .filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= startOfPrevQuarter && itemDate <= endOfPrevQuarter;
    })
    .reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate percentage change for month
  const monthlyPercentageChange = lastMonthAmount !== 0 
    ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100 
    : 0;

  // Calculate percentage change for quarter
  const quarterlyPercentageChange = prevQuarterAmount !== 0 
    ? ((quarterAmount - prevQuarterAmount) / prevQuarterAmount) * 100 
    : 0;
  
  // For expenses: green when decreased (negative %), red when increased (positive %)
  // For income: green when increased (positive %), red when decreased (negative %)
  const isMonthlyPositiveChange = itemType === "income" 
    ? monthlyPercentageChange > 0 
    : monthlyPercentageChange < 0;

  const isQuarterlyPositiveChange = itemType === "income" 
    ? quarterlyPercentageChange > 0 
    : quarterlyPercentageChange < 0;

  // Format the percentage change with sign
  const formattedMonthlyPercentage = `${monthlyPercentageChange > 0 ? '+' : ''}${monthlyPercentageChange.toFixed(1)}%`;
  const formattedQuarterlyPercentage = `${quarterlyPercentageChange > 0 ? '+' : ''}${quarterlyPercentageChange.toFixed(1)}%`;
  
  // Create tooltip text
  const monthlyTooltipText = `${itemType === "income" ? "Income" : "Spending"} ${
    Math.abs(monthlyPercentageChange).toFixed(1)
  }% ${monthlyPercentageChange > 0 ? "higher" : "lower"} than ${lastMonthStr} (${
    formatCurrency(lastMonthAmount, currency)
  })`;

  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
  const prevQuarterName = quarterNames[prevQuarter];
  const quarterlyTooltipText = `${itemType === "income" ? "Income" : "Spending"} ${
    Math.abs(quarterlyPercentageChange).toFixed(1)
  }% ${quarterlyPercentageChange > 0 ? "higher" : "lower"} than ${prevQuarterName} (${
    formatCurrency(prevQuarterAmount, currency)
  })`;
  
  const averageAmount = items.length > 0 ? totalAmount / items.length : 0;
  const colorClass = itemType === "income" ? "text-green-600" : "text-red-600";
  const titleText = itemType === "income" ? "Total Income" : "Total Expenses";

  // Get quarter name
  const currentQuarterName = quarterNames[currentQuarter];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 mb-2">{titleText}</p>
          <p className={`text-2xl font-bold ${colorClass}`}>
            {formatCurrency(totalAmount, currency)}
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 mb-2">
            This Month ({startDateStr} - {endDateStr})
          </p>
          <div className="flex flex-col items-center gap-1">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(thisMonthAmount, currency)}
            </p>
            {monthlyPercentageChange !== 0 && (
              <div 
                className={`flex items-center text-sm font-medium ${isMonthlyPositiveChange ? 'text-green-600' : 'text-red-600'}`}
                title={monthlyTooltipText}
              >
                <span className="mr-0.5">{isMonthlyPositiveChange ? '↑' : '↓'}</span>
                <span>{formattedMonthlyPercentage}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 mb-2">
            {currentQuarterName} ({quarterStartStr} - {quarterEndStr})
          </p>
          <div className="flex flex-col items-center gap-1">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(quarterAmount, currency)}
            </p>
            {quarterlyPercentageChange !== 0 && (
              <div 
                className={`flex items-center text-sm font-medium ${isQuarterlyPositiveChange ? 'text-green-600' : 'text-red-600'}`}
                title={quarterlyTooltipText}
              >
                <span className="mr-0.5">{isQuarterlyPositiveChange ? '↑' : '↓'}</span>
                <span>{formattedQuarterlyPercentage}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 mb-2">Average per Transaction</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(averageAmount, currency)}
          </p>
        </div>
      </div>
    </div>
  );
} 