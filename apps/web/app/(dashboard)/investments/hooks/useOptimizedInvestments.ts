"use client";

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

interface Modal {
    type: 'add' | 'edit' | 'delete' | 'view' | 'import' | null;
    investment?: InvestmentInterface | null;
}

interface InvestmentSection {
    title: string;
    investments: InvestmentInterface[];
    count: number;
    totalInvested: number;
    currentValue: number;
    gainLoss: number;
    gainLossPercentage: number;
}

const INVESTMENT_SECTIONS = {
    GAINERS: 'gainers',
    LOSERS: 'losers',
    BREAK_EVEN: 'break_even'
} as const;

export function useOptimizedInvestments() {
    const queryClient = useQueryClient();

    // ==================== DATA MANAGEMENT ====================
    
    const { 
        data: investments = [], 
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
        staleTime: 3 * 60 * 1000, // 3 minutes
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

    // ==================== STATE MANAGEMENT ====================
    
    // Modal states
    const [modal, setModal] = useState<Modal>({ type: null, investment: null });

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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
            
            const matchesType = selectedType === "" || investment.type === selectedType;
            
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
            
            return matchesSearch && matchesType && matchesDateRange;
        });
    }, [investments, searchTerm, selectedType, startDate, endDate]);

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

    // Check if filters are active
    const hasActiveFilters = useMemo(() => {
        return searchTerm !== '' || selectedType !== '' || startDate !== '' || endDate !== '';
    }, [searchTerm, selectedType, startDate, endDate]);

    // Organize investments by sections
    const sections = useMemo((): InvestmentSection[] => {
        const gainers = filteredInvestments.filter(investment => 
            investment.currentPrice > investment.purchasePrice);
        
        const losers = filteredInvestments.filter(investment => 
            investment.currentPrice < investment.purchasePrice);
        
        const breakEven = filteredInvestments.filter(investment => 
            investment.currentPrice === investment.purchasePrice);

        const calculateSectionStats = (sectionInvestments: InvestmentInterface[]) => {
            const invested = sectionInvestments.reduce((sum, inv) => 
                sum + (inv.quantity * inv.purchasePrice), 0);
            const current = sectionInvestments.reduce((sum, inv) => 
                sum + (inv.quantity * inv.currentPrice), 0);
            const gainLoss = current - invested;
            const gainLossPercentage = invested > 0 ? ((gainLoss / invested) * 100) : 0;
            
            return { invested, current, gainLoss, gainLossPercentage };
        };

        const sections: InvestmentSection[] = [];

        if (gainers.length > 0) {
            const stats = calculateSectionStats(gainers);
            sections.push({
                title: `Gainers (${gainers.length})`,
                investments: gainers,
                count: gainers.length,
                totalInvested: stats.invested,
                currentValue: stats.current,
                gainLoss: stats.gainLoss,
                gainLossPercentage: stats.gainLossPercentage
            });
        }

        if (breakEven.length > 0) {
            const stats = calculateSectionStats(breakEven);
            sections.push({
                title: `Break Even (${breakEven.length})`,
                investments: breakEven,
                count: breakEven.length,
                totalInvested: stats.invested,
                currentValue: stats.current,
                gainLoss: stats.gainLoss,
                gainLossPercentage: stats.gainLossPercentage
            });
        }

        if (losers.length > 0) {
            const stats = calculateSectionStats(losers);
            sections.push({
                title: `Losers (${losers.length})`,
                investments: losers,
                count: losers.length,
                totalInvested: stats.invested,
                currentValue: stats.current,
                gainLoss: stats.gainLoss,
                gainLossPercentage: stats.gainLossPercentage
            });
        }

        return sections;
    }, [filteredInvestments]);

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
    const handleAddInvestment = useCallback(async (data: Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account'>) => {
        createMutation.mutate(data);
    }, [createMutation]);

    const handleEditInvestment = useCallback(async (id: number, data: Partial<Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account'>>) => {
        updateMutation.mutate({ id, data });
    }, [updateMutation]);

    const handleDeleteInvestment = useCallback(async (investment: InvestmentInterface) => {
        deleteMutation.mutate(investment.id);
    }, [deleteMutation]);

    // Selection handlers
    const handleInvestmentSelect = useCallback((investmentId: number, selected: boolean) => {
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
            setSelectedInvestments(new Set(filteredInvestments.map(i => i.id)));
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
        setSelectedType('');
        setStartDate('');
        setEndDate('');
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // ==================== RETURN ====================

    return {
        // Data
        investments,
        filteredInvestments,
        loading,
        error,
        sections,
        uniqueTypes,
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
        searchTerm,
        setSearchTerm,
        selectedType,
        setSelectedType,
        startDate,
        setStartDate,
        endDate,
        setEndDate,

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
    };
} 