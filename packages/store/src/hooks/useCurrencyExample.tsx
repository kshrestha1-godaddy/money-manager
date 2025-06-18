import React, { useState } from 'react';
import { useCurrency, useCurrencyConverter, useUsdRates, useInrRates, useNprRates } from './useCurrency';

// Example component showing how to use currency conversion in your app
export const CurrencyConverterExample: React.FC = () => {
  const [amount, setAmount] = useState<number>(100);
  const [fromCurrency, setFromCurrency] = useState<string>('usd');
  const [toCurrency, setToCurrency] = useState<string>('inr');

  // Full currency hook with all functionality
  const {
    usd,
    inr,
    npr,
    isLoading,
    error,
    allLoaded,
    convert,
    convertFormatted,
    updateCurrency,
    refreshAll,
    isDataFresh,
    getLastUpdateTime,
  } = useCurrency();

  // Converter-only hook for simpler usage
  const { convert: convertOnly, convertFormatted: convertFormattedOnly } = useCurrencyConverter();

  // Specific currency rate hooks
  const usdRates = useUsdRates();
  const inrRates = useInrRates();
  const nprRates = useNprRates();

  const handleConvert = () => {
    const result = convert(amount, fromCurrency, toCurrency);
    if (result !== null) {
      console.log(`${amount} ${fromCurrency.toUpperCase()} = ${result} ${toCurrency.toUpperCase()}`);
    }
  };

  const handleRefresh = () => {
    refreshAll();
  };

  const handleUpdateSpecific = (currency: 'usd' | 'inr' | 'npr') => {
    updateCurrency(currency, true); // Force update
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Currency Converter</h1>
      
      {/* Status Section */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
            <p>All Data Loaded: {allLoaded ? 'Yes' : 'No'}</p>
            <p>Error: {error || 'None'}</p>
          </div>
          <div>
            <p>USD Fresh: {isDataFresh('usd') ? 'Yes' : 'No'}</p>
            <p>INR Fresh: {isDataFresh('inr') ? 'Yes' : 'No'}</p>
            <p>NPR Fresh: {isDataFresh('npr') ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* Currency Converter */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Convert Currency</h2>
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="usd">USD</option>
              <option value="inr">INR</option>
              <option value="npr">NPR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="usd">USD</option>
              <option value="inr">INR</option>
              <option value="npr">NPR</option>
              <option value="eur">EUR</option>
              <option value="gbp">GBP</option>
              <option value="cad">CAD</option>
              <option value="aud">AUD</option>
              <option value="jpy">JPY</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleConvert}
              disabled={isLoading}
              className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Convert
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-medium">Result (Number):</p>
            <p>{convert(amount, fromCurrency, toCurrency)?.toFixed(4) || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium">Result (Formatted):</p>
            <p>{convertFormatted(amount, fromCurrency, toCurrency) || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Currency Data Management */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Data Management</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Refresh All
          </button>
          <button
            onClick={() => handleUpdateSpecific('usd')}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Update USD
          </button>
          <button
            onClick={() => handleUpdateSpecific('inr')}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Update INR
          </button>
          <button
            onClick={() => handleUpdateSpecific('npr')}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Update NPR
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="font-medium">USD Last Updated:</p>
            <p>{getLastUpdateTime('usd') ? new Date(getLastUpdateTime('usd')!).toLocaleString() : 'Never'}</p>
          </div>
          <div>
            <p className="font-medium">INR Last Updated:</p>
            <p>{getLastUpdateTime('inr') ? new Date(getLastUpdateTime('inr')!).toLocaleString() : 'Never'}</p>
          </div>
          <div>
            <p className="font-medium">NPR Last Updated:</p>
            <p>{getLastUpdateTime('npr') ? new Date(getLastUpdateTime('npr')!).toLocaleString() : 'Never'}</p>
          </div>
        </div>
      </div>

      {/* Available Rates Preview */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Available Rates (Sample)</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h3 className="font-medium mb-2">USD Rates</h3>
            {usdRates && (
              <div className="text-sm">
                <p>EUR: {usdRates.rates.eur?.toFixed(4)}</p>
                <p>INR: {usdRates.rates.inr?.toFixed(4)}</p>
                <p>NPR: {usdRates.rates.npr?.toFixed(4)}</p>
                <p>GBP: {usdRates.rates.gbp?.toFixed(4)}</p>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium mb-2">INR Rates</h3>
            {inrRates && (
              <div className="text-sm">
                <p>USD: {inrRates.rates.usd?.toFixed(4)}</p>
                <p>EUR: {inrRates.rates.eur?.toFixed(4)}</p>
                <p>NPR: {inrRates.rates.npr?.toFixed(4)}</p>
                <p>GBP: {inrRates.rates.gbp?.toFixed(4)}</p>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium mb-2">NPR Rates</h3>
            {nprRates && (
              <div className="text-sm">
                <p>USD: {nprRates.rates.usd?.toFixed(4)}</p>
                <p>EUR: {nprRates.rates.eur?.toFixed(4)}</p>
                <p>INR: {nprRates.rates.inr?.toFixed(4)}</p>
                <p>GBP: {nprRates.rates.gbp?.toFixed(4)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Usage Examples</h2>
        <div className="space-y-2 text-sm">
          <div>
            <h3 className="font-medium">Basic Usage:</h3>
            <pre className="bg-gray-100 p-2 rounded mt-1">
{`import { useCurrency } from '@/store/hooks/useCurrency';

const { convert, convertFormatted } = useCurrency();
const result = convert(100, 'usd', 'inr');
const formatted = convertFormatted(100, 'usd', 'inr');`}
            </pre>
          </div>
          <div>
            <h3 className="font-medium">Converter Only:</h3>
            <pre className="bg-gray-100 p-2 rounded mt-1">
{`import { useCurrencyConverter } from '@/store/hooks/useCurrency';

const { convert, convertFormatted } = useCurrencyConverter();`}
            </pre>
          </div>
          <div>
            <h3 className="font-medium">Specific Rates:</h3>
            <pre className="bg-gray-100 p-2 rounded mt-1">
{`import { useUsdRates, useInrRates, useNprRates } from '@/store/hooks/useCurrency';

const usdRates = useUsdRates();
const inrRate = usdRates?.rates.inr;`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simpler example for quick conversions
export const SimpleCurrencyConverter: React.FC<{
  amount: number;
  from: string;
  to: string;
}> = ({ amount, from, to }) => {
  const { convert, convertFormatted, isLoading, error } = useCurrencyConverter();

  if (isLoading) return <span>Loading...</span>;
  if (error) return <span>Error: {error}</span>;

  const result = convert(amount, from, to);
  const formatted = convertFormatted(amount, from, to);

  return (
    <div>
      <p>
        {amount} {from.toUpperCase()} = {result?.toFixed(4)} {to.toUpperCase()}
      </p>
      <p>Formatted: {formatted}</p>
    </div>
  );
};

// Example for expenses/income with currency conversion
export const ExpenseWithCurrency: React.FC<{
  amount: number;
  currency: string;
  targetCurrency?: string;
}> = ({ amount, currency, targetCurrency = 'usd' }) => {
  const { convertFormatted, isLoading } = useCurrencyConverter();

  const convertedAmount = currency !== targetCurrency 
    ? convertFormatted(amount, currency, targetCurrency)
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount);

  return (
    <div className="flex items-center space-x-2">
      <span className="font-medium">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency.toUpperCase(),
        }).format(amount)}
      </span>
      {currency !== targetCurrency && (
        <>
          <span className="text-gray-500">≈</span>
          <span className="text-gray-600">
            {isLoading ? 'Loading...' : convertedAmount}
          </span>
        </>
      )}
    </div>
  );
}; 