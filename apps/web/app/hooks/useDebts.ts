import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DebtInterface } from "../types/debts";
import { getUserDebts, createDebt, updateDebt, deleteDebt, addRepayment, deleteRepayment } from "../actions/debts";
import { triggerBalanceRefresh } from "./useTotalBalance";

interface UseDebtsReturn {
  debts: DebtInterface[];
  loading: boolean;
  error: string | null;
  addDebt: (debt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) => Promise<void>;
  editDebt: (id: number, debt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) => Promise<void>;
  removeDebt: (debt: DebtInterface) => Promise<void>;
  addRepaymentToDebt: (debtId: number, repaymentData: { amount: number; notes?: string; accountId?: number }) => Promise<void>;
  deleteRepaymentFromDebt: (repaymentId: number, debtId: number) => Promise<void>;
  clearError: () => void;
}

export function useDebts(): UseDebtsReturn {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Query keys for caching
  const QUERY_KEYS = {
    debts: ['debts'] as const,
    accounts: ['accounts'] as const,
  };

  // Cached data query
  const { data: debtsResponse, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.debts,
    queryFn: getUserDebts,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Extract debts array safely
  const debts = useMemo(() => {
    if (debtsResponse && !('error' in debtsResponse)) {
      return debtsResponse.data || [];
    }
    return [];
  }, [debtsResponse]);

  // Optimized mutations with cache updates
  const createDebtMutation = useMutation({
    mutationFn: createDebt,
    onSuccess: (newDebt: DebtInterface) => {
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.debts, (oldData: any) => {
        if (!oldData || 'error' in oldData) {
          return { data: [newDebt] };
        }
        const currentDebts = oldData.data || [];
        return { ...oldData, data: [newDebt, ...currentDebts] };
      });
      // Refresh accounts cache for balance updates
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      triggerBalanceRefresh();
      setError(null);
    },
    onError: (error: Error) => {
      console.error("Error adding debt:", error);
      setError(`Failed to add debt: ${error.message}`);
    },
  });

  const updateDebtMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>> }) => 
      updateDebt(id, data),
    onSuccess: (updatedDebt: DebtInterface) => {
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.debts, (oldData: any) => {
        if (!oldData || 'error' in oldData) {
          return { data: [updatedDebt] };
        }
        const currentDebts = oldData.data || [];
        const updatedDebts = currentDebts.map((debt: DebtInterface) => 
          debt.id === updatedDebt.id ? updatedDebt : debt
        );
        return { ...oldData, data: updatedDebts };
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      triggerBalanceRefresh();
      setError(null);
    },
    onError: (error: Error) => {
      console.error("Error updating debt:", error);
      setError(`Failed to update debt: ${error.message}`);
    },
  });

  const deleteDebtMutation = useMutation({
    mutationFn: deleteDebt,
    onSuccess: (_: any, deletedId: number) => {
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.debts, (oldData: any) => {
        if (!oldData || 'error' in oldData) {
          return { data: [] };
        }
        const currentDebts = oldData.data || [];
        const filteredDebts = currentDebts.filter((debt: DebtInterface) => debt.id !== deletedId);
        return { ...oldData, data: filteredDebts };
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      triggerBalanceRefresh();
      setError(null);
    },
    onError: (error: Error) => {
      console.error("Error deleting debt:", error);
      setError(`Failed to delete debt: ${error.message}`);
    },
  });

  const addRepaymentMutation = useMutation({
    mutationFn: ({ debtId, amount, notes, accountId }: { debtId: number; amount: number; notes?: string; accountId?: number }) => 
      addRepayment(debtId, amount, notes, accountId),
    onSuccess: (repayment, variables) => {
      // After adding repayment, we need to refresh the debt data to get the updated debt with new repayment
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.debts });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      triggerBalanceRefresh();
      setError(null);
    },
    onError: (error: Error) => {
      console.error("Error adding repayment:", error);
      setError(`Failed to add repayment: ${error.message}`);
    },
  });

  const deleteRepaymentMutation = useMutation({
    mutationFn: ({ repaymentId, debtId }: { repaymentId: number; debtId: number }) => 
      deleteRepayment(repaymentId, debtId),
    onSuccess: (result, variables) => {
      // After deleting repayment, refresh the debt data to get the updated debt without the repayment
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.debts });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      triggerBalanceRefresh();
      setError(null);
    },
    onError: (error: Error) => {
      console.error("Error deleting repayment:", error);
      setError(`Failed to delete repayment: ${error.message}`);
    },
  });

  // CRUD Handlers
  const handleAddDebt = useCallback(async (newDebt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) => {
    return new Promise<void>((resolve, reject) => {
      createDebtMutation.mutate(newDebt, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  }, [createDebtMutation]);

  const handleEditDebt = useCallback(async (id: number, updatedDebt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) => {
    return new Promise<void>((resolve, reject) => {
      updateDebtMutation.mutate({ id, data: updatedDebt }, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  }, [updateDebtMutation]);

  const handleRemoveDebt = useCallback(async (debtToDelete: DebtInterface) => {
    return new Promise<void>((resolve, reject) => {
      deleteDebtMutation.mutate(debtToDelete.id, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  }, [deleteDebtMutation]);

  const handleAddRepayment = useCallback(async (debtId: number, repaymentData: { amount: number; notes?: string; accountId?: number }) => {
    return new Promise<void>((resolve, reject) => {
      addRepaymentMutation.mutate({ 
        debtId, 
        amount: repaymentData.amount, 
        notes: repaymentData.notes, 
        accountId: repaymentData.accountId 
      }, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  }, [addRepaymentMutation]);

  const handleDeleteRepayment = useCallback(async (repaymentId: number, debtId: number) => {
    return new Promise<void>((resolve, reject) => {
      deleteRepaymentMutation.mutate({ repaymentId, debtId }, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  }, [deleteRepaymentMutation]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    debts,
    loading,
    error,
    addDebt: handleAddDebt,
    editDebt: handleEditDebt,
    removeDebt: handleRemoveDebt,
    addRepaymentToDebt: handleAddRepayment,
    deleteRepaymentFromDebt: handleDeleteRepayment,
    clearError
  };
} 