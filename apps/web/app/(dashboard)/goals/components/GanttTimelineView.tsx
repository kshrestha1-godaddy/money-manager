import React, { useMemo } from 'react';
import { useCurrency } from '../../../providers/CurrencyProvider';

interface Goal {
  id: number;
  title: string;
  startDate: Date;
  targetCompletionDate?: Date;
  status: string;
  priority: number;
  color: string;
  targetAmount?: number;
  currentAmount: number;
  currency: string;
}

interface GanttTimelineViewProps {
  goals: Goal[];
  onGoalClick: (id: number) => void;
}

export function GanttTimelineView({ goals, onGoalClick }: GanttTimelineViewProps) {
  const { currency: userCurrency } = useCurrency();
  const timelineData = useMemo(() => {
    if (!goals.length) return { months: [], years: [], goalBars: [] };

    // Calculate the timeline range - use a consistent range
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 1, 0, 1); // Start from last year
    const maxDate = new Date(now.getFullYear() + 2, 11, 31); // End 2 years from now
    
    // Generate months and years for header
    const months = [];
    const years = [];
    const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    
    while (current <= maxDate) {
      months.push({
        date: new Date(current),
        label: current.toLocaleDateString('en-US', { month: 'short' }),
        year: current.getFullYear()
      });
      
      // Add year marker for January or first month
      if (current.getMonth() === 0 || months.length === 1) {
        years.push({
          year: current.getFullYear(),
          startIndex: months.length - 1
        });
      }
      
      current.setMonth(current.getMonth() + 1);
    }

    // Calculate goal bars
    const totalMonths = months.length;
    const goalBars = goals.map(goal => {
      const startDate = new Date(goal.startDate);
      const endDate = goal.targetCompletionDate 
        ? new Date(goal.targetCompletionDate) 
        : new Date(startDate.getFullYear(), startDate.getMonth() + 6, startDate.getDate()); // Default 6 months
      
      // Calculate month positions from the start of timeline
      const startMonthFromMin = (startDate.getFullYear() - minDate.getFullYear()) * 12 + (startDate.getMonth() - minDate.getMonth());
      const endMonthFromMin = (endDate.getFullYear() - minDate.getFullYear()) * 12 + (endDate.getMonth() - minDate.getMonth());
      
      // Convert to percentages
      const left = Math.max(0, (startMonthFromMin / totalMonths) * 100);
      const width = Math.max(1, ((endMonthFromMin - startMonthFromMin) / totalMonths) * 100);

      return {
        goal,
        left,
        width,
        color: getGoalColor(goal.status)
      };
    });

    return { months, years, goalBars, minDate, maxDate };
  }, [goals]);

  function getGoalColor(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return '#10B981'; // green-500
      case 'ACTIVE':
        return '#3B82F6'; // blue-500
      case 'OVERDUE':
        return '#EF4444'; // red-500
      case 'ON_HOLD':
        return '#F59E0B'; // amber-500
      case 'CANCELLED':
        return '#6B7280'; // gray-500
      default:
        return '#8B5CF6'; // violet-500
    }
  }

  if (!goals.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-gray-400 mb-2">No goals to display</div>
          <div className="text-sm text-gray-500">Add goals to see the timeline</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Timeline Header */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
        {/* Years Row */}
        <div className="h-10 border-b border-gray-200 dark:border-gray-700 flex">
          {timelineData.years.map((yearInfo, index) => {
            const nextYear = timelineData.years[index + 1];
            const monthSpan = nextYear 
              ? nextYear.startIndex - yearInfo.startIndex 
              : timelineData.months.length - yearInfo.startIndex;
            
            return (
              <div
                key={yearInfo.year}
                className="flex items-center justify-center border-r border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-750 text-sm font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0"
                style={{ 
                  width: `${(monthSpan / timelineData.months.length) * 100}%`
                }}
              >
                {yearInfo.year}
              </div>
            );
          })}
        </div>
        
        {/* Months Row */}
        <div className="h-10 flex">
          {timelineData.months.map((month, index) => (
            <div
              key={index}
              className="flex items-center justify-center border-r border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0"
              style={{ 
                width: `${100 / timelineData.months.length}%`
              }}
            >
              {month.label}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 relative">
        {/* Vertical Grid Lines */}
        <div className="absolute inset-0 pointer-events-none">
          {timelineData.months.map((_, index) => (
            <div
              key={index}
              className="absolute top-0 bottom-0 border-r border-gray-100 dark:border-gray-800"
              style={{ left: `${((index + 1) / timelineData.months.length) * 100}%` }}
            />
          ))}
        </div>

        {/* Goal Bars Container */}
        <div className="relative">
          {timelineData.goalBars.map((goalBar, index) => (
            <div
              key={goalBar.goal.id}
              className="relative border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              style={{ height: '64px' }} // Fixed height to match left panel rows
            >
              {/* Goal Timeline Bar */}
              <div
                className="absolute top-4 h-8 rounded cursor-pointer transition-all hover:opacity-80 flex items-center px-2"
                style={{
                  left: `${goalBar.left}%`,
                  width: `${Math.max(goalBar.width, 2)}%`, // Minimum width for visibility
                  backgroundColor: goalBar.color,
                }}
                onClick={() => onGoalClick(goalBar.goal.id)}
                title={`${goalBar.goal.title} (${goalBar.goal.status})`}
              >
                <span className="text-white text-xs font-medium truncate">
                  {goalBar.goal.title}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state for timeline area */}
        {timelineData.goalBars.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-sm">No timeline to display</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}