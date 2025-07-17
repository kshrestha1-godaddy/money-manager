"use client";

import React from "react";
import { DebtList } from "../../components/debts/DebtList";
import { DebtTable } from "../../components/debts/DebtTable";
import { AddDebtModal } from "../../components/debts/AddDebtModal";
import { EditDebtModal } from "../../components/debts/EditDebtModal";
import { DeleteDebtModal } from "../../components/debts/DeleteDebtModal";
import { BulkDeleteDebtModal } from "../../components/debts/BulkDeleteDebtModal";
import { ViewDebtModal } from "../../components/debts/ViewDebtModal";
import { AddRepaymentModal } from "../../components/debts/AddRepaymentModal";
import { BulkImportModal } from "../../components/debts/BulkImportModal";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useOptimizedDebts } from "../../hooks/useOptimizedDebts";

export default function Debts() {
    const { currency: userCurrency } = useCurrency();
    
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
        viewMode,
        setViewMode,
        searchTerm,
        setSearchTerm,
        selectedStatus,
        setSelectedStatus,

        // Selection states
        selectedDebts,
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Debts</h3>
                    <p className="text-red-600">{error}</p>
                    <div className="flex gap-2 mt-4 justify-center">
                        <button 
                            onClick={() => window.location.reload()} 
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Debts</h1>
                    <p className="text-gray-600">Track money you've lent to others and manage repayments</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => openModal('add')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                        Add Debt
                    </button>
                    <button
                        onClick={() => openModal('import')}
                        className="px-4 py-2 border border-gray-600 text-gray-600 hover:bg-blue-50 rounded-md"
                    >
                        Import CSV
                    </button>
                    <button
                        onClick={handleExportToCSV}
                        className="px-4 py-2 border border-gray-600 text-gray-600 hover:bg-green-50 rounded-md disabled:opacity-50"
                        disabled={filteredDebts.length === 0}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-7 gap-4">
                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <h3 className="text-sm font-medium text-gray-600">Total Debts</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                        {loading ? "..." : financialSummary.totalDebts}
                    </p>
                    <p className="text-sm text-gray-500">debt records</p>
                </div>

                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <h3 className="text-sm font-medium text-gray-600">Active</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                        {loading ? "..." : financialSummary.activeCount}
                    </p>
                    <p className="text-sm text-gray-500">active debts</p>
                </div>

                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <h3 className="text-sm font-medium text-gray-600">Overdue</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                        {loading ? "..." : financialSummary.overdueCount}
                    </p>
                    <p className="text-sm text-gray-500">overdue debts</p>
                </div>

                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <h3 className="text-sm font-medium text-gray-600">Principal Lent</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                        {loading ? "..." : formatCurrency(financialSummary.totalPrincipal, userCurrency)}
                    </p>
                </div>

                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Interest Accrued</h3>
                        <div className="h-4 w-4 bg-orange-100 rounded-full flex items-center justify-center">
                            <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-600">
                        {loading ? "..." : formatCurrency(financialSummary.totalInterestAccrued, userCurrency)}
                    </p>
                </div>

                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-600 mr-2">Total Repaid</h3>
                        <div className="h-4 w-4 bg-green-100 rounded-full flex items-center justify-center">
                            <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                        {loading ? "..." : formatCurrency(financialSummary.totalRepaid, userCurrency)}
                    </p>
                </div>

                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-600 mr-2">Outstanding</h3>
                        <div className="h-4 w-4 bg-red-100 rounded-full flex items-center justify-center">
                            <div className="h-2 w-2 bg-red-600 rounded-full"></div>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                        {loading ? "..." : formatCurrency(financialSummary.totalOutstanding, userCurrency)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        {loading ? "" : `${((financialSummary.totalOutstanding / (financialSummary.totalPrincipal + financialSummary.totalInterestAccrued || 1)) * 100).toFixed(1)}% remaining`}
                    </p>
                </div>
            </div>

            {/* Filters and Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search debts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Statuses</option>
                            {uniqueStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {status.replace('_', ' ')}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={clearFilters}
                            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            disabled={!hasActiveFilters}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">View:</span>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`px-3 py-1 rounded text-sm ${
                                viewMode === "table"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            Table
                        </button>
                        <button
                            onClick={() => setViewMode("cards")}
                            className={`px-3 py-1 rounded text-sm ${
                                viewMode === "cards"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            Cards
                        </button>
                    </div>
                    <div className="text-sm text-gray-600">
                        {loading ? "Loading..." : `${filteredDebts.length} of ${debts.length} debts`}
                    </div>
                </div>
            </div>

            {/* Debts by Sections */}
            {loading ? (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                    <div className="animate-spin mx-auto mb-4 h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <p className="text-gray-600">Loading debts...</p>
                </div>
            ) : filteredDebts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {hasActiveFilters ? "No debts match your filters" : "No debts yet"}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {hasActiveFilters 
                            ? "Try adjusting your search criteria or clearing filters." 
                            : "Get started by adding your first debt record."
                        }
                    </p>
                    {hasActiveFilters ? (
                        <button onClick={clearFilters} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                            Clear Filters
                        </button>
                    ) : (
                        <button onClick={() => openModal('add')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            Add Your First Debt
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {sections.map((section) => {
                        if (section.debts.length === 0) return null;

                        return (
                            <div key={section.key} className="bg-white rounded-lg shadow-sm border">
                                {/* Section Header */}
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {section.title} ({section.debts.length})
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                                <span>Total: {formatCurrency(section.totalAmount, userCurrency)}</span>
                                                <span>Outstanding: {formatCurrency(section.totalRemaining, userCurrency)}</span>
                                            </div>
                                        </div>
                                        {selectedDebts.size > 0 && (
                                            <button
                                                onClick={() => handleBulkDelete(section.debts)}
                                                className="px-3 py-2 text-red-600 border border-red-200 hover:bg-red-50 rounded-md text-sm"
                                            >
                                                Delete ({Array.from(selectedDebts).filter(id => section.debts.some(debt => debt.id === id)).length})
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Section Content */}
                                <div className="p-0">
                                    {viewMode === "table" ? (
                                        <DebtTable
                                            debts={section.debts}
                                            onEdit={(debt) => openModal('edit', debt)}
                                            onDelete={(debt) => openModal('delete', debt)}
                                            onViewDetails={(debt) => openModal('view', debt)}
                                            onAddRepayment={(debt) => openModal('repayment', debt)}
                                            selectedDebts={selectedDebts}
                                            onDebtSelect={handleDebtSelect}
                                            onSelectAll={(selected) => handleSelectAll(selected, section.debts)}
                                            showBulkActions={true}
                                            onBulkDelete={() => handleBulkDelete(section.debts)}
                                            onClearSelection={() => clearFilters()}
                                        />
                                    ) : (
                                        <div className="p-6">
                                            <DebtList
                                                debts={section.debts}
                                                onEdit={(debt) => openModal('edit', debt)}
                                                onDelete={(debt) => openModal('delete', debt)}
                                                onViewDetails={(debt) => openModal('view', debt)}
                                                onAddRepayment={(debt) => openModal('repayment', debt)}
                                                selectedDebts={selectedDebts}
                                                onDebtSelect={handleDebtSelect}
                                                onSelectAll={(selected) => handleSelectAll(selected, section.debts)}
                                                showBulkActions={true}
                                                onBulkDelete={() => handleBulkDelete(section.debts)}
                                                onClearSelection={() => clearFilters()}
                                            />
                                        </div>
                                    )}
                                </div>
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
                onEdit={(data) => handleModalAction('edit', data)}
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