"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
import { DebtTable } from "../../components/debts/DebtTable";
import { AddDebtModal } from "../../components/debts/AddDebtModal";
import { EditDebtModal } from "../../components/debts/EditDebtModal";
import { DeleteDebtModal } from "../../components/debts/DeleteDebtModal";
import { BulkDeleteDebtModal } from "../../components/debts/BulkDeleteDebtModal";
import { ViewDebtModal } from "../../components/debts/ViewDebtModal";
import { AddRepaymentModal } from "../../components/debts/AddRepaymentModal";
import { BulkImportModal } from "../../components/debts/BulkImportModal";
import { formatCurrency } from "../../utils/currency";
import DebtStatusWaterfallChart from "../../components/debts/DebtStatusWaterfallChart";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useOptimizedDebts } from "../../hooks/useOptimizedDebts";
import { 
    getSummaryCardClasses,
    BUTTON_COLORS,
    TEXT_COLORS,
    CONTAINER_COLORS,
    INPUT_COLORS,
    LOADING_COLORS,
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

export default function Debts() {
    const { currency: userCurrency } = useCurrency();
    
    // State for managing expandable sections (only for Fully Paid Debts)
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        FULLY_PAID: false // Only fully paid debts are collapsible
    });
    
    // Use the optimized debts hook
    const {
        // Data
        debts,
        filteredDebts,
        loading,
        error,
        financialSummary,
        totalDebtAmount,
        totalRemainingAmount,
        hasActiveFilters,
        sections,

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
    } = useOptimizedDebts();

    // Get unique statuses for filter dropdown
    const uniqueStatuses = Array.from(new Set(debts.map(debt => debt.status))).sort();

    // Toggle function for expandable sections
    const toggleSection = (sectionKey: string) => {
        if (sectionKey === 'FULLY_PAID') {
            setExpandedSections(prev => ({
                ...prev,
                [sectionKey]: !prev[sectionKey]
            }));
        }
    };

    // Handle modal actions
    const handleModalAction = async (action: string, data?: any) => {
        try {
            switch (action) {
                case 'add':
                    await handleAddDebt(data);
                    break;
                case 'edit':
                    if (modal.debt) {
                        await handleEditDebt(modal.debt.id, data);
                    }
                    break;
                case 'delete':
                    if (modal.debt) {
                        await handleDeleteDebt(modal.debt);
                    }
                    break;
                case 'addRepayment':
                    if (modal.debt) {
                        await handleAddRepayment(modal.debt.id, data);
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
                    <h3 className={errorTitle}>Error Loading Debts</h3>
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
                <p className={loadingText}>Loading lendings...</p>
            </div>
        );
    }

    return (
        <div className={pageContainer}>
            {/* Header */}
            <div className={UI_STYLES.header.container}>
                <div>
                    <h1 className={pageTitle}>Lendings</h1>
                    <p className={pageSubtitle}>Track money you've lent to others and manage repayments</p>
                </div>
                <div className={UI_STYLES.header.buttonGroup}>
                    <button
                        onClick={() => openModal('add')}
                        className={primaryButton}
                    >
                        Add Debt
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
                        disabled={filteredDebts.length === 0}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-5 gap-6 mb-6">
                <div className={`${cardLargeContainer} relative`}>
                    <div className={`absolute top-4 left-4 ${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('totalDebts', 'debts').indicator}`}></div>
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Total number of lending records in your portfolio
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Total Lendings</h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {loading ? "..." : financialSummary.totalDebts}
                        </p>
                        <p className={cardSubtitle}>lending records</p>
                    </div>
                </div>

                <div className={`${cardLargeContainer} relative`}>
                    <div className={`absolute top-4 left-4 ${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('principalLent', 'debts').indicator}`}></div>
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Total amount you have lent out (original principal)
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Principal Lent</h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {loading ? "..." : formatCurrency(financialSummary.totalPrincipal, userCurrency)}
                        </p>
                        <p className={cardSubtitle}>original amount</p>
                    </div>
                </div>

                <div className={`${cardLargeContainer} relative`}>
                    <div className={`absolute top-4 left-4 ${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('interestEarned', 'debts').indicator}`}></div>
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Total interest accumulated on all loans
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Interest Earned</h3>
                        <p className="text-2xl font-bold text-gray-900">
                            {loading ? "..." : formatCurrency(financialSummary.totalInterestAccrued, userCurrency)}
                        </p>
                        <p className={cardSubtitle}>total interest</p>
                    </div>
                </div>

                <div className={`${cardLargeContainer} relative`}>
                    <div className={`absolute top-4 left-4 ${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('totalRepaid', 'debts').indicator}`}></div>
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Total amount repaid by borrowers so far
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Total Repaid</h3>
                        <p className="text-2xl font-bold text-green-600">
                            {loading ? "..." : formatCurrency(financialSummary.totalRepaid, userCurrency)}
                        </p>
                        <p className={cardSubtitle}>collected</p>
                    </div>
                </div>

                <div className={`${cardLargeContainer} relative`}>
                    <div className={`absolute top-4 left-4 ${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('outstanding', 'debts').indicator}`}></div>
                    <div className="absolute top-4 right-4">
                        <div className="relative group">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                                Amount still owed: (Principal + Interest) - Repaid
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center h-full text-center pt-6">
                        <h3 className={`${cardTitle} mb-2`}>Outstanding</h3>
                        <p className="text-2xl font-bold text-red-600">
                            {loading ? "..." : formatCurrency(financialSummary.totalOutstanding, userCurrency)}
                        </p>
                        <p className={cardSubtitle}>
                            {loading ? "" : `${((financialSummary.totalOutstanding / (financialSummary.totalPrincipal + financialSummary.totalInterestAccrued || 1)) * 100).toFixed(1)}% remaining`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Debts Waterfall Chart */}
            <div className="mb-6">
                <DebtStatusWaterfallChart debts={filteredDebts} currency={userCurrency} />
            </div>


            {/* Filters and Actions */}
            <div className={UI_STYLES.filters.containerWithMargin}>
                <div className={UI_STYLES.filters.gridFive}>
                    <div>
                        <label className={labelText}>
                            Search Lendings
                        </label>
                        <input
                            type="text"
                            placeholder="Search by borrower name, purpose, contact..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={standardInput}
                        />
                    </div>
                    <div>
                        <label className={labelText}>
                            Filter by Status
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className={standardInput}
                        >
                            <option value="">All Statuses</option>
                            {uniqueStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {status.replace('_', ' ')}
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

            {/* Debts by Sections */}
            {filteredDebts.length === 0 ? (
                <div className={UI_STYLES.empty.container}>
                    <div className={UI_STYLES.empty.icon}>
                        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                    </div>
                    <h3 className={emptyTitle}>
                        {hasActiveFilters ? "No lendings match your filters" : "No lendings yet"}
                    </h3>
                    <p className={emptyMessage}>
                        {hasActiveFilters 
                            ? "Try adjusting your search criteria or clearing filters." 
                            : "Get started by adding your first lending record."
                        }
                    </p>
                    {hasActiveFilters ? (
                        <button onClick={clearFilters} className={clearButton}>
                            Clear Filters
                        </button>
                    ) : (
                        <button onClick={() => openModal('add')} className={primaryButton}>
                            Add Your First Lending
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {sections.map((section) => {
                        if (section.debts.length === 0) return null;

                        const isFullyPaid = section.key === 'FULLY_PAID';
                        const isExpanded = isFullyPaid ? expandedSections[section.key] : true;

                        return (
                            <div key={section.key} className={CONTAINER_COLORS.white}>
                                <div 
                                    className={`px-6 py-4 border-b border-gray-200 ${isFullyPaid ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                    onClick={isFullyPaid ? () => toggleSection(section.key) : undefined}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <h3 className={`text-lg font-semibold ${TEXT_COLORS.title}`}>
                                                    {section.title} ({section.debts.length})
                                                </h3>
                                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                                    <span>Total: {formatCurrency(section.totalAmount, userCurrency)}</span>
                                                    <span>Outstanding: {formatCurrency(section.totalRemaining, userCurrency)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            {(() => {
                                                const sectionSelectedIds = section.debts.filter(debt => selectedDebts.has(debt.id));
                                                return sectionSelectedIds.length > 0 && (
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevent header toggle when clicking button
                                                                const newSelected = new Set(selectedDebts);
                                                                section.debts.forEach(debt => newSelected.delete(debt.id));
                                                                setSelectedDebts(newSelected);
                                                            }}
                                                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                                                        >
                                                            Clear ({sectionSelectedIds.length})
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevent header toggle when clicking button
                                                                handleBulkDelete(section.debts);
                                                            }}
                                                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                                        >
                                                            Delete ({sectionSelectedIds.length})
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                            {isFullyPaid && (
                                                <div className="text-gray-400">
                                                    {isExpanded ? '▼' : '▶'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <DebtTable
                                        debts={section.debts}
                                        selectedDebts={selectedDebts}
                                        onDebtSelect={handleDebtSelect}
                                        onSelectAll={(selected) => handleSelectAll(selected, section.debts)}
                                        onEdit={(debt) => openModal('edit', debt)}
                                        onDelete={(debt) => openModal('delete', debt)}
                                        onViewDetails={(debt) => openModal('view', debt)}
                                        onAddRepayment={(debt) => openModal('repayment', debt)}
                                        showBulkActions={true}
                                        onBulkDelete={() => handleBulkDelete(section.debts)}
                                        onClearSelection={() => clearFilters()}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modals */}
            <AddDebtModal
                isOpen={modal.type === 'add'}
                onClose={closeModal}
                onAdd={(data) => handleModalAction('add', data)}
            />

            <EditDebtModal
                isOpen={modal.type === 'edit'}
                onClose={closeModal}
                onEdit={(id, data) => handleModalAction('edit', data)}
                debt={modal.debt || null}
            />

            <DeleteDebtModal
                isOpen={modal.type === 'delete'}
                onClose={closeModal}
                onConfirm={() => handleModalAction('delete')}
                debt={modal.debt || null}
            />

            <ViewDebtModal
                debtId={modal.debt?.id || null}
                isOpen={modal.type === 'view'}
                onClose={closeModal}
                onEdit={(debt) => openModal('edit', debt)}
                onAddRepayment={(debt) => openModal('repayment', debt)}
                onDeleteRepayment={handleDeleteRepayment}
            />

            <AddRepaymentModal
                debt={modal.debt || null}
                isOpen={modal.type === 'repayment'}
                onClose={closeModal}
                onAdd={(data) => handleModalAction('addRepayment', data)}
            />

            <BulkImportModal
                isOpen={modal.type === 'import'}
                onClose={closeModal}
                onSuccess={() => {
                    closeModal();
                    // The hook automatically handles cache invalidation
                }}
            />

            <BulkDeleteDebtModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={handleBulkDeleteConfirm}
                debts={bulkDeleteDebts}
            />
        </div>
    );
} 