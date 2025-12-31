"use client";

import { useState } from "react";

interface DateFilterButtonsProps {
    startDate: string;
    endDate: string;
    availableYears?: number[];
    onDateChange: (startDate: string, endDate: string) => void;
    onClearFilters: () => void;
    onSetAllTime?: () => void;
}

export function DateFilterButtons({ 
    startDate, 
    endDate, 
    availableYears = [],
    onDateChange, 
    onClearFilters,
    onSetAllTime 
}: DateFilterButtonsProps) {
    const getDateRange = (months: number) => {
        const today = new Date();
        
        // Calculate the first day of the month X months ago
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Calculate year and month for X months ago (excluding current month, then add 1 to include it)
        // For "Last N Months": go back (N-1) months to include current month as the Nth month
        let targetMonth = currentMonth - months + 2;
        let targetYear = currentYear;
        
        // Adjust for year boundary crossing
        while (targetMonth <= 0) {
            targetMonth += 12;
            targetYear -= 1;
        }
        
        // Create date for first day of the target month with time set to beginning of day
        const startDate = new Date(targetYear, targetMonth - 1, 1); // -1 because months are 0-indexed
        startDate.setHours(0, 0, 0, 0);
        
        // End date is the last day of the current month to ensure complete months
        // Set time to end of day to include all data for the month
        const endDate = new Date(currentYear, currentMonth + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        
        // Format dates as YYYY-MM-DD, ensuring we always have a string
        const startFormatted = startDate.toISOString().split('T')[0] || '';
        const endFormatted = endDate.toISOString().split('T')[0] || '';
        
        return {
            start: startFormatted,
            end: endFormatted
        };
    };

    const handleQuickFilter = (months: number) => {
        const { start, end } = getDateRange(months);
        onDateChange(start, end);
    };

    // Check if current selection matches a quick filter option
    const isActiveQuickFilter = (months: number) => {
        const { start, end } = getDateRange(months);
        return startDate === start && endDate === end;
    };

    // Track if user explicitly selected All Time vs default state
    const [isAllTimeSelected, setIsAllTimeSelected] = useState(false);
    
    // Check if we're in default state (no dates selected and not explicitly All Time)
    const isDefaultState = !startDate && !endDate && !isAllTimeSelected;
    
    // Handle All Time filter
    const handleAllTime = () => {
        setIsAllTimeSelected(true);
        if (onSetAllTime) {
            onSetAllTime(); // Use the dedicated All Time handler if available
        } else {
            onClearFilters(); // Fallback to clearing filters
        }
    };
    
    // Override quick filter to reset All Time selection
    const handleQuickFilterOverride = (months: number) => {
        setIsAllTimeSelected(false);
        handleQuickFilter(months);
    };

    const getYearRange = (year: number) => {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31);
        const startFormatted = start.toISOString().split('T')[0] || '';
        const endFormatted = end.toISOString().split('T')[0] || '';
        return { start: startFormatted, end: endFormatted };
    };

    const handleYearFilterOverride = (year: number) => {
        setIsAllTimeSelected(false);
        const { start, end } = getYearRange(year);
        onDateChange(start, end);
    };

    const isActiveYearFilter = (year: number) => {
        const { start, end } = getYearRange(year);
        return startDate === start && endDate === end;
    };

    const getYearButtonStyle = (year: number) => {
        if (isActiveYearFilter(year)) {
            return "px-3 py-1 text-xs border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm";
        }
        return "px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500";
    };

    // Handle custom date changes and reset All Time selection
    const handleCustomDateChange = (newStartDate: string, newEndDate: string) => {
        setIsAllTimeSelected(false);
        onDateChange(newStartDate, newEndDate);
    };
    
    // Check if All Time is active
    const isAllTimeActive = !startDate && !endDate && isAllTimeSelected;
    
    // Get button styling based on active state
    const getButtonStyle = (months: number, isDefault = false) => {
        const isActive = isActiveQuickFilter(months) || (isDefault && isDefaultState);
        
        if (isActive) {
            return "px-3 py-1 text-xs border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm";
        }
        
        return "px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500";
    };

    // Get All Time button styling (same as other buttons)
    const getAllTimeButtonStyle = () => {
        const isActive = isAllTimeActive;
        
        if (isActive) {
            return "px-3 py-1 text-xs border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-sm";
        }
        
        return "px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500";
    };

    return (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                         {/* Quick Filter Buttons */}
             <div className="flex flex-wrap items-center gap-2">
                                 <button
                    onClick={() => handleQuickFilterOverride(1)}
                    className={getButtonStyle(1)}
                >
                    Last Month
                </button>
                <button
                    onClick={() => handleQuickFilterOverride(3)}
                    className={getButtonStyle(3)}
                >
                    Last 3 Months
                </button>
                <button
                    onClick={() => handleQuickFilterOverride(6)}
                    className={getButtonStyle(6, true)} // true indicates this is the default
                >
                    Last 6 Months
                </button>
                <button
                    onClick={() => handleQuickFilterOverride(12)}
                    className={getButtonStyle(12)}
                >
                    Last 12 Months
                </button>
                <button
                    onClick={handleAllTime}
                    className={getAllTimeButtonStyle()}
                >
                    All Time
                </button>

                {availableYears.length > 0 && (
                    <>
                        <div className="h-4 w-px bg-gray-300"></div>
                        {availableYears.map((year) => (
                            <button
                                key={year}
                                onClick={() => handleYearFilterOverride(year)}
                                className={getYearButtonStyle(year)}
                            >
                                {year}
                            </button>
                        ))}
                    </>
                )}
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-gray-300"></div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">From:</span>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                <span className="text-xs text-gray-500">to</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
            </div>

            {/* Clear Button */}
            {(startDate || endDate || isAllTimeActive) && (
                <>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <button
                        onClick={() => {
                            setIsAllTimeSelected(false);
                            onClearFilters();
                        }}
                        className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                        Clear
                    </button>
                </>
            )}
        </div>
    );
} 