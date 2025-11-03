"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthNavigationProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number, year: number) => void;
}

export function MonthNavigation({
  selectedMonth,
  selectedYear,
  onMonthChange
}: MonthNavigationProps) {
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentDate = new Date();
  const isCurrentMonth = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();
  
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      onMonthChange(11, selectedYear - 1);
    } else {
      onMonthChange(selectedMonth - 1, selectedYear);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      onMonthChange(0, selectedYear + 1);
    } else {
      onMonthChange(selectedMonth + 1, selectedYear);
    }
  };

  const goToCurrentMonth = () => {
    onMonthChange(currentDate.getMonth(), currentDate.getFullYear());
  };

  const handleMonthSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const month = parseInt(event.target.value);
    onMonthChange(month, selectedYear);
  };

  const handleYearSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(event.target.value);
    onMonthChange(selectedMonth, year);
  };

  // Generate year options (current year ± 5 years)
  const yearOptions = [];
  const currentYear = currentDate.getFullYear();
  for (let year = currentYear - 5; year <= currentYear + 1; year++) {
    yearOptions.push(year);
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
      {/* Previous Month Button */}
      <button
        onClick={goToPreviousMonth}
        className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
        title="Previous month"
      >
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      </button>

      {/* Month Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <select
          value={selectedMonth}
          onChange={handleMonthSelect}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {monthNames.map((month, index) => (
            <option key={index} value={index}>
              {month}
            </option>
          ))}
        </select>

        {/* Year Selector */}
        <select
          value={selectedYear}
          onChange={handleYearSelect}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {yearOptions.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Next Month Button */}
      <button
        onClick={goToNextMonth}
        className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
        title="Next month"
      >
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </button>

      {/* Current Month Button */}
      {!isCurrentMonth && (
        <button
          onClick={goToCurrentMonth}
          className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          title="Go to current month"
        >
          Current
        </button>
      )}

      {/* Current Month Indicator */}
      {isCurrentMonth && (
        <div className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-md">
          Current
        </div>
      )}
    </div>
  );
}
