import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { useBubbleChart } from '../../hooks/useBubbleChart';

interface BubbleChartZoomControlsProps {
  chartData: ReturnType<typeof useBubbleChart>;
  chartLabel: string;
}

export function BubbleChartZoomControls({ chartData, chartLabel }: BubbleChartZoomControlsProps) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2" role="group" aria-label="Chart zoom">
        {chartData.zoomLevel > 1 && chartData.visibleCategoryData.length > 0 && (
          <span className="mr-auto text-xs text-gray-500">Drag the chart to explore</span>
        )}
        <span className="mr-1 text-xs text-gray-500" aria-live="polite">
          {Math.round(chartData.zoomLevel * 100)}%
        </span>
        <input
          type="range"
          min="50"
          max="800"
          step="10"
          value={Math.round(chartData.zoomLevel * 100)}
          onChange={event => chartData.changeZoom(Number(event.target.value) / 100)}
          disabled={chartData.visibleCategoryData.length === 0}
          aria-label="Chart zoom level"
          aria-valuetext={`${Math.round(chartData.zoomLevel * 100)} percent`}
          className="w-28 accent-blue-600"
        />
        <button
          type="button"
          onClick={chartData.fitToData}
          disabled={chartData.visibleCategoryData.length === 0}
          className="rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
        >
          Fit to Data
        </button>
        <button
          type="button"
          onClick={chartData.zoomOut}
          disabled={chartData.zoomLevel <= 0.5 || chartData.visibleCategoryData.length === 0}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Zoom out ${chartLabel} category chart`}
        >
          <Minus size={14} aria-hidden="true" /> Zoom Out
        </button>
        <button
          type="button"
          onClick={chartData.zoomIn}
          disabled={chartData.zoomLevel >= 8 || chartData.visibleCategoryData.length === 0}
          className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Zoom in ${chartLabel} category chart`}
        >
          <Plus size={14} aria-hidden="true" /> Zoom In
        </button>
        <button
          type="button"
          onClick={chartData.resetZoom}
          disabled={chartData.zoomLevel === 1}
          className="flex items-center gap-1 rounded-md px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Reset ${chartLabel} category chart zoom`}
        >
          <RotateCcw size={14} aria-hidden="true" /> Reset
        </button>
      </div>
      <p className="mb-3 text-xs text-gray-500">
        Ctrl/Cmd + scroll to zoom at the pointer. Double-click to zoom in; Shift + double-click to zoom out.
        Focus the chart to use +/−, arrow keys to pan, or 0 to reset.
      </p>

    </>
  );
}
