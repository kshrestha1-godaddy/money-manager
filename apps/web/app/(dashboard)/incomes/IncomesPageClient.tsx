"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOptimizedFinancialData } from '../../hooks/useOptimizedFinancialData';
import { useGatedAction } from '@repo/applock';
import { IncomeList, AddIncomeModal, EditIncomeModal, ViewIncomeModal } from './components';
import { UnifiedBulkImportModal } from '../../components/shared/UnifiedBulkImportModal';
import { incomeImportConfig } from '../../config/bulkImportConfig';
import { AddCategoryModal } from '../../components/category/AddCategoryModal';
import { TransactionCategoryAnalysis } from "../../components/shared/TransactionCategoryAnalysis";
import { FinancialAreaChart } from '../../components/FinancialAreaChart';
import { FinancialFilters } from '../../components/shared/FinancialFilters';
import { MonthNavigation } from '../../components/shared/MonthNavigation';
import { formatCurrency } from '../../utils/currency';
import { getIncomes, createIncome, updateIncome, deleteIncome, bulkDeleteIncomes } from './actions/incomes';
import { exportIncomesToCSV } from '../../utils/csvExportIncomes';
import { createTransactionBookmark, deleteTransactionBookmarkByTransaction } from '../transactions/actions/transaction-bookmarks';
import { Income } from '../../types/financial';
import { useCurrency } from '../../providers/CurrencyProvider';
import { getTransactionPeriodTotals } from "../../utils/transaction-period-totals";
import { createTransactionDayFormatter, getVisibleSelection } from "../../utils/transaction-calendar";
import { useTimezone } from '../../providers/TimezoneProvider';
import { DisappearingNotification, NotificationData } from '../../components/DisappearingNotification';
import { BUTTON_COLORS, TEXT_COLORS, CONTAINER_COLORS, LOADING_COLORS } from '../../config/colorConfig';
import { convertForDisplaySync } from '../../utils/currencyDisplay';
import { getCategoriesWithFrequency, CategoryWithFrequencyData } from '../../utils/categoryFrequency';

const pageContainer = CONTAINER_COLORS.page;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;
const cardLargeContainer = CONTAINER_COLORS.cardLarge;
const cardTitle = TEXT_COLORS.cardTitle;
const cardValue = TEXT_COLORS.cardValue;
const cardSubtitle = TEXT_COLORS.cardSubtitle;
const primaryButton = BUTTON_COLORS.primary;
const secondaryBlueButton = BUTTON_COLORS.secondaryBlue;
const secondaryGreenButton = BUTTON_COLORS.secondaryGreen;

