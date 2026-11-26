import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountOpeningDay } from "../(dashboard)/accounts/utils/accountOpeningDate";
import { AccountInterface } from "../types/accounts";
import { 
    getUserAccounts, 
    createAccount, 
    updateAccount, 
    deleteAccount, 
    bulkDeleteAccounts,
    bulkCreateAccounts,
    transferMoney,
    bulkUpdateAccountBalances
} from "../(dashboard)/accounts/actions/accounts";
import { triggerBalanceRefresh } from "./useTotalBalance";
import { exportAccountsToCSV } from "../utils/csv";
import { ParsedAccountData } from "../utils/csv";
import { TransferData } from "../(dashboard)/accounts/components/TransferModal";

interface UseOptimizedAccountsReturn {
    // Data
    accounts: AccountInterface[];
    loading: boolean;
    error: string | null;
    actionError: string | null;
    clearActionError: () => void;
    retryAccounts: () => Promise<unknown>;
    isDeleting: boolean;
    isFetching: boolean;
    hasActiveFilters: boolean;

    // Modal states
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    isEditModalOpen: boolean;
    setIsEditModalOpen: (open: boolean) => void;
    isViewModalOpen: boolean;
    setIsViewModalOpen: (open: boolean) => void;
    isShareModalOpen: boolean;
    setIsShareModalOpen: (open: boolean) => void;
    isImportModalOpen: boolean;
    setIsImportModalOpen: (open: boolean) => void;
    isTransferModalOpen: boolean;
    setIsTransferModalOpen: (open: boolean) => void;
    isBulkBalancesModalOpen: boolean;
    setIsBulkBalancesModalOpen: (open: boolean) => void;

    // Filter states
    selectedAccounts: Set<number>;
    setSelectedAccounts: (accounts: Set<number>) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    selectedBanks: string[];
    setSelectedBanks: (banks: string[]) => void;
    selectedAccountTypes: string[];
    setSelectedAccountTypes: (types: string[]) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;

    // Selected items
    accountToEdit: AccountInterface | null;
    setAccountToEdit: (account: AccountInterface | null) => void;
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
    handleDeleteAccount: (appLockPassword: string, accountId: number) => Promise<void>;
    handleBulkDelete: (appLockPassword: string) => Promise<void>;
    handleBulkImportSuccess: (accounts: ParsedAccountData[]) => ReturnType<typeof bulkCreateAccounts>;
    handleExportToCSV: () => void;
    handleTransfer: (transfer: TransferData) => Promise<void>;
    handleBulkBalanceUpdate: (updates: { id: number; balance: number }[]) => Promise<void>;
    handleAccountSelect: (accountId: number, checked: boolean) => void;
    handleSelectAll: (checked: boolean) => void;
    clearFilters: () => void;
    openEditModal: (account: AccountInterface) => void;
    openViewModal: (account: AccountInterface) => void;
    openShareModal: (account: AccountInterface) => void;

    // Import status
    isImporting: boolean;
    isBulkBalanceSaving: boolean;

    // Query invalidation helper
    invalidateQueries: () => void;

    /** All accounts (unfiltered) — use for bulk balance modal, transfers, etc. */
    allAccounts: AccountInterface[];
}

