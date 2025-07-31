"use client";

import { useState, useMemo, useRef } from "react";
import { Income, Expense } from "../types/financial";
import { ChartControls } from "./ChartControls";
import { useChartExpansion } from "../utils/chartUtils";

interface CustomCalendarChartProps {
    data: (Income | Expense)[];
    type: "income" | "expense";
    currency?: string;
    title?: string;
    startDate?: string;
    endDate?: string;
}

interface DayData {
    date: Date;
    count: number;
    amount: number;
    isCurrentMonth: boolean;
    isToday: boolean;
}

interface MonthData {
    year: number;
    month: number;
    monthName: string;
    days: DayData[];
    weeks: DayData[][];
}

export function CustomCalendarChart({ 
    data, 
    type, 
    currency = "USD", 
    title, 
    startDate, 
    endDate 
}: CustomCalendarChartProps) {
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const chartRef = useRef<HTMLDivElement>(null);
    
    // Generate time period text
    const getTimePeriodText = (): string => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const startMonth = start.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            const endMonth = end.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            return `(${startMonth} - ${endMonth})`;
        } else if (startDate) {
            const start = new Date(startDate);
            const startMonth = start.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            return `(From ${startMonth})`;
        } else if (endDate) {
            const end = new Date(endDate);
            const endMonth = end.toLocaleDateString('en', { month: 'short', year: 'numeric' });
            return `(Until ${endMonth})`;
        }
        return '';
    };

    const timePeriodText = getTimePeriodText();

    // Process data for selected year or date range
    const processedData = useMemo(() => {
        // If global date filters are provided, use them; otherwise use selected year
        let filteredData = data;
        
        if (startDate || endDate) {
            // Use global date filters
            filteredData = data.filter(transaction => {
                const transactionDate = new Date(transaction.date);
                const start = startDate ? new Date(startDate) : new Date('1900-01-01');
                const end = endDate ? new Date(endDate) : new Date('2100-12-31');
                return transactionDate >= start && transactionDate <= end;
            });
        } else {
            // Use selected year filter
            filteredData = data.filter(transaction => {
                const transactionYear = new Date(transaction.date).getFullYear();
                return transactionYear === selectedYear;
            });
        }

        // Create a map of date strings to transaction data
        const dateMap = new Map<string, { count: number; amount: number }>();
        
        filteredData.forEach(transaction => {
            const date = new Date(transaction.date);
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            
            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, { count: 0, amount: 0 });
            }
            
            const current = dateMap.get(dateKey)!;
            current.count += 1;
            current.amount += transaction.amount;
        });

        return dateMap;
    }, [data, selectedYear, startDate, endDate]);

    // Determine which years to show based on filters
    const displayYears = useMemo(() => {
        if (startDate || endDate) {
            const years = new Set<number>();
            Array.from(processedData.keys()).forEach(dateKey => {
                const yearPart = dateKey.split('-')[0];
                if (yearPart) {
                    const year = parseInt(yearPart);
                    years.add(year);
                }
            });
            return Array.from(years).sort();
        } else {
            return [selectedYear];
        }
    }, [processedData, selectedYear, startDate, endDate]);

    // Generate calendar data in row-column format (rows = days of month 1-31, columns = months)
    const calendarData = useMemo(() => {
        const today = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Get max count and amount for color intensity calculation (using percentiles to handle outliers)
        const amounts = Array.from(processedData.values()).map(d => d.amount).filter(amount => amount > 0);
        const maxCount = Math.max(...Array.from(processedData.values()).map(d => d.count), 1);
        
        // Use 95th percentile to reduce outlier impact on color scale
        const sortedAmounts = amounts.sort((a, b) => a - b);
        const percentile95Index = Math.floor(sortedAmounts.length * 0.95);
        const maxAmount = sortedAmounts.length > 0 
            ? Math.max((sortedAmounts[percentile95Index] || sortedAmounts[sortedAmounts.length - 1] || 1), 1)
            : 1;

        // When using global filters, we need to show data across multiple years
        if (startDate || endDate) {
            // For filtered data, aggregate across all years and months
            const grid: DayData[][] = [];
            
            for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth++) {
                const row: DayData[] = [];
                
                for (let month = 0; month < 12; month++) {
                    // Aggregate data for this day across all years in the filter range
                    let totalCount = 0;
                    let totalAmount = 0;
                    let hasToday = false;
                    let isValidDay = false;
                    
                    displayYears.forEach(year => {
                        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
                        if (dayOfMonth <= lastDayOfMonth) {
                            isValidDay = true;
                            const currentDate = new Date(year, month, dayOfMonth);
                            const dateKey = `${year}-${month}-${dayOfMonth}`;
                            const dayInfo = processedData.get(dateKey);
                            
                            if (dayInfo) {
                                totalCount += dayInfo.count;
                                totalAmount += dayInfo.amount;
                            }
                            
                            if (currentDate.toDateString() === today.toDateString()) {
                                hasToday = true;
                            }
                        }
                    });
                    
                    row.push({
                        date: new Date(displayYears[0] || selectedYear, month, dayOfMonth),
                        count: totalCount,
                        amount: totalAmount,
                        isCurrentMonth: isValidDay,
                        isToday: hasToday
                    });
                }
                
                grid.push(row);
            }
            
            return { grid, maxCount, maxAmount, monthNames };
        } else {
            // Original single-year logic
            const grid: DayData[][] = [];
            
            for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth++) {
                const row: DayData[] = [];
                
                for (let month = 0; month < 12; month++) {
                    const lastDayOfMonth = new Date(selectedYear, month + 1, 0).getDate();
                    
                    if (dayOfMonth <= lastDayOfMonth) {
                        // This day exists in this month
                        const currentDate = new Date(selectedYear, month, dayOfMonth);
                        const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
                        const dayInfo = processedData.get(dateKey) || { count: 0, amount: 0 };
                        
                        row.push({
                            date: new Date(currentDate),
                            count: dayInfo.count,
                            amount: dayInfo.amount,
                            isCurrentMonth: true,
                            isToday: currentDate.toDateString() === today.toDateString()
                        });
                    } else {
                        // This day doesn't exist in this month (e.g., Feb 31st)
                        row.push({
                            date: new Date(selectedYear, month, 1), // Placeholder date
                            count: 0,
                            amount: 0,
                            isCurrentMonth: false,
                            isToday: false
                        });
                    }
                }
                
                grid.push(row);
            }
            
            return { grid, maxCount, maxAmount, monthNames };
        }
    }, [selectedYear, processedData, startDate, endDate, displayYears]);

    // Get color intensity for a day based on transaction amount (capped at 95th percentile)
    const getColorIntensity = (amount: number): string => {
        if (amount === 0) return 'transparent';
        
        // Cap intensity at 95th percentile - outliers will have max intensity
        const intensity = Math.min(amount / calendarData.maxAmount, 1);
        const baseColors = type === 'income' 
            ? { r: 34, g: 197, b: 94 }   // Green for income
            : { r: 239, g: 68, b: 68 };  // Red for expenses
        
        // Create opacity based on intensity
        const opacity = Math.max(0.1, intensity);
        return `rgba(${baseColors.r}, ${baseColors.g}, ${baseColors.b}, ${opacity})`;
    };

    // Available years for selection
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        data.forEach(transaction => {
            years.add(new Date(transaction.date).getFullYear());
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [data]);

    const chartTitle = title || `${type === 'income' ? 'Income' : 'Expense'} Transaction Frequency - ${selectedYear} ${timePeriodText}`;
    const tooltipText = `Calendar view showing the frequency of ${type} transactions per day in ${selectedYear}`;

    // Prepare CSV data for chart controls
    const csvDataForControls = [
        ['Day of Month', 'Month', 'Transaction Count', 'Total Amount'],
        ...calendarData.grid.flatMap((row, rowIndex) => 
            row.map((cellData, colIndex) => [
                (rowIndex + 1).toString(),
                calendarData.monthNames[colIndex] || '',
                cellData.isCurrentMonth ? cellData.count.toString() : 'N/A',
                cellData.isCurrentMonth ? cellData.amount.toFixed(2) : 'N/A'
            ])
        )
    ];

    // Custom download function for HTML-based calendar chart
    const downloadCalendarChartAsPNG = async () => {
        if (!chartRef.current) return;

        try {
            // Dynamically import html2canvas
            const html2canvas = (await import('html2canvas')).default;
            
            const canvas = await html2canvas(chartRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                width: chartRef.current.scrollWidth,
                height: chartRef.current.scrollHeight
            });

            // Convert to blob and download
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `${type}-transaction-frequency-${selectedYear}.png`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                }
            }, 'image/png', 1.0);
        } catch (error) {
            console.error('Error downloading calendar chart as PNG:', error);
            // Fallback: try to create SVG representation
            downloadCalendarChartAsSVG();
        }
    };

    // Custom SVG download function for calendar chart
    const downloadCalendarChartAsSVG = () => {
        if (!chartRef.current) return;

        try {
            const chartElement = chartRef.current;
            const rect = chartElement.getBoundingClientRect();
            const width = Math.max(2500, rect.width * 1.5); // Increased base width and scaling
            const height = Math.max(1000, rect.height);

            // Create SVG
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', width.toString());
            svg.setAttribute('height', height.toString());
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

            // Add background
            const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            background.setAttribute('width', '100%');
            background.setAttribute('height', '100%');
            background.setAttribute('fill', '#ffffff');
            svg.appendChild(background);

            // Add title
            const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleElement.setAttribute('x', '40');
            titleElement.setAttribute('y', '40');
            titleElement.setAttribute('font-family', 'Arial, sans-serif');
            titleElement.setAttribute('font-size', '22');
            titleElement.setAttribute('font-weight', 'bold');
            titleElement.setAttribute('fill', '#111827');
            titleElement.textContent = chartTitle;
            svg.appendChild(titleElement);

            // Calendar grid dimensions - increased for better spacing
            const gridStartX = 40;
            const gridStartY = 100;
            const availableWidth = width - (gridStartX * 2); // Leave margins on both sides
            const dayLabelWidth = 60;
            const gridWidth = availableWidth - dayLabelWidth;
            const cellWidth = Math.floor(gridWidth / 12); // Distribute width evenly across 12 months
            const cellHeight = 25; // Slightly taller cells

            // Add month headers
            calendarData.monthNames.forEach((monthName, index) => {
                const monthHeader = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                monthHeader.setAttribute('x', (gridStartX + dayLabelWidth + (index * cellWidth) + cellWidth / 2).toString());
                monthHeader.setAttribute('y', (gridStartY - 15).toString());
                monthHeader.setAttribute('text-anchor', 'middle');
                monthHeader.setAttribute('font-family', 'Arial, sans-serif');
                monthHeader.setAttribute('font-size', '14');
                monthHeader.setAttribute('font-weight', 'bold');
                monthHeader.setAttribute('fill', '#111827');
                monthHeader.textContent = monthName;
                svg.appendChild(monthHeader);
            });

            // Add calendar grid
            calendarData.grid.forEach((row, rowIndex) => {
                // Add day label
                const dayLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                dayLabel.setAttribute('x', (gridStartX + dayLabelWidth / 2).toString());
                dayLabel.setAttribute('y', (gridStartY + (rowIndex * cellHeight) + cellHeight / 2 + 5).toString());
                dayLabel.setAttribute('text-anchor', 'middle');
                dayLabel.setAttribute('font-family', 'Arial, sans-serif');
                dayLabel.setAttribute('font-size', '12');
                dayLabel.setAttribute('fill', '#6b7280');
                dayLabel.textContent = (rowIndex + 1).toString();
                svg.appendChild(dayLabel);

                // Add month cells
                row.forEach((cellData, colIndex) => {
                    const x = gridStartX + dayLabelWidth + (colIndex * cellWidth);
                    const y = gridStartY + (rowIndex * cellHeight);

                    // Cell background
                    const cellRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    cellRect.setAttribute('x', x.toString());
                    cellRect.setAttribute('y', y.toString());
                    cellRect.setAttribute('width', (cellWidth - 3).toString());
                    cellRect.setAttribute('height', (cellHeight - 3).toString());
                    cellRect.setAttribute('rx', '3');
                    
                    if (cellData.isCurrentMonth) {
                        const backgroundColor = getColorIntensity(cellData.amount);
                        cellRect.setAttribute('fill', backgroundColor === 'transparent' ? '#f9fafb' : backgroundColor);
                        cellRect.setAttribute('stroke', '#e5e7eb');
                        cellRect.setAttribute('stroke-width', '1');
                        
                        if (cellData.isToday) {
                            cellRect.setAttribute('stroke', '#3b82f6');
                            cellRect.setAttribute('stroke-width', '2');
                        }
                    } else {
                        cellRect.setAttribute('fill', '#f9fafb');
                        cellRect.setAttribute('stroke', '#e5e7eb');
                        cellRect.setAttribute('stroke-width', '1');
                        cellRect.setAttribute('opacity', '0.3');
                    }
                    svg.appendChild(cellRect);

                    // Cell count text
                    if (cellData.count > 0 && cellData.isCurrentMonth) {
                        const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        countText.setAttribute('x', (x + cellWidth / 2).toString());
                        countText.setAttribute('y', (y + cellHeight / 2 + 4).toString());
                        countText.setAttribute('text-anchor', 'middle');
                        countText.setAttribute('font-family', 'Arial, sans-serif');
                        countText.setAttribute('font-size', '12');
                        countText.setAttribute('font-weight', 'bold');
                        countText.setAttribute('fill', '#374151');
                        countText.textContent = cellData.count.toString();
                        svg.appendChild(countText);
                    }
                });
            });

            // Add legend with min/max values
            const legendY = gridStartY + (calendarData.grid.length * cellHeight) + 60;
            const legendCenterX = width / 2;
            
            // Calculate min and 95th percentile transaction amounts for legend
            const allAmounts = Array.from(processedData.values()).map(d => d.amount).filter(amount => amount > 0);
            const minAmount = allAmounts.length > 0 ? Math.min(...allAmounts) : 0;
            
            // Use the same 95th percentile calculation as the calendar data
            const sortedAmounts = [...allAmounts].sort((a, b) => a - b);
            const percentile95Index = Math.floor(sortedAmounts.length * 0.95);
            const maxScaleAmount = sortedAmounts.length > 0 
                ? Math.max((sortedAmounts[percentile95Index] || sortedAmounts[sortedAmounts.length - 1] || 1), 1)
                : 0;
            
            const legendText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            legendText.setAttribute('x', (legendCenterX - 140).toString());
            legendText.setAttribute('y', legendY.toString());
            legendText.setAttribute('font-family', 'Arial, sans-serif');
            legendText.setAttribute('font-size', '14');
            legendText.setAttribute('fill', '#6b7280');
            legendText.textContent = `Less [${currency} ${minAmount.toLocaleString()}]`;
            svg.appendChild(legendText);

            // Legend colors - centered
            [0, 0.25, 0.5, 0.75, 1].forEach((intensity, index) => {
                const legendRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                legendRect.setAttribute('x', (legendCenterX - 60 + (index * 24)).toString());
                legendRect.setAttribute('y', (legendY - 15).toString());
                legendRect.setAttribute('width', '20');
                legendRect.setAttribute('height', '20');
                legendRect.setAttribute('rx', '3');
                legendRect.setAttribute('stroke', '#e5e7eb');
                legendRect.setAttribute('stroke-width', '1');
                
                const baseColors = type === 'income' 
                    ? { r: 34, g: 197, b: 94 }   // Green for income
                    : { r: 239, g: 68, b: 68 };  // Red for expenses
                
                if (intensity === 0) {
                    legendRect.setAttribute('fill', '#f3f4f6');
                } else {
                    legendRect.setAttribute('fill', `rgba(${baseColors.r}, ${baseColors.g}, ${baseColors.b}, ${intensity})`);
                }
                svg.appendChild(legendRect);
            });

            const moreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            moreText.setAttribute('x', (legendCenterX + 80).toString());
            moreText.setAttribute('y', legendY.toString());
            moreText.setAttribute('font-family', 'Arial, sans-serif');
            moreText.setAttribute('font-size', '14');
            moreText.setAttribute('fill', '#6b7280');
            moreText.textContent = `More [${currency} ${maxScaleAmount.toLocaleString()}]`;
            svg.appendChild(moreText);

            // Create SVG blob and download
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const link = document.createElement('a');
            link.download = `${type}-transaction-frequency-${selectedYear}.svg`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error downloading calendar chart as SVG:', error);
        }
    };

    const ChartContent = () => (
        <div 
            ref={chartRef}
            className={`${isExpanded ? "h-full flex flex-col" : ""} p-4`}
        >
            {/* Year Selector - Only show when not using global date filters */}
            {!(startDate || endDate) && (
                <div className="flex items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {selectedYear}
                    </h3>
                    {availableYears.length > 1 && (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    )}
                </div>
            )}
        

            {/* Legend */}
            <div className="flex items-center justify-center mb-4 text-sm text-gray-600">
                {(() => {
                    // Calculate min and 95th percentile for legend (to show the scale being used)
                    const allAmounts = Array.from(processedData.values()).map(d => d.amount).filter(amount => amount > 0);
                    const minAmount = allAmounts.length > 0 ? Math.min(...allAmounts) : 0;
                    
                    // Use the same 95th percentile calculation as the calendar data
                    const sortedAmounts = [...allAmounts].sort((a, b) => a - b);
                    const percentile95Index = Math.floor(sortedAmounts.length * 0.95);
                    const maxScaleAmount = sortedAmounts.length > 0 
                        ? Math.max((sortedAmounts[percentile95Index] || sortedAmounts[sortedAmounts.length - 1] || 1), 1)
                        : 0;
                    
                    return (
                        <>
                            <span className="mr-4">Less [{currency} {minAmount.toLocaleString()}]</span>
                            <div className="flex space-x-1">
                                {[0, 0.25, 0.5, 0.75, 1].map((intensity, index) => (
                                    <div
                                        key={index}
                                        className="w-3 h-3 border border-gray-200 rounded-sm"
                                        style={{
                                            backgroundColor: intensity === 0 
                                                ? '#f3f4f6' 
                                                : `rgba(${type === 'income' ? '34, 197, 94' : '239, 68, 68'}, ${intensity})`
                                        }}
                                    />
                                ))}
                            </div>
                            <span className="ml-4">More [{currency} {maxScaleAmount.toLocaleString()}]</span>
                            <span className="ml-2 text-xs text-gray-400">(95th percentile)</span>
                        </>
                    );
                })()}
            </div>

            {/* Row-Column Calendar Grid */}
            <div className="flex-1 overflow-auto">
                <div className="inline-block min-w-full">
                    {/* Month Headers */}
                    <div className="flex mb-2">
                        <div className="w-12 flex-shrink-0"></div> {/* Space for day labels */}
                        {calendarData.monthNames.map((monthName, index) => (
                            <div key={index} className="flex-1 text-center font-semibold text-gray-900 text-sm px-1 min-w-[50px]">
                                {monthName}
                            </div>
                        ))}
                    </div>
                    
                    {/* Calendar Rows */}
                    {calendarData.grid.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex mb-0.5">
                            {/* Day of Month Label */}
                            <div className="w-12 flex-shrink-0 text-xs text-gray-600 font-medium flex items-center justify-center pr-2">
                                {rowIndex + 1}
                            </div>
                            
                            {/* Month Cells */}
                            {row.map((cellData, colIndex) => (
                                <div
                                    key={colIndex}
                                    className={`
                                        relative group flex-1 h-6 border border-gray-200 rounded-sm cursor-pointer mx-0.5
                                        ${cellData.isToday ? 'ring-2 ring-blue-500' : ''}
                                        ${cellData.isCurrentMonth ? 'hover:ring-2 hover:ring-gray-400' : 'opacity-30'}
                                        transition-all
                                        min-w-[50px]
                                    `}
                                    style={{
                                        backgroundColor: cellData.isCurrentMonth ? getColorIntensity(cellData.amount) : '#f9fafb'
                                    }}
                                    title={cellData.isCurrentMonth ? 
                                        `${calendarData.monthNames[colIndex]} ${rowIndex + 1}, ${selectedYear}: ${cellData.count} transactions` :
                                        `${calendarData.monthNames[colIndex]} ${rowIndex + 1} does not exist`
                                    }
                                >
                                    {/* Transaction count display */}
                                    {cellData.count > 0 && cellData.isCurrentMonth && (
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                                            {cellData.count}
                                        </span>
                                    )}
                                    
                                    {/* Tooltip - only show for valid days */}
                                    {cellData.isCurrentMonth && (
                                        <div className={`
                                            absolute left-1/2 transform -translate-x-1/2 px-3 py-2 
                                            bg-gray-900 text-white text-xs rounded shadow-lg 
                                            opacity-0 group-hover:opacity-100 transition-opacity z-20 
                                            whitespace-nowrap pointer-events-none
                                            ${rowIndex < 15 ? 'top-full mt-2' : 'bottom-full mb-2'}
                                        `}>
                                            <div className="font-semibold">
                                                {calendarData.monthNames[colIndex]} {rowIndex + 1}
                                                {(startDate || endDate) && displayYears.length > 1 ? (
                                                    ` (${displayYears.length} years)`
                                                ) : (
                                                    `, ${selectedYear}`
                                                )}
                                            </div>
                                            <div>{cellData.count} transaction{cellData.count !== 1 ? 's' : ''}</div>
                                            {cellData.amount > 0 && (
                                                <div>{currency} {cellData.amount.toLocaleString()}</div>
                                            )}
                                            {(startDate || endDate) && displayYears.length > 1 && (
                                                <div className="text-gray-300 text-xs mt-1">
                                                    Aggregated: {Math.min(...displayYears)}-{Math.max(...displayYears)}
                                                </div>
                                            )}
                                            {/* Tooltip Arrow */}
                                            <div className={`
                                                absolute left-1/2 transform -translate-x-1/2 w-0 h-0 
                                                ${rowIndex < 15 
                                                    ? 'top-0 -mt-1 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900' 
                                                    : 'bottom-0 -mb-1 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900'
                                                }
                                            `} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {Array.from(processedData.values()).every(d => d.count === 0) && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <div className="text-6xl mb-4">{type === 'income' ? '💰' : '💸'}</div>
                    <h3 className="text-lg font-medium mb-2">No {type === 'income' ? 'Income' : 'Expense'} Data for {selectedYear}</h3>
                    <p className="text-sm text-center max-w-sm">
                        Add some {type} entries for {selectedYear} to see the transaction frequency calendar.
                        Your daily {type} activity will appear here.
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <div 
            className={`bg-white rounded-lg shadow-sm border border-gray-200 ${
                isExpanded ? 'fixed inset-4 z-50 overflow-auto flex flex-col' : ''
            }`}
        >
            <div className={`${isExpanded ? 'p-4 flex-1 flex flex-col' : 'p-6'}`}>
                <ChartControls
                    title={chartTitle}
                    tooltipText={tooltipText}
                    csvData={csvDataForControls}
                    csvFileName={`${type}-transaction-frequency-${selectedYear}`}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    chartRef={chartRef}
                    customDownloadPNG={downloadCalendarChartAsPNG}
                    customDownloadSVG={downloadCalendarChartAsSVG}
                />
                <div className={isExpanded ? 'flex-1 mt-4' : ''}>
                    <ChartContent />
                </div>
            </div>
        </div>
    );
}