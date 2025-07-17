import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountInterface } from "../types/accounts";
import { 
    getUserAccounts, 
    createAccount, 
    updateAccount, 
    deleteAccount, 
    bulkDeleteAccounts 
} from "../actions/accounts";
import { triggerBalanceRefresh } from "./useTotalBalance";
import { exportAccountsToCSV } from "../utils/csvExport";
import { ParsedAccountData } from "../utils/csvImport";

interface UseOptimizedAccountsReturn {
    // Data
    accounts: AccountInterface[];
    loading: boolean;
    error: string | null;
    totalBalance: number;
    hasActiveFilters: boolean;

    // Modal states
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    isEditModalOpen: boolean;
    setIsEditModalOpen: (open: boolean) => void;
    isDeleteModalOpen: boolean;
    setIsDeleteModalOpen: (open: boolean) => void;
    isViewModalOpen: boolean;
    setIsViewModalOpen: (open: boolean) => void;
    isShareModalOpen: boolean;
    setIsShareModalOpen: (open: boolean) => void;
    isImportModalOpen: boolean;
    setIsImportModalOpen: (open: boolean) => void;

    // Filter states
    selectedAccounts: Set<number>;
    setSelectedAccounts: (accounts: Set<number>) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    selectedBank: string;
    setSelectedBank: (bank: string) => void;
    selectedAccountType: string;
    setSelectedAccountType: (type: string) => void;

    // Selected items
    accountToEdit: AccountInterface | null;
    setAccountToEdit: (account: AccountInterface | null) => void;
    accountToDelete: AccountInterface | null;
    setAccountToDelete: (account: AccountInterface | null) => void;
    accountToView: AccountInterface | null;
    setAccountToView: (account: AccountInterface | null) => void;
    accountToShare: AccountInterface | null;
    setAccountToShare: (account: AccountInterface | null) => void;

    // View mode
    viewMode: "cards" | "table";
    setViewMode: (mode: "cards" | "table") => void;

    // Handlers
    handleAddAccount: (account: Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    handleEditAccount: (id: number, account: Partial<Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
    handleDeleteAccount: () => Promise<void>;
    handleBulkDelete: () => Promise<void>;
    handleBulkImportSuccess: (accounts: ParsedAccountData[]) => void;
    handleExportToCSV: () => void;
    handleAccountSelect: (accountId: number, checked: boolean) => void;
    handleSelectAll: (checked: boolean) => void;
    clearFilters: () => void;
    openEditModal: (account: AccountInterface) => void;
    openViewModal: (account: AccountInterface) => void;
    openDeleteModal: (account: AccountInterface) => void;
    openShareModal: (account: AccountInterface) => void;

    // Query invalidation helper
    invalidateQueries: () => void;
}

export function useOptimizedAccounts(): UseOptimizedAccountsReturn {
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);

    // Query keys for caching
    const QUERY_KEYS = {
        accounts: ['accounts'] as const,
    };

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Filter states
    const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBank, setSelectedBank] = useState("");
    const [selectedAccountType, setSelectedAccountType] = useState("");

    // Selected item states
    const [accountToEdit, setAccountToEdit] = useState<AccountInterface | null>(null);
    const [accountToDelete, setAccountToDelete] = useState<AccountInterface | null>(null);
    const [accountToView, setAccountToView] = useState<AccountInterface | null>(null);
    const [accountToShare, setAccountToShare] = useState<AccountInterface | null>(null);

    // View mode
    const [viewMode, setViewMode] = useState<"cards" | "table">("table");

    // Cached data query
    const { data: accountsResponse, isLoading: loading } = useQuery({
        queryKey: QUERY_KEYS.accounts,
        queryFn: getUserAccounts,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
        retry: 1,
        refetchOnWindowFocus: false,
    });

    // Extract accounts array safely
    const allAccounts = useMemo(() => {
        if (accountsResponse && !('error' in accountsResponse)) {
            return accountsResponse;
        }
        return [];
    }, [accountsResponse]);

