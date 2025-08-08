"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { InvestmentTable } from "./components/InvestmentTable";
import { AddInvestmentModal } from "./components/AddInvestmentModal";
import { EditInvestmentModal } from "./components/EditInvestmentModal";
import { DeleteInvestmentModal } from "./components/DeleteInvestmentModal";
import { ViewInvestmentModal } from "./components/ViewInvestmentModal";
import { BulkImportModal } from "./components/BulkImportModal";
import { BulkDeleteInvestmentModal } from "./components/BulkDeleteInvestmentModal";
import { InvestmentTargetModal } from "./components/InvestmentTargetModal";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useOptimizedInvestments } from "./hooks/useOptimizedInvestments";
import { InvestmentInterface } from "../../types/investments";
import { useOptimizedInvestmentTargets } from "./hooks/useOptimizedInvestmentTargets";  
import { Plus, Upload, TrendingUp, TrendingDown, DollarSign, Target, Info } from "lucide-react";
import { getGainLossClasses, BUTTON_COLORS, TEXT_COLORS, CONTAINER_COLORS, INPUT_COLORS, LOADING_COLORS, ICON_COLORS, UI_STYLES } from "../../config/colorConfig";
import { ChartAnimationProvider } from "../../hooks/useChartAnimationContext";
import { InvestmentTypePolarChart } from "./charts/InvestmentTypePolarChart";
import { InvestmentTargetProgressChart } from "./charts/InvestmentTargetProgressChart";
// import { InvestmentTypePieChart } from "./charts/InvestmentTypePieChart";

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

const blueIcon = ICON_COLORS.blue;
const greenIcon = ICON_COLORS.green;
const redIcon = ICON_COLORS.red;
const purpleIcon = ICON_COLORS.purple;
const greenPositiveIcon = ICON_COLORS.greenPositive;
const redNegativeIcon = ICON_COLORS.redNegative;

