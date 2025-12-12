"use client";

import { useState, useEffect } from "react";
import { getDateRangePresets } from "../utils/financial-formatting";
import { FinancialDataRequest } from "../actions/financial-data";
import { getUserCurrency } from "../../../actions/currency";

interface InlineFinancialSelectorProps {
  isVisible: boolean;
  onSelect: (request: FinancialDataRequest) => void;
  onClose: () => void;
}

export function InlineFinancialSelector({ 
  isVisible, 
  onSelect,
  onClose 
}: InlineFinancialSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("thisMonth");
  const [includeIncomes, setIncludeIncomes] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [userCurrency, setUserCurrency] = useState<string>("USD");

  const presetData = getDateRangePresets();
  const presets = Object.entries(presetData).map(([key, value]) => ({
    key,
    ...value
  }));

  // Fetch user's currency when component becomes visible
  useEffect(() => {
    if (isVisible) {
      getUserCurrency().then(setUserCurrency).catch(() => setUserCurrency("USD"));
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const handleApply = () => {
    const preset = presets.find(p => p.key === selectedPreset);
    if (!preset) return;

    const request: FinancialDataRequest = {
      startDate: preset.startDate,
      endDate: preset.endDate,
      includeIncomes,
      includeExpenses,
      currency: userCurrency,
    };

    onSelect(request);
  };

  const selectedPresetData = presets.find(p => p.key === selectedPreset);

  return (
    <div className="mb-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Include Financial Data</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Data Types - Left aligned */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-3">Data Types</label>
            <div className="space-y-3">
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeIncomes}
                  onChange={(e) => setIncludeIncomes(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 focus:ring-2"
                />
                <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">Income</span>
              </label>
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExpenses}
                  onChange={(e) => setIncludeExpenses(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 focus:ring-2"
                />
                <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900">Expenses</span>
              </label>
            </div>
          </div>

          {/* Time Period - Center */}
          <div className="lg:col-span-6">
            <label className="block text-xs font-medium text-gray-700 mb-3">Time Period</label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              {presets.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label}
                </option>
              ))}
            </select>
            {selectedPresetData && (
              <p className="text-xs text-gray-500 mt-2 font-medium">
                {selectedPresetData.startDate.toLocaleDateString()} - {selectedPresetData.endDate.toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Actions - Right aligned */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-transparent mb-3">Actions</label>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!includeIncomes && !includeExpenses}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 hover:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 transition-all duration-200"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
