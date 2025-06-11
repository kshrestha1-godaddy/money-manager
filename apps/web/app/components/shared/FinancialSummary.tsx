import React from "react";
import { formatCurrency } from "../../utils/currency";

interface FinancialSummaryProps {
  totalAmount: number;
  currency: string;
  items: any[];
  itemType: "income" | "expense";
}

export function FinancialSummary({ totalAmount, currency, items, itemType }: FinancialSummaryProps) {
  const currentMonth = new Date().getMonth();
  const thisMonthAmount = items
    .filter(item => item.date.getMonth() === currentMonth)
    .reduce((sum, item) => sum + item.amount, 0);
  
  const averageAmount = items.length > 0 ? totalAmount / items.length : 0;
  
  const colorClass = itemType === "income" ? "text-green-600" : "text-red-600";
  const titleText = itemType === "income" ? "Total Income" : "Total Expenses";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-sm font-medium text-gray-600">{titleText}</p>
          <p className={`text-2xl font-bold ${colorClass}`}>
            {formatCurrency(totalAmount, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">This Month</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(thisMonthAmount, currency)}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">Average per Transaction</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(averageAmount, currency)}
          </p>
        </div>
      </div>
    </div>
  );
} 