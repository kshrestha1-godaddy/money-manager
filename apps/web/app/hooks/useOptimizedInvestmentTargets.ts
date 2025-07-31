"use client";

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    InvestmentTarget, 
    InvestmentTargetProgress, 
    InvestmentTargetFormData 
} from '../types/investments';
import { 
    getInvestmentTargets,
    getInvestmentTargetProgress,
    createInvestmentTarget,
    updateInvestmentTarget,
    deleteInvestmentTarget
} from '../actions/investment-targets';

interface Modal {
    type: 'create' | 'edit' | null;
    target?: InvestmentTarget | null;
}

export function useOptimizedInvestmentTargets() {
    const queryClient = useQueryClient();

    // ==================== DATA MANAGEMENT ====================
    
    // Load investment targets
    const { 
        data: targets = [], 
        isLoading: targetsLoading, 
        error: targetsError 
    } = useQuery({
        queryKey: ['investment-targets'],
        queryFn: async () => {
            const result = await getInvestmentTargets();
            if (result.error) {
                throw new Error(result.error);
            }
            return result.data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    });

    // Load investment target progress
    const { 
        data: targetProgress = [], 
        isLoading: progressLoading, 
        error: progressError 
    } = useQuery({
        queryKey: ['investment-target-progress'],
        queryFn: async () => {
            const result = await getInvestmentTargetProgress();
            if (result.error) {
                throw new Error(result.error);
            }
            return result.data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    });

    // ==================== MODAL STATE MANAGEMENT ====================
    
    const [modal, setModal] = useState<Modal>({ type: null, target: null });

    const openModal = useCallback((type: 'create' | 'edit', target?: InvestmentTarget) => {
        setModal({ type, target: target || null });
    }, []);

    const closeModal = useCallback(() => {
        setModal({ type: null, target: null });
    }, []);

    // ==================== MUTATIONS ====================
    
    // Create target mutation
    const createMutation = useMutation({
        mutationFn: async (data: InvestmentTargetFormData) => {
            const result = await createInvestmentTarget(data);
            if ('error' in result && result.error) {
                throw new Error(typeof result.error === 'string' ? result.error : 'Failed to create target');
            }
            return result;
        },
        onSuccess: () => {
            // Invalidate both targets and progress data
            queryClient.invalidateQueries({ queryKey: ['investment-targets'] });
            queryClient.invalidateQueries({ queryKey: ['investment-target-progress'] });
            closeModal();
        },
        onError: (error) => {
            console.error('Error creating target:', error);
        }
    });

    // Update target mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<InvestmentTargetFormData> }) => {
            const result = await updateInvestmentTarget(id, data);
            if ('error' in result && result.error) {
                throw new Error(typeof result.error === 'string' ? result.error : 'Failed to update target');
            }
            return result;
        },
        onSuccess: () => {
            // Invalidate both targets and progress data
            queryClient.invalidateQueries({ queryKey: ['investment-targets'] });
            queryClient.invalidateQueries({ queryKey: ['investment-target-progress'] });
            closeModal();
        },
        onError: (error) => {
            console.error('Error updating target:', error);
        }
    });

    // Delete target mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const result = await deleteInvestmentTarget(id);
            // deleteInvestmentTarget returns void, no error checking needed
            return result;
        },
        onSuccess: () => {
            // Invalidate both targets and progress data
            queryClient.invalidateQueries({ queryKey: ['investment-targets'] });
            queryClient.invalidateQueries({ queryKey: ['investment-target-progress'] });
            closeModal();
        },
        onError: (error) => {
            console.error('Error deleting target:', error);
        }
    });

    // ==================== ACTION HANDLERS ====================
    
    const handleCreateTarget = useCallback(async (data: InvestmentTargetFormData) => {
        return createMutation.mutateAsync(data);
    }, [createMutation]);

    const handleUpdateTarget = useCallback(async (id: number, data: Partial<InvestmentTargetFormData>) => {
        return updateMutation.mutateAsync({ id, data });
    }, [updateMutation]);

    const handleDeleteTarget = useCallback(async (id: number) => {
        return deleteMutation.mutateAsync(id);
    }, [deleteMutation]);

    // ==================== COMPUTED DATA ====================
    
    // Compute summary statistics
    const summary = useMemo(() => {
        if (!targetProgress?.length) {
            return { 
                totalTargets: 0, 
                completedTargets: 0, 
                averageProgress: 0,
                totalTargetAmount: 0,
                totalCurrentAmount: 0
            };
        }

        const completed = targetProgress.filter(target => target.progress >= 100);
        const averageProgress = targetProgress.reduce((sum, target) => sum + target.progress, 0) / targetProgress.length;
        const totalTargetAmount = targetProgress.reduce((sum, target) => sum + target.targetAmount, 0);
        const totalCurrentAmount = targetProgress.reduce((sum, target) => sum + target.currentAmount, 0);

        return {
            totalTargets: targetProgress.length,
            completedTargets: completed.length,
            averageProgress,
            totalTargetAmount,
            totalCurrentAmount
        };
    }, [targetProgress]);

    // ==================== ERROR HANDLING ====================
    
    const error = targetsError?.message || progressError?.message || null;

    const clearError = useCallback(() => {
        // Clear errors by refetching
        queryClient.invalidateQueries({ queryKey: ['investment-targets'] });
        queryClient.invalidateQueries({ queryKey: ['investment-target-progress'] });
    }, [queryClient]);

    // ==================== LOADING STATES ====================
    
    const loading = targetsLoading || progressLoading;
    const isCreating = createMutation.isPending;
    const isUpdating = updateMutation.isPending;
    const isDeleting = deleteMutation.isPending;

    // ==================== RETURN ====================
    
    return {
        // Data
        targets,
        targetProgress,
        summary,
        loading,
        error,

        // Modal state
        modal,
        openModal,
        closeModal,

        // Actions
        handleCreateTarget,
        handleUpdateTarget,
        handleDeleteTarget,

        // Loading states
        isCreating,
        isUpdating,
        isDeleting,

        // Error handling
        clearError,
    };
}