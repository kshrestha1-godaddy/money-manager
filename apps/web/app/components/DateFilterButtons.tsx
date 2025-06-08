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
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-wrap gap-2 mb-4">
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
                    <button
                        onClick={onClearFilters}
                        className="px-3 py-1 text-xs border border-red-300 text-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        Clear Filters
                    </button>
                </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date
                    </label>
                    <input
                        type="date"
                        id="start-date"
                        value={startDate}
                        onChange={(e) => onDateChange(e.target.value, endDate)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                    </label>
                    <input
                        type="date"
                        id="end-date"
                        value={endDate}
                        onChange={(e) => onDateChange(startDate, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
        </div>
    );
} 