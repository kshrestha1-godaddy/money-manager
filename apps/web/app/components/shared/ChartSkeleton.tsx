interface ChartSkeletonProps {
    title?: string;
    height?: string;
    showControls?: boolean;
}

export function ChartSkeleton({ title = "Loading...", height = "h-[32rem]", showControls = true }: ChartSkeletonProps) {
    return (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="animate-pulse">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
                    <div className="h-6 bg-gray-200 rounded w-48 sm:w-64 mb-2 sm:mb-0"></div>
                    {showControls && (
                        <div className="flex gap-2">
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        </div>
                    )}
                </div>

                {/* Chart Area - Responsive height */}
                <div className={`${height} sm:${height} h-64 sm:h-auto w-full bg-gray-100 rounded-lg`}>
                    {/* Y-axis ticks */}
                    <div className="flex flex-col justify-between h-full py-2 sm:py-4">
                        <div className="h-3 sm:h-4 bg-gray-200 rounded w-8 sm:w-12 ml-2 sm:ml-4"></div>
                        <div className="h-3 sm:h-4 bg-gray-200 rounded w-8 sm:w-12 ml-2 sm:ml-4"></div>
                        <div className="h-3 sm:h-4 bg-gray-200 rounded w-8 sm:w-12 ml-2 sm:ml-4"></div>
                        <div className="h-3 sm:h-4 bg-gray-200 rounded w-8 sm:w-12 ml-2 sm:ml-4"></div>
                    </div>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between mt-2 sm:mt-4">
                    <div className="h-3 sm:h-4 bg-gray-200 rounded w-12 sm:w-16"></div>
                    <div className="h-3 sm:h-4 bg-gray-200 rounded w-12 sm:w-16"></div>
                    <div className="h-3 sm:h-4 bg-gray-200 rounded w-12 sm:w-16"></div>
                    <div className="h-3 sm:h-4 bg-gray-200 rounded w-12 sm:w-16"></div>
                </div>
            </div>
        </div>
    );
} 