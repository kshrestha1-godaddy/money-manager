"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeftRight, RefreshCw } from 'lucide-react';

interface CurrencyConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Exchange rates relative to USD (as of reference)
// You can update these rates or fetch from an API
const EXCHANGE_RATES = {
  USD: 1,
  INR: 83.12, // 1 USD = 83.12 INR
  NPR: 133.00, // 1 USD = 133.00 NPR
};

type Currency = keyof typeof EXCHANGE_RATES;

const CURRENCIES: Currency[] = ['USD', 'INR', 'NPR'];

const CURRENCY_SYMBOLS = {
  USD: '$',
  INR: '₹',
  NPR: 'रू',
};

const CURRENCY_NAMES = {
  USD: 'US Dollar',
  INR: 'Indian Rupee',
  NPR: 'Nepalese Rupee',
};

export function CurrencyConverterModal({ isOpen, onClose }: CurrencyConverterModalProps) {
  const [amount, setAmount] = useState<string>('100');
  const [fromCurrency, setFromCurrency] = useState<Currency>('USD');
  const [toCurrency, setToCurrency] = useState<Currency>('INR');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate converted amount
  const convertedAmount = useMemo(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) return 0;

    // Convert from source currency to USD first
    const amountInUSD = numAmount / EXCHANGE_RATES[fromCurrency];
    // Then convert from USD to target currency
    const converted = amountInUSD * EXCHANGE_RATES[toCurrency];
    
    return converted;
  }, [amount, fromCurrency, toCurrency]);

  // Calculate exchange rate
  const exchangeRate = useMemo(() => {
    return EXCHANGE_RATES[toCurrency] / EXCHANGE_RATES[fromCurrency];
  }, [fromCurrency, toCurrency]);

  // Swap currencies
  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  // Format number with appropriate decimal places
  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Handle amount input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string, numbers, and single decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // Close modal on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ArrowLeftRight className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Currency Converter</h2>
              <p className="text-sm text-green-100">Convert between USD, INR, and NPR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* From Currency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">From</label>
            <div className="flex gap-3">
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value as Currency)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 font-medium bg-white"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {CURRENCY_SYMBOLS[curr]} {curr} - {CURRENCY_NAMES[curr]}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-medium">
                {CURRENCY_SYMBOLS[fromCurrency]}
              </span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                className="w-full pl-10 pr-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-2xl font-semibold text-gray-900"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwap}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors group"
              title="Swap currencies"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 group-hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>

          {/* To Currency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">To</label>
            <div className="flex gap-3">
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value as Currency)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 font-medium bg-white"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>
                    {CURRENCY_SYMBOLS[curr]} {curr} - {CURRENCY_NAMES[curr]}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-medium">
                {CURRENCY_SYMBOLS[toCurrency]}
              </span>
              <div className="w-full pl-10 pr-4 py-4 border-2 border-green-200 bg-green-50 rounded-lg text-2xl font-bold text-green-700">
                {formatAmount(convertedAmount)}
              </div>
            </div>
          </div>

          {/* Exchange Rate Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Exchange Rate</span>
              <span className="font-semibold text-gray-900">
                1 {fromCurrency} = {formatAmount(exchangeRate)} {toCurrency}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-600">Inverse Rate</span>
              <span className="font-semibold text-gray-900">
                1 {toCurrency} = {formatAmount(1 / exchangeRate)} {fromCurrency}
              </span>
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Quick Convert</label>
            <div className="grid grid-cols-4 gap-2">
              {['10', '100', '1000', '10000'].map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  {quickAmount}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="text-xs text-gray-500 text-center">
            Exchange rates are indicative and may vary. For accurate rates, please check with your bank or financial institution.
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

