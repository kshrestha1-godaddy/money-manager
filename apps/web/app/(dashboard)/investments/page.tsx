"use client";

import React, { useState } from "react";
import { InvestmentList } from "../../components/investments/InvestmentList";
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

        // Selection states
        selectedInvestments,
        setSelectedInvestments,
        handleInvestmentSelect,
        handleSelectAll,

        // UI states
        viewMode,
        setViewMode,

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
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Investments</h3>
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
                    <h1 className="text-3xl font-bold">Investment</h1>
                    <p className="text-gray-600">Track your investment portfolio and performance</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => openModal('add')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                        Add Investment
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
                        disabled={filteredInvestments.length === 0}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-6 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Total Investments</h3>
                        <Target className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {loading ? "..." : investments.length}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Gainers</h3>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                        {loading ? "..." : gainersCount}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Losers</h3>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                        {loading ? "..." : losersCount}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Total Invested</h3>
                        <DollarSign className="h-4 w-4 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                        {loading ? "..." : formatCurrency(totalInvested, userCurrency)}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Current Value</h3>
                        <DollarSign className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                        {loading ? "..." : formatCurrency(totalCurrentValue, userCurrency)}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <h3 className="text-sm font-medium text-gray-500 mr-2">Total Gain/Loss</h3>
                        {totalGainLoss >= 0 ? 
                            <TrendingUp className="h-4 w-4 text-green-500" /> : 
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        }
                    </div>
                    <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {loading ? "..." : formatCurrency(totalGainLoss, userCurrency)}
                    </p>
                    <p className={`text-sm ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({totalGainLossPercentage.toFixed(2)}%)
                    </p>
                </div>
            </div>

            {/* Filters and Actions */}
            <div>
                <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search investments, symbols, notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Types</option>
                            {uniqueTypes.map((type) => (
                                <option key={type} value={type}>
                                    {formatType(type)}
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


                        {/* View Mode Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewMode("table")}
                                    className={`px-3 py-1 rounded text-sm ${viewMode === "table"
                                            ? "bg-blue-100 text-blue-700"
                                            : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    Table
                                </button>
                                <button
                                    onClick={() => setViewMode("cards")}
                                    className={`px-3 py-1 rounded text-sm ${viewMode === "cards"
                                            ? "bg-blue-100 text-blue-700"
                                            : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    Cards
                                </button>
                            </div>
                        </div>



                    </div>
 
                </div>

            </div>

            {/* Investments by Sections */}
            {loading ? (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                    <div className="animate-spin mx-auto mb-4 h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <p className="text-gray-600">Loading investments...</p>
                </div>
            ) : filteredInvestments.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {hasActiveFilters ? "No investments match your filters" : "No investments yet"}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {hasActiveFilters 
                            ? "Try adjusting your search criteria or clearing filters." 
                            : "Start building your investment portfolio by adding your first investment."
                        }
                    </p>
                    {hasActiveFilters ? (
                        <button onClick={clearFilters} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                            Clear Filters
                        </button>
                    ) : (
                        <button onClick={() => openModal('add')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            Add Your First Investment
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {sections.map((section, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm border">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                            <span>Invested: {formatCurrency(section.totalInvested, userCurrency)}</span>
                                            <span>Current: {formatCurrency(section.currentValue, userCurrency)}</span>
                                            <span className={`font-medium ${section.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                                        <div className="text-sm text-gray-500">
                                            {section.count} investment{section.count !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 pb-6">
                                {viewMode === "table" ? (
                                    <InvestmentTable
                                        investments={section.investments}
                                        onEdit={(investment) => openModal('edit', investment)}
                                        onDelete={(investment) => openModal('delete', investment)}
                                        onViewDetails={(investment) => openModal('view', investment)}
                                        selectedInvestments={selectedInvestments}
                                        onInvestmentSelect={handleInvestmentSelect}
                                        onSelectAll={(selected) => {
                                            const newSelected = new Set(selectedInvestments);
                                            section.investments.forEach(inv => {
                                                if (selected) {
                                                    newSelected.add(inv.id);
                                                } else {
                                                    newSelected.delete(inv.id);
                                                }
                                            });
                                            setSelectedInvestments(newSelected);
                                        }}
                                        showBulkActions={true}
                                        onBulkDelete={handleBulkDelete}
                                        onClearSelection={() => {
                                            const newSelected = new Set(selectedInvestments);
                                            section.investments.forEach(inv => newSelected.delete(inv.id));
                                            setSelectedInvestments(newSelected);
                                        }}
                                    />
                                ) : (
                                    <InvestmentList
                                        investments={section.investments}
                                        onEdit={(investment) => openModal('edit', investment)}
                                        onDelete={(investment) => openModal('delete', investment)}
                                        onViewDetails={(investment) => openModal('view', investment)}
                                        selectedInvestments={selectedInvestments}
                                        onInvestmentSelect={handleInvestmentSelect}
                                        onSelectAll={(selected) => {
                                            const newSelected = new Set(selectedInvestments);
                                            section.investments.forEach(inv => {
                                                if (selected) {
                                                    newSelected.add(inv.id);
                                                } else {
                                                    newSelected.delete(inv.id);
                                                }
                                            });
                                            setSelectedInvestments(newSelected);
                                        }}
                                        showBulkActions={true}
                                        onBulkDelete={handleBulkDelete}
                                        onClearSelection={() => {
                                            const newSelected = new Set(selectedInvestments);
                                            section.investments.forEach(inv => newSelected.delete(inv.id));
                                            setSelectedInvestments(newSelected);
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            <AddInvestmentModal
                isOpen={modal.type === 'add'}
                onClose={closeModal}
                onAdd={handleModalAction.bind(null, 'add')}
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