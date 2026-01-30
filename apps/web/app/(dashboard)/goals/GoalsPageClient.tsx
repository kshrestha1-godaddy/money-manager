"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from "../../providers/CurrencyProvider";
import { Plus, Search, Filter, SortAsc, Target } from "lucide-react";
import { AddGoalModal } from "./components/AddGoalModal";
import { EditGoalModal } from "./components/EditGoalModal";
import { ViewGoalModal } from "./components/ViewGoalModal";
import { DeleteGoalModal } from "./components/DeleteGoalModal";
import { GanttTimelineView } from "./components/GanttTimelineView";
import { useGoals } from "./hooks/useGoals";
import { DisappearingNotification, NotificationData } from "../../components/DisappearingNotification";
import {
  BUTTON_COLORS,
  TEXT_COLORS,
  CONTAINER_COLORS,
  INPUT_COLORS,
  LOADING_COLORS,
  ICON_COLORS
} from "../../config/colorConfig";

// Color classes
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export interface GoalFiltersState {
  search: string;
  status: string;
  category: string;
  priority: number | null;
  sortBy: 'priority' | 'startDate' | 'targetCompletionDate' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export default function GoalsPageClient() {
  const { currency: userCurrency } = useCurrency();
  const queryClient = useQueryClient();
  
  // State management
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  
  // Filters state
  const [filters, setFilters] = useState<GoalFiltersState>({
    search: '',
    status: '',
    category: '',
    priority: null,
    sortBy: 'priority',
    sortOrder: 'asc'
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Custom hook for goals data
  const {
    goals,
    filteredGoals,
    loading,
    error,
    categories,
    createGoal,
    updateGoal,
    deleteGoal,
    refetchGoals,
    isCreating,
    isUpdating,
    isDeleting
  } = useGoals(filters);

  // Filter handlers
  const handleFilterChange = useCallback((key: keyof GoalFiltersState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: '',
      category: '',
      priority: null,
      sortBy: 'priority',
      sortOrder: 'asc'
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return filters.search || filters.status || filters.category || filters.priority !== null;
  }, [filters]);

  // Goal handlers
  const handleAddGoal = useCallback(async (goalData: any) => {
    try {
      await createGoal(goalData);
      setIsAddModalOpen(false);
      setNotification({
        type: 'success',
        title: 'Success!',
        message: 'Goal created successfully!',
        duration: 3000
      });
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create goal. Please try again.',
        duration: 5000
      });
    }
  }, [createGoal]);

  const handleEditGoal = useCallback(async (goalData: any) => {
    if (!selectedGoalId) return;
    
    try {
      await updateGoal(selectedGoalId, goalData);
      setIsEditModalOpen(false);
      setSelectedGoalId(null);
      setNotification({
        type: 'success',
        title: 'Success!',
        message: 'Goal updated successfully!',
        duration: 3000
      });
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update goal. Please try again.',
        duration: 5000
      });
    }
  }, [selectedGoalId, updateGoal]);

  const handleDeleteGoal = useCallback(async () => {
    if (!selectedGoalId) return;
    
    try {
      await deleteGoal(selectedGoalId);
      setIsDeleteModalOpen(false);
      setSelectedGoalId(null);
      setNotification({
        type: 'success',
        title: 'Success!',
        message: 'Goal deleted successfully!',
        duration: 3000
      });
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete goal. Please try again.',
        duration: 5000
      });
    }
  }, [selectedGoalId, deleteGoal]);

  // Modal handlers
  const openEditModal = useCallback((goalId: number) => {
    setSelectedGoalId(goalId);
    setIsEditModalOpen(true);
  }, []);

  const openViewModal = useCallback((goalId: number) => {
    setSelectedGoalId(goalId);
    setIsViewModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((goalId: number) => {
    setSelectedGoalId(goalId);
    setIsDeleteModalOpen(true);
  }, []);

  // Get selected goal data
  const selectedGoal = useMemo(() => {
    if (!selectedGoalId) return null;
    return goals?.find(goal => goal.id === selectedGoalId) || null;
  }, [selectedGoalId, goals]);

  // Loading state
  if (loading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner}></div>
        <p className={loadingText}>Loading goals...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <Target className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Error Loading Goals</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {error}
          </p>
          <button
            onClick={refetchGoals}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Notification */}
      {notification && (
        <DisappearingNotification
          notification={notification}
          onHide={() => setNotification(null)}
        />
      )}

      {/* Header with Filters - Netflix Style */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Goals</h1>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-2 inline" />
              Add Goal
            </button>
          </div>
          
          {/* Filter Controls Bar - Like Netflix Interface */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <Filter className="h-4 w-4 mr-1 inline" />
                Filtered by
              </button>
              <button className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                <SortAsc className="h-4 w-4 mr-1 inline" />
                Sorted by
              </button>
              <button className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                Grouped by
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Find"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9 pr-4 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={`${filters.sortBy}:${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split(':');
                  handleFilterChange('sortBy', sortBy);
                  handleFilterChange('sortOrder', sortOrder);
                }}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="priority:asc">Sort ↑</option>
                <option value="priority:desc">Sort ↓</option>
                <option value="startDate:asc">Start Date ↑</option>
                <option value="startDate:desc">Start Date ↓</option>
                <option value="targetCompletionDate:asc">Target Date ↑</option>
                <option value="targetCompletionDate:desc">Target Date ↓</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Goals List */}
        <div className="w-80 flex-none border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto">
          <div className="p-0">
            {/* Goals Table Header - Match timeline header height */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              {/* Year row placeholder to match timeline */}
              <div className="h-10 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-750"></div>
              {/* Month row with actual headers */}
              <div className="h-10 grid grid-cols-12 gap-4 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider items-center">
                <div className="col-span-1">#</div>
                <div className="col-span-11">Title</div>
              </div>
            </div>
            
            {/* Goals List */}
            <div>
              {!filteredGoals || filteredGoals.length === 0 ? (
                <div className="p-8 text-center">
                  <Target className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {hasActiveFilters ? 'No goals match your filters' : 'No goals yet'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {hasActiveFilters
                      ? 'Try adjusting your search criteria.'
                      : 'Create your first goal to get started.'}
                  </p>
                </div>
              ) : (
                filteredGoals.map((goal, index) => (
                  <div
                    key={goal.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    style={{ height: '64px' }} // Match timeline row height exactly
                    onClick={() => openViewModal(goal.id)}
                  >
                    <div className="grid grid-cols-12 gap-4 px-4 h-full items-center">
                      <div className="col-span-1">
                        <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                          {goal.priority}
                        </div>
                      </div>
                      <div className="col-span-11">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {goal.title}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          {goal.category && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {goal.category}
                            </div>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            goal.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            goal.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            goal.status === 'OVERDUE' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }`}>
                            {goal.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div className="flex-1 bg-white dark:bg-gray-900 overflow-auto">
          <GanttTimelineView
            goals={filteredGoals || []}
            onGoalClick={openViewModal}
          />
        </div>
      </div>

      {/* Modals */}
      <AddGoalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddGoal}
        isLoading={isCreating}
      />

      {selectedGoal && (
        <>
          <EditGoalModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedGoalId(null);
            }}
            onSubmit={handleEditGoal}
            goal={selectedGoal}
            isLoading={isUpdating}
          />

          <ViewGoalModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setSelectedGoalId(null);
            }}
            goal={selectedGoal}
            onEdit={() => {
              setIsViewModalOpen(false);
              setIsEditModalOpen(true);
            }}
            onDelete={() => {
              setIsViewModalOpen(false);
              setIsDeleteModalOpen(true);
            }}
          />

          <DeleteGoalModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedGoalId(null);
            }}
            onConfirm={handleDeleteGoal}
            goal={selectedGoal}
            isLoading={isDeleting}
          />
        </>
      )}
    </div>
  );
}