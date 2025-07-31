"use client";

import React, { useState, useEffect } from "react";
import { InvestmentTable } from "../../components/investments/InvestmentTable";
import { AddInvestmentModal } from "../../components/investments/AddInvestmentModal";
import { EditInvestmentModal } from "../../components/investments/EditInvestmentModal";
import { DeleteInvestmentModal } from "../../components/investments/DeleteInvestmentModal";
import { ViewInvestmentModal } from "../../components/investments/ViewInvestmentModal";
import { BulkImportModal } from "../../components/investments/BulkImportModal";
import { BulkDeleteInvestmentModal } from "../../components/investments/BulkDeleteInvestmentModal";
import { InvestmentTypePolarChart } from "../../components/investments/InvestmentTypePolarChart";
import { InvestmentTargetProgressChart } from "../../components/investments/InvestmentTargetProgressChart";
import { InvestmentTargetModal } from "../../components/investments/InvestmentTargetModal";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useOptimizedInvestments } from "../../hooks/useOptimizedInvestments";
import { InvestmentInterface, InvestmentTarget, InvestmentTargetProgress, InvestmentTargetFormData } from "../../types/investments";
import { getInvestmentTargetProgress, getInvestmentTargets, createInvestmentTarget, updateInvestmentTarget, deleteInvestmentTarget } from "../../actions/investment-targets";
import { Plus, Upload, TrendingUp, TrendingDown, DollarSign, Target, Info } from "lucide-react";
import { 
    getSummaryCardClasses, 
    getGainLossClasses,
    BUTTON_COLORS,
    TEXT_COLORS,
    CONTAINER_COLORS,
    INPUT_COLORS,
    LOADING_COLORS,
    ICON_COLORS,
    UI_STYLES,
} from "../../config/colorConfig";

// Extract color variables for better readability
const pageContainer = CONTAINER_COLORS.page;
const errorContainer = CONTAINER_COLORS.error;
const cardLargeContainer = CONTAINER_COLORS.cardLarge;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

const pageTitle = TEXT_COLORS.title;
const pageSubtitle = TEXT_COLORS.subtitle;
const errorTitle = TEXT_COLORS.errorTitle;
const errorMessage = TEXT_COLORS.errorMessage;
const cardTitle = TEXT_COLORS.cardTitle;
const cardValueLarge = TEXT_COLORS.cardValueLarge;
const cardSubtitle = TEXT_COLORS.cardSubtitle;
const emptyTitle = TEXT_COLORS.emptyTitle;
const emptyMessage = TEXT_COLORS.emptyMessage;
const labelText = TEXT_COLORS.label;

const primaryButton = BUTTON_COLORS.primary;
const secondaryBlueButton = BUTTON_COLORS.secondaryBlue;
const secondaryGreenButton = BUTTON_COLORS.secondaryGreen;
const clearButton = BUTTON_COLORS.clear;
const clearFilterButton = BUTTON_COLORS.clearFilter;

const standardInput = INPUT_COLORS.standard;

// Icon colors
const blueIcon = ICON_COLORS.blue;
const greenIcon = ICON_COLORS.green;
const redIcon = ICON_COLORS.red;
const purpleIcon = ICON_COLORS.purple;
const greenPositiveIcon = ICON_COLORS.greenPositive;
const redNegativeIcon = ICON_COLORS.redNegative;

