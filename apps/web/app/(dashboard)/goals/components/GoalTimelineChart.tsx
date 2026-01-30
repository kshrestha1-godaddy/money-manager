import React, { useMemo } from 'react';
import { Calendar, Target, Clock } from 'lucide-react';
import { CONTAINER_COLORS, TEXT_COLORS } from '../../../config/colorConfig';

interface Goal {
  id: number;
  title: string;
  startDate: Date;
  targetCompletionDate?: Date;
  status: string;
  phases?: any[];
  priority: number;
  color: string;
}

interface GoalTimelineChartProps {
  goals: Goal[];
  onGoalClick: (id: number) => void;
}

const cardContainer = CONTAINER_COLORS.cardSmall;
const cardTitle = TEXT_COLORS.cardTitle;
const cardSubtitle = TEXT_COLORS.cardSubtitle;

const statusColors: Record<string, string> = {
  PLANNING: 'bg-gray-400',
  ACTIVE: 'bg-blue-500',
  ON_HOLD: 'bg-yellow-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-400',
  OVERDUE: 'bg-red-600',
};

interface TimelineData {
  goal: Goal;
  startPosition: number;
  duration: number;
  row: number;
}

export function GoalTimelineChart({ goals, onGoalClick }: GoalTimelineChartProps) {
  const timelineData = useMemo(() => {
    if (!goals.length) return [];

    // Find the earliest start date and latest end date
    const allDates = goals.flatMap(goal => [
      new Date(goal.startDate),
      goal.targetCompletionDate ? new Date(goal.targetCompletionDate) : new Date()
    ]);
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add some padding
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);
    
    const totalDuration = maxDate.getTime() - minDate.getTime();

    // Calculate timeline data for each goal
    const timelineItems: TimelineData[] = goals.map((goal, index) => {
      const startDate = new Date(goal.startDate);
      const endDate = goal.targetCompletionDate ? new Date(goal.targetCompletionDate) : new Date();
      
      const startPosition = ((startDate.getTime() - minDate.getTime()) / totalDuration) * 100;
      const duration = Math.max(((endDate.getTime() - startDate.getTime()) / totalDuration) * 100, 2);
      
      return {
        goal,
        startPosition,
        duration,
        row: index
      };
    });

    return { timelineItems, minDate, maxDate };
  }, [goals]);

  if (!goals.length) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No goals to display</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add some goals to see the timeline visualization.
        </p>
      </div>
    );
  }

  const { timelineItems, minDate, maxDate } = timelineData;

  // Generate month markers
  const monthMarkers = useMemo(() => {
    const markers = [];
    const current = new Date(minDate);
    const total = maxDate.getTime() - minDate.getTime();
    
    while (current <= maxDate) {
      const position = ((current.getTime() - minDate.getTime()) / total) * 100;
      markers.push({
        date: new Date(current),
        position
      });
      current.setMonth(current.getMonth() + 1);
    }
    
    return markers;
  }, [minDate, maxDate]);

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Goals Timeline
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {minDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {maxDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative">
        {/* Month markers */}
        <div className="relative h-8 mb-4 border-b border-gray-200 dark:border-gray-700">
          {monthMarkers.map((marker, index) => (
            <div
              key={index}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${marker.position}%` }}
            >
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {marker.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline Bars */}
        <div className="space-y-3">
          {timelineItems.map((item, index) => (
            <div key={item.goal.id} className="relative">
              {/* Goal Info */}
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400 mr-3">
                  {item.goal.priority}
                </div>
                <div className="flex-1">
                  <button
                    onClick={() => onGoalClick(item.goal.id)}
                    className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                  >
                    {item.goal.title}
                  </button>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  item.goal.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  item.goal.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  item.goal.status === 'OVERDUE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}>
                  {item.goal.status.replace('_', ' ')}
                </span>
              </div>

              {/* Timeline Bar */}
              <div className="relative h-6 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                <div
                  className={`absolute top-0 h-full rounded-md transition-all duration-300 cursor-pointer hover:opacity-80 ${
                    statusColors[item.goal.status] || 'bg-gray-400'
                  }`}
                  style={{
                    left: `${item.startPosition}%`,
                    width: `${item.duration}%`,
                  }}
                  onClick={() => onGoalClick(item.goal.id)}
                  title={`${item.goal.title} (${item.goal.status})`}
                >
                  <div className="flex items-center justify-center h-full px-2">
                    <span className="text-xs text-white font-medium truncate">
                      {item.goal.title}
                    </span>
                  </div>
                </div>

                {/* Phases (if any) */}
                {item.goal.phases && item.goal.phases.length > 0 && (
                  <div className="absolute top-0 h-full flex">
                    {item.goal.phases.map((phase, phaseIndex) => (
                      <div
                        key={phase.id}
                        className="h-full border-r border-white/30"
                        style={{
                          left: `${item.startPosition + (item.duration / item.goal.phases!.length) * phaseIndex}%`,
                          width: `${item.duration / item.goal.phases!.length}%`,
                        }}
                        title={`${phase.name}: ${phase.status}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Date Labels */}
              <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span style={{ marginLeft: `${item.startPosition}%` }}>
                  {new Date(item.goal.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {item.goal.targetCompletionDate && (
                  <span style={{ marginRight: `${100 - (item.startPosition + item.duration)}%` }}>
                    {new Date(item.goal.targetCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-900 dark:text-white">Status:</div>
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded ${color}`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {status.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}