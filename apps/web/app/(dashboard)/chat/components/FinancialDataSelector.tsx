"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/button";
import { getDateRangePresets } from "../utils/financial-formatting";
import { FinancialDataRequest } from "../actions/financial-data";
import { getUserCurrency } from "../../../actions/currency";

interface FinancialDataSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (request: FinancialDataRequest) => void;
}

export function FinancialDataSelector({ 
  isOpen, 
  onClose, 
  onSelect
}: FinancialDataSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [includeIncomes, setIncludeIncomes] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [userCurrency, setUserCurrency] = useState<string>("USD");

  const presets = getDateRangePresets();

  // Fetch user's currency when component mounts
  useEffect(() => {
    if (isOpen) {
      getUserCurrency().then(setUserCurrency).catch(() => setUserCurrency("USD"));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    let startDate: Date;
    let endDate: Date;

    if (useCustomRange) {
      if (!customStartDate || !customEndDate) {
        alert("Please select both start and end dates");
        return;
      }
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else {
      if (!selectedPreset) {
        alert("Please select a time period");
        return;
      }
      const preset = presets[selectedPreset as keyof typeof presets];
      startDate = preset.startDate;
      endDate = preset.endDate;
    }

    if (!includeIncomes && !includeExpenses) {
      alert("Please select at least one data type (Income or Expenses)");
      return;
    }

    const request: FinancialDataRequest = {
      startDate,
      endDate,
      includeIncomes,
      includeExpenses
    };

    onSelect(request);
    onClose();
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Include Financial Data</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Data Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Data Types
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeIncomes}
                    onChange={(e) => setIncludeIncomes(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Income Data</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeExpenses}
                    onChange={(e) => setIncludeExpenses(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Include Expense Data</span>
                </label>
              </div>
            </div>

            {/* Date Range Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Time Period
              </label>
              
              {/* Toggle between preset and custom */}
              <div className="flex space-x-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dateRangeType"
                    checked={!useCustomRange}
                    onChange={() => setUseCustomRange(false)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Quick Select</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dateRangeType"
                    checked={useCustomRange}
                    onChange={() => setUseCustomRange(true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Custom Range</span>
                </label>
              </div>

              {!useCustomRange ? (
                /* Preset Selection */
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(presets).map(([key, preset]) => (
                    <label key={key} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="preset"
                        value={key}
                        checked={selectedPreset === key}
                        onChange={(e) => setSelectedPreset(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{preset.label}</div>
                        <div className="text-xs text-gray-500">
                          {formatDateForInput(preset.startDate)} to {formatDateForInput(preset.endDate)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                /* Custom Date Range */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Currency Display */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Currency:</strong> All amounts will be converted to {userCurrency} for analysis
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <Button onClick={handleSubmit}>
              Include Financial Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
