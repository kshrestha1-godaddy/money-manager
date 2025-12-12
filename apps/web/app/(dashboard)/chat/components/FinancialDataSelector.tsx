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
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Include Financial Data</h2>
            <p className="text-sm text-gray-500 mt-1">Select data to analyze with AI</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">

          <div className="space-y-8">
            {/* Data Type Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">Data Types</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  includeIncomes 
                    ? 'border-green-500 bg-green-50 text-green-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={includeIncomes}
                    onChange={(e) => setIncludeIncomes(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                      includeIncomes ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {includeIncomes && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium">Income</span>
                  </div>
                </label>
                
                <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  includeExpenses 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={includeExpenses}
                    onChange={(e) => setIncludeExpenses(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                      includeExpenses ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`}>
                      {includeExpenses && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium">Expenses</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Date Range Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Time Period</h3>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setUseCustomRange(false)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      !useCustomRange 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Quick
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomRange(true)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      useCustomRange 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {!useCustomRange ? (
                /* Preset Selection */
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(presets).map(([key, preset]) => (
                    <label 
                      key={key} 
                      className={`flex items-center justify-between p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedPreset === key 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${
                          selectedPreset === key ? 'border-blue-500' : 'border-gray-300'
                        }`}>
                          {selectedPreset === key && (
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          )}
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${
                            selectedPreset === key ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {preset.label}
                          </div>
                          <div className={`text-xs ${
                            selectedPreset === key ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {formatDateForInput(preset.startDate)} to {formatDateForInput(preset.endDate)}
                          </div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="preset"
                        value={key}
                        checked={selectedPreset === key}
                        onChange={(e) => setSelectedPreset(e.target.value)}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                /* Custom Date Range */
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {!includeIncomes && !includeExpenses ? 'Select at least one data type' : 
             `${includeIncomes ? 'Income' : ''}${includeIncomes && includeExpenses ? ' & ' : ''}${includeExpenses ? 'Expenses' : ''} selected`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!includeIncomes && !includeExpenses}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Include Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
