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
  
  // Format dates for display
  const startDateStr = startOfMonth.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  const endDateStr = endOfMonth.toLocaleDateString('en-US', {
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
  
  // Calculate percentage change
  const percentageChange = lastMonthAmount !== 0 
    ? ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100 
    : 0;
  
  // For expenses: green when decreased (negative %), red when increased (positive %)
  // For income: green when increased (positive %), red when decreased (negative %)
  const isPositiveChange = itemType === "income" 
    ? percentageChange > 0 
    : percentageChange < 0;

  // Format the percentage change with sign
  const formattedPercentage = `${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}%`;
  
  // Create tooltip text
  const tooltipText = `${itemType === "income" ? "Income" : "Spending"} ${
    Math.abs(percentageChange).toFixed(1)
  }% ${percentageChange > 0 ? "higher" : "lower"} than ${lastMonthStr} (${
    formatCurrency(lastMonthAmount, currency)
  })`;
  
  const averageAmount = items.length > 0 ? totalAmount / items.length : 0;
  const colorClass = itemType === "income" ? "text-green-600" : "text-red-600";
  const titleText = itemType === "income" ? "Total Income" : "Total Expenses";

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="text-center sm:text-left">
          <p className="text-sm font-medium text-gray-600">{titleText}</p>
          <p className={`text-xl sm:text-2xl font-bold ${colorClass}`}>
            {formatCurrency(totalAmount, currency)}
          </p>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-sm font-medium text-gray-600">
            This Month ({startDateStr} - {endDateStr})
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {formatCurrency(thisMonthAmount, currency)}
            </p>
            {percentageChange !== 0 && (
              <div 
                className={`flex items-center text-sm font-medium ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}
                title={tooltipText}
              >
                <span className="mr-0.5">{isPositiveChange ? '↑' : '↓'}</span>
                <span>{formattedPercentage}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-sm font-medium text-gray-600">Average per Transaction</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900">
            {formatCurrency(averageAmount, currency)}
          </p>
        </div>
      </div>
    </div>
  );
} 