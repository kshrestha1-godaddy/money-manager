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
        const startDate = new Date(today);
        startDate.setMonth(today.getMonth() - months);
        
        return {
            start: startDate.toISOString().split('T')[0] || '',
            end: today.toISOString().split('T')[0] || ''
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