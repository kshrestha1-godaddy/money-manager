import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DebtInterface } from "../types/debts";
import { 
    getUserDebts, 
    createDebt, 
    updateDebt, 
    deleteDebt, 
    addRepayment, 
    deleteRepayment 
} from "../(dashboard)/debts/actions/debts";
import { triggerBalanceRefresh } from "./useTotalBalance";
import { exportDebtsToCSV } from "../utils/csvExportDebts";
import { calculateRemainingWithInterest } from "../utils/interestCalculation";


type ModalType = 'add' | 'edit' | 'delete' | 'view' | 'repayment' | 'import' | null;

interface ModalState {
    type: ModalType;
    debt?: DebtInterface;
}

interface FinancialSummary {
    totalDebts: number;
    activeCount: number;
    overdueCount: number;
    totalPrincipal: number;
    totalInterestAccrued: number;
    totalRepaid: number;
    totalOutstanding: number;
}

interface UseOptimizedDebtsReturn {
    // Data
    debts: DebtInterface[];
    filteredDebts: DebtInterface[];
    loading: boolean;
    error: string | null;
    financialSummary: FinancialSummary;
    totalDebtAmount: number;
    totalRemainingAmount: number;
    hasActiveFilters: boolean;

    // Modal states
    modal: ModalState;
    openModal: (type: ModalType, debt?: DebtInterface) => void;
    closeModal: () => void;
    isBulkDeleteModalOpen: boolean;
    setIsBulkDeleteModalOpen: (open: boolean) => void;

    // UI states
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    selectedStatus: string;
    setSelectedStatus: (status: string) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;

    // Selection states
    selectedDebts: Set<number>;
    setSelectedDebts: (debts: Set<number>) => void;
    bulkDeleteDebts: DebtInterface[];
    setBulkDeleteDebts: (debts: DebtInterface[]) => void;

    // Handlers
    handleAddDebt: (debt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) => Promise<void>;
    handleEditDebt: (id: number, debt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) => Promise<void>;
    handleDeleteDebt: (debt: DebtInterface) => Promise<void>;
    handleAddRepayment: (debtId: number, repaymentData: { amount: number; notes?: string; accountId?: number }) => Promise<void>;
    handleDeleteRepayment: (repaymentId: number, debtId: number) => Promise<void>;
    handleDebtSelect: (debtId: number, selected: boolean) => void;
    handleSelectAll: (selected: boolean, sectionDebts: DebtInterface[]) => void;
    handleBulkDelete: (sectionDebts: DebtInterface[]) => void;
    handleBulkDeleteConfirm: () => Promise<void>;
    handleExportToCSV: () => void;
    clearFilters: () => void;
    clearError: () => void;

    // Section data for organized display
    sections: {
        key: string;
        title: string;
        debts: DebtInterface[];
        totalAmount: number;
        totalRemaining: number;
    }[];

    // Query invalidation helper
    invalidateQueries: () => void;
}

// Stable section configuration to prevent re-renders
const DEBT_SECTIONS = [
    { key: 'ACTIVE', title: 'Active Lendings', statuses: ['ACTIVE'] },
    { key: 'PARTIALLY_PAID', title: 'Partially Paid Lendings', statuses: ['PARTIALLY_PAID'] },
    { key: 'FULLY_PAID', title: 'Fully Paid Lendings', statuses: ['FULLY_PAID'] }
];

