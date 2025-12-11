"use client";

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { DebtTable } from './components/DebtTable';
import { AddDebtModal } from './components/AddDebtModal';
import { EditDebtModal } from './components/EditDebtModal';
import { DeleteDebtModal } from './components/DeleteDebtModal';
import { BulkDeleteDebtModal } from './components/BulkDeleteDebtModal';
import { ViewDebtModal } from './components/ViewDebtModal';
import { AddRepaymentModal } from './components/AddRepaymentModal';
import { BulkImportModal } from './components/BulkImportModal';
import { formatCurrency } from '../../utils/currency';
import DebtStatusWaterfallChart from './charts/DebtStatusWaterfallChart';
import DebtDueDatesChart from './charts/DebtDueDatesChart';
import { useCurrency } from '../../providers/CurrencyProvider';
import { useOptimizedDebts } from './hooks/useOptimizedDebts';
import { getSummaryCardClasses, BUTTON_COLORS, TEXT_COLORS, CONTAINER_COLORS, INPUT_COLORS, LOADING_COLORS, UI_STYLES } from '../../config/colorConfig';
import { DisappearingNotification, NotificationData } from '../../components/DisappearingNotification';

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

export default function DebtsPageClient() {
  const { currency: userCurrency } = useCurrency();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ FULLY_PAID: false });
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const {
    debts,
    filteredDebts,
    loading,
    error,
    financialSummary,
    hasActiveFilters,
    sections,
    modal,
    openModal,
    closeModal,
    isBulkDeleteModalOpen,
    setIsBulkDeleteModalOpen,
    searchTerm,
    setSearchTerm,
    selectedStatus,
    setSelectedStatus,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedDebts,
    setSelectedDebts,
    bulkDeleteDebts,
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
  } = useOptimizedDebts({
    onNotification: setNotification,
    userCurrency: userCurrency
  });

  const uniqueStatuses = Array.from(new Set(debts.map(debt => debt.status))).sort();

  const toggleSection = (sectionKey: string) => {
    if (sectionKey === 'FULLY_PAID') {
      setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className={errorContainer}>
          <h3 className={errorTitle}>Error Loading Debts</h3>
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
        <p className={loadingText}>Loading lendings...</p>
      </div>
    );
  }

  return (
    <div className={pageContainer}>
      <div className={UI_STYLES.header.container}>
        <div>
          <h1 className={pageTitle}>Lendings</h1>
          <p className={pageSubtitle}>Track money you've lent to others and manage repayments</p>
        </div>
        <div className={UI_STYLES.header.buttonGroup}>
          <button onClick={() => openModal('add')} className={primaryButton}>Add Debt</button>
          <button onClick={() => openModal('import')} className={secondaryBlueButton}>Import CSV</button>
          <button onClick={handleExportToCSV} className={secondaryGreenButton} disabled={filteredDebts.length === 0}>Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6 mb-6">
        <div className={`${cardLargeContainer} relative`}>
          <div className={`absolute top-4 left-4 ${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('totalDebts', 'debts').indicator}`}></div>
          <div className="flex flex-col items-center justify-center h-full text-center pt-6">
            <h3 className={`${cardTitle} mb-2`}>Total Lendings</h3>
            <p className="text-2xl font-bold text-gray-900">{financialSummary.totalDebts}</p>
            <p className={cardSubtitle}>lending records</p>
          </div>
        </div>
        <div className={`${cardLargeContainer} relative`}>
          <div className={`absolute top-4 left-4 ${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('principalLent', 'debts').indicator}`}></div>
          <div className="flex flex-col items-center justify-center h-full text-center pt-6">
            <h3 className={`${cardTitle} mb-2`}>Principal Lent</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(financialSummary.totalPrincipal, userCurrency)}</p>
            <p className={cardSubtitle}>original amount</p>
          </div>
        </div>
        <div className={`${cardLargeContainer} relative`}>
          <div className={`absolute top-4 left-4 ${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('interestEarned', 'debts').indicator}`}></div>
          <div className="flex flex-col items-center justify-center h-full text-center pt-6">
            <h3 className={`${cardTitle} mb-2`}>Interest Earned</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(financialSummary.totalInterestAccrued, userCurrency)}</p>
            <p className={cardSubtitle}>total interest</p>
          </div>
        </div>
        <div className={`${cardLargeContainer} relative`}>
          <div className={`absolute top-4 left-4 ${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('totalRepaid', 'debts').indicator}`}></div>
          <div className="flex flex-col items-center justify-center h-full text-center pt-6">
            <h3 className={`${cardTitle} mb-2`}>Total Repaid</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(financialSummary.totalRepaid, userCurrency)}</p>
            <p className={cardSubtitle}>collected</p>
          </div>
        </div>
        <div className={`${cardLargeContainer} relative`}>
          <div className={`absolute top-4 left-4 ${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('outstanding', 'debts').indicator}`}></div>
          <div className="flex flex-col items-center justify-center h-full text-center pt-6">
            <h3 className={`${cardTitle} mb-2`}>Outstanding</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(financialSummary.totalOutstanding, userCurrency)}</p>
            <p className={cardSubtitle}>{`${((financialSummary.totalOutstanding / (financialSummary.totalPrincipal + financialSummary.totalInterestAccrued || 1)) * 100).toFixed(1)}% remaining`}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <DebtStatusWaterfallChart debts={filteredDebts} currency={userCurrency} hasPageFilters={hasActiveFilters} pageStartDate={startDate} pageEndDate={endDate} />
      </div>

      <div className="mb-6">
        <DebtDueDatesChart debts={filteredDebts} currency={userCurrency} />
      </div>

      <div className={UI_STYLES.filters.containerWithMargin}>
        <div className={UI_STYLES.filters.gridFive}>
          <div>
            <label className={labelText}>Search Lendings</label>
            <input type="text" placeholder="Search by borrower name, purpose, contact..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={standardInput} />
          </div>
          <div>
            <label className={labelText}>Filter by Status</label>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className={standardInput}>
              <option value="">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelText}>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={standardInput} />
          </div>
          <div>
            <label className={labelText}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={standardInput} />
          </div>
          <div className={UI_STYLES.filters.clearButtonContainer}>
            <button onClick={clearFilters} className={clearFilterButton} disabled={!hasActiveFilters}>Clear Filters</button>
          </div>
        </div>
      </div>

      {filteredDebts.length === 0 ? (
        <div className={UI_STYLES.empty.container}>
          <div className={UI_STYLES.empty.icon}>
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
          </div>
          <h3 className={emptyTitle}>{hasActiveFilters ? 'No lendings match your filters' : 'No lendings yet'}</h3>
          <p className={emptyMessage}>{hasActiveFilters ? 'Try adjusting your search criteria or clearing filters.' : 'Get started by adding your first lending record.'}</p>
          {hasActiveFilters ? (
            <button onClick={clearFilters} className={clearButton}>Clear Filters</button>
          ) : (
            <button onClick={() => openModal('add')} className={primaryButton}>Add Your First Lending</button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(section => {
            if (section.debts.length === 0) return null;
            const isFullyPaid = section.key === 'FULLY_PAID';
            const isExpanded = isFullyPaid ? expandedSections[section.key] : true;
            return (
              <div key={section.key} className={CONTAINER_COLORS.white}>
                <div className={`px-6 py-4 border-b border-gray-200 ${isFullyPaid ? 'cursor-pointer hover:bg-gray-50' : ''}`} onClick={isFullyPaid ? () => toggleSection(section.key) : undefined}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className={`text-lg font-semibold ${TEXT_COLORS.title}`}>{section.title} ({section.debts.length})</h3>
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
                            <button onClick={e => { e.stopPropagation(); const newSelected = new Set(selectedDebts); section.debts.forEach(debt => newSelected.delete(debt.id)); setSelectedDebts(newSelected); }} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors">Clear ({sectionSelectedIds.length})</button>
                            <button onClick={e => { e.stopPropagation(); handleBulkDelete(section.debts); }} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">Delete ({sectionSelectedIds.length})</button>
                          </div>
                        );
                      })()}
                      {isFullyPaid && (<div className="text-gray-400">{isExpanded ? '▼' : '▶'}</div>)}
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

      <AddDebtModal isOpen={modal.type === 'add'} onClose={closeModal} onAdd={data => handleModalAction('add', data)} />
      <EditDebtModal isOpen={modal.type === 'edit'} onClose={closeModal} onEdit={(id, data) => handleModalAction('edit', data)} debt={modal.debt || null} />
      <DeleteDebtModal isOpen={modal.type === 'delete'} onClose={closeModal} onConfirm={() => handleModalAction('delete')} debt={modal.debt || null} />
      <ViewDebtModal debtId={modal.debt?.id || null} isOpen={modal.type === 'view'} onClose={closeModal} onEdit={debt => openModal('edit', debt)} onAddRepayment={debt => openModal('repayment', debt)} onDeleteRepayment={handleDeleteRepayment} />
      <AddRepaymentModal debt={modal.debt || null} isOpen={modal.type === 'repayment'} onClose={closeModal} onAdd={data => handleModalAction('addRepayment', data)} />
      <BulkImportModal isOpen={modal.type === 'import'} onClose={closeModal} onSuccess={() => { closeModal(); }} />
      <BulkDeleteDebtModal isOpen={isBulkDeleteModalOpen} onClose={() => setIsBulkDeleteModalOpen(false)} onConfirm={handleBulkDeleteConfirm} debts={bulkDeleteDebts} />
      
      {/* Disappearing Notification */}
      <DisappearingNotification 
        notification={notification} 
        onHide={() => setNotification(null)} 
      />
    </div>
  );

  function handleModalAction(action: string, data?: any) {
    switch (action) {
      case 'add':
        return handleAddDebt(data);
      case 'edit':
        return modal.debt ? handleEditDebt(modal.debt.id, data) : undefined;
      case 'delete':
        return modal.debt ? handleDeleteDebt(modal.debt) : undefined;
      case 'addRepayment':
        return modal.debt ? handleAddRepayment(modal.debt.id, data) : undefined;
    }
  }
}


