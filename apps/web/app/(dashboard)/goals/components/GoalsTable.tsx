import React from 'react';
import { Eye, Edit2, Trash2, Calendar, Target, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency } from '../../../utils/currency';
import { useCurrency } from '../../../providers/CurrencyProvider';
import { BUTTON_COLORS, TEXT_COLORS, CONTAINER_COLORS } from '../../../config/colorConfig';

interface Goal {
  id: number;
  title: string;
  description?: string;
  targetAmount?: number;
  currentAmount: number;
  currency: string;
  startDate: Date;
  targetCompletionDate?: Date;
  actualCompletionDate?: Date;
  priority: number;
  status: string;
  category?: string;
  tags: string[];
  color: string;
  phases?: any[];
  progress?: any[];
}

interface GoalsTableProps {
  goals: Goal[];
  onEditGoal: (id: number) => void;
  onViewGoal: (id: number) => void;
  onDeleteGoal: (id: number) => void;
}

const tableContainer = CONTAINER_COLORS.table;
const tableHeader = TEXT_COLORS.tableHeader;
const tableCell = TEXT_COLORS.tableCell;
const tableCellMuted = TEXT_COLORS.tableCellMuted;
const iconButtonSecondary = BUTTON_COLORS.iconSecondary;
const iconButtonDanger = BUTTON_COLORS.iconDanger;

const statusColors: Record<string, string> = {
  PLANNING: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ON_HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const priorityColors: Record<number, string> = {
  1: 'text-red-600 dark:text-red-400',
  2: 'text-orange-600 dark:text-orange-400',
  3: 'text-yellow-600 dark:text-yellow-400',
  4: 'text-green-600 dark:text-green-400',
  5: 'text-blue-600 dark:text-blue-400',
};

function getTimelineBar(goal: Goal) {
  const now = new Date();
  const startDate = new Date(goal.startDate);
  const targetDate = goal.targetCompletionDate ? new Date(goal.targetCompletionDate) : null;
  const completedDate = goal.actualCompletionDate ? new Date(goal.actualCompletionDate) : null;
  
  // Calculate progress percentage
  let progressPercentage = 0;
  if (goal.targetAmount && goal.targetAmount > 0) {
    progressPercentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  } else if (goal.progress && goal.progress.length > 0) {
    // Use latest progress percentage
    progressPercentage = goal.progress[0].progressPercentage || 0;
  }

  // Determine bar color based on status
  let barColor = 'bg-gray-300 dark:bg-gray-600';
  switch (goal.status) {
    case 'ACTIVE':
      barColor = 'bg-blue-500';
      break;
    case 'COMPLETED':
      barColor = 'bg-green-500';
      break;
    case 'OVERDUE':
      barColor = 'bg-red-500';
      break;
    case 'ON_HOLD':
      barColor = 'bg-yellow-500';
      break;
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Timeline Bar */}
      <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.max(progressPercentage, 5)}%` }}
        />
      </div>
      
      {/* Progress Text */}
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
        {Math.round(progressPercentage)}%
      </span>
    </div>
  );
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function getStatusBadge(status: string) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.PLANNING}`}>
      {status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
    </span>
  );
}

function getPriorityBadge(priority: number) {
  const labels: Record<number, string> = {
    1: 'High',
    2: 'Med',
    3: 'Low',
    4: 'V.Low',
    5: 'Min'
  };
  
  return (
    <span className={`inline-flex items-center font-medium text-xs ${priorityColors[priority] || 'text-gray-600 dark:text-gray-400'}`}>
      {labels[priority] || priority}
    </span>
  );
}

export function GoalsTable({ goals, onEditGoal, onViewGoal, onDeleteGoal }: GoalsTableProps) {
  const { currency: userCurrency } = useCurrency();

  return (
    <div className={tableContainer}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-medium ${tableHeader} uppercase tracking-wider`}>
                #
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium ${tableHeader} uppercase tracking-wider`}>
                Goal
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium ${tableHeader} uppercase tracking-wider`}>
                Timeline & Progress
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium ${tableHeader} uppercase tracking-wider`}>
                Financial
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium ${tableHeader} uppercase tracking-wider`}>
                Status
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium ${tableHeader} uppercase tracking-wider`}>
                Phases
              </th>
              <th className={`px-6 py-3 text-right text-xs font-medium ${tableHeader} uppercase tracking-wider`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {goals.map((goal) => (
              <tr key={goal.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                {/* Priority */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-white mr-2">
                      {goal.priority}
                    </span>
                    {getPriorityBadge(goal.priority)}
                  </div>
                </td>
                
                {/* Goal Info */}
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      <button
                        onClick={() => onViewGoal(goal.id)}
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                      >
                        {goal.title}
                      </button>
                    </div>
                    {goal.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {goal.description}
                      </div>
                    )}
                    {goal.category && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                        {goal.category}
                      </span>
                    )}
                  </div>
                </td>

                {/* Timeline & Progress */}
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{formatDate(goal.startDate)}</span>
                      {goal.targetCompletionDate && (
                        <>
                          <span className="mx-2">→</span>
                          <span>{formatDate(goal.targetCompletionDate)}</span>
                        </>
                      )}
                    </div>
                    {getTimelineBar(goal)}
                  </div>
                </td>

                {/* Financial */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {goal.targetAmount ? (
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(goal.currentAmount, goal.currency || userCurrency)}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        of {formatCurrency(goal.targetAmount, goal.currency || userCurrency)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(goal.status)}
                </td>

                {/* Phases */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-1">
                    {goal.phases && goal.phases.length > 0 ? (
                      <>
                        <div className="flex space-x-1">
                          {goal.phases.slice(0, 3).map((phase, index) => (
                            <div
                              key={phase.id}
                              className={`w-3 h-3 rounded-full ${
                                phase.status === 'COMPLETED' ? 'bg-green-500' :
                                phase.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                                phase.status === 'OVERDUE' ? 'bg-red-500' :
                                'bg-gray-300 dark:bg-gray-600'
                              }`}
                              title={`${phase.name}: ${phase.status}`}
                            />
                          ))}
                        </div>
                        {goal.phases.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{goal.phases.length - 3}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">No phases</span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onViewGoal(goal.id)}
                      className={iconButtonSecondary}
                      title="View Goal"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEditGoal(goal.id)}
                      className={iconButtonSecondary}
                      title="Edit Goal"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className={iconButtonDanger}
                      title="Delete Goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}