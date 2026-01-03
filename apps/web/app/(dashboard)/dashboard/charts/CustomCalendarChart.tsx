"use client";

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useChartData } from "../../../hooks/useChartDataContext";
import { ChartControls } from "../../../components/ChartControls";
import { useChartExpansion } from "../../../utils/chartUtils";
import { useChartAnimationState } from "../../../hooks/useChartAnimationContext";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";

interface CustomCalendarChartProps {
    type: "income" | "expense";
    currency?: string;
    title?: string;
}

interface YearData {
    year: number;
    count: number;
    amount: number;
}

interface DayData {
    date: Date;
    count: number;
    amount: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    yearBreakdown: YearData[];
    isMonthlyTotal?: boolean; // Flag to identify monthly total rows
}

interface MonthData {
    year: number;
    month: number;
    monthName: string;
    days: DayData[];
    weeks: DayData[][];
}

export const CustomCalendarChart = React.memo<CustomCalendarChartProps>(({ 
    type, 
    currency = "USD", 
    title
}) => {
    const router = useRouter();
    const { isExpanded, toggleExpanded } = useChartExpansion();
    const chartRef = useRef<HTMLDivElement>(null);
    const { rawIncomes, rawExpenses } = useChartData();
    
    // Animation control to prevent restart on re-renders
    const chartId = `calendar-${type}`;
    const { hasAnimated } = useChartAnimationState(chartId);
    
    // Year navigation state
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
    
    // Category filtering state - now supports multiple categories
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    
    // Tooltip state management with delays
    const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
    const [isTooltipHovered, setIsTooltipHovered] = useState(false);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Use raw unfiltered data so calendar chart is independent of global filters
    const allData = type === 'income' ? rawIncomes : rawExpenses;
    
    // Extract unique categories for the dropdown
    const availableCategories = useMemo(() => {
        const categories = new Set<string>();
        allData.forEach(transaction => {
            if (transaction.category?.name) {
                categories.add(transaction.category.name);
            }
        });
        return Array.from(categories).sort();
    }, [allData]);
    
    // Filter data by selected categories
    const data = useMemo(() => {
        if (selectedCategories.length === 0) {
            return allData; // Show all data if no categories selected
        }
        return allData.filter(transaction => 
            transaction.category?.name && selectedCategories.includes(transaction.category.name)
        );
    }, [allData, selectedCategories]);

    // Tooltip handlers with delay
    const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setHoveredCell({ row: rowIndex, col: colIndex });
    };

    const handleCellMouseLeave = () => {
        // Delay hiding to allow moving to tooltip
        hideTimeoutRef.current = setTimeout(() => {
            if (!isTooltipHovered) {
                setHoveredCell(null);
            }
        }, 200); // 200ms delay - gives user time to move to tooltip
    };

    const handleTooltipMouseEnter = () => {
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }
        setIsTooltipHovered(true);
    };

    const handleTooltipMouseLeave = () => {
        setIsTooltipHovered(false);
        setHoveredCell(null);
    };

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    // Process data filtered by selected year
    const processedData = useMemo(() => {
        // Filter data by selected year
        const yearFilteredData = data.filter(transaction => {
            const transactionYear = new Date(transaction.date).getFullYear();
            return transactionYear === selectedYear;
        });
        
        const dateMap = new Map<string, { count: number; amount: number }>();
        
        yearFilteredData.forEach(transaction => {
            const date = new Date(transaction.date);
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            
            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, { count: 0, amount: 0 });
            }
            
            const current = dateMap.get(dateKey)!;
            current.count += 1;
            // Convert transaction amount to display currency
            const convertedAmount = convertForDisplaySync(transaction.amount, transaction.currency, currency || "USD");
            current.amount += convertedAmount;
        });

        return dateMap;
    }, [
        data.length,
        currency,
        selectedYear,
        // Add checksum to detect actual data changes, not just reference changes
        data.reduce((sum, item) => sum + item.amount + item.id, 0)
    ]);

    // Get available years from all data for year navigation
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        data.forEach(transaction => {
            years.add(new Date(transaction.date).getFullYear());
        });
        return Array.from(years).sort();
    }, [
        data.length,
        // Add checksum to detect actual data changes, not just reference changes
        data.reduce((sum, item) => sum + item.id, 0)
    ]);

    // Generate calendar data in row-column format (rows = days of month 1-31, columns = months)
    const calendarData = useMemo(() => {
        const today = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Get max count and amount for color intensity calculation (using percentiles to handle outliers)
        const amounts = Array.from(processedData.values()).map(d => d.amount).filter(amount => amount > 0);
        const maxCount = Math.max(...Array.from(processedData.values()).map(d => d.count), 1);
        
        // Use 80th percentile to reduce outlier impact on color scale
        const sortedAmounts = amounts.sort((a, b) => a - b);
        const percentile80Index = Math.floor(sortedAmounts.length * 0.80);
        const maxAmount = sortedAmounts.length > 0 
            ? Math.max((sortedAmounts[percentile80Index] || sortedAmounts[sortedAmounts.length - 1] || 1), 1)
            : 1;

        // Single-year calendar grid logic - show data for selected year only
        const grid: DayData[][] = [];
        const monthlyTotals: { count: number; amount: number; yearBreakdown: YearData[] }[] = [];
        
        // Initialize monthly totals
        for (let month = 0; month < 12; month++) {
            monthlyTotals.push({ count: 0, amount: 0, yearBreakdown: [] });
        }
        
        for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth++) {
            const row: DayData[] = [];
            
            for (let month = 0; month < 12; month++) {
                // Get data for this specific day in the selected year
                let totalCount = 0;
                let totalAmount = 0;
                let hasToday = false;
                let isValidDay = false;
                const yearBreakdown: YearData[] = [];
                
                // Check if this day exists in the selected year
                const lastDayOfMonth = new Date(selectedYear, month + 1, 0).getDate();
                if (dayOfMonth <= lastDayOfMonth) {
                    isValidDay = true;
                    
                    // Get data for this specific day in selected year
                    const currentDate = new Date(selectedYear, month, dayOfMonth);
                    const dateKey = `${selectedYear}-${month}-${dayOfMonth}`;
                    const dayInfo = processedData.get(dateKey);
                    
                    if (dayInfo) {
                        totalCount = dayInfo.count;
                        totalAmount = dayInfo.amount;
                        
                        // Track year-specific breakdown (single year)
                        yearBreakdown.push({
                            year: selectedYear,
                            count: dayInfo.count,
                            amount: dayInfo.amount
                        });
                        
                        // Add to monthly totals
                        const monthTotal = monthlyTotals[month];
                        if (monthTotal) {
                            monthTotal.count += dayInfo.count;
                            monthTotal.amount += dayInfo.amount;
                            
                            // Find or add year breakdown for monthly totals
                            let monthlyYearData = monthTotal.yearBreakdown.find(y => y.year === selectedYear);
                            if (!monthlyYearData) {
                                monthlyYearData = { year: selectedYear, count: 0, amount: 0 };
                                monthTotal.yearBreakdown.push(monthlyYearData);
                            }
                            monthlyYearData.count += dayInfo.count;
                            monthlyYearData.amount += dayInfo.amount;
                        }
                    }
                    
                    if (currentDate.toDateString() === today.toDateString()) {
                        hasToday = true;
                    }
                }
                
                row.push({
                    date: new Date(selectedYear, month, dayOfMonth),
                    count: totalCount,
                    amount: totalAmount,
                    isCurrentMonth: isValidDay,
                    isToday: hasToday,
                    yearBreakdown: yearBreakdown
                });
            }
            
            grid.push(row);
        }
        
        // Add monthly totals row
        const monthlyTotalRow: DayData[] = [];
        for (let month = 0; month < 12; month++) {
            const monthTotal = monthlyTotals[month];
            if (monthTotal) {
                monthlyTotalRow.push({
                    date: new Date(selectedYear, month, 1), // Use first day as reference
                    count: monthTotal.count,
                    amount: monthTotal.amount,
                    isCurrentMonth: true,
                    isToday: false,
                    yearBreakdown: monthTotal.yearBreakdown,
                    isMonthlyTotal: true
                });
            } else {
                monthlyTotalRow.push({
                    date: new Date(selectedYear, month, 1),
                    count: 0,
                    amount: 0,
                    isCurrentMonth: true,
                    isToday: false,
                    yearBreakdown: [],
                    isMonthlyTotal: true
                });
            }
        }
        grid.push(monthlyTotalRow);
        
        return { grid, maxCount, maxAmount, monthNames };
    }, [
        processedData.size,
        selectedYear,
        // Add checksums to detect actual data changes
        Array.from(processedData.values()).reduce((sum, d) => sum + d.count + d.amount, 0)
    ]);

    // Get color intensity for a day based on transaction amount (capped at 80th percentile)
    const getColorIntensity = (amount: number): string => {
        if (amount === 0) return 'transparent';
        
        // Cap intensity at 80th percentile - outliers will have max intensity
        const intensity = Math.min(amount / calendarData.maxAmount, 1);
        const baseColors = type === 'income' 
            ? { r: 34, g: 197, b: 94 }   // Green for income
            : { r: 239, g: 68, b: 68 };  // Red for expenses
        
        // Create opacity based on intensity
        const opacity = Math.max(0.1, intensity);
        return `rgba(${baseColors.r}, ${baseColors.g}, ${baseColors.b}, ${opacity})`;
    };

    // Calculate total transactions for display
    const totalTransactions = Array.from(processedData.values()).reduce((sum, d) => sum + d.count, 0);
    
    // Create title with category info if filtered
    const categoryText = selectedCategories.length === 0 ? '' : 
                        selectedCategories.length === 1 ? ` • ${selectedCategories[0]}` :
                        selectedCategories.length <= 3 ? ` • ${selectedCategories.join(', ')}` :
                        ` • ${selectedCategories.length} categories`;
    
    const chartTitle = title || (totalTransactions > 0 
        ? `${type === 'income' ? 'Income' : 'Expense'} Transaction Frequency - ${selectedYear}${categoryText} • ${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''}`
        : `${type === 'income' ? 'Income' : 'Expense'} Transaction Frequency - ${selectedYear}${categoryText}`);
    
    const tooltipText = `Calendar heatmap showing daily ${type} transaction frequency and amounts for ${selectedYear}${categoryText}. Hover over dates for comprehensive insights including transaction counts, totals, averages, and activity levels.`;

    // Handle calendar cell click to navigate with date filter
    const handleCellClick = (cellData: DayData, monthIndex: number, dayOfMonth: number) => {
        // Only navigate if the cell has data and is a valid day
        if (!cellData.isCurrentMonth || cellData.count === 0) return;

        // Use the selected year for navigation
        const targetYear = selectedYear;
        
        // Create date range: d-1, d, d+1 for the selected year
        const clickedDate = new Date(targetYear, monthIndex, dayOfMonth);
        const startDate = new Date(clickedDate);
        startDate.setDate(clickedDate.getDate() - 1);
        const endDate = new Date(clickedDate);
        endDate.setDate(clickedDate.getDate() + 1);

        // Format dates for URL parameters (YYYY-MM-DD format)
        const formatDateForURL = (date: Date): string => {
            return date.toISOString().split('T')[0] || '';
        };

        const startDateStr = formatDateForURL(startDate);
        const endDateStr = formatDateForURL(endDate);

        // Navigate to the appropriate page with date filters
        const targetPath = type === 'income' ? '/incomes' : '/expenses';
        const url = `${targetPath}?startDate=${startDateStr}&endDate=${endDateStr}`;
        
        router.push(url);
    };

    // Year navigation handlers
    const goToPreviousYear = () => {
        if (availableYears.length > 0) {
            const currentIndex = availableYears.indexOf(selectedYear);
            if (currentIndex > 0) {
                const previousYear = availableYears[currentIndex - 1];
                if (previousYear !== undefined) {
                    setSelectedYear(previousYear);
                } else {
                    setSelectedYear(selectedYear - 1);
                }
            } else {
                // Allow going to years before the first available year
                setSelectedYear(selectedYear - 1);
            }
        } else {
            setSelectedYear(selectedYear - 1);
        }
    };

    const goToNextYear = () => {
        if (availableYears.length > 0) {
            const currentIndex = availableYears.indexOf(selectedYear);
            if (currentIndex < availableYears.length - 1) {
                const nextYear = availableYears[currentIndex + 1];
                if (nextYear !== undefined) {
                    setSelectedYear(nextYear);
                } else {
                    setSelectedYear(selectedYear + 1);
                }
            } else {
                // Allow going to years after the last available year
                setSelectedYear(selectedYear + 1);
            }
        } else {
            setSelectedYear(selectedYear + 1);
        }
    };

    const goToCurrentYear = () => {
        setSelectedYear(currentDate.getFullYear());
    };

    const handleYearSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const year = parseInt(event.target.value);
        setSelectedYear(year);
    };

    // Generate year options (available years + current year ± 2 years)
    const yearOptions = useMemo(() => {
        const currentYear = currentDate.getFullYear();
        const allYears = new Set([...availableYears, currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]);
        return Array.from(allYears).sort((a, b) => b - a); // Descending order
    }, [availableYears, currentDate]);

    // Enhanced CSV data for chart controls with detailed statistics
    const csvDataForControls = [
        ['Day of Month', 'Month', 'Date', 'Year', 'Category Filter', 'Transaction Count', 'Total Amount', 'Average per Transaction', 'Activity Level', 'Valid Day', 'Type'],
        ...calendarData.grid.flatMap((row, rowIndex) => 
            row.map((cellData, colIndex) => {
                const averageAmount = cellData.count > 0 ? cellData.amount / cellData.count : 0;
                const activityLevel = cellData.count === 0 ? 'None' :
                                   cellData.count === 1 ? 'Single' :
                                   cellData.count <= 3 ? 'Low' :
                                   cellData.count <= 6 ? 'Moderate' : 'High';
                const isMonthlyTotal = cellData.isMonthlyTotal;
                const dateString = isMonthlyTotal ? 
                    `${calendarData.monthNames[colIndex]} ${selectedYear} Monthly Total` :
                    cellData.isCurrentMonth ? 
                    `${calendarData.monthNames[colIndex]} ${rowIndex + 1}, ${selectedYear}` : 'Invalid';
                
                return [
                    isMonthlyTotal ? 'Total' : (rowIndex + 1).toString(),
                    calendarData.monthNames[colIndex] || '',
                    dateString,
                    selectedYear.toString(),
                    selectedCategories.length === 0 ? 'All Categories' : selectedCategories.join('; '),
                    (cellData.isCurrentMonth || isMonthlyTotal) ? cellData.count.toString() : '0',
                    (cellData.isCurrentMonth || isMonthlyTotal) ? cellData.amount.toFixed(2) : '0.00',
                    (cellData.isCurrentMonth || isMonthlyTotal) ? averageAmount.toFixed(2) : '0.00',
                    (cellData.isCurrentMonth || isMonthlyTotal) ? activityLevel : 'N/A',
                    (cellData.isCurrentMonth || isMonthlyTotal) ? 'Yes' : 'No',
                    isMonthlyTotal ? 'Monthly Total' : 'Daily'
                ];
            })
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
                    link.download = `${type}-transaction-frequency.png`;
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
                const isMonthlyTotalRow = row[0]?.isMonthlyTotal;
                const yPosition = gridStartY + (rowIndex * cellHeight);
                
                // Add day label or total label
                const dayLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                dayLabel.setAttribute('x', (gridStartX + dayLabelWidth / 2).toString());
                dayLabel.setAttribute('y', (yPosition + cellHeight / 2 + 5).toString());
                dayLabel.setAttribute('text-anchor', 'middle');
                dayLabel.setAttribute('font-family', 'Arial, sans-serif');
                dayLabel.setAttribute('font-size', isMonthlyTotalRow ? '14' : '12');
                dayLabel.setAttribute('fill', isMonthlyTotalRow ? '#374151' : '#6b7280');
                dayLabel.setAttribute('font-weight', isMonthlyTotalRow ? 'bold' : 'normal');
                dayLabel.textContent = isMonthlyTotalRow ? 'Total' : (rowIndex + 1).toString();
                svg.appendChild(dayLabel);

                // Add separator line for monthly total row
                if (isMonthlyTotalRow) {
                    const separatorLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    separatorLine.setAttribute('x1', gridStartX.toString());
                    separatorLine.setAttribute('y1', (yPosition - 10).toString());
                    separatorLine.setAttribute('x2', (gridStartX + dayLabelWidth + (12 * cellWidth)).toString());
                    separatorLine.setAttribute('y2', (yPosition - 10).toString());
                    separatorLine.setAttribute('stroke', '#d1d5db');
                    separatorLine.setAttribute('stroke-width', '2');
                    svg.appendChild(separatorLine);
                }

                // Add month cells
                row.forEach((cellData, colIndex) => {
                    const x = gridStartX + dayLabelWidth + (colIndex * cellWidth);
                    const y = yPosition;
                    const isMonthlyTotal = cellData.isMonthlyTotal;

                    // Cell background
                    const cellRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    cellRect.setAttribute('x', x.toString());
                    cellRect.setAttribute('y', y.toString());
                    cellRect.setAttribute('width', (cellWidth - 3).toString());
                    cellRect.setAttribute('height', (isMonthlyTotal ? cellHeight + 3 : cellHeight - 3).toString());
                    cellRect.setAttribute('rx', '3');
                    
                    if (cellData.isCurrentMonth) {
                        if (isMonthlyTotal) {
                            // Special styling for monthly totals
                            cellRect.setAttribute('fill', cellData.count > 0 ? (type === 'income' ? '#dcfce7' : '#fee2e2') : '#f9fafb');
                            cellRect.setAttribute('stroke', '#e5e7eb');
                            cellRect.setAttribute('stroke-width', '1');
                        } else {
                        const backgroundColor = getColorIntensity(cellData.amount);
                        cellRect.setAttribute('fill', backgroundColor === 'transparent' ? '#f9fafb' : backgroundColor);
                        cellRect.setAttribute('stroke', '#e5e7eb');
                        cellRect.setAttribute('stroke-width', '1');
                        
                        if (cellData.isToday) {
                            cellRect.setAttribute('stroke', '#3b82f6');
                            cellRect.setAttribute('stroke-width', '2');
                        }
                        }
                    } else if (!isMonthlyTotal) {
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
                        countText.setAttribute('font-size', isMonthlyTotal ? '14' : '12');
                        countText.setAttribute('font-weight', 'bold');
                        countText.setAttribute('fill', isMonthlyTotal ? '#111827' : '#374151');
                        countText.textContent = cellData.count.toString();
                        svg.appendChild(countText);
                    }
                });
            });

            // Add legend with min/max values
            const legendY = gridStartY + (calendarData.grid.length * cellHeight) + 60;
            const legendCenterX = width / 2;
            
            // Calculate min and 80th percentile transaction amounts for legend
            const allAmounts = Array.from(processedData.values()).map(d => d.amount).filter(amount => amount > 0);
            const minAmount = allAmounts.length > 0 ? Math.min(...allAmounts) : 0;
            
            // Use the same 80th percentile calculation as the calendar data
            const sortedAmounts = [...allAmounts].sort((a, b) => a - b);
            const percentile80Index = Math.floor(sortedAmounts.length * 0.80);
            const maxScaleAmount = sortedAmounts.length > 0 
                ? Math.max((sortedAmounts[percentile80Index] || sortedAmounts[sortedAmounts.length - 1] || 1), 1)
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
            link.download = `${type}-transaction-frequency.svg`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Error downloading calendar chart as SVG:', error);
        }
    };

    // Category filter handlers
    const handleCategoryToggle = (category: string) => {
        setSelectedCategories(prev => {
            if (prev.includes(category)) {
                // Remove category if already selected
                return prev.filter(cat => cat !== category);
            } else {
                // Add category if not selected
                return [...prev, category];
            }
        });
    };

    const handleSelectAllCategories = () => {
        setSelectedCategories(availableCategories);
    };

    const handleClearAllCategories = () => {
        setSelectedCategories([]);
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.category-dropdown')) {
                setIsCategoryDropdownOpen(false);
            }
        };

        if (isCategoryDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isCategoryDropdownOpen]);

    // Year Navigation Component
    const YearNavigation = () => {
        const isCurrentYear = selectedYear === currentDate.getFullYear();
        const hasDataForYear = availableYears.includes(selectedYear);
        
        return (
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm mb-4">
                {/* Left side - Year Navigation */}
                <div className="flex items-center gap-3">
                    {/* Previous Year Button */}
                    <button
                        onClick={goToPreviousYear}
                        className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
                        title="Previous year"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>

                    {/* Year Selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <select
                            value={selectedYear}
                            onChange={handleYearSelect}
                            className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[80px]"
                        >
                            {yearOptions.map(year => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Next Year Button */}
                    <button
                        onClick={goToNextYear}
                        className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
                        title="Next year"
                    >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>

                    {/* Current Year Button */}
                    {!isCurrentYear && (
                        <button
                            onClick={goToCurrentYear}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                            title="Go to current year"
                        >
                            Current
                        </button>
                    )}
                    
                    {/* Data availability indicator */}
                    <div className="flex items-center gap-1 ml-2">
                        <div className={`w-2 h-2 rounded-full ${
                            hasDataForYear ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                    </div>
                </div>

                {/* Right side - Category Filter */}
                <div className="relative category-dropdown">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Categories:</span>
                        <button
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                            className="flex items-center justify-between border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px] bg-white hover:bg-gray-50 transition-colors"
                            title={`Filter by ${type} categories`}
                        >
                            <span className="truncate">
                                {selectedCategories.length === 0 
                                    ? 'All Categories'
                                    : selectedCategories.length === 1 
                                    ? selectedCategories[0]
                                    : `${selectedCategories.length} selected`
                                }
                            </span>
                            <ChevronLeft className={`w-4 h-4 text-gray-500 transition-transform ${
                                isCategoryDropdownOpen ? 'rotate-[-90deg]' : 'rotate-[-180deg]'
                            }`} />
                        </button>
                    </div>

                    {/* Multi-select Dropdown */}
                    {isCategoryDropdownOpen && (
                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[250px] max-h-64 overflow-hidden">
                            {/* Header with bulk actions */}
                            <div className="p-3 border-b border-gray-200 bg-gray-50">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-gray-700">
                                        Select Categories ({selectedCategories.length}/{availableCategories.length})
                                    </span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={handleSelectAllCategories}
                                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                            disabled={selectedCategories.length === availableCategories.length}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={handleClearAllCategories}
                                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                            disabled={selectedCategories.length === 0}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Category options */}
                            <div className="max-h-48 overflow-y-auto">
                                {availableCategories.map(category => {
                                    const isSelected = selectedCategories.includes(category);
                                    return (
                                        <label
                                            key={category}
                                            className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleCategoryToggle(category)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                            />
                                            <span className="ml-2 text-sm text-gray-700 select-none">
                                                {category}
                                            </span>
                                        </label>
                                    );
                                })}
                                
                                {/* Empty state */}
                                {availableCategories.length === 0 && (
                                    <div className="p-3 text-sm text-gray-500 text-center">
                                        No categories available
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const ChartContent = () => (
        <div className="p-4">
            {/* Year Navigation */}
            <YearNavigation />
            {/* Legend */}
            <div className="flex items-center justify-center mb-4 text-sm text-gray-600">
                {(() => {
                    // Calculate min and 80th percentile for legend (to show the scale being used)
                    const allAmounts = Array.from(processedData.values()).map(d => d.amount).filter(amount => amount > 0);
                    const minAmount = allAmounts.length > 0 ? Math.min(...allAmounts) : 0;
                    
                    // Use the same 80th percentile calculation as the calendar data
                    const sortedAmounts = [...allAmounts].sort((a, b) => a - b);
                    const percentile80Index = Math.floor(sortedAmounts.length * 0.80);
                    const maxScaleAmount = sortedAmounts.length > 0 
                        ? Math.max((sortedAmounts[percentile80Index] || sortedAmounts[sortedAmounts.length - 1] || 1), 1)
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
                            <span className="ml-2 text-xs text-gray-400">(80th percentile)</span>
                        </>
                    );
                })()}
            </div>

            {/* Row-Column Calendar Grid */}
            <div className="overflow-auto">
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
                    {calendarData.grid.map((row, rowIndex) => {
                        const isMonthlyTotalRow = row[0]?.isMonthlyTotal;
                        return (
                            <div key={rowIndex} className={`flex ${isMonthlyTotalRow ? 'mb-2 mt-2 border-t-2 border-gray-300 pt-2' : 'mb-0.5'}`}>
                                {/* Day of Month Label or Monthly Total Label */}
                                <div className={`w-12 flex-shrink-0 text-xs font-medium flex items-center justify-center pr-2 ${
                                    isMonthlyTotalRow ? 'text-gray-800 font-bold' : 'text-gray-600'
                                }`}>
                                    {isMonthlyTotalRow ? 'Total' : rowIndex + 1}
                            </div>
                            
                            {/* Month Cells */}
                            {row.map((cellData, colIndex) => {
                                const isHovered = hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex;
                                const isMonthlyTotal = cellData.isMonthlyTotal;
                                return (
                                <div
                                    key={colIndex}
                                    className={`
                                        relative flex-1 border border-gray-200 rounded-sm mx-0.5
                                        ${isMonthlyTotal ? 'h-8' : 'h-6'}
                                        ${cellData.isToday && !isMonthlyTotal ? 'ring-2 ring-blue-500' : ''}
                                        ${cellData.isCurrentMonth && cellData.count > 0 ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:shadow-sm' : cellData.isCurrentMonth ? 'hover:ring-2 hover:ring-gray-400' : !isMonthlyTotal ? 'opacity-30' : ''}
                                        transition-all
                                        min-w-[50px]
                                    `}
                                    style={{
                                        backgroundColor: cellData.isCurrentMonth ? 
                                            (isMonthlyTotal ? 
                                                (cellData.count > 0 ? (type === 'income' ? '#dcfce7' : '#fee2e2') : '#f9fafb') 
                                                : getColorIntensity(cellData.amount)) 
                                            : '#f9fafb'
                                    }}
                                    title={isMonthlyTotal ? 
                                        `${calendarData.monthNames[colIndex]} Total: ${cellData.count} transactions - Hover for details`
                                        : cellData.isCurrentMonth ? 
                                        cellData.count > 0 
                                            ? `${calendarData.monthNames[colIndex]} ${rowIndex + 1}: ${cellData.count} transactions - Hover for details`
                                            : `${calendarData.monthNames[colIndex]} ${rowIndex + 1}: No transactions`
                                        : `${calendarData.monthNames[colIndex]} ${rowIndex + 1} does not exist`
                                    }
                                    onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                                    onMouseLeave={handleCellMouseLeave}
                                    onClick={() => {
                                        if (isMonthlyTotal) {
                                            // For monthly totals, navigate to the entire month view
                                            if (cellData.count > 0) {
                                                const startDate = new Date(selectedYear, colIndex, 1);
                                                const endDate = new Date(selectedYear, colIndex + 1, 0); // Last day of month
                                                
                                                const formatDateForURL = (date: Date): string => {
                                                    return date.toISOString().split('T')[0] || '';
                                                };

                                                const startDateStr = formatDateForURL(startDate);
                                                const endDateStr = formatDateForURL(endDate);

                                                const targetPath = type === 'income' ? '/incomes' : '/expenses';
                                                const url = `${targetPath}?startDate=${startDateStr}&endDate=${endDateStr}`;
                                                
                                                router.push(url);
                                            }
                                                        } else {
                                                            handleCellClick(cellData, colIndex, rowIndex + 1);
                                                        }
                                    }}
                                >
                                    {/* Transaction count display */}
                                    {cellData.count > 0 && cellData.isCurrentMonth && (
                                        <span className={`absolute inset-0 flex items-center justify-center text-xs font-medium ${
                                            isMonthlyTotal ? 'text-gray-800 font-bold' : 'text-gray-700'
                                        }`}>
                                            {cellData.count}
                                        </span>
                                    )}
                                    
                                    {/* Enhanced Tooltip - only show for valid days and when hovered */}
                                    {cellData.isCurrentMonth && isHovered && (
                                        <div 
                                            className={`
                                                absolute px-4 py-3 
                                                bg-white border border-gray-200 rounded-lg shadow-xl 
                                                opacity-100 z-30 animate-in fade-in duration-150
                                                pointer-events-auto min-w-72 max-w-96
                                                ${rowIndex < 15 ? 'top-full mt-1' : 'bottom-full mb-1'}
                                                ${
                                                    colIndex === 0 ? 'left-0' :  // January - align left
                                                    colIndex === 1 ? 'left-0' :  // February - align left
                                                    colIndex >= 10 ? 'right-0' : // November, December - align right
                                                    colIndex >= 9 ? 'right-0' :  // October - align right
                                                    'left-1/2 transform -translate-x-1/2' // Others - center
                                                }
                                            `}
                                            onMouseEnter={handleTooltipMouseEnter}
                                            onMouseLeave={handleTooltipMouseLeave}
                                        >
                                            {/* Date Header */}
                                            <div className="font-bold text-gray-900 mb-2 text-sm">
                                                {isMonthlyTotal ? (
                                                    <>
                                                        {calendarData.monthNames[colIndex]} {selectedYear} Monthly Total
                                                    </>
                                                ) : (
                                                    <>
                                                        {calendarData.monthNames[colIndex]} {rowIndex + 1}, {selectedYear}
                                                    </>
                                                )}
                                            </div>

                                            {cellData.count > 0 ? (
                                                <>
                                                    {/* Transaction Summary */}
                                                    <div className="space-y-2 mb-3 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Total Transactions:</span>
                                                            <span className="font-medium text-gray-900">{cellData.count}</span>
                                                        </div>
                                                        
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Total Amount:</span>
                                                            <span className={`font-medium ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                                {currency} {cellData.amount.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-600">Average per Transaction:</span>
                                                            <span className="font-medium text-gray-900">
                                                                {currency} {(cellData.amount / cellData.count).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>


                                                    {/* Activity Context */}
                                                    <div className="border-t border-gray-200 pt-2 space-y-1 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-500">Activity Level:</span>
                                                            <span className={`font-medium ${
                                                                cellData.count === 1 ? 'text-blue-600' :
                                                                cellData.count <= 3 ? 'text-green-600' :
                                                                cellData.count <= 6 ? 'text-yellow-600' : 'text-red-600'
                                                            }`}>
                                                                {cellData.count === 1 ? 'Single' :
                                                                 cellData.count <= 3 ? 'Low' :
                                                                 cellData.count <= 6 ? 'Moderate' : 'High'}
                                                            </span>
                                                        </div>
                                                        
                                                    </div>

                                                    {/* Action Hint */}
                                                    <div className="border-t border-gray-200 pt-2 mt-2">
                                                        <div className="text-xs text-gray-500 text-center">
                                                            {isMonthlyTotal 
                                                                ? '💡 Click cell to view entire month data'
                                                                : '💡 Click cell to view details (±1 day range)'
                                                            }
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    {/* No Activity State */}
                                                    <div className="text-sm text-gray-500 text-center py-2">
                                                        <div className="mb-1">
                                                            {isMonthlyTotal ? `No ${type} transactions this month` : `No ${type} transactions`}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            In {selectedYear}
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* Tooltip Arrow */}
                                            <div className={`
                                                absolute w-0 h-0 
                                                ${
                                                    colIndex === 0 || colIndex === 1 
                                                        ? 'left-4' // Left-aligned tooltips - arrow near left edge
                                                        : colIndex >= 9 
                                                        ? 'right-4' // Right-aligned tooltips - arrow near right edge
                                                        : 'left-1/2 transform -translate-x-1/2' // Centered tooltips - arrow in middle
                                                }
                                                ${rowIndex < 15 
                                                    ? 'top-0 -mt-1 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-200' 
                                                    : 'bottom-0 -mb-1 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200'
                                                }
                                            `} />
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-chart-type={`${type}-calendar`}>
                <ChartControls
                    title={chartTitle}
                    tooltipText={tooltipText}
                    csvData={csvDataForControls}
                    csvFileName={`${type}-transaction-frequency-${selectedYear}${selectedCategories.length > 0 ? `-${selectedCategories.length === 1 ? (selectedCategories[0] || 'unknown').replace(/[^a-zA-Z0-9]/g, '-') : `${selectedCategories.length}-categories`}` : ''}`}
                    isExpanded={isExpanded}
                    onToggleExpanded={toggleExpanded}
                    chartRef={chartRef}
                    customDownloadPNG={downloadCalendarChartAsPNG}
                    customDownloadSVG={downloadCalendarChartAsSVG}
                />
                
                <ChartContent />
            </div>

            {/* Full screen modal */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-[95%] w-full max-h-[95%] overflow-auto">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2 sm:gap-0">
                            <div>
                                <h2 className="text-lg sm:text-2xl font-semibold">{chartTitle}</h2>
                                <p className="text-sm text-gray-500">{tooltipText}</p>
                            </div>
                            <button
                                onClick={toggleExpanded}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm sm:text-base"
                            >
                                Close
                            </button>
                        </div>
                        
                        <div ref={chartRef}>
                            <ChartContent />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});

CustomCalendarChart.displayName = 'CustomCalendarChart';