export function useOptimizedDebts(): UseOptimizedDebtsReturn {
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);

    // Query keys for caching
    const QUERY_KEYS = {
        debts: ['debts'] as const,
        accounts: ['accounts'] as const,
    };

    // UI State
    const [modal, setModal] = useState<ModalState>({ type: null });
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    
    // Selection State
    const [selectedDebts, setSelectedDebts] = useState<Set<number>>(new Set());
    const [bulkDeleteDebts, setBulkDeleteDebts] = useState<DebtInterface[]>([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    // Cached data query
    const { data: debtsResponse, isLoading: loading } = useQuery({
        queryKey: QUERY_KEYS.debts,
        queryFn: getUserDebts,
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
    });

    // Extract debts array safely
    const allDebts = useMemo(() => {
        if (debtsResponse && !('error' in debtsResponse)) {
            return debtsResponse.data || [];
        }
        return [];
    }, [debtsResponse]);

    // Filter logic (memoized for performance)
    const hasActiveFilters = useMemo(() => {
        return !!(searchTerm || selectedStatus || startDate || endDate);
    }, [searchTerm, selectedStatus, startDate, endDate]);

    const filteredDebts = useMemo(() => {
        let filtered = [...allDebts];

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(debt =>
                debt.borrowerName.toLowerCase().includes(lowerSearchTerm) ||
                (debt.purpose && debt.purpose.toLowerCase().includes(lowerSearchTerm)) ||
                (debt.borrowerContact && debt.borrowerContact.toLowerCase().includes(lowerSearchTerm)) ||
                (debt.borrowerEmail && debt.borrowerEmail.toLowerCase().includes(lowerSearchTerm)) ||
                (debt.notes && debt.notes.toLowerCase().includes(lowerSearchTerm))
            );
        }

        if (selectedStatus) {
            filtered = filtered.filter(debt => debt.status === selectedStatus);
        }

        // Date filtering
        if (startDate) {
            const start = new Date(startDate);
            filtered = filtered.filter(debt => {
                const debtDate = debt.lentDate instanceof Date ? debt.lentDate : new Date(debt.lentDate);
                return debtDate >= start;
            });
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include the entire end date
            filtered = filtered.filter(debt => {
                const debtDate = debt.lentDate instanceof Date ? debt.lentDate : new Date(debt.lentDate);
                return debtDate <= end;
            });
        }

        return filtered;
    }, [allDebts, searchTerm, selectedStatus, startDate, endDate]);

    // Calculate financial summary

    const financialSummary = useMemo(() => {
        let totalPrincipal = 0;
        let totalInterestAccrued = 0;
        let totalRepaid = 0;
        let totalOutstanding = 0;
        let activeCount = 0;
        let overdueCount = 0;

        filteredDebts.forEach(debt => {
            totalPrincipal += debt.amount;
            
            const calculation = calculateRemainingWithInterest(
                debt.amount,
                debt.interestRate,
                debt.lentDate,
                debt.dueDate,
                debt.repayments || [],
                new Date(),
                debt.status
            );
            
            totalInterestAccrued += calculation.interestAmount;
            totalOutstanding += calculation.remainingAmount;
            
            const repaymentAmount = debt.repayments?.reduce((sum, repayment) => sum + repayment.amount, 0) || 0;
            totalRepaid += repaymentAmount;
            
            if (debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID') {
                activeCount++;
            }
            
            if (debt.status === 'OVERDUE') {
                overdueCount++;
            }
        });

        return {
            totalDebts: filteredDebts.length,
            activeCount,
            overdueCount,
            totalPrincipal,
            totalInterestAccrued,
            totalRepaid,
            totalOutstanding
        };
    }, [filteredDebts]);

    // Keep backward compatibility
    const totalDebtAmount = financialSummary.totalPrincipal;
    const totalRemainingAmount = financialSummary.totalOutstanding;

    // Organize debts by sections
    const sections = useMemo(() => {
        return DEBT_SECTIONS.map(section => {
            const sectionDebts = filteredDebts.filter(debt => 
                section.statuses.includes(debt.status)
            );
            
            const totalAmount = sectionDebts.reduce((sum, debt) => sum + debt.amount, 0);
            const totalRemaining = sectionDebts.reduce((sum, debt) => {
                const remaining = calculateRemainingWithInterest(
                    debt.amount,
                    debt.interestRate,
                    debt.lentDate,
                    debt.dueDate,
                    debt.repayments || [],
                    new Date(),
                    debt.status
                );
                return sum + remaining.remainingAmount;
            }, 0);

            return {
                key: section.key,
                title: section.title,
                debts: sectionDebts,
                totalAmount,
                totalRemaining
            };
        });
    }, [filteredDebts]);

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
            closeModal();
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
            closeModal();
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
            closeModal();
        },
        onError: (error: Error) => {
            console.error("Error deleting debt:", error);
            setError(`Failed to delete debt: ${error.message}`);
        },
    });

    const addRepaymentMutation = useMutation({
        mutationFn: ({ debtId, amount, notes, accountId }: { debtId: number; amount: number; notes?: string; accountId?: number }) => 
            addRepayment(debtId, amount, notes, accountId),
        onSuccess: () => {
            // After adding repayment, we need to refresh the debt data to get the updated debt with new repayment
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.debts });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
            triggerBalanceRefresh();
            setError(null);
            closeModal();
        },
        onError: (error: Error) => {
            console.error("Error adding repayment:", error);
            setError(`Failed to add repayment: ${error.message}`);
        },
    });

    const deleteRepaymentMutation = useMutation({
        mutationFn: ({ repaymentId, debtId }: { repaymentId: number; debtId: number }) => 
            deleteRepayment(repaymentId, debtId),
        onSuccess: () => {
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

    // Stable modal handlers
    const openModal = useCallback((type: ModalType, debt?: DebtInterface) => {
        setModal({ type, debt });
    }, []);

    const closeModal = useCallback(() => {
        setModal({ type: null });
    }, []);

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

    const handleDeleteDebt = useCallback(async (debt: DebtInterface) => {
        return new Promise<void>((resolve, reject) => {
            deleteDebtMutation.mutate(debt.id, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error)
            });
        });
    }, [deleteDebtMutation]);

    const handleAddRepayment = useCallback(async (debtId: number, repaymentData: { amount: number; notes?: string; accountId?: number }) => {
        return new Promise<void>((resolve, reject) => {
            addRepaymentMutation.mutate({ debtId, ...repaymentData }, {
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

    // Selection handlers
    const handleDebtSelect = useCallback((debtId: number, selected: boolean) => {
        setSelectedDebts(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(debtId);
            } else {
                newSet.delete(debtId);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback((selected: boolean, sectionDebts: DebtInterface[]) => {
        setSelectedDebts(prev => {
            const newSet = new Set(prev);
            sectionDebts.forEach(debt => {
                if (selected) {
                    newSet.add(debt.id);
                } else {
                    newSet.delete(debt.id);
                }
            });
            return newSet;
        });
    }, []);

    // Bulk operations
    const handleBulkDelete = useCallback((sectionDebts: DebtInterface[]) => {
        const selectedInSection = sectionDebts.filter(debt => selectedDebts.has(debt.id));
        
        if (selectedInSection.length === 0) {
            alert("No debts selected for deletion");
            return;
        }

        setBulkDeleteDebts(selectedInSection);
        setIsBulkDeleteModalOpen(true);
    }, [selectedDebts]);

    const handleBulkDeleteConfirm = useCallback(async () => {
        if (bulkDeleteDebts.length === 0) return;
        
        // Close modal immediately
        setIsBulkDeleteModalOpen(false);
        setBulkDeleteDebts([]);
        
        try {
            await Promise.all(bulkDeleteDebts.map(debt => handleDeleteDebt(debt)));
            setSelectedDebts(new Set());
        } catch (error) {
            console.error("Error in bulk delete:", error);
            setError("Failed to delete some debts. Please try again.");
        }
    }, [bulkDeleteDebts, handleDeleteDebt]);

    // Utility handlers
    const handleExportToCSV = useCallback(() => {
        if (filteredDebts.length === 0) {
            alert("No debts to export");
            return;
        }
        exportDebtsToCSV(filteredDebts);
    }, [filteredDebts]);

    const clearFilters = useCallback(() => {
        setSearchTerm("");
        setSelectedStatus("");
        setStartDate("");
        setEndDate("");
        setSelectedDebts(new Set());
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const invalidateQueries = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.debts });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
    }, [queryClient]);

    return {
        // Data
        debts: allDebts,
        filteredDebts,
        loading,
        error,
        financialSummary,
        totalDebtAmount,
        totalRemainingAmount,
        hasActiveFilters,

        // Modal states
        modal,
        openModal,
        closeModal,
        isBulkDeleteModalOpen,
        setIsBulkDeleteModalOpen,

        // UI states
        searchTerm,
        setSearchTerm,
        selectedStatus,
        setSelectedStatus,
        startDate,
        setStartDate,
        endDate,
        setEndDate,

        // Selection states
        selectedDebts,
        setSelectedDebts,
        bulkDeleteDebts,
        setBulkDeleteDebts,

        // Handlers
        handleAddDebt,
        handleEditDebt,
        handleDeleteDebt,
        handleAddRepayment,
        handleDeleteRepayment,
        handleDebtSelect,
        handleSelectAll,
        handleBulkDelete,
        handleBulkDeleteConfirm,
        handleExportToCSV,
        clearFilters,
        clearError,

        // Section data
        sections,

        // Query invalidation helper
        invalidateQueries,
    };
} 