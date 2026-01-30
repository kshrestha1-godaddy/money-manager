import React from 'react';
import { Target, CheckCircle, Play, AlertTriangle, TrendingUp } from 'lucide-react';
import { CONTAINER_COLORS, TEXT_COLORS, ICON_COLORS } from '../../../config/colorConfig';

interface GoalStats {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  overdueGoals: number;
  completionRate: number;
}

interface GoalStatsCardsProps {
  stats: GoalStats | null;
}

const cardContainer = CONTAINER_COLORS.cardSmall;
const cardTitle = TEXT_COLORS.cardTitle;
const cardValue = TEXT_COLORS.cardValue;
const cardSubtitle = TEXT_COLORS.cardSubtitle;

const blueIcon = ICON_COLORS.blue;
const greenIcon = ICON_COLORS.green;
const yellowIcon = ICON_COLORS.yellow;
const redIcon = ICON_COLORS.red;
const purpleIcon = ICON_COLORS.purple;

export function GoalStatsCards({ stats }: GoalStatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`${cardContainer} animate-pulse`}>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="ml-3">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16 mb-1"></div>
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-8"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Goals',
      value: stats.totalGoals,
      icon: Target,
      iconColor: blueIcon,
      subtitle: 'All goals',
    },
    {
      title: 'Active Goals',
      value: stats.activeGoals,
      icon: Play,
      iconColor: yellowIcon,
      subtitle: 'In progress',
    },
    {
      title: 'Completed',
      value: stats.completedGoals,
      icon: CheckCircle,
      iconColor: greenIcon,
      subtitle: 'Achieved',
    },
    {
      title: 'Overdue',
      value: stats.overdueGoals,
      icon: AlertTriangle,
      iconColor: redIcon,
      subtitle: 'Past deadline',
    },
    {
      title: 'Success Rate',
      value: `${Math.round(stats.completionRate)}%`,
      icon: TrendingUp,
      iconColor: stats.completionRate >= 70 ? greenIcon : stats.completionRate >= 40 ? yellowIcon : redIcon,
      subtitle: 'Completion rate',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {statsCards.map((stat, index) => (
        <div key={index} className={cardContainer}>
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${stat.iconColor}`}>
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <div className="ml-3">
              <p className={cardTitle}>{stat.title}</p>
              <p className={cardValue}>{stat.value}</p>
              <p className={cardSubtitle}>{stat.subtitle}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}