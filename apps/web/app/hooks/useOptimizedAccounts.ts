import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountInterface } from "../types/accounts";
import { 
    getUserAccounts, 
    createAccount, 
    updateAccount, 
    deleteAccount, 
    bulkDeleteAccounts,
    bulkCreateAccounts,
    transferMoney,
    getWithheldAmountsByBank
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
    totalBalance: number;
    freeBalance: number; // Total balance minus withheld amounts from investments
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
    isTransferModalOpen: boolean;
    setIsTransferModalOpen: (open: boolean) => void;

    // Filter states
    selectedAccounts: Set<number>;
    setSelectedAccounts: (accounts: Set<number>) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    selectedBank: string;
    setSelectedBank: (bank: string) => void;
    selectedAccountType: string;
    setSelectedAccountType: (type: string) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;

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
    handleTransfer: (transfer: TransferData) => Promise<void>;
    handleAccountSelect: (accountId: number, checked: boolean) => void;
    handleSelectAll: (checked: boolean) => void;
    clearFilters: () => void;
    openEditModal: (account: AccountInterface) => void;
    openViewModal: (account: AccountInterface) => void;
    openDeleteModal: (account: AccountInterface) => void;
    openShareModal: (account: AccountInterface) => void;

    // Import status
    isImporting: boolean;

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
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

    // Filter states
    const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBank, setSelectedBank] = useState("");
    const [selectedAccountType, setSelectedAccountType] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

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

    // Fetch withheld amounts from investments
    const { data: withheldAmounts = {} } = useQuery({
        queryKey: ['withheld-amounts'],
        queryFn: getWithheldAmountsByBank,
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
        return !!(searchTerm || selectedBank || selectedAccountType || startDate || endDate);
    }, [searchTerm, selectedBank, selectedAccountType, startDate, endDate]);

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

        // Date filtering based on account opening date
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(account => {
                const accountDate = account.accountOpeningDate instanceof Date 
                    ? account.accountOpeningDate 
                    : new Date(account.accountOpeningDate);
                return accountDate >= start;
            });
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(account => {
                const accountDate = account.accountOpeningDate instanceof Date 
                    ? account.accountOpeningDate 
                    : new Date(account.accountOpeningDate);
                return accountDate <= end;
            });
        }

        return filtered;
    }, [allAccounts, searchTerm, selectedBank, selectedAccountType, startDate, endDate]);

    // Calculate total balance
    const totalBalance = useMemo(() => {
        return filteredAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    }, [filteredAccounts]);

    // Calculate free balance (properly distributed by bank)
    const freeBalance = useMemo(() => {
        if (filteredAccounts.length === 0) return 0;

        // Group accounts by bank name to calculate proportional withheld amounts
        const bankGroups = new Map<string, typeof filteredAccounts>();
        filteredAccounts.forEach(account => {
            const bankName = account.bankName;
            if (!bankGroups.has(bankName)) {
                bankGroups.set(bankName, []);
            }
            bankGroups.get(bankName)!.push(account);
        });

        // Calculate free balance for each bank and sum them up
        let totalFreeBalance = 0;
        
        for (const [bankName, accountsInBank] of bankGroups.entries()) {
            const withheldAmountForBank = withheldAmounts[bankName] || 0;
            const totalBankBalance = accountsInBank.reduce((sum, acc) => sum + (acc.balance || 0), 0);
            
            // If no withheld amount for this bank, add full balance
            if (withheldAmountForBank === 0) {
                totalFreeBalance += totalBankBalance;
            } else {
                // Calculate free balance for this bank (total bank balance minus withheld amount)
                const bankFreeBalance = Math.max(0, totalBankBalance - withheldAmountForBank);
                totalFreeBalance += bankFreeBalance;
            }
        }
        
        return totalFreeBalance;
    }, [filteredAccounts, withheldAmounts]);

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

    const bulkCreateMutation = useMutation({
        mutationFn: (accounts: Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => 
            bulkCreateAccounts(accounts),
        onSuccess: (result) => {
            // Optimistically update the cache with successfully created accounts
            if (result.data.length > 0) {
                queryClient.setQueryData(QUERY_KEYS.accounts, (oldAccounts: AccountInterface[] = []) => {
                    return [...result.data, ...oldAccounts];
                });
                triggerBalanceRefresh();
            }
            // Don't automatically close modal - let the ImportAccountModal handle this
            // setIsImportModalOpen(false);
            setError(null);
            
            // Show success/error summary
            if (result.errors.length > 0) {
                console.warn(`Bulk import completed with ${result.errors.length} errors:`, result.errors);
            }
        },
        onError: (error: Error) => {
            console.error("Error bulk creating accounts:", error);
            setError(`Failed to import accounts: ${error.message}`);
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
            triggerBalanceRefresh();
            setIsTransferModalOpen(false);
            setError(null);
            console.info(result.message);
        },
        onError: (error: Error) => {
            console.error("Error transferring money:", error);
            setError(`Transfer failed: ${error.message}`);
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

        bulkCreateMutation.mutate(accountsToCreate);
    }, [bulkCreateMutation]);

    const handleTransfer = useCallback(async (transferData: TransferData) => {
        return new Promise<void>((resolve, reject) => {
            transferMutation.mutate(transferData, {
                onSuccess: () => resolve(),
                onError: (error) => reject(error)
            });
        });
    }, [transferMutation]);

    const handleExportToCSV = useCallback(() => {
        const result = exportAccountsToCSV(filteredAccounts);
        if (!result.success) {
            setError(result.error || 'Failed to export accounts');
        }
    }, [filteredAccounts]);

    const clearFilters = useCallback(() => {
        setSearchTerm("");
        setSelectedBank("");
        setSelectedAccountType("");
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
        totalBalance,
        freeBalance,
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
        isTransferModalOpen,
        setIsTransferModalOpen,

        // Filter states
        selectedAccounts,
        setSelectedAccounts,
        searchTerm,
        setSearchTerm,
        selectedBank,
        setSelectedBank,
        selectedAccountType,
        setSelectedAccountType,
        startDate,
        setStartDate,
        endDate,
        setEndDate,

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
        handleTransfer,
        handleAccountSelect,
        handleSelectAll,
        clearFilters,
        openEditModal,
        openViewModal,
        openDeleteModal,
        openShareModal,

        // Import status
        isImporting: bulkCreateMutation.isPending,

        // Query invalidation helper
        invalidateQueries,
    };
} 