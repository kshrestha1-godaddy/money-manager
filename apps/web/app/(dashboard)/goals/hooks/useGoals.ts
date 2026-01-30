import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getGoals,
  getGoalStats,
  getGoalCategories,
  createGoal as createGoalAction,
  updateGoal as updateGoalAction,
  deleteGoal as deleteGoalAction,
} from '../../../actions/goals';
import { GoalFiltersState } from '../GoalsPageClient';

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
  notes?: string;
  successCriteria?: string;
  accountId?: number;
  riskLevel: string;
  isPublic: boolean;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  phases?: any[];
  progress?: any[];
}

interface GoalStats {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  overdueGoals: number;
  completionRate: number;
}

export function useGoals(filters: GoalFiltersState) {
  const queryClient = useQueryClient();

  // Fetch goals
  const {
    data: goalsData,
    isLoading: goalsLoading,
    error: goalsError,
    refetch: refetchGoals
  } = useQuery({
    queryKey: ['goals', filters.status, filters.category, filters.priority],
    queryFn: () => getGoals({
      status: filters.status || undefined,
      category: filters.category || undefined,
      priority: filters.priority || undefined,
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch stats
  const {
    data: statsData,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['goal-stats'],
    queryFn: getGoalStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch categories
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ['goal-categories'],
    queryFn: getGoalCategories,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createGoalAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-stats'] });
      queryClient.invalidateQueries({ queryKey: ['goal-categories'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateGoalAction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGoalAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-stats'] });
      queryClient.invalidateQueries({ queryKey: ['goal-categories'] });
    },
  });

  // Process data
  const goals = useMemo((): Goal[] => {
    if (goalsData?.error || !goalsData?.data) return [];
    return goalsData.data;
  }, [goalsData]);

  const stats = useMemo((): GoalStats | null => {
    if (statsData?.error || !statsData?.data) return null;
    return statsData.data;
  }, [statsData]);

  const categories = useMemo((): string[] => {
    if (categoriesData?.error || !categoriesData?.data) return [];
    return categoriesData.data;
  }, [categoriesData]);

  // Filter and search goals
  const filteredGoals = useMemo((): Goal[] => {
    if (!goals) return [];

    let filtered = [...goals];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(goal => 
        goal.title.toLowerCase().includes(searchTerm) ||
        goal.description?.toLowerCase().includes(searchTerm) ||
        goal.category?.toLowerCase().includes(searchTerm) ||
        goal.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        goal.notes?.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(goal => goal.status === filters.status);
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(goal => goal.category === filters.category);
    }

    // Priority filter
    if (filters.priority !== null) {
      filtered = filtered.filter(goal => goal.priority === filters.priority);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'startDate':
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
        case 'targetCompletionDate':
          aValue = a.targetCompletionDate ? new Date(a.targetCompletionDate) : new Date('9999-12-31');
          bValue = b.targetCompletionDate ? new Date(b.targetCompletionDate) : new Date('9999-12-31');
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [goals, filters]);

  // Check for overdue goals and update status if needed
  useEffect(() => {
    if (!goals?.length) return;

    const now = new Date();
    const overdueGoals = goals.filter(goal => 
      goal.status === 'ACTIVE' &&
      goal.targetCompletionDate &&
      new Date(goal.targetCompletionDate) < now
    );

    if (overdueGoals.length > 0) {
      // Update overdue goals in the background
      overdueGoals.forEach(goal => {
        updateMutation.mutate({ 
          id: goal.id, 
          data: { status: 'OVERDUE' } 
        });
      });
    }
  }, [goals]);

  // Action handlers
  const createGoal = useCallback(async (goalData: any) => {
    const result = await createMutation.mutateAsync(goalData);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.data;
  }, [createMutation]);

  const updateGoal = useCallback(async (id: number, goalData: any) => {
    const result = await updateMutation.mutateAsync({ id, data: goalData });
    if (result.error) {
      throw new Error(result.error);
    }
    return result.data;
  }, [updateMutation]);

  const deleteGoal = useCallback(async (id: number) => {
    const result = await deleteMutation.mutateAsync(id);
    if (result.error) {
      throw new Error(result.error);
    }
    return result;
  }, [deleteMutation]);

  return {
    // Data
    goals,
    filteredGoals,
    stats,
    categories,
    
    // Loading states
    loading: goalsLoading || statsLoading || categoriesLoading,
    error: goalsData?.error || statsData?.error || categoriesData?.error,
    
    // Actions
    createGoal,
    updateGoal,
    deleteGoal,
    refetchGoals,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}