"use client";

import { useState, useMemo } from "react";
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

    // Process data for selected year
    const processedData = useMemo(() => {
        // Filter data to selected year
        const yearData = data.filter(transaction => {
            const transactionYear = new Date(transaction.date).getFullYear();
            return transactionYear === selectedYear;
        });

        // Create a map of date strings to transaction data
        const dateMap = new Map<string, { count: number; amount: number }>();
        
        yearData.forEach(transaction => {
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
    }, [data, selectedYear]);

    // Generate calendar data in row-column format (rows = days of week, columns = months)
    const calendarData = useMemo(() => {
        const today = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Get max count for color intensity calculation
        const maxCount = Math.max(...Array.from(processedData.values()).map(d => d.count), 1);

        // Create a 7x12 grid: 7 rows (days of week) × 12 columns (months)
        const grid: DayData[][] = [];
        
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
            const row: DayData[] = [];
            
            for (let month = 0; month < 12; month++) {
                // Get all days of this month that fall on this day of week
                const monthDays: DayData[] = [];
                const firstDay = new Date(selectedYear, month, 1);
                const lastDay = new Date(selectedYear, month + 1, 0);
                
                for (let date = 1; date <= lastDay.getDate(); date++) {
                    const currentDate = new Date(selectedYear, month, date);
                    
                    if (currentDate.getDay() === dayOfWeek) {
                        const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
                        const dayInfo = processedData.get(dateKey) || { count: 0, amount: 0 };
                        
                        monthDays.push({
                            date: new Date(currentDate),
                            count: dayInfo.count,
                            amount: dayInfo.amount,
                            isCurrentMonth: true,
                            isToday: currentDate.toDateString() === today.toDateString()
                        });
                    }
                }
                
                // Aggregate data for this day-of-week in this month
                const totalCount = monthDays.reduce((sum, day) => sum + day.count, 0);
                const totalAmount = monthDays.reduce((sum, day) => sum + day.amount, 0);
                const hasToday = monthDays.some(day => day.isToday);
                
                row.push({
                    date: new Date(selectedYear, month, 1), // Representative date
                    count: totalCount,
                    amount: totalAmount,
                    isCurrentMonth: true,
                    isToday: hasToday
                });
            }
            
            grid.push(row);
        }

        return { grid, maxCount, dayNames, monthNames };
    }, [selectedYear, processedData]);

    // Get color intensity for a day based on transaction count
    const getColorIntensity = (count: number): string => {
        if (count === 0) return 'transparent';
        
        const intensity = Math.min(count / calendarData.maxCount, 1);
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
        ['Day of Week', 'Month', 'Transaction Count', 'Total Amount'],
        ...calendarData.grid.flatMap((row, rowIndex) => 
            row.map((cellData, colIndex) => [
                calendarData.dayNames[rowIndex],
                calendarData.monthNames[colIndex],
                cellData.count.toString(),
                cellData.amount.toFixed(2)
            ])
        )
    ];

    const ChartContent = () => (
        <div className={`${isExpanded ? "h-full flex flex-col" : ""} p-4`}>
            {/* Year Selector */}
            <div className="flex items-center justify-between mb-6">
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

            {/* Legend */}
            <div className="flex items-center justify-center mb-4 text-sm text-gray-600">
                <span className="mr-4">Less</span>
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
                <span className="ml-4">More</span>
            </div>

            {/* Row-Column Calendar Grid */}
            <div className="flex-1 overflow-auto">
                <div className="inline-block min-w-full">
                    {/* Month Headers */}
                    <div className="flex mb-2">
                        <div className="w-20 flex-shrink-0"></div> {/* Space for day labels */}
                        {calendarData.monthNames.map((monthName, index) => (
                            <div key={index} className="flex-1 text-center font-semibold text-gray-900 text-sm px-1 min-w-[60px]">
                                {monthName}
                            </div>
                        ))}
                    </div>
                    
                    {/* Calendar Rows */}
                    {calendarData.grid.map((row, rowIndex) => (
                        <div key={rowIndex} className="flex mb-1">
                            {/* Day of Week Label */}
                            <div className="w-20 flex-shrink-0 text-xs text-gray-600 font-medium flex items-center pr-3">
                                {calendarData.dayNames[rowIndex]}
                            </div>
                            
                            {/* Month Cells */}
                            {row.map((cellData, colIndex) => (
                                <div
                                    key={colIndex}
                                    className={`
                                        relative group flex-1 h-8 border border-gray-200 rounded-sm cursor-pointer mx-0.5
                                        ${cellData.isToday ? 'ring-2 ring-blue-500' : ''}
                                        hover:ring-2 hover:ring-gray-400 transition-all
                                        min-w-[60px]
                                    `}
                                    style={{
                                        backgroundColor: getColorIntensity(cellData.count)
                                    }}
                                    title={`${calendarData.dayNames[rowIndex]}s in ${calendarData.monthNames[colIndex]} ${selectedYear}: ${cellData.count} transactions`}
                                >
                                    {/* Transaction count display */}
                                    {cellData.count > 0 && (
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                                            {cellData.count}
                                        </span>
                                    )}
                                    
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                                        <div className="font-semibold">{calendarData.dayNames[rowIndex]}s in {calendarData.monthNames[colIndex]} {selectedYear}</div>
                                        <div>{cellData.count} transaction{cellData.count !== 1 ? 's' : ''}</div>
                                        {cellData.amount > 0 && (
                                            <div>{currency} {cellData.amount.toLocaleString()}</div>
                                        )}
                                    </div>
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
                />
                <div className={isExpanded ? 'flex-1 mt-4' : ''}>
                    <ChartContent />
                </div>
            </div>
        </div>
    );
}