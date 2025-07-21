"use client";

import React, { useState } from "react";
import { InvestmentTable } from "../../components/investments/InvestmentTable";
import { AddInvestmentModal } from "../../components/investments/AddInvestmentModal";
import { EditInvestmentModal } from "../../components/investments/EditInvestmentModal";
import { DeleteInvestmentModal } from "../../components/investments/DeleteInvestmentModal";
import { ViewInvestmentModal } from "../../components/investments/ViewInvestmentModal";
import { BulkImportModal } from "../../components/investments/BulkImportModal";
import { BulkDeleteInvestmentModal } from "../../components/investments/BulkDeleteInvestmentModal";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useOptimizedInvestments } from "../../hooks/useOptimizedInvestments";
import { InvestmentInterface } from "../../types/investments";
import { Plus, Upload, TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
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
const cardValue = TEXT_COLORS.cardValue;
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

    // Bulk delete modal handlers
    const handleSectionBulkDelete = (sectionInvestments: InvestmentInterface[]) => {
        const selectedIds = sectionInvestments.filter(inv => selectedInvestments.has(inv.id));
        if (selectedIds.length === 0) return;
        
        setBulkDeleteInvestments(selectedIds);
        setIsBulkDeleteModalOpen(true);
    };

    const handleBulkDeleteConfirm = async () => {
        await handleBulkDelete();
        setIsBulkDeleteModalOpen(false);
        setBulkDeleteInvestments([]);
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
                <div className={cardLargeContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <h3 className={`${cardTitle} mr-2`}>Total Investments</h3>
                        <Target className={`h-4 w-4 ${blueIcon}`} />
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('totalInvestments', 'investments').text}`}>
                        {loading ? "..." : investments.length}
                    </p>
                </div>
                <div className={cardLargeContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <h3 className={`${cardTitle} mr-2`}>Gainers</h3>
                        <TrendingUp className={`h-4 w-4 ${greenIcon}`} />
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('gainers', 'investments').text}`}>
                        {loading ? "..." : gainersCount}
                    </p>
                </div>
                <div className={cardLargeContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <h3 className={`${cardTitle} mr-2`}>Losers</h3>
                        <TrendingDown className={`h-4 w-4 ${redIcon}`} />
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('losers', 'investments').text}`}>
                        {loading ? "..." : losersCount}
                    </p>
                </div>
                <div className={cardLargeContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <h3 className={`${cardTitle} mr-2`}>Total Invested</h3>
                        <DollarSign className={`h-4 w-4 ${purpleIcon}`} />
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('totalInvested', 'investments').text}`}>
                        {loading ? "..." : formatCurrency(totalInvested, userCurrency)}
                    </p>
                </div>
                <div className={cardLargeContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <h3 className={`${cardTitle} mr-2`}>Current Value</h3>
                        <DollarSign className={`h-4 w-4 ${blueIcon}`} />
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('currentValue', 'investments').text}`}>
                        {loading ? "..." : formatCurrency(totalCurrentValue, userCurrency)}
                    </p>
                </div>
                <div className={cardLargeContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <h3 className={`${cardTitle} mr-2`}>Total Gain/Loss</h3>
                        {totalGainLoss >= 0 ? 
                            <TrendingUp className={`h-4 w-4 ${greenPositiveIcon}`} /> : 
                            <TrendingDown className={`h-4 w-4 ${redNegativeIcon}`} />
                        }
                    </div>
                    <p className={`${cardValue} ${getGainLossClasses(totalGainLoss)}`}>
                        {loading ? "..." : formatCurrency(totalGainLoss, userCurrency)}
                    </p>
                    <p className={`text-sm ${getGainLossClasses(totalGainLoss)}`}>
                        ({totalGainLossPercentage.toFixed(2)}%)
                    </p>
                </div>
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

            {loading ? (
                <div className={loadingContainer}>
                    <div className={loadingSpinner}></div>
                    <p className={loadingText}>Loading investments...</p>
                </div>
            ) : filteredInvestments.length === 0 ? (
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
            ) :
                <div className="space-y-6">
                    {sections.map((section, index) => (
                        <div key={index} className={CONTAINER_COLORS.white}>
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className={`text-lg font-semibold ${TEXT_COLORS.cardTitle} ${TEXT_COLORS.chartTitle.replace('mb-4', '')}`}>{section.title}</h3>
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
            }

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
        </div>
    );
}