import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BudgetTarget } from '../types/financial';
import { getBudgetTargets, createBudgetTarget, updateBudgetTarget, deleteBudgetTarget, getBudgetComparison, updateOrCreateBudgetTarget, updateCategoryBudgetInclusion, getAllCategoriesWithBudgetStatus } from '../actions/budget-targets';

export interface BudgetComparisonData {
  categoryName: string;
  categoryType: 'EXPENSE' | 'INCOME';
  actualSpending: {
    monthlyAverage: number;
    totalAmount: number;
    transactionCount: number;
  };
  budgetTarget: {
    monthlySpend: number;
    impliedAnnualSpend: number;
  };
  variance: {
    amount: number;
    percentage: number;
    status: 'over' | 'under' | 'on-track';
  };
}

export interface BudgetTargetFormData {
  name: string;
  targetAmount: number;
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  startDate: Date;
  endDate: Date;
}

export function useBudgetTracking(period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' = 'MONTHLY') {
  const queryClient = useQueryClient();

  // Fetch budget targets
  const {
    data: budgetTargets = [],
    isLoading: targetsLoading,
    error: targetsError
  } = useQuery({
    queryKey: ['budget-targets', period],
    queryFn: async () => {
      const result = await getBudgetTargets(period);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch budget comparison data
  const {
    data: budgetComparison = [],
    isLoading: comparisonLoading,
    error: comparisonError
  } = useQuery({
    queryKey: ['budget-comparison', period],
    queryFn: async () => {
      const result = await getBudgetComparison(period);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create budget target mutation
  const createMutation = useMutation({
    mutationFn: createBudgetTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-targets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-comparison'] });
    },
  });

  // Update budget target mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BudgetTargetFormData> }) =>
      updateBudgetTarget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-targets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-comparison'] });
    },
  });

  // Delete budget target mutation
  const deleteMutation = useMutation({
    mutationFn: deleteBudgetTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-targets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-comparison'] });
    },
  });

  // Update or create budget target mutation
  const updateOrCreateMutation = useMutation({
    mutationFn: ({ categoryName, targetAmount, period }: { 
      categoryName: string; 
      targetAmount: number; 
      period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' 
    }) => updateOrCreateBudgetTarget(categoryName, targetAmount, period),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-targets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-comparison'] });
    },
  });

  // Category budget inclusion mutation
  const updateCategoryInclusionMutation = useMutation({
    mutationFn: ({ categoryName, includedInBudget }: { 
      categoryName: string; 
      includedInBudget: boolean 
    }) => updateCategoryBudgetInclusion(categoryName, includedInBudget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['all-categories'] });
    },
  });

  const loading = targetsLoading || comparisonLoading;
  const error = targetsError?.message || comparisonError?.message;

  return {
    budgetTargets,
    budgetComparison,
    loading,
    error,
    createBudgetTarget: createMutation.mutate,
    updateBudgetTarget: updateMutation.mutate,
    deleteBudgetTarget: deleteMutation.mutate,
    updateOrCreateBudgetTarget: (categoryName: string, targetAmount: number, period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY') => 
      updateOrCreateMutation.mutate({ categoryName, targetAmount, period }),
    updateCategoryBudgetInclusion: (categoryName: string, includedInBudget: boolean) =>
      updateCategoryInclusionMutation.mutate({ categoryName, includedInBudget }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending || updateOrCreateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdatingInclusion: updateCategoryInclusionMutation.isPending,
  };
}

// Separate hook for managing all categories
export function useAllCategories() {
  const { data: allCategories, isLoading, error } = useQuery({
    queryKey: ['all-categories'],
    queryFn: async () => {
      const result = await getAllCategoriesWithBudgetStatus();
      if (result.error) throw new Error(result.error);
      return result.data || [];
    },
  });

  return {
    allCategories: allCategories || [],
    loading: isLoading,
    error: error?.message,
  };
}