export function useOptimizedAccounts(): UseOptimizedAccountsReturn {
    const queryClient = useQueryClient();
    const [actionError, setActionError] = useState<string | null>(null);

    // Query keys for caching
    const QUERY_KEYS = {
        accounts: ['accounts'] as const,
    };

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isBulkBalancesModalOpen, setIsBulkBalancesModalOpen] = useState(false);

    // Filter states
    const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
    const [selectedAccountTypes, setSelectedAccountTypes] = useState<string[]>([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Selected item states
    const [accountToEdit, setAccountToEdit] = useState<AccountInterface | null>(null);
    const [accountToView, setAccountToView] = useState<AccountInterface | null>(null);
    const [accountToShare, setAccountToShare] = useState<AccountInterface | null>(null);

    // View mode
    const [viewMode, setViewMode] = useState<"cards" | "table">("table");

    // Cached data query
    const { data: accountsResponse, isLoading: loading, isFetching, error: accountQueryError, refetch: retryAccounts } = useQuery({
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

    const error = accountQueryError?.message ??
        (accountsResponse && "error" in accountsResponse ? accountsResponse.error : null);

    // Filter logic (memoized for performance)
    const hasActiveFilters = useMemo(() => {
        return !!(searchTerm.trim() || selectedBanks.length > 0 || selectedAccountTypes.length > 0 || startDate || endDate);
    }, [searchTerm, selectedBanks, selectedAccountTypes, startDate, endDate]);

    const filteredAccounts = useMemo(() => {
        let filtered = [...allAccounts];

        if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(account =>
                account.holderName.toLowerCase().includes(lowerSearchTerm) ||
                account.bankName.toLowerCase().includes(lowerSearchTerm) ||
                (account.nickname && account.nickname.toLowerCase().includes(lowerSearchTerm)) ||
                account.accountNumber.toLowerCase().includes(lowerSearchTerm)
            );
        }

        if (selectedBanks.length > 0) {
            filtered = filtered.filter(account => selectedBanks.includes(account.bankName));
        }

        if (selectedAccountTypes.length > 0) {
            filtered = filtered.filter(account => selectedAccountTypes.includes(account.accountType));
        }

        if (startDate || endDate) {
            filtered = filtered.filter((account) => {
                const day = accountOpeningDay(account.accountOpeningDate);
                return day && (!startDate || day >= startDate) && (!endDate || day <= endDate);
            });
        }

        return filtered;
    }, [allAccounts, searchTerm, selectedBanks, selectedAccountTypes, startDate, endDate]);

    const visibleSelection = useMemo(() => new Set(filteredAccounts
        .filter(({ id }) => selectedAccounts.has(id))
        .map(({ id }) => id)), [filteredAccounts, selectedAccounts]);

    const refreshAccountActivity = () => {
        triggerBalanceRefresh();
        void queryClient.invalidateQueries({ queryKey: ["account-balance-activity"] });
    };

    // Optimized mutations with cache updates
    const createAccountMutation = useMutation({
        mutationFn: createAccount,
        onSuccess: (newAccount: AccountInterface) => {
            // Optimistically update the cache
            queryClient.setQueryData(QUERY_KEYS.accounts, (oldAccounts: AccountInterface[] = []) => {
                return [newAccount, ...oldAccounts];
            });
            refreshAccountActivity();
            setIsAddModalOpen(false);
            setActionError(null);
        },
        onError: (error: Error) => {
            console.error("Error adding account:", error);
            setActionError(`Failed to add account: ${error.message}`);
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
            refreshAccountActivity();
            setIsEditModalOpen(false);
            setAccountToEdit(null);
            setActionError(null);
        },
        onError: (error: Error) => {
            console.error("Error updating account:", error);
            setActionError(`Failed to update account: ${error.message}`);
        },
    });

    const deleteAccountMutation = useMutation({
        mutationFn: ({ id, appLockPassword }: { id: number; appLockPassword: string }) =>
            deleteAccount(id, appLockPassword),
        onSuccess: (_, { id: deletedId }) => {
            // Optimistically update the cache
            queryClient.setQueryData(QUERY_KEYS.accounts, (oldAccounts: AccountInterface[] = []) => {
                return oldAccounts.filter(account => account.id !== deletedId);
            });
            refreshAccountActivity();
            setActionError(null);
        },
        onError: (error: Error) => {
            console.error("Error deleting account:", error);
            setActionError(`Failed to delete account: ${error.message}`);
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: ({ ids, appLockPassword }: { ids: number[]; appLockPassword: string }) =>
            bulkDeleteAccounts(ids, appLockPassword),
        onSuccess: (_, { ids: deletedIds }) => {
            // Optimistically update the cache
            queryClient.setQueryData(QUERY_KEYS.accounts, (oldAccounts: AccountInterface[] = []) => {
                return oldAccounts.filter(account => !deletedIds.includes(account.id));
            });
            refreshAccountActivity();
            setSelectedAccounts(new Set());
            setActionError(null);
        },
        onError: (error: Error) => {
            console.error("Error bulk deleting accounts:", error);
            setActionError(`Failed to delete accounts: ${error.message}`);
        },
    });

    const bulkCreateMutation = useMutation({
        mutationFn: (accounts: Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) =>
            bulkCreateAccounts(accounts),
        onSuccess: (result) => {
            // Optimistically update the cache with successfully created accounts
            if (result.data.length > 0) {
                queryClient.setQueryData(QUERY_KEYS.accounts, (oldAccounts: AccountInterface[] = []) => {
                    return [...result.data, ...oldAccounts];
                });
                refreshAccountActivity();
            }
            // Don't automatically close modal - let the ImportAccountModal handle this
            // setIsImportModalOpen(false);
            setActionError(null);
            
            // Show success/error summary
            if (result.errors.length > 0) {
                console.warn(`Bulk import completed with ${result.errors.length} errors:`, result.errors);
            }
        },
        onError: (error: Error) => {
            console.error("Error bulk creating accounts:", error);
            setActionError(`Failed to import accounts: ${error.message}`);
        },
    });

    const bulkBalanceMutation = useMutation({
        mutationFn: (updates: { id: number; balance: number }[]) => bulkUpdateAccountBalances(updates),
        onSuccess: (updatedList: AccountInterface[]) => {
            queryClient.setQueryData(QUERY_KEYS.accounts, updatedList);
            refreshAccountActivity();
            setIsBulkBalancesModalOpen(false);
            setActionError(null);
        },
        onError: (err: Error) => {
            console.error("Error bulk updating balances:", err);
            setActionError(`Failed to update balances: ${err.message}`);
        },
    });

    const transferMutation = useMutation({
        mutationFn: ({ fromAccountId, toAccountId, amount, notes }: TransferData) =>
            transferMoney(fromAccountId, toAccountId, amount, notes),
        onSuccess: (result) => {
            // Optimistically update the cache with new account balances
            queryClient.setQueryData(QUERY_KEYS.accounts, (oldAccounts: AccountInterface[] = []) => {
                return oldAccounts.map(account => {
                    if (account.id === result.data.fromAccount.id) {
                        return result.data.fromAccount;
                    } else if (account.id === result.data.toAccount.id) {
                        return result.data.toAccount;
                    }
                    return account;
                });
            });
            refreshAccountActivity();
            void queryClient.invalidateQueries({ queryKey: ["expenses"] });
            setIsTransferModalOpen(false);
            setActionError(null);
            console.info(result.message);
        },
        onError: (error: Error) => {
            console.error("Error transferring money:", error);
            setActionError(`Transfer failed: ${error.message}`);
        },
    });

    const handleAddAccount: UseOptimizedAccountsReturn["handleAddAccount"] = async (account) => {
        await createAccountMutation.mutateAsync(account);
    };

    const handleEditAccount: UseOptimizedAccountsReturn["handleEditAccount"] = async (id, account) => {
        await updateAccountMutation.mutateAsync({ id, account });
    };

    const handleDeleteAccount = async (appLockPassword: string, accountId: number) => {
        await deleteAccountMutation.mutateAsync({ id: accountId, appLockPassword });
    };

    const handleBulkDelete = async (appLockPassword: string) => {
        if (visibleSelection.size === 0 || bulkDeleteMutation.isPending) return;
        try {
            await bulkDeleteMutation.mutateAsync({ ids: [...visibleSelection], appLockPassword });
        } catch {
            // The mutation reports the failure through actionError.
        }
    };

    // Modal handlers
    const openEditModal = useCallback((account: AccountInterface) => {
        setAccountToEdit(account);
        setIsEditModalOpen(true);
    }, []);

    const openViewModal = useCallback((account: AccountInterface) => {
        setAccountToView(account);
        setIsViewModalOpen(true);
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
        // Convert ParsedAccountData to AccountInterface format
        const accountsToCreate = importedAccounts.map(account => ({
            holderName: account.holderName,
            accountNumber: account.accountNumber,
            branchCode: account.branchCode || '',
            bankName: account.bankName,
            branchName: account.branchName || '',
            bankAddress: account.bankAddress || '',
            accountType: account.accountType || '',
            mobileNumbers: account.mobileNumbers || [],
            branchContacts: account.branchContacts || [],
            swift: account.swift || '',
            bankEmail: account.bankEmail || '',
            accountOpeningDate: account.accountOpeningDate,
            securityQuestion: account.securityQuestion || [],
            balance: account.balance,
            appUsername: account.appUsername,
            notes: account.notes,
            nickname: account.nickname
        }));

        return bulkCreateMutation.mutateAsync(accountsToCreate);
    }, [bulkCreateMutation]);

    const handleTransfer = async (transferData: TransferData) => {
        await transferMutation.mutateAsync(transferData);
    };

    const handleBulkBalanceUpdate = async (updates: { id: number; balance: number }[]) => {
        if (updates.length === 0) {
            setIsBulkBalancesModalOpen(false);
            return;
        }
        await bulkBalanceMutation.mutateAsync(updates);
    };

    const handleExportToCSV = useCallback(() => {
        const result = exportAccountsToCSV(filteredAccounts);
        if (!result.success) {
            setActionError(result.error || 'Failed to export accounts');
        }
    }, [filteredAccounts]);

    const clearFilters = useCallback(() => {
        setSearchTerm("");
        setSelectedBanks([]);
        setSelectedAccountTypes([]);
        setStartDate("");
        setEndDate("");
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
        actionError,
        clearActionError: () => setActionError(null),
        retryAccounts,
        isFetching,
        isDeleting: deleteAccountMutation.isPending || bulkDeleteMutation.isPending,
        hasActiveFilters,

        // Modal states
        isAddModalOpen,
        setIsAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        isViewModalOpen,
        setIsViewModalOpen,
        isShareModalOpen,
        setIsShareModalOpen,
        isImportModalOpen,
        setIsImportModalOpen,
        isTransferModalOpen,
        setIsTransferModalOpen,
        isBulkBalancesModalOpen,
        setIsBulkBalancesModalOpen,

        // Filter states
        selectedAccounts: visibleSelection,
        setSelectedAccounts,
        searchTerm,
        setSearchTerm,
        selectedBanks,
        setSelectedBanks,
        selectedAccountTypes,
        setSelectedAccountTypes,
        startDate,
        setStartDate,
        endDate,
        setEndDate,

        // Selected items
        accountToEdit,
        setAccountToEdit,
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
        handleTransfer,
        handleBulkBalanceUpdate,
        handleAccountSelect,
        handleSelectAll,
        clearFilters,
        openEditModal,
        openViewModal,
        openShareModal,

        // Import status
        isImporting: bulkCreateMutation.isPending,
        isBulkBalanceSaving: bulkBalanceMutation.isPending,

        // Query invalidation helper
        invalidateQueries,

        allAccounts,
    };
} 