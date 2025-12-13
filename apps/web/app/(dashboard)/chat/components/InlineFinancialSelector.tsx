"use client";

import { useState, useEffect } from "react";
import { getDateRangePresets } from "../utils/financial-formatting";
import { FinancialDataRequest } from "../actions/financial-data";
import { getUserCurrency } from "../../../actions/currency";

interface InlineFinancialSelectorProps {
  isVisible: boolean;
  onSelect: (request: FinancialDataRequest) => void;
  onClose: () => void;
  initialIncludeIncomes?: boolean;
  initialIncludeExpenses?: boolean;
  initialIncludeDebts?: boolean;
  initialIncludeInvestments?: boolean;
  initialIncludeNetWorth?: boolean;
  initialPreset?: string;
}

export function InlineFinancialSelector({ 
  isVisible, 
  onSelect,
  onClose,
  initialIncludeIncomes = true,
  initialIncludeExpenses = true,
  initialIncludeDebts = false,
  initialIncludeInvestments = false,
  initialIncludeNetWorth = false,
  initialPreset = "thisMonth"
}: InlineFinancialSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>(initialPreset);
  const [includeIncomes, setIncludeIncomes] = useState(initialIncludeIncomes);
  const [includeExpenses, setIncludeExpenses] = useState(initialIncludeExpenses);
  const [includeDebts, setIncludeDebts] = useState(initialIncludeDebts);
  const [includeInvestments, setIncludeInvestments] = useState(initialIncludeInvestments);
  const [includeNetWorth, setIncludeNetWorth] = useState(initialIncludeNetWorth);
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

  // Reset state when component becomes visible with new initial values
  useEffect(() => {
    if (isVisible) {
      setSelectedPreset(initialPreset);
      setIncludeIncomes(initialIncludeIncomes);
      setIncludeExpenses(initialIncludeExpenses);
      setIncludeDebts(initialIncludeDebts);
      setIncludeInvestments(initialIncludeInvestments);
      setIncludeNetWorth(initialIncludeNetWorth);
    }
  }, [isVisible, initialPreset, initialIncludeIncomes, initialIncludeExpenses, initialIncludeDebts, initialIncludeInvestments, initialIncludeNetWorth]);

  if (!isVisible) return null;

  const handleApply = () => {
    const preset = presets.find(p => p.key === selectedPreset);
    if (!preset) return;

    const request: FinancialDataRequest = {
      startDate: preset.startDate,
      endDate: preset.endDate,
      includeIncomes,
      includeExpenses,
      includeDebts,
      includeInvestments,
      includeNetWorth,
    };

    onSelect(request);
    onClose();
  };

  const selectedPresetData = presets.find(p => p.key === selectedPreset);

  return (
    <div className="mb-4 bg-white border border-gray-200 rounded-lg shadow-sm">

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Data Types - Left aligned */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-medium text-gray-700 mb-3">Data Types</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeIncomes}
                  onChange={(e) => setIncludeIncomes(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 focus:ring-2"
                />
                <div className="ml-3">
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Income</span>
                  <span className="block text-xs text-gray-500">Date filtered</span>
                </div>
              </label>
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExpenses}
                  onChange={(e) => setIncludeExpenses(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 focus:ring-2"
                />
                <div className="ml-3">
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Expenses</span>
                  <span className="block text-xs text-gray-500">Date filtered</span>
                </div>
              </label>
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDebts}
                  onChange={(e) => setIncludeDebts(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 focus:ring-2"
                />
                <div className="ml-3">
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Debts</span>
                  <span className="block text-xs text-gray-500">All current data</span>
                </div>
              </label>
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInvestments}
                  onChange={(e) => setIncludeInvestments(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <div className="ml-3">
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Investments</span>
                  <span className="block text-xs text-gray-500">All current data</span>
                </div>
              </label>
              <label className="flex items-center group cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNetWorth}
                  onChange={(e) => setIncludeNetWorth(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                />
                <div className="ml-3">
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Net Worth</span>
                  <span className="block text-xs text-gray-500">Current snapshot</span>
                </div>
              </label>
            </div>
          </div>

          {/* Time Period - Center */}
          <div className="lg:col-span-5">
            <label className="block text-xs font-medium text-gray-700 mb-3">
              Time Period
              <span className="block text-xs font-normal text-gray-500 mt-1">
                (Applies to Income & Expenses only)
              </span>
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={!includeIncomes && !includeExpenses}
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
            {!includeIncomes && !includeExpenses && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Date range disabled - only applies to Income & Expenses
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
                disabled={!includeIncomes && !includeExpenses && !includeDebts && !includeInvestments && !includeNetWorth}
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
