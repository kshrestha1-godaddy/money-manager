import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { DebtInterface } from "../types/debts";
import { getUserDebts, createDebt, updateDebt, deleteDebt } from "../actions/debts";
import { triggerBalanceRefresh } from "./useTotalBalance";

interface UseDebtsReturn {
  debts: DebtInterface[];
  loading: boolean;
  error: string | null;
  loadDebts: () => Promise<void>;
  refreshDebts: () => Promise<DebtInterface[] | null>;
  addDebt: (debt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) => Promise<void>;
  editDebt: (id: number, debt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) => Promise<void>;
  removeDebt: (debt: DebtInterface) => Promise<void>;
  clearError: () => void;
}

export function useDebts(): UseDebtsReturn {
  const [debts, setDebts] = useState<DebtInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAuthError = useCallback((errorMessage: string) => {
    setError("Your session has expired. Please sign in again.");
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      signOut({ 
        callbackUrl: "/api/auth/signin",
        redirect: true 
      });
    }, 2000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const loadDebts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userDebts = await getUserDebts();
      
      if (userDebts && !('error' in userDebts)) {
        setDebts(userDebts.data || []);
        triggerBalanceRefresh();
      } else {
        const errorMessage = userDebts?.error || "Unknown error";
        console.error("Error loading debts:", errorMessage);
        
        if (errorMessage === "User not found" || errorMessage === "Unauthorized") {
          handleAuthError(errorMessage);
        } else {
          setError(`Failed to load debts: ${errorMessage}`);
        }
        setDebts([]);
      }
    } catch (error) {
      console.error("Error loading debts:", error);
      setError(`An unexpected error occurred: ${error}`);
      setDebts([]);
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  const addDebt = useCallback(async (newDebt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) => {
    try {
      const debt = await createDebt(newDebt);
      setDebts(prevDebts => [debt, ...prevDebts]);
      setError(null);
      triggerBalanceRefresh();
    } catch (error) {
      console.error("Error adding debt:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
        handleAuthError(errorMessage);
      } else {
        setError(`Failed to add debt: ${errorMessage}`);
        throw error; // Re-throw for component to handle
      }
    }
  }, [handleAuthError]);

  const editDebt = useCallback(async (id: number, updatedDebt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) => {
    try {
      const debt = await updateDebt(id, updatedDebt);
      setDebts(prevDebts => prevDebts.map(d => d.id === id ? debt : d));
      setError(null);
      triggerBalanceRefresh();
    } catch (error) {
      console.error("Error updating debt:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
        handleAuthError(errorMessage);
      } else {
        setError(`Failed to update debt: ${errorMessage}`);
        throw error; // Re-throw for component to handle
      }
    }
  }, [handleAuthError]);

  const removeDebt = useCallback(async (debtToDelete: DebtInterface) => {
    try {
      await deleteDebt(debtToDelete.id);
      setDebts(prevDebts => prevDebts.filter(d => d.id !== debtToDelete.id));
      setError(null);
      triggerBalanceRefresh();
    } catch (error) {
      console.error("Error deleting debt:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
        handleAuthError(errorMessage);
      } else {
        setError(`Failed to delete debt: ${errorMessage}`);
        throw error; // Re-throw for component to handle
      }
    }
  }, [handleAuthError]);

  const refreshDebts = useCallback(async (): Promise<DebtInterface[] | null> => {
    try {
      setError(null);
      const userDebts = await getUserDebts();
      
      if (userDebts && !('error' in userDebts)) {
        const freshDebts = userDebts.data || [];
        setDebts(freshDebts);
        triggerBalanceRefresh();
        return freshDebts;
      } else {
        const errorMessage = userDebts?.error || "Unknown error";
        console.error("Error refreshing debts:", errorMessage);
        
        if (errorMessage === "User not found" || errorMessage === "Unauthorized") {
          handleAuthError(errorMessage);
        } else {
          setError(`Failed to refresh debts: ${errorMessage}`);
        }
        return null;
      }
    } catch (error) {
      console.error("Error refreshing debts:", error);
      setError(`An unexpected error occurred: ${error}`);
      return null;
    }
  }, [handleAuthError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  return {
    debts,
    loading,
    error,
    loadDebts,
    refreshDebts,
    addDebt,
    editDebt,
    removeDebt,
    clearError
  };
} 