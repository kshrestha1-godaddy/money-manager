"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStockPurchases } from "../actions/stocks";
import { signOut } from "next-auth/react";
import { InvestmentInterface } from '../../../types/investments';
import { 
    getUserInvestments, 
    createInvestment, 
    updateInvestment, 
    deleteInvestment, 
    bulkDeleteInvestments 
} from '../actions/investments';
import { triggerBalanceRefresh } from '../../../hooks/useTotalBalance';
import { exportInvestmentsToCSV } from '../../../utils/csvExportInvestments';
import { exportInvestmentTargetsToCSV } from '../../../utils/csvExportInvestmentTargets';
import { groupInvestments, isInvestmentGrouping, INVESTMENT_GROUPING_STORAGE_KEY, type InvestmentGrouping } from '../utils/investmentGrouping';
import { applyMetalSpotRatesToInvestments } from '../utils/applyMetalSpotRatesToInvestments';
import { useCurrency } from '../../../providers/CurrencyProvider';
import { useGoldSpotRate } from './useGoldSpotRate';
import { useSilverSpotRate } from './useSilverSpotRate';

interface Modal {
    type: 'add' | 'edit' | 'delete' | 'view' | 'import' | null;
    investment?: InvestmentInterface | null;
}

export function useOptimizedInvestments() {
    const queryClient = useQueryClient();
    const { currency } = useCurrency();
    const {
        spotPerUnitDisplay: goldSpotPerUnitDisplay,
        updatedAt: goldSpotUpdatedAt,
        setSpotFromDisplayAmount: setGoldSpotRateFromDisplay,
    } = useGoldSpotRate(currency);
    const {
        spotPerUnitDisplay: silverSpotPerUnitDisplay,
        updatedAt: silverSpotUpdatedAt,
        setSpotFromDisplayAmount: setSilverSpotRateFromDisplay,
    } = useSilverSpotRate(currency);

    // ==================== DATA MANAGEMENT ====================
    
    const { 
        data: investmentsRaw = [], 
        isLoading: loading, 
        error: queryError 
    } = useQuery({
        queryKey: ['investments'],
        queryFn: async () => {
            const result = await getUserInvestments();
            
            if (result && result.data) {
                return result.data || [];
            } else {
                const errorMessage = result?.error || "Unknown error";
                
                // Handle authentication/session errors
                if (errorMessage === "User not found" || errorMessage === "Unauthorized") {
                    setTimeout(() => {
                        signOut({ 
                            callbackUrl: "/api/auth/signin",
                            redirect: true 
                        });
                    }, 2000);
                    throw new Error("Your session has expired. Please sign in again.");
                } else {
                    throw new Error(`Failed to load investments: ${errorMessage}`);
                }
            }
        },
        staleTime: 0, // Cost basis follows expense changes on navigation.
        gcTime: 10 * 60 * 1000,   // 10 minutes
        retry: (failureCount, error) => {
            // Don't retry on auth errors
            if (error.message.includes('session has expired') || 
                error.message.includes('Unauthorized')) {
                return false;
            }
            return failureCount < 3;
        },
    });

    const stockPurchasesQuery = useQuery({
        queryKey: ['investments', 'stock-purchases', currency],
        queryFn: getStockPurchases,
        staleTime: 0,
    });
    const stockPurchases = useMemo(() => stockPurchasesQuery.data?.purchases ?? [], [stockPurchasesQuery.data]);
    const investmentsWithStocks = useMemo(() => {
        const stocks = investmentsRaw.filter(i => i.type === 'STOCKS');
        if (stocks.length) {
            if (!stockPurchasesQuery.data) return investmentsRaw;
            const cost = stockPurchases.reduce((sum, p) => sum + p.amount, 0);
            return investmentsRaw.map(i => i.type === 'STOCKS'
                ? { ...i, purchasePrice: i.quantity > 0 ? cost / stocks.length / i.quantity : 0 }
                : i);
        }
        if (!stockPurchases.length) return investmentsRaw;
        const date = new Date(stockPurchases[stockPurchases.length - 1]!.date);
        return [...investmentsRaw, {
            id: -1, userId: 0, name: 'Stocks portfolio', type: 'STOCKS' as const,
            quantity: 1, purchasePrice: stockPurchases.reduce((sum, p) => sum + p.amount, 0),
            currentPrice: 0, purchaseDate: date, createdAt: date, updatedAt: date,
            deductFromAccount: false,
        }];
    }, [investmentsRaw, stockPurchases, stockPurchasesQuery.data]);

    const investments = useMemo(
        () =>
            applyMetalSpotRatesToInvestments(
                investmentsWithStocks,
                goldSpotPerUnitDisplay,
                silverSpotPerUnitDisplay
            ),
        [investmentsWithStocks, goldSpotPerUnitDisplay, silverSpotPerUnitDisplay]
    );

    // ==================== STATE MANAGEMENT ====================
    
    // Modal states
    const [modal, setModal] = useState<Modal>({ type: null, investment: null });

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedBank, setSelectedBank] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    /** "" = any target; "none" = not linked to a target; otherwise target id as string */
    const [selectedTargetFilter, setSelectedTargetFilter] = useState('');
    const [groupBy, setGroupBy] = useState<InvestmentGrouping>('performance');
    const [groupingLoaded, setGroupingLoaded] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(INVESTMENT_GROUPING_STORAGE_KEY);
            if (isInvestmentGrouping(saved)) setGroupBy(saved);
        } catch {
            // Grouping remains available when browser storage is disabled.
        }
        setGroupingLoaded(true);
    }, []);

    useEffect(() => {
        if (!groupingLoaded) return;
        try {
            localStorage.setItem(INVESTMENT_GROUPING_STORAGE_KEY, groupBy);
        } catch {
            // Keep the in-memory selection when browser storage is unavailable.
        }
    }, [groupBy, groupingLoaded]);


    // Selection states
    const [selectedInvestments, setSelectedInvestments] = useState<Set<number>>(new Set());

    // UI states
    const [error, setError] = useState<string | null>(
        queryError ? String(queryError) : null
    );

    // ==================== COMPUTED VALUES ====================
    
    // Filter investments
    const filteredInvestments = useMemo(() => {
        if (!Array.isArray(investments)) {
            return [];
        }
        return investments.filter(investment => {
            const matchesSearch = 
                investment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                investment.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                investment.notes?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesType =
                selectedTypes.length === 0 || selectedTypes.includes(investment.type);
            
            const matchesBank = selectedBank === "" || 
                (investment.account?.bankName?.toLowerCase() === selectedBank.toLowerCase()) ||
                (selectedBank === "no-bank" && !investment.account?.bankName);
            
            // Date filtering based on purchase date
            let matchesDateRange = true;
            if (startDate) {
                const start = new Date(startDate);
                const investmentDate = investment.purchaseDate instanceof Date ? investment.purchaseDate : new Date(investment.purchaseDate);
                matchesDateRange = matchesDateRange && investmentDate >= start;
            }
            
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Include the entire end date
                const investmentDate = investment.purchaseDate instanceof Date ? investment.purchaseDate : new Date(investment.purchaseDate);
                matchesDateRange = matchesDateRange && investmentDate <= end;
            }

            const tid = investment.investmentTargetId;
            const matchesTarget =
                selectedTargetFilter === '' ||
                (selectedTargetFilter === 'none' &&
                    (tid === null || tid === undefined)) ||
                (selectedTargetFilter !== '' &&
                    selectedTargetFilter !== 'none' &&
                    String(tid) === selectedTargetFilter);
            
            return matchesSearch && matchesType && matchesBank && matchesDateRange && matchesTarget;
        });
    }, [investments, searchTerm, selectedTypes, selectedBank, startDate, endDate, selectedTargetFilter]);

    // Calculate summary statistics
    const {
        totalInvested,
        totalCurrentValue,
        totalGainLoss,
        totalGainLossPercentage,
        gainersCount,
        losersCount,
        breakEvenCount
    } = useMemo(() => {
        if (!Array.isArray(investments)) {
            return {
                totalInvested: 0,
                totalCurrentValue: 0,
                totalGainLoss: 0,
                totalGainLossPercentage: 0,
                gainersCount: 0,
                losersCount: 0,
                breakEvenCount: 0
            };
        }

        const totalInvested = investments.reduce((sum, investment) => 
            sum + (investment.quantity * investment.purchasePrice), 0);
        
        const totalCurrentValue = investments.reduce((sum, investment) => 
            sum + (investment.quantity * investment.currentPrice), 0);
        
        const totalGainLoss = totalCurrentValue - totalInvested;
        const totalGainLossPercentage = totalInvested > 0 ? 
            ((totalGainLoss / totalInvested) * 100) : 0;

        const gainersCount = investments.filter(investment => 
            investment.currentPrice > investment.purchasePrice).length;
        
        const losersCount = investments.filter(investment => 
            investment.currentPrice < investment.purchasePrice).length;
        
        const breakEvenCount = investments.filter(investment => 
            investment.currentPrice === investment.purchasePrice).length;

        return {
            totalInvested,
            totalCurrentValue,
            totalGainLoss,
            totalGainLossPercentage,
            gainersCount,
            losersCount,
            breakEvenCount
        };
    }, [investments]);

    // Get unique types for filter dropdown
    const uniqueTypes = useMemo(() => {
        if (!Array.isArray(investments)) {
            return [];
        }
        return Array.from(new Set(investments.map(investment => investment.type))).sort();
    }, [investments]);

    // Get unique banks for filter dropdown
    const uniqueBanks = useMemo(() => {
        if (!Array.isArray(investments)) {
            return [];
        }
        const banks = investments
            .map(investment => investment.account?.bankName)
            .filter(bankName => bankName) // Remove null/undefined values
            .filter((bankName, index, array) => array.indexOf(bankName) === index) // Remove duplicates
            .sort();
        
        // Add "No bank linked" option if there are investments without banks
        const hasInvestmentsWithoutBank = investments.some(investment => !investment.account?.bankName);
        if (hasInvestmentsWithoutBank) {
            banks.push("No bank linked");
        }
        
        return banks;
    }, [investments]);

    // Check if filters are active
    const hasActiveFilters = useMemo(() => {
        return (
            searchTerm !== '' ||
            selectedTypes.length > 0 ||
            selectedBank !== '' ||
            startDate !== '' ||
            endDate !== '' ||
            selectedTargetFilter !== ''
        );
    }, [searchTerm, selectedTypes, selectedBank, startDate, endDate, selectedTargetFilter]);

    const sections = useMemo(
        () => groupInvestments(filteredInvestments, groupBy),
        [filteredInvestments, groupBy]
    );

    // ==================== MUTATIONS ====================
    
    // Create Investment
    const createMutation = useMutation({
        mutationFn: createInvestment,
        onMutate: async (newInvestment) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['investments'] });

            // Snapshot previous value
            const previousInvestments = queryClient.getQueryData<InvestmentInterface[]>(['investments']);

            // Optimistically update cache
            const tempInvestment: InvestmentInterface = {
                ...newInvestment,
                id: Date.now(), // Temporary ID
                userId: 0, // Temporary user ID
                createdAt: new Date(),
                updatedAt: new Date(),
                account: undefined
            };

            queryClient.setQueryData<InvestmentInterface[]>(['investments'], (old = []) => 
                [tempInvestment, ...old]
            );

            return { previousInvestments, tempInvestment };
        },
        onSuccess: (data, variables, context) => {
            // Update cache with real data
            queryClient.setQueryData<InvestmentInterface[]>(['investments'], (old = []) =>
                old.map(investment => 
                    investment.id === context?.tempInvestment.id ? data : investment
                )
            );
            // Invalidate investment target progress since current amounts changed
            queryClient.invalidateQueries({ queryKey: ['investment-target-progress'] });
            // Invalidate withheld amounts since investment was added
            queryClient.invalidateQueries({ queryKey: ['withheld-amounts'] });
            triggerBalanceRefresh();
            closeModal();
            setError(null);
        },
        onError: (error, variables, context) => {
            // Rollback
            if (context?.previousInvestments) {
                queryClient.setQueryData(['investments'], context.previousInvestments);
            }
            
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
                setError("Your session has expired. Please sign in again.");
                setTimeout(() => {
                    signOut({ callbackUrl: "/api/auth/signin", redirect: true });
                }, 2000);
            } else {
                setError(`Failed to add investment: ${errorMessage}`);
            }
        }
    });

    // Update Investment
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account'>> }) =>
            updateInvestment(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['investments'] });
            
            const previousInvestments = queryClient.getQueryData<InvestmentInterface[]>(['investments']);
            
            queryClient.setQueryData<InvestmentInterface[]>(['investments'], (old = []) =>
                old.map(investment => 
                    investment.id === id ? { ...investment, ...data } : investment
                )
            );

            return { previousInvestments };
        },
        onSuccess: (data) => {
            queryClient.setQueryData<InvestmentInterface[]>(['investments'], (old = []) =>
                old.map(investment => investment.id === data.id ? data : investment)
            );
            // Invalidate investment target progress since current amounts changed
            queryClient.invalidateQueries({ queryKey: ['investment-target-progress'] });
            // Invalidate withheld amounts since investment was updated
            queryClient.invalidateQueries({ queryKey: ['withheld-amounts'] });
            triggerBalanceRefresh();
            closeModal();
            setError(null);
        },
        onError: (error, variables, context) => {
            if (context?.previousInvestments) {
                queryClient.setQueryData(['investments'], context.previousInvestments);
            }
            
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
                setError("Your session has expired. Please sign in again.");
                setTimeout(() => {
                    signOut({ callbackUrl: "/api/auth/signin", redirect: true });
                }, 2000);
            } else {
                setError(`Failed to update investment: ${errorMessage}`);
            }
        }
    });

    // Delete Investment
    const deleteMutation = useMutation({
        mutationFn: deleteInvestment,
        onMutate: async (investmentId) => {
            await queryClient.cancelQueries({ queryKey: ['investments'] });
            
            const previousInvestments = queryClient.getQueryData<InvestmentInterface[]>(['investments']);
            
            queryClient.setQueryData<InvestmentInterface[]>(['investments'], (old = []) =>
                old.filter(investment => investment.id !== investmentId)
            );

            return { previousInvestments };
        },
        onSuccess: () => {
            // Invalidate investment target progress since current amounts changed
            queryClient.invalidateQueries({ queryKey: ['investment-target-progress'] });
            // Invalidate withheld amounts since investment was deleted
            queryClient.invalidateQueries({ queryKey: ['withheld-amounts'] });
            triggerBalanceRefresh();
            closeModal();
            setError(null);
        },
        onError: (error, variables, context) => {
            if (context?.previousInvestments) {
                queryClient.setQueryData(['investments'], context.previousInvestments);
            }
            
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
                setError("Your session has expired. Please sign in again.");
                setTimeout(() => {
                    signOut({ callbackUrl: "/api/auth/signin", redirect: true });
                }, 2000);
            } else {
                setError(`Failed to delete investment: ${errorMessage}`);
            }
        }
    });

    // Bulk Delete
    const bulkDeleteMutation = useMutation({
        mutationFn: bulkDeleteInvestments,
        onMutate: async (investmentIds) => {
            await queryClient.cancelQueries({ queryKey: ['investments'] });
            
            const previousInvestments = queryClient.getQueryData<InvestmentInterface[]>(['investments']);
            
            queryClient.setQueryData<InvestmentInterface[]>(['investments'], (old = []) =>
                old.filter(investment => !investmentIds.includes(investment.id))
            );

            return { previousInvestments };
        },
        onSuccess: () => {
            // Invalidate investment target progress since current amounts changed
            queryClient.invalidateQueries({ queryKey: ['investment-target-progress'] });
            // Invalidate withheld amounts since investments were deleted
            queryClient.invalidateQueries({ queryKey: ['withheld-amounts'] });
            triggerBalanceRefresh();
            setSelectedInvestments(new Set());
            setError(null);
        },
        onError: (error, variables, context) => {
            if (context?.previousInvestments) {
                queryClient.setQueryData(['investments'], context.previousInvestments);
            }
            
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            setError(`Bulk delete failed: ${errorMessage}`);
        }
    });

    // ==================== HANDLERS ====================

    // Modal handlers
    const openModal = useCallback((type: Modal['type'], investment?: InvestmentInterface) => {
        setModal({ type, investment });
    }, []);

    const closeModal = useCallback(() => {
        setModal({ type: null, investment: null });
    }, []);

    // Investment handlers
    const handleAddInvestment = useCallback(async (data: Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account' | 'investmentTarget'>) => {
        createMutation.mutate(data);
    }, [createMutation]);

    const handleEditInvestment = useCallback(async (id: number, data: Partial<Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account' | 'investmentTarget'>>) => {
        updateMutation.mutate({ id, data });
    }, [updateMutation]);

    const handleDeleteInvestment = useCallback(async (investment: InvestmentInterface) => {
        deleteMutation.mutate(investment.id);
    }, [deleteMutation]);

    // Selection handlers
    const handleInvestmentSelect = useCallback((investmentId: number, selected: boolean) => {
        if (investmentId < 0) return;
        setSelectedInvestments(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(investmentId);
            } else {
                newSet.delete(investmentId);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback((selected: boolean) => {
        if (selected) {
            setSelectedInvestments(new Set(filteredInvestments.filter(i => i.id > 0).map(i => i.id)));
        } else {
            setSelectedInvestments(new Set());
        }
    }, [filteredInvestments]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedInvestments.size === 0) return;
        bulkDeleteMutation.mutate(Array.from(selectedInvestments));
    }, [selectedInvestments, bulkDeleteMutation]);

    // Export handler
    const handleExportToCSV = useCallback(() => {
        if (filteredInvestments.length === 0) {
            alert("No investments to export");
            return;
        }
        exportInvestmentsToCSV(filteredInvestments);
    }, [filteredInvestments]);

    // Filter handlers
    const clearFilters = useCallback(() => {
        setSearchTerm('');
        setSelectedTypes([]);
        setSelectedBank('');
        setStartDate('');
        setEndDate('');
        setSelectedTargetFilter('');
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // ==================== RETURN ====================

    return {
        // Data
        investments,
        stockPurchases,
        stocksLoading: stockPurchasesQuery.isLoading,
        stocksError: stockPurchasesQuery.error,
        filteredInvestments,
        loading,
        error: error || queryError?.message || null,
        sections,
        uniqueTypes,
        uniqueBanks,
        hasActiveFilters,

        // Statistics
        totalInvested,
        totalCurrentValue,
        totalGainLoss,
        totalGainLossPercentage,
        gainersCount,
        losersCount,
        breakEvenCount,

        // Modal state
        modal,
        openModal,
        closeModal,

        // Filter states
        groupBy,
        setGroupBy,
        searchTerm,
        setSearchTerm,
        selectedTypes,
        setSelectedTypes,
        selectedBank,
        setSelectedBank,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        selectedTargetFilter,
        setSelectedTargetFilter,

        // Selection states
        selectedInvestments,
        setSelectedInvestments,
        handleInvestmentSelect,
        handleSelectAll,

        // UI states

        // Handlers
        handleAddInvestment,
        handleEditInvestment,
        handleDeleteInvestment,
        handleBulkDelete,
        handleExportToCSV,
        clearFilters,
        clearError,

        // Loading states
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isBulkDeleting: bulkDeleteMutation.isPending,

        goldSpotPerUnitDisplay,
        goldSpotUpdatedAt,
        setGoldSpotRateFromDisplay,

        silverSpotPerUnitDisplay,
        silverSpotUpdatedAt,
        setSilverSpotRateFromDisplay,
    };
} 