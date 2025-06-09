"use client";

import React from 'react';
import { ChartUtilsConfig, downloadChart, downloadAsSvg, downloadData } from '../utils/chartUtils';

export interface ChartControlsProps {
    chartRef: React.RefObject<HTMLDivElement | null>;
    isExpanded?: boolean;
    onToggleExpanded?: () => void;
    fileName?: string;
    csvData?: (string | number)[][];
    csvFileName?: string;
    showDownloadButtons?: boolean;
    showExpandButton?: boolean;
    title?: string;
}

/**
 * Renders standardized chart control buttons
 */
export const ChartControls: React.FC<ChartControlsProps> = ({
    chartRef,
    isExpanded = false,
    onToggleExpanded,
    fileName = 'chart',
    csvData,
    csvFileName = 'chart-data',
    showDownloadButtons = true,
    showExpandButton = true,
    title
}) => {
    const config: ChartUtilsConfig = {
        chartRef,
        fileName,
        csvData,
        csvFileName
    };

    return (
        <div className="flex justify-between items-center mb-6">
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            <div className="flex items-center gap-2">
                {showDownloadButtons && (
                    <>
                        {/* Download Chart as PNG Button */}
                        <button
                            onClick={() => downloadChart(config)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title="Download Chart as PNG (fallback to SVG)"
                            aria-label="Download chart as PNG image"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>
                        
                        {/* Download Chart as SVG Button */}
                        <button
                            onClick={() => downloadAsSvg(config)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title="Download Chart as SVG"
                            aria-label="Download chart as SVG image"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </button>
                        
                        {/* Download Data Button */}
                        {csvData && (
                            <button
                                onClick={() => downloadData(config)}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                                title="Download Data as CSV"
                                aria-label="Download chart data as CSV file"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </button>
                        )}
                    </>
                )}
                
                {/* Expand/Collapse Button */}
                {showExpandButton && onToggleExpanded && (
                    <button
                        onClick={onToggleExpanded}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                        title={isExpanded ? "Exit Fullscreen" : "Expand to Fullscreen"}
                        aria-label={isExpanded ? "Exit fullscreen view" : "Enter fullscreen view"}
                    >
                        {isExpanded ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}; 