import React from 'react';
import { Search, X, SortAsc, Filter } from 'lucide-react';
import { GoalFiltersState } from '../GoalsPageClient';
import { INPUT_COLORS, BUTTON_COLORS, TEXT_COLORS } from '../../../config/colorConfig';

interface GoalFiltersProps {
  filters: GoalFiltersState;
  categories: string[];
  onFilterChange: (key: keyof GoalFiltersState, value: any) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const standardInput = INPUT_COLORS.standard;
const selectInput = INPUT_COLORS.select;
const clearButton = BUTTON_COLORS.clear;
const labelText = TEXT_COLORS.label;

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'OVERDUE', label: 'Overdue' },
];

const priorityOptions = [
  { value: null, label: 'All Priorities' },
  { value: 1, label: 'High (1)' },
  { value: 2, label: 'Medium (2)' },
  { value: 3, label: 'Low (3)' },
  { value: 4, label: 'Very Low (4)' },
  { value: 5, label: 'Lowest (5)' },
];

const sortOptions = [
  { value: 'priority', label: 'Priority' },
  { value: 'startDate', label: 'Start Date' },
  { value: 'targetCompletionDate', label: 'Target Date' },
  { value: 'createdAt', label: 'Created Date' },
];

export function GoalFilters({
  filters,
  categories,
  onFilterChange,
  onClearFilters,
  hasActiveFilters
}: GoalFiltersProps) {
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map(category => ({ value: category, label: category }))
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filters & Search
        </h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className={clearButton}
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Search */}
        <div className="lg:col-span-2">
          <label className={labelText}>
            Search Goals
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, description, or tags..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              className={`${standardInput} pl-10`}
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className={labelText}>
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className={selectInput}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className={labelText}>
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className={selectInput}
          >
            {categoryOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <label className={labelText}>
            Priority
          </label>
          <select
            value={filters.priority?.toString() || ''}
            onChange={(e) => onFilterChange('priority', e.target.value ? parseInt(e.target.value) : null)}
            className={selectInput}
          >
            {priorityOptions.map(option => (
              <option key={option.value?.toString() || 'all'} value={option.value?.toString() || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Options */}
        <div>
          <label className={labelText}>
            Sort By
          </label>
          <div className="flex gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange('sortBy', e.target.value)}
              className={selectInput}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => onFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <SortAsc 
                className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${
                  filters.sortOrder === 'desc' ? 'rotate-180' : ''
                }`} 
              />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Search: "{filters.search}"
              <button
                onClick={() => onFilterChange('search', '')}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Status: {statusOptions.find(opt => opt.value === filters.status)?.label}
              <button
                onClick={() => onFilterChange('status', '')}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {filters.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Category: {filters.category}
              <button
                onClick={() => onFilterChange('category', '')}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {filters.priority !== null && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              Priority: {priorityOptions.find(opt => opt.value === filters.priority)?.label}
              <button
                onClick={() => onFilterChange('priority', null)}
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}