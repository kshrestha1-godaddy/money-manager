interface ChartSkeletonProps {
    title?: string;
    height?: string;
    showControls?: boolean;
}

export function ChartSkeleton({ title = "Loading...", height = "h-[32rem]", showControls = true }: ChartSkeletonProps) {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="h-6 bg-gray-200 rounded w-64"></div>
                    {showControls && (
                        <div className="flex gap-2">
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        </div>
                    )}
                </div>

                {/* Chart Area */}
                <div className={`${height} w-full bg-gray-100 rounded-lg`}>
                    {/* Y-axis ticks */}
                    <div className="flex flex-col justify-between h-full py-4">
                        <div className="h-4 bg-gray-200 rounded w-12 ml-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-12 ml-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-12 ml-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-12 ml-4"></div>
                    </div>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between mt-4">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
            </div>
        </div>
    );
} 