export default function IncomesPageClient() {
  const { currency: userCurrency } = useCurrency();
  const { timezone: userTimezone } = useTimezone();
  const searchParams = useSearchParams();
  const [notification, setNotification] = useState<NotificationData | null>(null);

  // Month navigation state
  const getTransactionDay = useMemo(() => createTransactionDayFormatter(userTimezone), [userTimezone]);
  const today = getTransactionDay(new Date());
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7)) - 1;
  const [monthOverride, setMonthOverride] = useState<{ month: number; year: number } | null>(null);
  const selectedMonth = monthOverride?.month ?? currentMonth;
  const selectedYear = monthOverride?.year ?? currentYear;
  const [isMonthFilterActive, setIsMonthFilterActive] = useState<boolean>(true);
  const [incomeTab, setIncomeTab] = useState<number | null>(null);

  // Month navigation handler
  const handleMonthChange = (month: number, year: number) => {
    setMonthOverride({ month, year });
    setIsMonthFilterActive(true);
  };

  const {
    items: incomes,
    itemsWithoutDateFilter,
    allItems: allIncomes,
    categories,
    accounts,
    loading: isLoading,
    itemsError,
    retryItems,
    itemsFetching,
    isBulkDeleting,
    uniqueBankNames,
    hasActiveFilters,
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isViewModalOpen,
    setIsViewModalOpen,
    isAddCategoryModalOpen,
    setIsAddCategoryModalOpen,
    isBulkImportModalOpen,
    setIsBulkImportModalOpen,
    selectedItems,
    itemToEdit,
    setItemToEdit,
    itemToView,
    setItemToView,
    handleAddItem,
    handleEditItem,
    handleDeleteItem,
    handleAddCategory,
    handleDeleteCategory,
    handleUpdateCategory,
    categoryTabMutation,
    openEditModal,
    openViewModal,
    handleItemSelect,
    handleSelectAll,
    handleBulkDelete,
    handleBulkImportSuccess,
    handleExportToCSV,
    searchTerm,
    setSearchTerm,
    selectedCategories,
    setSelectedCategories,
    selectedBanks,
    setSelectedBanks,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    showBookmarkedOnly,
    setShowBookmarkedOnly,
    clearFilters,
    invalidateQueries,
    userThresholds,
    thresholdsLoading
  } = useOptimizedFinancialData<Income>('INCOME', {
    getItems: getIncomes,
    createItem: createIncome,
    updateItem: updateIncome,
    deleteItem: deleteIncome,
    bulkDeleteItems: bulkDeleteIncomes,
    exportToCSV: exportIncomesToCSV,
  }, {
    onNotification: setNotification,
    userCurrency: userCurrency,
    userTimezone
  });

  // Sort categories by frequency for the add/edit modals (last 6 months)
  const categoriesWithFrequency = useMemo(() => {
    return getCategoriesWithFrequency(categories, allIncomes);
  }, [categories, allIncomes]);

  const handleBookmarkToggle = async (income: Income) => {
    try {
      if (income.isBookmarked) {
        await deleteTransactionBookmarkByTransaction('INCOME', income.id);
      } else {
        await createTransactionBookmark({
          transactionType: 'INCOME',
          transactionId: income.id,
          title: income.title,
          description: income.description || undefined,
          notes: income.notes || undefined,
          tags: income.tags || [],
        });
      }
      invalidateQueries();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      invalidateQueries();
    }
  };

  const filteredIncomes = useMemo(() => {
    if (hasActiveFilters || !isMonthFilterActive) return incomes;
    const month = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return incomes.filter((transaction) => getTransactionDay(transaction.date).startsWith(month));
  }, [incomes, hasActiveFilters, isMonthFilterActive, selectedMonth, selectedYear, getTransactionDay]);
  const tabCategories = categories.filter((category) => category.showAsTransactionTab);
  const activeIncomeTab = tabCategories.some(({ id }) => id === incomeTab) ? incomeTab : null;
  const tableIncomes = useMemo(
    () => activeIncomeTab === null
      ? filteredIncomes
      : filteredIncomes.filter(({ categoryId }) => categoryId === activeIncomeTab),
    [activeIncomeTab, filteredIncomes]
  );
  const visibleSelection = useMemo(
    () => getVisibleSelection(tableIncomes, selectedItems),
    [tableIncomes, selectedItems]
  );

  useEffect(() => {
    if (searchParams.get('action') === 'add') setIsAddModalOpen(true);

    // Handle date filter URL parameters
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');
    const urlCategories = searchParams.get('categories');
    const urlCategory = searchParams.get('category');

    if (urlStartDate) {
      setStartDate(urlStartDate);
    }
    if (urlEndDate) {
      setEndDate(urlEndDate);
    }
    if (urlCategories) {
      setSelectedCategories(
        urlCategories.split(',').map((s) => s.trim()).filter(Boolean)
      );
    } else if (urlCategory) {
      setSelectedCategories([urlCategory]);
    }
  }, [searchParams, setIsAddModalOpen, setStartDate, setEndDate, setSelectedCategories]);

  const periods = useMemo(
    () => getTransactionPeriodTotals(
      allIncomes,
      getTransactionDay,
      (item) => convertForDisplaySync(item.amount, item.currency, userCurrency),
      currentYear,
      currentMonth
    ),
    [allIncomes, getTransactionDay, userCurrency, currentYear, currentMonth]
  );
  const currentQuarter = Math.floor(currentMonth / 3);
  const lastMonth = (currentMonth + 11) % 12;
  const monthlyChange = periods.previousMonth.amount > 0
    ? ((periods.currentMonth.amount - periods.previousMonth.amount) / periods.previousMonth.amount) * 100
    : null;
  const quarterlyChange = periods.previousQuarter.amount > 0
    ? ((periods.currentQuarter.amount - periods.previousQuarter.amount) / periods.previousQuarter.amount) * 100
    : null;
  const averagePerIncome = periods.allTime.count ? periods.allTime.amount / periods.allTime.count : 0;

  const chartProps = useMemo(
    () => ({
      data: incomes,
      currency: userCurrency,
      timezone: userTimezone,
      type: 'income' as const,
      hasPageFilters: hasActiveFilters,
      pageStartDate: startDate,
      pageEndDate: endDate,
      userThresholds: userThresholds ? {
        autoBookmarkEnabled: userThresholds.autoBookmarkEnabled,
        income: userThresholds.incomeThreshold,
        expense: userThresholds.expenseThreshold
      } : undefined,
      thresholdsLoading
    }),
    [incomes, userCurrency, userTimezone, hasActiveFilters, startDate, endDate, userThresholds, thresholdsLoading]
  );

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
  const currentMonthName = monthNames[currentMonth];
  const currentQuarterName = quarterNames[currentQuarter];

  const visibleTotal = useMemo(
    () => filteredIncomes.reduce((total, item) => total + convertForDisplaySync(item.amount, item.currency, userCurrency), 0),
    [filteredIncomes, userCurrency]
  );

  const summaryCards = [
    {
      title: 'Incomes in View',
      value: formatCurrency(visibleTotal, userCurrency),
      subtitle: `${filteredIncomes.length} transaction${filteredIncomes.length !== 1 ? 's' : ''}`,
      dotColor: 'bg-green-500'
    },
    {
      title: `This Month (${currentMonthName})`,
      value: formatCurrency(periods.currentMonth.amount, userCurrency),
      subtitle: `${periods.currentMonth.count} transaction${periods.currentMonth.count !== 1 ? 's' : ''}${monthlyChange === null ? '' : ` • ${(monthlyChange ?? 0) >= 0 ? '+' : ''}${monthlyChange.toFixed(1)}%`}`,
      subtitleColor: (monthlyChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600',
      dotColor: (monthlyChange ?? 0) >= 0 ? 'bg-green-500' : 'bg-red-500',
      tooltipText: `Last month (${monthNames[lastMonth]}): ${formatCurrency(periods.previousMonth.amount, userCurrency)} (${periods.previousMonth.count} transaction${periods.previousMonth.count !== 1 ? 's' : ''})`
    },
    {
      title: `${currentQuarterName} (${currentQuarterName === 'Q1' ? 'Jan-Mar' : currentQuarterName === 'Q2' ? 'Apr-Jun' : currentQuarterName === 'Q3' ? 'Jul-Sep' : 'Oct-Dec'})`,
      value: formatCurrency(periods.currentQuarter.amount, userCurrency),
      subtitle: `${periods.currentQuarter.count} transaction${periods.currentQuarter.count !== 1 ? 's' : ''}${quarterlyChange === null ? '' : ` • ${(quarterlyChange ?? 0) >= 0 ? '+' : ''}${quarterlyChange.toFixed(1)}%`}`,
      subtitleColor: (quarterlyChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600',
      dotColor: (quarterlyChange ?? 0) >= 0 ? 'bg-green-500' : 'bg-red-500',
      tooltipText: `Last quarter (${quarterNames[currentQuarter === 0 ? 3 : currentQuarter - 1]}): ${formatCurrency(periods.previousQuarter.amount, userCurrency)} (${periods.previousQuarter.count} transaction${periods.previousQuarter.count !== 1 ? 's' : ''})`
    },
    {
      title: 'Average per Transaction',
      value: formatCurrency(averagePerIncome, userCurrency),
      subtitle: `across ${allIncomes.length} transaction${allIncomes.length !== 1 ? 's' : ''}`,
      dotColor: 'bg-purple-500',
    },
  ];

  // Deletions require the lock screen password, which the server action
  // re-verifies before deleting.
  const deleteItem = useGatedAction(
    (appLockPassword: string, itemId: number) => handleDeleteItem(appLockPassword, itemId),
    {
      title: 'Delete income',
      description: 'This cannot be undone. Enter your lock screen password to delete this income.',
      confirmLabel: 'Delete income',
    },
  );

  const bulkDeleteItems = useGatedAction(
    (appLockPassword: string, visibleIds: number[]) => handleBulkDelete(appLockPassword, visibleIds),
    {
      title: 'Delete selected incomes',
      description: 'This cannot be undone. Enter your lock screen password to delete the selected incomes.',
      confirmLabel: 'Delete incomes',
    },
  );

  if (itemsError) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6" role="alert">
        <h1 className="sr-only">Incomes</h1>
        <p className="my-3 text-sm text-gray-700">Couldn’t load transactions.</p>
        <button type="button" onClick={() => void retryItems()} disabled={itemsFetching} className={primaryButton}>
          {itemsFetching ? "Retrying…" : "Try again"}
        </button>
      </section>
    );
  }

  if (isLoading) {
    return (
      <div className={loadingContainer} role="status">
        <div className={loadingSpinner} aria-hidden="true" />
        <p className={loadingText}>Loading incomes...</p>
      </div>
    );
  }


  return (
    <div className={pageContainer}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="sr-only">Incomes</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setIsAddModalOpen(true)} className={primaryButton}>Add Income</button>
          <button onClick={() => setIsAddCategoryModalOpen(true)} className={primaryButton}>Manage Categories</button>
          <button style={{ display: "none" }} onClick={() => setIsBulkImportModalOpen(true)} className={secondaryBlueButton}>Import CSV</button>
          <button style={{ display: "none" }} onClick={() => handleExportToCSV(filteredIncomes)} disabled={filteredIncomes.length === 0} className={`${secondaryGreenButton} disabled:opacity-50`}>Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.title} className={`${cardLargeContainer} relative min-w-0`}>
            <div className={`absolute top-4 left-4 w-3 h-3 rounded-full ${card.dotColor}`}></div>
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>{card.title}</h3>
              <p className={`${cardValue} ${card.title === 'Incomes in View' ? 'text-green-600' : 'text-black'} mb-1`}>{card.value}</p>
              <p className={`${cardSubtitle} ${card.subtitleColor || 'text-gray-500'}`}>{card.subtitle}</p>
              {card.tooltipText && <p className="mt-2 text-xs text-gray-500">{card.tooltipText}</p>}
            </div>
          </div>
        ))}
      </div>

      <FinancialAreaChart {...chartProps} />

      <TransactionCategoryAnalysis
        type="income"
        transactions={filteredIncomes}
        timeframeTransactions={itemsWithoutDateFilter}
        currency={userCurrency}
        timezone={userTimezone}
      />

      <FinancialFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedBanks={selectedBanks}
        onBanksChange={setSelectedBanks}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        categories={categories}
        uniqueBankNames={uniqueBankNames}
        onClearFilters={clearFilters}
        itemType="income"
        hasActiveFilters={hasActiveFilters}
        showBookmarkedOnly={showBookmarkedOnly}
        onShowBookmarkedOnlyChange={setShowBookmarkedOnly}
      />

      {hasActiveFilters ? (
        <p className="text-sm text-gray-600">Showing matches across all months.</p>
      ) : (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <MonthNavigation
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={handleMonthChange}
          />
          <button
            type="button"
            onClick={() => setIsMonthFilterActive(!isMonthFilterActive)}
            className="rounded-md px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-800"
          >
            {isMonthFilterActive ? "Show All Incomes" : "Show Selected Month"}
          </button>
        </div>
      )}

      <div role="group" aria-label="Income table category" className="flex flex-wrap gap-2 border-b">
        {[
          { value: null, label: "All" },
          ...tabCategories.map(({ id, name }) => ({ value: id, label: name })),
        ].map(({ value, label }) => (
          <button
            key={value ?? "all"}
            type="button"
            aria-pressed={activeIncomeTab === value}
            onClick={() => setIncomeTab(value)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              activeIncomeTab === value
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-600 hover:text-blue-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Suspense fallback={<div>Loading incomes...</div>}>
        <IncomeList
          incomes={tableIncomes}
          currency={userCurrency}
          onEdit={openEditModal}
          onView={openViewModal}
          onDelete={(item) => void deleteItem(item.id)}
          onBookmark={handleBookmarkToggle}
          onRefresh={invalidateQueries}
          selectedIncomes={visibleSelection}
          onIncomeSelect={handleItemSelect}
          onSelectAll={(selected) => handleSelectAll(selected, tableIncomes)}
          showBulkActions={true}
          onBulkDelete={isBulkDeleting ? undefined : (ids) => void bulkDeleteItems(ids)}
          onClearSelection={() => handleSelectAll(false)}
        />
      </Suspense>

      <AddIncomeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddItem} categories={categoriesWithFrequency} accounts={accounts} />
      <EditIncomeModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setItemToEdit(null); }} onEdit={handleEditItem} categories={categoriesWithFrequency} accounts={accounts} income={itemToEdit} />
      <ViewIncomeModal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setItemToView(null); }} onEdit={openEditModal} income={itemToView} />
      <AddCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        onAdd={handleAddCategory}
        onDelete={handleDeleteCategory}
        onUpdate={handleUpdateCategory}
        onCategoryTabChange={(id, enabled) => categoryTabMutation.mutate({ id, enabled }, {
          onSuccess: () => {
            if (!enabled) setIncomeTab((current) => current === id ? null : current);
          },
        })}
        isSavingCategoryTab={categoryTabMutation.isPending}
        type="INCOME"
        categories={categories}
      />
      <UnifiedBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onSuccess={handleBulkImportSuccess}
        config={incomeImportConfig}
      />
      <DisappearingNotification notification={notification} onHide={() => setNotification(null)} />
    </div>
  );
}


