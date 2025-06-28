"use client";

interface DateFilterButtonsProps {
    startDate: string;
    endDate: string;
    onDateChange: (startDate: string, endDate: string) => void;
    onClearFilters: () => void;
}

export function DateFilterButtons({ 
    startDate, 
    endDate, 
    onDateChange, 
    onClearFilters 
}: DateFilterButtonsProps) {
    const getDateRange = (months: number) => {
        const today = new Date();
        
        // Calculate the first day of the month X months ago
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Calculate year and month for X months ago
        let targetMonth = currentMonth - months + 1; // +1 to include current month
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

    return (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                         {/* Quick Filter Buttons */}
             <div className="flex flex-wrap items-center gap-2">
                 <button
                     onClick={() => handleQuickFilter(1)}
                     className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                 >
                     Last Month
                 </button>
                 <button
                     onClick={() => handleQuickFilter(3)}
                     className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                 >
                     Last 3 Months
                 </button>
                 <button
                     onClick={() => handleQuickFilter(6)}
                     className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                 >
                     Last 6 Months
                 </button>
                 <button
                     onClick={() => handleQuickFilter(12)}
                     className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                 >
                     Last 12 Months
                 </button>
             </div>

            {/* Divider */}
            <div className="h-4 w-px bg-gray-300"></div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-600">From:</span>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onDateChange(e.target.value, endDate)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                <span className="text-xs text-gray-500">to</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => onDateChange(startDate, e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
            </div>

            {/* Clear Button */}
            {(startDate || endDate) && (
                <>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <button
                        onClick={onClearFilters}
                        className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    >
                        Clear
                    </button>
                </>
            )}
        </div>
    );
} 