export default function Investments() {
    const { currency: userCurrency } = useCurrency();

    // Bulk delete modal states
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [bulkDeleteInvestments, setBulkDeleteInvestments] = useState<InvestmentInterface[]>([]);
    
    // Investment targets states
    const [targetProgress, setTargetProgress] = useState<InvestmentTargetProgress[]>([]);
    const [actualTargets, setActualTargets] = useState<InvestmentTarget[]>([]);
    const [targetsLoading, setTargetsLoading] = useState(true);
    const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
    const [targetModalMode, setTargetModalMode] = useState<'create' | 'edit'>('create');
    const [editingTarget, setEditingTarget] = useState<InvestmentTarget | null>(null);
    
    // Use the optimized investments hook
    const {
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

        // Handlers
        handleAddInvestment,
        handleEditInvestment,
        handleDeleteInvestment,
        handleBulkDelete,
        handleExportToCSV,
        clearFilters,
        clearError,

        // Loading states
        isCreating,
        isUpdating,
        isDeleting,
        isBulkDeleting,
    } = useOptimizedInvestments();

    // Format investment type for display
    const formatType = (type: string) => {
        return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };
    
    // Load investment target progress when component mounts or when investments change
    useEffect(() => {
        const loadTargetData = async () => {
            try {
                setTargetsLoading(true);
                // Load both progress and actual targets
                const [progressResult, targetsResult] = await Promise.all([
                    getInvestmentTargetProgress(),
                    getInvestmentTargets()
                ]);
                
                if (progressResult.data) {
                    setTargetProgress(progressResult.data);
                } else {
                    console.error("Failed to load target progress:", progressResult.error);
                }

                if (targetsResult.data) {
                    setActualTargets(targetsResult.data);
                } else {
                    console.error("Failed to load targets:", targetsResult.error);
                }
            } catch (error) {
                console.error("Error loading target data:", error);
            } finally {
                setTargetsLoading(false);
            }
        };

        loadTargetData();
    }, [investments]); // Reload when investments change

    // Target management handlers
    const handleCreateTarget = async (data: InvestmentTargetFormData) => {
        try {
            await createInvestmentTarget(data);
            // Reload both progress and targets
            const [progressResult, targetsResult] = await Promise.all([
                getInvestmentTargetProgress(),
                getInvestmentTargets()
            ]);
            if (progressResult.data) setTargetProgress(progressResult.data);
            if (targetsResult.data) setActualTargets(targetsResult.data);
        } catch (error) {
            throw error;
        }
    };

    const handleUpdateTarget = async (id: number, data: Partial<InvestmentTargetFormData>) => {
        try {
            await updateInvestmentTarget(id, data);
            // Reload both progress and targets
            const [progressResult, targetsResult] = await Promise.all([
                getInvestmentTargetProgress(),
                getInvestmentTargets()
            ]);
            if (progressResult.data) setTargetProgress(progressResult.data);
            if (targetsResult.data) setActualTargets(targetsResult.data);
        } catch (error) {
            throw error;
        }
    };

    const handleDeleteTarget = async (id: number) => {
        try {
            await deleteInvestmentTarget(id);
            // Reload both progress and targets
            const [progressResult, targetsResult] = await Promise.all([
                getInvestmentTargetProgress(),
                getInvestmentTargets()
            ]);
            if (progressResult.data) setTargetProgress(progressResult.data);
            if (targetsResult.data) setActualTargets(targetsResult.data);
        } catch (error) {
            throw error;
        }
    };

    const openAddTargetModal = () => {
        setTargetModalMode('create');
        setEditingTarget(null);
        setIsTargetModalOpen(true);
    };

    const openEditTargetModal = (investmentType: string) => {
        // Find the actual target for editing
        const actualTarget = actualTargets.find(t => t.investmentType === investmentType);
        if (actualTarget) {
            setTargetModalMode('edit');
            setEditingTarget(actualTarget);
            setIsTargetModalOpen(true);
        }
    };

    // Bulk delete modal handlers
    const handleSectionBulkDelete = (sectionInvestments: InvestmentInterface[]) => {
        const selectedIds = sectionInvestments.filter(inv => selectedInvestments.has(inv.id));
        if (selectedIds.length === 0) return;
        
        setBulkDeleteInvestments(selectedIds);
        setIsBulkDeleteModalOpen(true);
    };

    const handleBulkDeleteConfirm = async () => {
        if (bulkDeleteInvestments.length === 0) return;
        
        // Delete only the investments from the specific section
        try {
            const investmentIds = bulkDeleteInvestments.map(inv => inv.id);
            await Promise.all(investmentIds.map(id => handleDeleteInvestment({ id } as InvestmentInterface)));
            
            // Clear selection for deleted investments
            setSelectedInvestments(prev => {
                const newSet = new Set(prev);
                investmentIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        } catch (error) {
            console.error("Error in bulk delete:", error);
        } finally {
            setIsBulkDeleteModalOpen(false);
            setBulkDeleteInvestments([]);
        }
    };

    // Handle modal actions
    const handleModalAction = async (action: string, data?: any) => {
        try {
            switch (action) {
                case 'add':
                    await handleAddInvestment(data);
                    break;
                case 'edit':
                    if (modal.investment) {
                        await handleEditInvestment(modal.investment.id, data);
                    }
                    break;
                case 'delete':
                    if (modal.investment) {
                        await handleDeleteInvestment(modal.investment);
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error with ${action}:`, error);
        }
    };

    // Display error if there's one
    if (error) {
        return (
            <div className="p-8 text-center">
                <div className={errorContainer}>
                    <h3 className={errorTitle}>Error Loading Investments</h3>
                    <p className={errorMessage}>{error}</p>
                    <div className="flex gap-2 mt-4 justify-center">
                        <button 
                            onClick={() => window.location.reload()} 
                            className={primaryButton}
                        >
                            Retry
                        </button>
                        <button 
                            onClick={clearError} 
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className={loadingContainer}>
                <div className={loadingSpinner}></div>
                <p className={loadingText}>Loading investments...</p>
            </div>
        );
    }

    return (
        <div className={pageContainer}>
            {/* Header */}
            <div className={UI_STYLES.header.container}>
                <div>
                    <h1 className={pageTitle}>Investment</h1>
                    <p className={pageSubtitle}>Track your investment portfolio and performance</p>
                </div>
                <div className={UI_STYLES.header.buttonGroup}>
                    <button
                        onClick={() => openModal('add')}
                        className={primaryButton}
                    >
                        Add Investment
                    </button>
                    <button
                        onClick={() => openModal('import')}
                        className={secondaryBlueButton}
                    >
                        Import CSV
                    </button>
                    <button
                        onClick={handleExportToCSV}
                        className={secondaryGreenButton}
                        disabled={filteredInvestments.length === 0}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-6 gap-6">
                <div className={`${cardLargeContainer} relative`}>
                    <Target className={`absolute top-4 left-4 h-4 w-4 ${blueIcon}`} />
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Total number of investment positions in your portfolio
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Total Investments</h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {loading ? "..." : investments.length}
                        </p>
                        <p className={cardSubtitle}>positions</p>
                    </div>
                </div>
                <div className={`${cardLargeContainer} relative`}>
                    <TrendingUp className={`absolute top-4 left-4 h-4 w-4 ${greenIcon}`} />
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Number of investments with positive returns
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Gainers</h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {loading ? "..." : gainersCount}
                        </p>
                        <p className={cardSubtitle}>profitable</p>
                    </div>
                </div>
                <div className={`${cardLargeContainer} relative`}>
                    <TrendingDown className={`absolute top-4 left-4 h-4 w-4 ${redIcon}`} />
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Number of investments with negative returns
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Losers</h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {loading ? "..." : losersCount}
                        </p>
                        <p className={cardSubtitle}>at loss</p>
                    </div>
                </div>
                <div className={`${cardLargeContainer} relative`}>
                    <DollarSign className={`absolute top-4 left-4 h-4 w-4 ${purpleIcon}`} />
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Total amount of money you've invested (purchase price)
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Total Invested</h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {loading ? "..." : formatCurrency(totalInvested, userCurrency)}
                        </p>
                        <p className={cardSubtitle}>purchase cost</p>
                    </div>
                </div>
                <div className={`${cardLargeContainer} relative`}>
                    <DollarSign className={`absolute top-4 left-4 h-4 w-4 ${blueIcon}`} />
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Current market value of all your investments
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Current Value</h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {loading ? "..." : formatCurrency(totalCurrentValue, userCurrency)}
                        </p>
                        <p className={cardSubtitle}>market value</p>
                    </div>
                </div>
                <div className={`${cardLargeContainer} relative`}>
                    {totalGainLoss >= 0 ? 
                        <TrendingUp className={`absolute top-4 left-4 h-4 w-4 ${greenPositiveIcon}`} /> : 
                        <TrendingDown className={`absolute top-4 left-4 h-4 w-4 ${redNegativeIcon}`} />
                    }
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Profit or loss: Current Value - Total Invested
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Total Gain/Loss</h3>
                        <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {loading ? "..." : formatCurrency(totalGainLoss, userCurrency)}
                        </p>
                        <p className={cardSubtitle}>
                            {loading ? "" : `${totalGainLossPercentage >= 0 ? '+' : ''}${totalGainLossPercentage.toFixed(2)}% return`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Investment Type Distribution Chart */}
                <InvestmentTypePolarChart
                    investments={filteredInvestments}
                    currency={userCurrency}
                    title="Portfolio Distribution by Investment Type"
                />
                
                {/* Investment Target Progress Chart */}
                <InvestmentTargetProgressChart
                    targets={targetProgress}
                    currency={userCurrency}
                    title="Investment Target Progress"
                    onEditTarget={openEditTargetModal}
                    onAddTarget={openAddTargetModal}
                />
            </div>

            {/* Filters and Actions */}
            <div className={UI_STYLES.filters.containerWithMargin}>
                <div className={UI_STYLES.filters.gridFive}>
                    <div>
                        <label className={labelText}>
                            Search Investments
                        </label>
                        <input
                            type="text"
                            placeholder="Search by name, symbol, notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={standardInput}
                        />
                    </div>
                    <div>
                        <label className={labelText}>
                            Filter by Type
                        </label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className={standardInput}
                        >
                            <option value="">All Types</option>
                            {uniqueTypes.map((type) => (
                                <option key={type} value={type}>
                                    {formatType(type)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelText}>
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={standardInput}
                        />
                    </div>
                    <div>
                        <label className={labelText}>
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={standardInput}
                        />
                    </div>
                    <div className={UI_STYLES.filters.clearButtonContainer}>
                        <button
                            onClick={clearFilters}
                            className={clearFilterButton}
                            disabled={!hasActiveFilters}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {filteredInvestments.length === 0 ? (
                <div className={UI_STYLES.empty.container}>
                    <div className={UI_STYLES.empty.icon}>
                        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <h3 className={emptyTitle}>
                        {hasActiveFilters ? "No investments match your filters" : "No investments yet"}
                    </h3>
                    <p className={emptyMessage}>
                        {hasActiveFilters 
                            ? "Try adjusting your search criteria or clearing filters." 
                            : "Start building your investment portfolio by adding your first investment."
                        }
                    </p>
                    {hasActiveFilters ? (
                        <button onClick={clearFilters} className={clearButton}>
                            Clear Filters
                        </button>
                    ) : (
                        <button onClick={() => openModal('add')} className={primaryButton}>
                            Add Your First Investment
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    
                    {/* Investment Sections */}
                    {sections.map((section, index) => (
                        <div key={index} className={CONTAINER_COLORS.white}>
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className={`text-lg font-semibold ${TEXT_COLORS.title} ${TEXT_COLORS.chartTitle.replace('mb-4', '')}`}>{section.title}</h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                            <span>Invested: {formatCurrency(section.totalInvested, userCurrency)}</span>
                                            <span>Current: {formatCurrency(section.currentValue, userCurrency)}</span>
                                            <span className={`font-medium ${getGainLossClasses(section.gainLoss)}`}>
                                                {section.gainLoss >= 0 ? '+' : ''}{formatCurrency(section.gainLoss, userCurrency)} 
                                                ({section.gainLossPercentage.toFixed(2)}%)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        {(() => {
                                            const sectionSelectedIds = section.investments.filter(inv => selectedInvestments.has(inv.id));
                                            return sectionSelectedIds.length > 0 && (
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            const newSelected = new Set(selectedInvestments);
                                                            section.investments.forEach(inv => newSelected.delete(inv.id));
                                                            setSelectedInvestments(newSelected);
                                                        }}
                                                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                                                    >
                                                        Clear ({sectionSelectedIds.length})
                                                    </button>
                                                    <button
                                                        onClick={() => handleSectionBulkDelete(section.investments)}
                                                        disabled={isBulkDeleting}
                                                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {isBulkDeleting ? "Deleting..." : `Delete (${sectionSelectedIds.length})`}
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            
                            <InvestmentTable
                                investments={section.investments}
                                selectedInvestments={selectedInvestments}
                                onInvestmentSelect={handleInvestmentSelect}
                                onEdit={(investment: InvestmentInterface) => openModal('edit', investment)}
                                onDelete={(investment: InvestmentInterface) => openModal('delete', investment)}
                                onViewDetails={(investment: InvestmentInterface) => openModal('view', investment)}
                                showBulkActions={true}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            <AddInvestmentModal
                isOpen={modal.type === 'add'}
                onClose={closeModal}
                onAdd={(data) => handleModalAction('add', data)}
            />

            <EditInvestmentModal
                investment={modal.investment || null}
                isOpen={modal.type === 'edit'}
                onClose={closeModal}
                onEdit={(id, data) => handleModalAction('edit', data)}
            />

            <DeleteInvestmentModal
                investment={modal.investment || null}
                isOpen={modal.type === 'delete'}
                onClose={closeModal}
                onConfirm={() => handleModalAction('delete')}
            />

            <ViewInvestmentModal
                investment={modal.investment || null}
                isOpen={modal.type === 'view'}
                onClose={closeModal}
                onEdit={(investment) => openModal('edit', investment)}
            />

            <BulkImportModal
                isOpen={modal.type === 'import'}
                onClose={closeModal}
                onSuccess={() => {
                    closeModal();
                    // The React Query cache will automatically refresh
                }}
            />

            <BulkDeleteInvestmentModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={handleBulkDeleteConfirm}
                investments={bulkDeleteInvestments}
            />

            <InvestmentTargetModal
                isOpen={isTargetModalOpen}
                onClose={() => setIsTargetModalOpen(false)}
                onSave={handleCreateTarget}
                onUpdate={handleUpdateTarget}
                onDelete={handleDeleteTarget}
                existingTarget={editingTarget}
                mode={targetModalMode}
                existingTargetTypes={actualTargets.map(t => t.investmentType)}
                currency={userCurrency}
            />
        </div>
    );
}