    // Filter logic (memoized for performance)
    const hasActiveFilters = useMemo(() => {
        return !!(searchTerm || selectedBank || selectedAccountType);
    }, [searchTerm, selectedBank, selectedAccountType]);

    const filteredAccounts = useMemo(() => {
        let filtered = [...allAccounts];

        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(account =>
                account.holderName.toLowerCase().includes(lowerSearchTerm) ||
                account.bankName.toLowerCase().includes(lowerSearchTerm) ||
                (account.nickname && account.nickname.toLowerCase().includes(lowerSearchTerm)) ||
                account.accountNumber.toLowerCase().includes(lowerSearchTerm)
            );
        }

        if (selectedBank) {
            filtered = filtered.filter(account => account.bankName === selectedBank);
        }

        if (selectedAccountType) {
            filtered = filtered.filter(account => account.accountType === selectedAccountType);
        }

        return filtered;
    }, [allAccounts, searchTerm, selectedBank, selectedAccountType]);

    // Calculate total balance
    const totalBalance = useMemo(() => {
        return filteredAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    }, [filteredAccounts]);

    // Optimized mutations with cache updates
    const createAccountMutation = useMutation({
        mutationFn: createAccount,
        onSuccess: (newAccount: AccountInterface) => {
            // Optimistically update the cache
            queryClient.setQueryData(QUERY_KEYS.accounts, (oldAccounts: AccountInterface[] = []) => {
                return [newAccount, ...oldAccounts];
            });
            triggerBalanceRefresh();
            setIsAddModalOpen(false);
            setError(null);
        },
        onError: (error: Error) => {
            console.error("Error adding account:", error);
            setError(`Failed to add account: ${error.message}`);
        },
    });

    const updateAccountMutation = useMutation({
        mutationFn: ({ id, account }: { id: number; account: Partial<Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> }) =>
            updateAccount(id, account),
        onSuccess: (updatedAccount: AccountInterface, variables) => {
            // Optimistically update the cache
            queryClient.setQueryData(QUERY_KEYS.accounts, (oldAccounts: AccountInterface[] = []) => {
                return oldAccounts.map(account => 
                    account.id === variables.id ? updatedAccount : account
                );
            });
            triggerBalanceRefresh();
            setIsEditModalOpen(false);
            setAccountToEdit(null);
            setError(null);
        },
        onError: (error: Error) => {
            console.error("Error updating account:", error);
            setError(`Failed to update account: ${error.message}`);
        },
    });

    const deleteAccountMutation = useMutation({
        mutationFn: deleteAccount,
        onSuccess: (_, deletedId: number) => {
            // Optimistically update the cache
            queryClient.setQueryData(QUERY_KEYS.accounts, (oldAccounts: AccountInterface[] = []) => {
                return oldAccounts.filter(account => account.id !== deletedId);
            });
            triggerBalanceRefresh();
            setIsDeleteModalOpen(false);
            setAccountToDelete(null);
            setError(null);
        },
        onError: (error: Error) => {
            console.error("Error deleting account:", error);
            setError(`Failed to delete account: ${error.message}`);
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: number[]) => bulkDeleteAccounts(ids),
        onSuccess: (_, deletedIds: number[]) => {
            // Optimistically update the cache
            queryClient.setQueryData(QUERY_KEYS.accounts, (oldAccounts: AccountInterface[] = []) => {
                return oldAccounts.filter(account => !deletedIds.includes(account.id));
            });
            triggerBalanceRefresh();
            setSelectedAccounts(new Set());
            setError(null);
        },
        onError: (error: Error) => {
            console.error("Error bulk deleting accounts:", error);
            setError(`Failed to delete accounts: ${error.message}`);
        },
    });

    // CRUD Handlers
    const handleAddAccount = useCallback(async (newAccount: Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
        return new Promise<void>((resolve, reject) => {
            createAccountMutation.mutate(newAccount, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error)
            });
        });
    }, [createAccountMutation]);

    const handleEditAccount = useCallback(async (id: number, updatedAccount: Partial<Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
        return new Promise<void>((resolve, reject) => {
            updateAccountMutation.mutate({ id, account: updatedAccount }, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error)
            });
        });
    }, [updateAccountMutation]);

    const handleDeleteAccount = useCallback(async () => {
        if (!accountToDelete) return;
        
        return new Promise<void>((resolve, reject) => {
            deleteAccountMutation.mutate(accountToDelete.id, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error)
            });
        });
    }, [deleteAccountMutation, accountToDelete]);

    const handleBulkDelete = useCallback(async () => {
        const idsToDelete = Array.from(selectedAccounts);
        if (idsToDelete.length === 0) return;

        return new Promise<void>((resolve, reject) => {
            bulkDeleteMutation.mutate(idsToDelete, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error)
            });
        });
    }, [bulkDeleteMutation, selectedAccounts]);

    // Modal handlers
    const openEditModal = useCallback((account: AccountInterface) => {
        setAccountToEdit(account);
        setIsEditModalOpen(true);
    }, []);

    const openViewModal = useCallback((account: AccountInterface) => {
        setAccountToView(account);
        setIsViewModalOpen(true);
    }, []);

    const openDeleteModal = useCallback((account: AccountInterface) => {
        setAccountToDelete(account);
        setIsDeleteModalOpen(true);
    }, []);

    const openShareModal = useCallback((account: AccountInterface) => {
        setAccountToShare(account);
        setIsShareModalOpen(true);
    }, []);

    // Selection handlers
    const handleAccountSelect = useCallback((accountId: number, checked: boolean) => {
        setSelectedAccounts(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(accountId);
            } else {
                newSet.delete(accountId);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            setSelectedAccounts(new Set(filteredAccounts.map(account => account.id)));
        } else {
            setSelectedAccounts(new Set());
        }
    }, [filteredAccounts]);

    // Utility handlers
    const handleBulkImportSuccess = useCallback((importedAccounts: ParsedAccountData[]) => {
        // Invalidate queries to refetch fresh data
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
        triggerBalanceRefresh();
        setIsImportModalOpen(false);
    }, [queryClient]);

    const handleExportToCSV = useCallback(() => {
        exportAccountsToCSV(filteredAccounts);
    }, [filteredAccounts]);

    const clearFilters = useCallback(() => {
        setSearchTerm("");
        setSelectedBank("");
        setSelectedAccountType("");
        setSelectedAccounts(new Set());
    }, []);

    const invalidateQueries = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
    }, [queryClient]);

    return {
        // Data
        accounts: filteredAccounts,
        loading,
        error,
        totalBalance,
        hasActiveFilters,

        // Modal states
        isAddModalOpen,
        setIsAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isViewModalOpen,
        setIsViewModalOpen,
        isShareModalOpen,
        setIsShareModalOpen,
        isImportModalOpen,
        setIsImportModalOpen,

        // Filter states
        selectedAccounts,
        setSelectedAccounts,
        searchTerm,
        setSearchTerm,
        selectedBank,
        setSelectedBank,
        selectedAccountType,
        setSelectedAccountType,

        // Selected items
        accountToEdit,
        setAccountToEdit,
        accountToDelete,
        setAccountToDelete,
        accountToView,
        setAccountToView,
        accountToShare,
        setAccountToShare,

        // View mode
        viewMode,
        setViewMode,

        // Handlers
        handleAddAccount,
        handleEditAccount,
        handleDeleteAccount,
        handleBulkDelete,
        handleBulkImportSuccess,
        handleExportToCSV,
        handleAccountSelect,
        handleSelectAll,
        clearFilters,
        openEditModal,
        openViewModal,
        openDeleteModal,
        openShareModal,

        // Query invalidation helper
        invalidateQueries,
    };
} 