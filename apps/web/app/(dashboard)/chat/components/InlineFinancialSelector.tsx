"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getDateRangePresets } from "../utils/financial-formatting";
import { FinancialDataRequest } from "../actions/financial-data";
import { getUserCurrency } from "../../../actions/currency";
import { TrendingUp, TrendingDown, PiggyBank, BarChart3, Wallet, ArrowLeftRight, Target, Building2 } from "lucide-react";

interface InlineFinancialSelectorProps {
  isVisible: boolean;
  onSelect: (request: FinancialDataRequest) => void;
  onClose: () => void;
}

type DataType = 'income' | 'expenses' | 'debts' | 'investments' | 'networth' | 'transactions' | 'investmentTargets' | 'accounts';

interface DataTypeOption {
  id: DataType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  isDateFiltered: boolean;
}

const dataTypeOptions: DataTypeOption[] = [
  {
    id: 'income',
    label: 'Income',
    description: 'Earnings and revenue streams',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200 hover:border-gray-300',
    isDateFiltered: true
  },
  {
    id: 'expenses',
    label: 'Expenses',
    description: 'Spending and costs',
    icon: <TrendingDown className="w-5 h-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200 hover:border-gray-300',
    isDateFiltered: true
  },
  {
    id: 'debts',
    label: 'Debts',
    description: 'Money lent to others',
    icon: <PiggyBank className="w-5 h-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200 hover:border-gray-300',
    isDateFiltered: false
  },
  {
    id: 'investments',
    label: 'Investments',
    description: 'Portfolio and assets',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200 hover:border-gray-300',
    isDateFiltered: false
  },
  {
    id: 'networth',
    label: 'Net Worth',
    description: 'Complete financial snapshot',
    icon: <Wallet className="w-5 h-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200 hover:border-gray-300',
    isDateFiltered: false
  },
  {
    id: 'transactions',
    label: 'Transactions',
    description: 'Combined income and expense view',
    icon: <ArrowLeftRight className="w-5 h-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200 hover:border-gray-300',
    isDateFiltered: true
  },
  {
    id: 'investmentTargets',
    label: 'Investment Targets',
    description: 'Goals and progress tracking',
    icon: <Target className="w-5 h-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200 hover:border-gray-300',
    isDateFiltered: false
  },
  {
    id: 'accounts',
    label: 'Bank Accounts',
    description: 'Account balances and details',
    icon: <Building2 className="w-5 h-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200 hover:border-gray-300',
    isDateFiltered: false
  }
];

export function InlineFinancialSelector({ 
  isVisible, 
  onSelect,
  onClose
}: InlineFinancialSelectorProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<DataType>>(new Set());
  const [selectedPreset, setSelectedPreset] = useState<string>("thisMonth");
  const [userCurrency, setUserCurrency] = useState<string>("USD");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Reset state when component becomes visible
  useEffect(() => {
    if (isVisible) {
      setSelectedTypes(new Set());
      setSelectedPreset("thisMonth");
    }
  }, [isVisible]);

  // Cleanup timeout when component unmounts or becomes invisible
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible && debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const toggleDataType = (type: DataType) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedTypes(newSelected);
    
    // Auto-apply the selection with debounce
    debouncedApplySelection(newSelected);
  };

  const applySelection = useCallback((typesToApply: Set<DataType>) => {
    if (typesToApply.size === 0) {
      // If no types selected, just return without applying
      return;
    }

    const preset = presets.find(p => p.key === selectedPreset);
    if (!preset) return;

    const request: FinancialDataRequest = {
      startDate: preset.startDate,
      endDate: preset.endDate,
      includeIncomes: typesToApply.has('income'),
      includeExpenses: typesToApply.has('expenses'),
      includeDebts: typesToApply.has('debts'),
      includeInvestments: typesToApply.has('investments'),
      includeNetWorth: typesToApply.has('networth'),
      includeTransactions: typesToApply.has('transactions'),
      includeInvestmentTargets: typesToApply.has('investmentTargets'),
      includeAccounts: typesToApply.has('accounts'),
    };

    onSelect(request);
    // Don't close the selector - keep it open for multiple selections
  }, [selectedPreset, presets, onSelect]);

  const debouncedApplySelection = useCallback((typesToApply: Set<DataType>) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced application
    debounceTimeoutRef.current = setTimeout(() => {
      applySelection(typesToApply);
    }, 500); // 500ms debounce delay
  }, [applySelection]);

  const selectedPresetData = presets.find(p => p.key === selectedPreset);
  const hasDateFilteredTypes = Array.from(selectedTypes).some(type => 
    dataTypeOptions.find(opt => opt.id === type)?.isDateFiltered
  );

  return (
    <div className="mb-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900">Select Financial Data</h3>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Data Type Selection */}
        <div className="mb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dataTypeOptions.map((option) => {
              const isSelected = selectedTypes.has(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => toggleDataType(option.id)}
                  className={`
                    relative p-2 rounded-md border transition-all duration-200 text-left
                    ${isSelected 
                      ? 'bg-gray-100 border-gray-400 ring-1 ring-gray-400' 
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 p-1 rounded bg-gray-100">
                      <div className="text-gray-600 [&>svg]:w-4 [&>svg]:h-4">
                        {option.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 text-xs">
                        {option.label}
                      </h5>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </p>
                      <div className="flex items-center mt-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {option.isDateFiltered ? 'Date filtered' : 'Current data'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Period Selection - Only show if date-filtered types are selected */}
        {hasDateFilteredTypes && (
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-900 mb-2">
              Time Period
              <span className="text-xs font-normal text-gray-500 ml-1">
                (for date-filtered data)
              </span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {presets.slice(0, 4).map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => {
                    setSelectedPreset(preset.key);
                    // Auto-apply when time period changes if there are selected types
                    if (selectedTypes.size > 0) {
                      debouncedApplySelection(selectedTypes);
                    }
                  }}
                  className={`
                    p-2 rounded border text-xs font-medium transition-all duration-200
                    ${selectedPreset === preset.key
                      ? 'bg-gray-100 border-gray-400 text-gray-900'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {selectedPresetData && (
              <p className="text-xs text-gray-500 mt-1.5 text-center">
                {selectedPresetData.startDate.toLocaleDateString()} - {selectedPresetData.endDate.toLocaleDateString()}
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
