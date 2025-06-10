import React from 'react';
import { downloadCSV } from './csvUtils';

export interface ChartUtilsConfig {
    chartRef: React.RefObject<HTMLDivElement | null>;
    fileName?: string;
    csvData?: (string | number)[][];
    csvFileName?: string;
}

/**
 * Downloads chart as PNG with fallback to SVG
 */
export const downloadChart = (config: ChartUtilsConfig): void => {
    const { chartRef, fileName = 'chart' } = config;
    
    if (chartRef.current) {
        const svgElement = chartRef.current.querySelector('svg');
        if (svgElement) {
            try {
                // Clone the SVG to avoid modifying the original
                const clonedSvg = svgElement.cloneNode(true) as SVGElement;
                
                // Get computed styles and dimensions
                const bbox = svgElement.getBoundingClientRect();
                const width = bbox.width || 800;
                const height = bbox.height || 600;
                
                // Set explicit dimensions on cloned SVG
                clonedSvg.setAttribute('width', width.toString());
                clonedSvg.setAttribute('height', height.toString());
                clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                
                // Add white background
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('width', '100%');
                rect.setAttribute('height', '100%');
                rect.setAttribute('fill', 'white');
                clonedSvg.insertBefore(rect, clonedSvg.firstChild);
                
                // Convert to string
                const svgData = new XMLSerializer().serializeToString(clonedSvg);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const svgUrl = URL.createObjectURL(svgBlob);
                
                // Create canvas and image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                canvas.width = width * 2; // Higher resolution
                canvas.height = height * 2;
                
                img.onload = () => {
                    if (ctx) {
                        // Scale for higher quality
                        ctx.scale(2, 2);
                        ctx.drawImage(img, 0, 0);
                        
                        // Convert to PNG and download
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const url = URL.createObjectURL(blob);
                                const downloadLink = document.createElement('a');
                                downloadLink.download = `${fileName}.png`;
                                downloadLink.href = url;
                                document.body.appendChild(downloadLink);
                                downloadLink.click();
                                document.body.removeChild(downloadLink);
                                URL.revokeObjectURL(url);
                            }
                        }, 'image/png', 1.0);
                    }
                    URL.revokeObjectURL(svgUrl);
                };
                
                img.onerror = () => {
                    console.error('Failed to load SVG for PNG conversion');
                    URL.revokeObjectURL(svgUrl);
                    // Fallback: download as SVG
                    downloadAsSvg(config);
                };
                
                img.src = svgUrl;
                
            } catch (error) {
                console.error('Error converting to PNG:', error);
                // Fallback: download as SVG
                downloadAsSvg(config);
            }
        }
    }
};

/**
 * Downloads chart as SVG
 */
export const downloadAsSvg = (config: ChartUtilsConfig): void => {
    const { chartRef, fileName = 'chart' } = config;
    
    if (chartRef.current) {
        const svgElement = chartRef.current.querySelector('svg');
        if (svgElement) {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.download = `${fileName}.svg`;
            downloadLink.href = url;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
        }
    }
};

/**
 * Downloads chart data as CSV
 */
export const downloadData = (config: ChartUtilsConfig): void => {
    const { csvData, csvFileName = 'chart-data' } = config;
    
    if (!csvData || csvData.length === 0) {
        console.warn('No CSV data provided for download');
        return;
    }
    
    // Use centralized CSV utility
    downloadCSV(csvData, csvFileName);
};

/**
 * Hook for managing chart expansion state
 */
export const useChartExpansion = (initialState = false) => {
    const [isExpanded, setIsExpanded] = React.useState(initialState);
    
    const toggleExpanded = () => setIsExpanded(!isExpanded);
    
    return { isExpanded, toggleExpanded, setIsExpanded };
}; 