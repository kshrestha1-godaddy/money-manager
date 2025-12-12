import { formatCurrency } from '../../utils/currency';

interface CategoryData {
  name: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  color: string;
}

interface BubbleChartProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  dimensions: { width: number; height: number };
  allCategoryData: CategoryData[];
  visibleCategoryData: CategoryData[];
  highValueCategories: CategoryData[];
  excludedCategories: Set<string>;
  thresholdPosition: number | null;
  toggleCategoryExclusion: (categoryName: string) => void;
  includeAllCategories: () => void;
  currency: string;
  title: string;
  highValueThreshold: number;
  thresholdColor: string;
}

export function BubbleChart({
  chartRef,
  isLoading,
  dimensions,
  allCategoryData,
  visibleCategoryData,
  highValueCategories,
  excludedCategories,
  thresholdPosition,
  toggleCategoryExclusion,
  includeAllCategories,
  currency,
  title,
  highValueThreshold,
  thresholdColor
}: BubbleChartProps) {
  // No data state
  if (allCategoryData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 w-full">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8 text-gray-500">
          No data available to display
        </div>
      </div>
    );
  }

  // All categories excluded state
  if (visibleCategoryData.length === 0 && excludedCategories.size > 0 && highValueCategories.length > 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
          <div className="flex flex-wrap items-center gap-2">
            {highValueCategories
              .sort((a, b) => b.averageAmount - a.averageAmount)
              .map(category => (
                <button
                  key={category.name}
                  onClick={() => toggleCategoryExclusion(category.name)}
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all bg-gray-200 text-gray-500 line-through opacity-60 hover:opacity-80"
                  title={`Click to show ${category.name} (Avg: ${formatCurrency(category.averageAmount, currency)})`}
                >
                  <div className="w-3 h-3 rounded bg-gray-400" />
                  <span>{category.name}</span>
                </button>
              ))}
            
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            <button
              onClick={includeAllCategories}
              className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded whitespace-nowrap font-medium"
            >
              Show All
            </button>
          </div>
        </div>
        
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">👁️</div>
          <p>All high-value categories are hidden</p>
          <p className="text-sm mt-2">Click "Show All" to display the chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-sm text-gray-600">Loading chart...</p>
          </div>
        </div>
      )}
      
      <div 
        ref={chartRef} 
        style={{ width: '100%', height: `${dimensions.height}px`, minHeight: '300px' }}
        className="overflow-hidden w-full"
      />
      
      {/* Threshold Line Overlay */}
      {thresholdPosition !== null && (
        <div 
          className="absolute pointer-events-none"
          style={{
            left: dimensions.width < 640 ? '40px' : '60px',
            top: '10px',
            width: dimensions.width < 640 ? 'calc(92% - 40px)' : 'calc(95% - 60px)',
            height: 'calc(90% - 10px)',
          }}
        >
          <svg
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <line
              x1={`${thresholdPosition}%`}
              y1="0"
              x2={`${thresholdPosition}%`}
              y2="100%"
              stroke={thresholdColor}
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <rect
              x={`calc(${thresholdPosition}% - 50px)`}
              y="5"
              width="100"
              height="20"
              fill="white"
              fillOpacity="0.9"
              rx="3"
            />
            <text
              x={`${thresholdPosition}%`}
              y="18"
              textAnchor="middle"
              fill={thresholdColor}
              fontSize={dimensions.width < 640 ? "8" : "9"}
              fontWeight="600"
            >
              {formatCurrency(highValueThreshold, currency)}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}
