import { formatCurrency } from '../../utils/currency';
import { useEffect, useRef, type HTMLAttributes } from 'react';

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
  loadError: boolean;
  retryLoad: () => void;
  dimensions: { width: number; height: number };
  allCategoryData: CategoryData[];
  visibleCategoryData: CategoryData[];
  thresholdPosition: number | null;
  currency: string;
  title: string;
  highValueThreshold: number;
  thresholdColor: string;
  panEnabled?: boolean;
  isPanning?: boolean;
  panHandlers?: Pick<HTMLAttributes<HTMLDivElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture' | 'onDoubleClick' | 'onKeyDown'>;
  onWheelZoom?: (event: WheelEvent) => void;
}

export function BubbleChart({
  chartRef,
  isLoading,
  loadError,
  retryLoad,
  dimensions,
  allCategoryData,
  visibleCategoryData,
  thresholdPosition,
  currency,
  title,
  highValueThreshold,
  thresholdColor,
  panEnabled = false,
  isPanning = false,
  panHandlers,
  onWheelZoom
}: BubbleChartProps) {
  const interactionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = interactionRef.current;
    if (!element || !onWheelZoom) return;
    element.addEventListener('wheel', onWheelZoom, { passive: false });
    return () => element.removeEventListener('wheel', onWheelZoom);
  }, [onWheelZoom, allCategoryData.length, visibleCategoryData.length]);
  const isEmpty = visibleCategoryData.length === 0;
  const canInteract = !isEmpty && !loadError && !isLoading;

  return (
    <div
      {...panHandlers}
      ref={interactionRef}
      tabIndex={onWheelZoom && canInteract ? 0 : undefined}
      role={onWheelZoom ? 'region' : undefined}
      aria-label={onWheelZoom ? `${title}. Use plus and minus to zoom, arrow keys to pan, and zero to reset.` : undefined}
      className={`relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${panEnabled ? 'select-none [&_*]:!cursor-[inherit]' : ''}`}
      style={{ cursor: panEnabled ? (isPanning ? 'grabbing' : 'grab') : undefined, touchAction: panEnabled ? 'none' : 'auto' }}
    >
      {isLoading && !isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-sm text-gray-600">Loading chart...</p>
          </div>
        </div>
      )}
      
      <div 
        ref={chartRef} 
        style={{ width: '100%', height: `${dimensions.height}px`, minHeight: '500px' }}
        className={`w-full overflow-hidden ${isEmpty || loadError ? "invisible" : ""}`}
      />
      
      {isEmpty && (
        <div className="absolute inset-0 flex flex-col p-3 sm:p-5">
          <div
            className="grid flex-1 place-items-center border-b border-l border-slate-300 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:10%_20%]"
          >
            <p role="status" className="rounded-md bg-white px-3 py-2 text-sm text-gray-500">
              {allCategoryData.length === 0 ? "No transactions in this view" : "No categories match the chart filters"}
            </p>
          </div>
          <p className="pt-2 text-center text-xs text-gray-500">Average Amount per Transaction ({currency})</p>
        </div>
      )}

      {loadError && !isEmpty && (
        <div className="absolute inset-0 grid place-items-center rounded-md bg-slate-50" role="alert">
          <div className="space-y-2 text-center text-sm text-slate-600">
            <p>Couldn’t load the category chart.</p>
            <button type="button" onClick={retryLoad} className="font-medium text-blue-700 underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Threshold Line Overlay */}
      {canInteract && thresholdPosition !== null && (
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
              strokeWidth="3"
              strokeDasharray="6,6"
            />
            <rect
              x={`calc(${thresholdPosition}% - 60px)`}
              y="5"
              width="120"
              height="25"
              fill="white"
              fillOpacity="0.9"
              rx="4"
            />
            <text
              x={`${thresholdPosition}%`}
              y="20"
              textAnchor="middle"
              fill={thresholdColor}
              fontSize={dimensions.width < 640 ? "12" : "14"}
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