export default function InvestmentsPageClient() {
  const { currency: userCurrency } = useCurrency();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteInvestments, setBulkDeleteInvestments] = useState<InvestmentInterface[]>([]);

  const {
    targets: actualTargets,
    targetProgress,
    loading: targetsLoading,
    error: targetsError,
    modal: targetModal,
    openModal: openTargetModal,
    closeModal: closeTargetModal,
    handleCreateTarget,
    handleUpdateTarget,
    handleDeleteTarget,
    isCreating: isCreatingTarget,
    isUpdating: isUpdatingTarget,
    isDeleting: isDeletingTarget,
  } = useOptimizedInvestmentTargets();

  const {
    investments,
    filteredInvestments,
    loading,
    error,
    sections,
    uniqueTypes,
    hasActiveFilters,
    totalInvested,
    totalCurrentValue,
    totalGainLoss,
    totalGainLossPercentage,
    gainersCount,
    losersCount,
    breakEvenCount,
    modal,
    openModal,
    closeModal,
    searchTerm,
    setSearchTerm,
    selectedType,
    setSelectedType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedInvestments,
    setSelectedInvestments,
    handleInvestmentSelect,
    handleSelectAll,
    handleAddInvestment,
    handleEditInvestment,
    handleDeleteInvestment,
    handleBulkDelete,
    handleExportToCSV,
    clearFilters,
    clearError,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkDeleting,
  } = useOptimizedInvestments();

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  const debouncedSetSearchTerm = useCallback((value: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setSearchTerm(value), 200);
  }, [setSearchTerm]);

  const debouncedSetStartDate = useCallback((value: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setStartDate(value), 150);
  }, [setStartDate]);

  const debouncedSetEndDate = useCallback((value: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setEndDate(value), 150);
  }, [setEndDate]);

  const formatType = (type: string) => type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  const openAddTargetModal = useCallback(() => openTargetModal('create'), [openTargetModal]);
  const openEditTargetModal = useCallback((investmentType: string) => {
    const actualTarget = actualTargets.find(t => t.investmentType === investmentType);
    if (actualTarget) openTargetModal('edit', actualTarget);
  }, [actualTargets, openTargetModal]);

  const stableInvestments = useMemo(() => investments, [investments?.length, investments?.reduce((sum, inv) => sum + inv.id + (inv.currentPrice || 0), 0) ?? 0]);
  const stableTargetProgress = useMemo(() => targetProgress, [targetProgress?.length, targetProgress?.reduce((sum, target) => sum + target.progress + (target.isComplete ? 1 : 0), 0) ?? 0]);

  const polarChartProps = useMemo(() => ({ investments: stableInvestments, currency: userCurrency, title: "Portfolio Distribution by Investment Type" }), [stableInvestments, userCurrency]);
  const targetChartProps = useMemo(() => ({ targets: stableTargetProgress, currency: userCurrency, title: "Investment Target Progress", onEditTarget: openEditTargetModal, onAddTarget: openAddTargetModal }), [stableTargetProgress, userCurrency, openEditTargetModal, openAddTargetModal]);

  const handleSectionBulkDelete = (sectionInvestments: InvestmentInterface[]) => {
    const selectedIds = sectionInvestments.filter(inv => selectedInvestments.has(inv.id));
    if (selectedIds.length === 0) return;
    setBulkDeleteInvestments(selectedIds);
    setIsBulkDeleteModalOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (bulkDeleteInvestments.length === 0) return;
    try {
      const investmentIds = bulkDeleteInvestments.map(inv => inv.id);
      await Promise.all(investmentIds.map(id => handleDeleteInvestment({ id } as InvestmentInterface)));
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

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className={errorContainer}>
          <h3 className={errorTitle}>Error Loading Investments</h3>
          <p className={errorMessage}>{error}</p>
          <div className="flex gap-2 mt-4 justify-center">
            <button onClick={() => window.location.reload()} className={primaryButton}>Retry</button>
            <button onClick={clearError} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Dismiss</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner}></div>
        <p className={loadingText}>Loading investments...</p>
      </div>
    );
  }

  return (
    <ChartAnimationProvider>
      <div className={pageContainer}>
        <div className={UI_STYLES.header.container}>
          <div>
            <h1 className={pageTitle}>Investment</h1>
            <p className={pageSubtitle}>Track your investment portfolio and performance</p>
          </div>
          <div className={UI_STYLES.header.buttonGroup}>
            <button onClick={() => openModal('add')} className={primaryButton}>Add Investment</button>
            <button onClick={() => openModal('import')} className={secondaryBlueButton}>Import CSV</button>
            <button onClick={handleExportToCSV} className={secondaryGreenButton} disabled={filteredInvestments.length === 0}>Export CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-6">
          <div className={`${cardLargeContainer} relative`}>
            <Target className={`absolute top-4 left-4 h-4 w-4 ${blueIcon}`} />
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Total Investments</h3>
              <p className="text-2xl font-bold text-gray-900">{investments.length}</p>
              <p className={cardSubtitle}>positions</p>
            </div>
          </div>
          <div className={`${cardLargeContainer} relative`}>
            <TrendingUp className={`absolute top-4 left-4 h-4 w-4 ${greenIcon}`} />
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Gainers</h3>
              <p className="text-2xl font-bold text-gray-900">{gainersCount}</p>
              <p className={cardSubtitle}>profitable</p>
            </div>
          </div>
          <div className={`${cardLargeContainer} relative`}>
            <TrendingDown className={`absolute top-4 left-4 h-4 w-4 ${redIcon}`} />
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Losers</h3>
              <p className="text-2xl font-bold text-gray-900">{losersCount}</p>
              <p className={cardSubtitle}>at loss</p>
            </div>
          </div>
          <div className={`${cardLargeContainer} relative`}>
            <DollarSign className={`absolute top-4 left-4 h-4 w-4 ${purpleIcon}`} />
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Total Invested</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvested, userCurrency)}</p>
              <p className={cardSubtitle}>purchase cost</p>
            </div>
          </div>
          <div className={`${cardLargeContainer} relative`}>
            <DollarSign className={`absolute top-4 left-4 h-4 w-4 ${blueIcon}`} />
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Current Value</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCurrentValue, userCurrency)}</p>
              <p className={cardSubtitle}>market value</p>
            </div>
          </div>
          <div className={`${cardLargeContainer} relative`}>
            {totalGainLoss >= 0 ? (
              <TrendingUp className={`absolute top-4 left-4 h-4 w-4 ${greenPositiveIcon}`} />
            ) : (
              <TrendingDown className={`absolute top-4 left-4 h-4 w-4 ${redNegativeIcon}`} />
            )}
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>Total Gain/Loss</h3>
              <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(totalGainLoss, userCurrency)}</p>
              <p className={cardSubtitle}>{`${totalGainLossPercentage >= 0 ? '+' : ''}${totalGainLossPercentage.toFixed(2)}% return`}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <InvestmentTypePolarChart {...polarChartProps} investments={filteredInvestments} />
          </div>
          <div>
            <InvestmentTargetProgressChart {...targetChartProps} />
          </div>
        </div>

        <div className={UI_STYLES.filters.containerWithMargin}>
          <div className={UI_STYLES.filters.gridFive}>
            <div>
              <label className={labelText}>Search Investments</label>
              <input type="text" placeholder="Search by name, symbol, notes..." value={searchTerm} onChange={e => debouncedSetSearchTerm(e.target.value)} className={standardInput} />
            </div>
            <div>
              <label className={labelText}>Filter by Type</label>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className={standardInput}>
                <option value="">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{formatType(type)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelText}>Start Date</label>
              <input type="date" value={startDate} onChange={e => debouncedSetStartDate(e.target.value)} className={standardInput} />
            </div>
            <div>
              <label className={labelText}>End Date</label>
              <input type="date" value={endDate} onChange={e => debouncedSetEndDate(e.target.value)} className={standardInput} />
            </div>
            <div className={UI_STYLES.filters.clearButtonContainer}>
              <button onClick={clearFilters} className={clearFilterButton} disabled={!hasActiveFilters}>Clear Filters</button>
            </div>
          </div>
        </div>

        {filteredInvestments.length === 0 ? (
          <div className={UI_STYLES.empty.container}>
            <div className={UI_STYLES.empty.icon}>
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <h3 className={emptyTitle}>{hasActiveFilters ? 'No investments match your filters' : 'No investments yet'}</h3>
            <p className={emptyMessage}>{hasActiveFilters ? 'Try adjusting your search criteria or clearing filters.' : 'Start building your investment portfolio by adding your first investment.'}</p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className={clearButton}>Clear Filters</button>
            ) : (
              <button onClick={() => openModal('add')} className={primaryButton}>Add Your First Investment</button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section, index) => (
              <div key={index} className={CONTAINER_COLORS.white}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${TEXT_COLORS.title} ${TEXT_COLORS.chartTitle.replace('mb-4', '')}`}>{section.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>Invested: {formatCurrency(section.totalInvested, userCurrency)}</span>
                        <span>Current: {formatCurrency(section.currentValue, userCurrency)}</span>
                        <span className={`font-medium ${getGainLossClasses(section.gainLoss)}`}>{section.gainLoss >= 0 ? '+' : ''}{formatCurrency(section.gainLoss, userCurrency)} ({section.gainLossPercentage.toFixed(2)}%)</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {(() => {
                        const sectionSelectedIds = section.investments.filter(inv => selectedInvestments.has(inv.id));
                        return sectionSelectedIds.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <button onClick={() => { const newSelected = new Set(selectedInvestments); section.investments.forEach(inv => newSelected.delete(inv.id)); setSelectedInvestments(newSelected); }} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors">Clear ({sectionSelectedIds.length})</button>
                            <button onClick={() => handleSectionBulkDelete(section.investments)} disabled={isBulkDeleting} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50">{isBulkDeleting ? 'Deleting...' : `Delete (${sectionSelectedIds.length})`}</button>
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

        <AddInvestmentModal isOpen={modal.type === 'add'} onClose={closeModal} onAdd={(data) => handleModalAction('add', data)} />
        <EditInvestmentModal investment={modal.investment || null} isOpen={modal.type === 'edit'} onClose={closeModal} onEdit={(id, data) => handleModalAction('edit', data)} />
        <DeleteInvestmentModal investment={modal.investment || null} isOpen={modal.type === 'delete'} onClose={closeModal} onConfirm={() => handleModalAction('delete')} />
        <ViewInvestmentModal investment={modal.investment || null} isOpen={modal.type === 'view'} onClose={closeModal} onEdit={(investment) => openModal('edit', investment)} />
        <BulkImportModal isOpen={modal.type === 'import'} onClose={closeModal} onSuccess={() => { closeModal(); }} />
        <BulkDeleteInvestmentModal isOpen={isBulkDeleteModalOpen} onClose={() => setIsBulkDeleteModalOpen(false)} onConfirm={handleBulkDeleteConfirm} investments={bulkDeleteInvestments} />
        <InvestmentTargetModal isOpen={targetModal.type !== null} onClose={closeModalTarget} onSave={async (data) => { await handleCreateTarget(data); }} onUpdate={async (id, data) => { await handleUpdateTarget(id, data); }} onDelete={async (id) => { await handleDeleteTarget(id); }} existingTarget={targetModal.target} mode={targetModal.type || 'create'} existingTargetTypes={actualTargets.map(t => t.investmentType)} currency={userCurrency} />
      </div>
    </ChartAnimationProvider>
  );

  function handleModalAction(action: string, data?: any) {
    switch (action) {
      case 'add':
        return handleAddInvestment(data);
      case 'edit':
        return modal.investment ? handleEditInvestment(modal.investment.id, data) : undefined;
      case 'delete':
        return modal.investment ? handleDeleteInvestment(modal.investment) : undefined;
    }
  }

  function closeModalTarget() {
    closeTargetModal();
  }
}


