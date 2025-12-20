import { formatCurrency } from '../../utils/currency';

interface CategoryData {
  name: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  color: string;
}

interface AxisRange {
  min: number;
  max: number;
}

interface BubbleChartControlsProps {
  // Timeframe controls
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  handleQuickFilter: (months: number) => void;
  isActiveQuickFilter: (months: number) => boolean;
  clearTimeframeFilters: () => void;
  isDefaultTimeframe: boolean;
  
  // Average amount filter controls
  minAverage: number;
  maxAverage: number;
  handleMinAverageChange: (value: number) => void;
  handleMaxAverageChange: (value: number) => void;
  resetAverageFilters: () => void;
  
  // Category controls
  highValueCategories: CategoryData[];
  excludedCategories: Set<string>;
  toggleCategoryExclusion: (categoryName: string) => void;
  includeAllCategories: () => void;
  excludeAllHighValueCategories: () => void;
  currency: string;
  
  // Axis controls
  showAxisControls: boolean;
  setShowAxisControls: (show: boolean) => void;
  customXRange: AxisRange | null;
  customYRange: AxisRange | null;
  handleXRangeChange: (min: number, max: number) => void;
  handleYRangeChange: (min: number, max: number) => void;
  resetToDefaults: () => void;
}

function getButtonStyle(isActive: boolean) {
  return isActive
    ? "px-2 sm:px-3 py-1 text-xs border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm whitespace-nowrap"
    : "px-2 sm:px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap";
}

export function BubbleChartControls({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  handleQuickFilter,
  isActiveQuickFilter,
  clearTimeframeFilters,
  isDefaultTimeframe,
  minAverage,
  maxAverage,
  handleMinAverageChange,
  handleMaxAverageChange,
  resetAverageFilters,
  highValueCategories,
  excludedCategories,
  toggleCategoryExclusion,
  includeAllCategories,
  excludeAllHighValueCategories,
  currency,
  showAxisControls,
  setShowAxisControls,
  customXRange,
  customYRange,
  handleXRangeChange,
  handleYRangeChange,
  resetToDefaults
}: BubbleChartControlsProps) {
  return (
    <>
      {/* Timeframe Selector with Adjust Scale Button */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <button
                onClick={clearTimeframeFilters}
                className={getButtonStyle(isDefaultTimeframe)}
              >
                All Time
              </button>
              {[1, 3, 6, 12].map(months => (
                <button
                  key={months}
                  onClick={() => handleQuickFilter(months)}
                  className={getButtonStyle(isActiveQuickFilter(months))}
                >
                  {months === 12 ? '1Y' : `${months}M`}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-4 w-px bg-gray-300"></div>

            {/* Custom Date Range */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white flex-1 sm:flex-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white flex-1 sm:flex-none"
                />
              </div>
            </div>

            {/* Clear Button */}
            {(startDate || endDate) && (
              <button
                onClick={clearTimeframeFilters}
                className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors w-full sm:w-auto text-center"
              >
                Clear
              </button>
            )}

            {/* Divider */}
            <div className="hidden sm:block h-4 w-px bg-gray-300"></div>

            {/* Average Amount Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Min Avg:</span>
                <input
                  type="number"
                  value={minAverage}
                  onChange={(e) => handleMinAverageChange(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white w-20"
                  min="0"
                  step="1000"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">to</span>
                <input
                  type="number"
                  value={maxAverage}
                  onChange={(e) => handleMaxAverageChange(Number(e.target.value))}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white w-20"
                  min="0"
                  step="1000"
                />
              </div>
              {(minAverage !== 5000 || maxAverage !== 300000) && (
                <button
                  onClick={resetAverageFilters}
                  className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Adjust Scale Button - Right Side */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAxisControls(!showAxisControls)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
            >
              {showAxisControls ? 'Hide Controls' : 'Adjust Scale'}
            </button>
          </div>
        </div>
      </div>

      {/* Category Selection Controls */}
      {highValueCategories.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
          <div className="flex flex-wrap items-center gap-2">
            {highValueCategories
              .sort((a, b) => b.averageAmount - a.averageAmount)
              .map(category => {
                const isExcluded = excludedCategories.has(category.name);
                return (
                  <button
                    key={category.name}
                    onClick={() => toggleCategoryExclusion(category.name)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isExcluded
                        ? 'bg-gray-200 text-gray-500 line-through opacity-60 hover:opacity-80'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                    title={`Click to ${isExcluded ? 'show' : 'hide'} ${category.name} (Avg: ${formatCurrency(category.averageAmount, currency)})`}
                  >
                    <div 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: isExcluded ? '#d1d5db' : category.color }}
                    />
                    <span>{category.name}</span>
                  </button>
                );
              })}
            
            {/* Action Buttons */}
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            <button
              onClick={includeAllCategories}
              disabled={excludedCategories.size === 0}
              className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Show All
            </button>
            <button
              onClick={excludeAllHighValueCategories}
              disabled={highValueCategories.every(cat => excludedCategories.has(cat.name))}
              className="px-3 py-1 text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Hide High-Value
            </button>
          </div>
        </div>
      )}

      {/* Axis Controls */}
      {showAxisControls && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* X-Axis Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                X-Axis Range (Average Amount)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={customXRange?.min ?? ''}
                  onChange={(e) => {
                    const min = e.target.value ? parseFloat(e.target.value) : (customXRange?.min ?? -5000);
                    const max = customXRange?.max ?? 51100;
                    handleXRangeChange(min, max);
                  }}
                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={customXRange?.max ?? ''}
                  onChange={(e) => {
                    const max = e.target.value ? parseFloat(e.target.value) : (customXRange?.max ?? 51100);
                    const min = customXRange?.min ?? -5000;
                    handleXRangeChange(min, max);
                  }}
                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-1 mt-2">
                {[[0, 10000, '0-10K'], [0, 50000, '0-50K'], [0, 100000, '0-100K']].map(([min, max, label]) => (
                  <button
                    key={label}
                    onClick={() => handleXRangeChange(min as number, max as number)}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Y-Axis Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y-Axis Range (Transaction Count)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Min"
                  value={customYRange?.min ?? ''}
                  onChange={(e) => {
                    const min = e.target.value ? parseFloat(e.target.value) : (customYRange?.min ?? -50);
                    const max = customYRange?.max ?? 110;
                    handleYRangeChange(min, max);
                  }}
                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={customYRange?.max ?? ''}
                  onChange={(e) => {
                    const max = e.target.value ? parseFloat(e.target.value) : (customYRange?.max ?? 110);
                    const min = customYRange?.min ?? -50;
                    handleYRangeChange(min, max);
                  }}
                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-1 mt-2">
                {[[0, 50, '0-50'], [0, 100, '0-100'], [0, 200, '0-200']].map(([min, max, label]) => (
                  <button
                    key={label}
                    onClick={() => handleYRangeChange(min as number, max as number)}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={resetToDefaults}
              className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Reset to Auto
            </button>
          </div>
        </div>
      )}
    </>
  );
}
