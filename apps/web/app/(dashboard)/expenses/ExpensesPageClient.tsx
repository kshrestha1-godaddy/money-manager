"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOptimizedFinancialData } from '../../hooks/useOptimizedFinancialData';
import { ExpenseList } from './components/ExpenseList';
import { AddExpenseModal } from './components/AddExpenseModal';
import { EditExpenseModal } from './components/EditExpenseModal';
import { ViewExpenseModal } from './components/ViewExpenseModal';
import { ExpenseFrequencyCharts } from './components/ExpenseFrequencyCharts';
import { UnifiedBulkImportModal } from '../../components/shared/UnifiedBulkImportModal';
import { expenseImportConfig } from '../../config/bulkImportConfig';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { AddCategoryModal } from '../../components/category/AddCategoryModal';
import { TransactionCategoryAnalysis } from "../../components/shared/TransactionCategoryAnalysis";
import { FinancialAreaChart } from '../../components/FinancialAreaChart';
import { FinancialFilters } from '../../components/shared/FinancialFilters';
import { MonthNavigation } from '../../components/shared/MonthNavigation';
import { formatCurrency } from '../../utils/currency';
import { getExpenses, createExpense, updateExpense, deleteExpense, bulkDeleteExpenses } from './actions/expenses';
import { exportExpensesToCSV } from '../../utils/csvExportExpenses';
import { createTransactionBookmark, deleteTransactionBookmarkByTransaction } from '../transactions/actions/transaction-bookmarks';
import { Expense } from '../../types/financial';
import { useCurrency } from '../../providers/CurrencyProvider';
import { getTransactionPeriodTotals } from "../../utils/transaction-period-totals";
import { createTransactionDayFormatter, getVisibleSelection } from "../../utils/transaction-calendar";
import { useTimezone } from '../../providers/TimezoneProvider';
import { DisappearingNotification, NotificationData } from '../../components/DisappearingNotification';
import { convertForDisplaySync } from '../../utils/currencyDisplay';
import { getCategoriesWithFrequency, CategoryWithFrequencyData } from '../../utils/categoryFrequency';
import {
  BUTTON_COLORS,
  TEXT_COLORS,
  CONTAINER_COLORS,
  LOADING_COLORS,
} from '../../config/colorConfig';

const pageContainer = CONTAINER_COLORS.page;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;
const cardLargeContainer = CONTAINER_COLORS.cardLarge;
const cardTitle = TEXT_COLORS.cardTitle;
const cardValue = TEXT_COLORS.cardValue;
const cardSubtitle = TEXT_COLORS.cardSubtitle;
const pageTitle = TEXT_COLORS.title;
const primaryButton = BUTTON_COLORS.primary;
const secondaryBlueButton = BUTTON_COLORS.secondaryBlue;
const secondaryGreenButton = BUTTON_COLORS.secondaryGreen;

export default function ExpensesPageClient() {
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

  // Month navigation handler
  const handleMonthChange = (month: number, year: number) => {
    setMonthOverride({ month, year });
    setIsMonthFilterActive(true);
  };

  const {
    items: expenses,
    itemsWithoutDateFilter,
    allItems: allExpenses,
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
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isAddCategoryModalOpen,
    setIsAddCategoryModalOpen,
    isBulkImportModalOpen,
    setIsBulkImportModalOpen,
    selectedItems,
    itemToEdit,
    setItemToEdit,
    itemToView,
    setItemToView,
    itemToDelete,
    setItemToDelete,
    handleAddItem,
    handleEditItem,
    handleDeleteItem,
    handleAddCategory,
    handleDeleteCategory,
    openEditModal,
    openViewModal,
    openDeleteModal,
    handleItemSelect,
    handleSelectAll,
    handleBulkDelete,
    handleBulkImportSuccess,
    handleExportToCSV,
    searchTerm,
    setSearchTerm,
    selectedCategories,
    setSelectedCategories,
    selectedBank,
    setSelectedBank,
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
  } = useOptimizedFinancialData<Expense>('EXPENSE', {
    getItems: getExpenses,
    createItem: createExpense,
    updateItem: updateExpense,
    deleteItem: deleteExpense,
    bulkDeleteItems: bulkDeleteExpenses,
    exportToCSV: exportExpensesToCSV,
  }, {
    onNotification: setNotification,
    userCurrency: userCurrency,
    userTimezone
  });

  // Resolve linked expenses from the full dataset, regardless of active month or filters.
  const openedExpenseLink = useRef<string | null>(null);
  const linkedExpenseId = searchParams.get('view');
  useEffect(() => {
    if (!linkedExpenseId) {
      openedExpenseLink.current = null;
      return;
    }
    if (!/^\d+$/.test(linkedExpenseId) || openedExpenseLink.current === linkedExpenseId) return;
    const expense = allExpenses.find(item => item.id === Number(linkedExpenseId));
    if (!expense) return;
    openedExpenseLink.current = linkedExpenseId;
    openViewModal(expense);
  }, [linkedExpenseId, allExpenses, openViewModal]);

  // Sort categories by frequency for the add/edit modals (last 6 months)
  const categoriesWithFrequency = useMemo(() => {
    return getCategoriesWithFrequency(categories, allExpenses);
  }, [categories, allExpenses]);

  const handleBookmarkToggle = async (expense: Expense) => {
    try {
      if (expense.isBookmarked) {
        await deleteTransactionBookmarkByTransaction('EXPENSE', expense.id);
      } else {
        await createTransactionBookmark({
          transactionType: 'EXPENSE',
          transactionId: expense.id,
          title: expense.title,
          description: expense.description || undefined,
          notes: expense.notes || undefined,
          tags: expense.tags || [],
        });
      }
      invalidateQueries();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      invalidateQueries();
    }
  };

  const filteredExpenses = useMemo(() => {
    if (hasActiveFilters || !isMonthFilterActive) return expenses;
    const month = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
    return expenses.filter((transaction) => getTransactionDay(transaction.date).startsWith(month));
  }, [expenses, hasActiveFilters, isMonthFilterActive, selectedMonth, selectedYear, getTransactionDay]);
  const visibleSelection = useMemo(
    () => getVisibleSelection(filteredExpenses, selectedItems),
    [filteredExpenses, selectedItems]
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
      allExpenses,
      getTransactionDay,
      (item) => convertForDisplaySync(item.amount, item.currency, userCurrency),
      currentYear,
      currentMonth
    ),
    [allExpenses, getTransactionDay, userCurrency, currentYear, currentMonth]
  );
  const currentQuarter = Math.floor(currentMonth / 3);
  const lastMonth = (currentMonth + 11) % 12;
  const monthlyChange = periods.previousMonth.amount > 0
    ? ((periods.currentMonth.amount - periods.previousMonth.amount) / periods.previousMonth.amount) * 100
    : null;
  const quarterlyChange = periods.previousQuarter.amount > 0
    ? ((periods.currentQuarter.amount - periods.previousQuarter.amount) / periods.previousQuarter.amount) * 100
    : null;
  const averagePerExpense = periods.allTime.count ? periods.allTime.amount / periods.allTime.count : 0;

  const chartProps = useMemo(
    () => ({
      data: expenses,
      currency: userCurrency,
      timezone: userTimezone,
      type: 'expense' as const,
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
    [expenses, userCurrency, userTimezone, hasActiveFilters, startDate, endDate, userThresholds, thresholdsLoading]
  );

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
  const currentMonthName = monthNames[currentMonth];
  const currentQuarterName = quarterNames[currentQuarter];

  const visibleTotal = useMemo(
    () => filteredExpenses.reduce((total, item) => total + convertForDisplaySync(item.amount, item.currency, userCurrency), 0),
    [filteredExpenses, userCurrency]
  );

  const summaryCards = [
    {
      title: 'Expenses in View',
      value: formatCurrency(visibleTotal, userCurrency),
      subtitle: `${filteredExpenses.length} transaction${filteredExpenses.length !== 1 ? 's' : ''}`,
      dotColor: 'bg-red-500'
    },
    {
      title: `This Month (${currentMonthName})`,
      value: formatCurrency(periods.currentMonth.amount, userCurrency),
      subtitle: `${periods.currentMonth.count} transaction${periods.currentMonth.count !== 1 ? 's' : ''}${monthlyChange === null ? '' : ` • ${(monthlyChange ?? 0) >= 0 ? '+' : ''}${monthlyChange.toFixed(1)}%`}`,
      subtitleColor: (monthlyChange ?? 0) >= 0 ? 'text-red-600' : 'text-green-600',
      dotColor: (monthlyChange ?? 0) >= 0 ? 'bg-red-500' : 'bg-green-500',
      tooltipText: `Last month (${monthNames[lastMonth]}): ${formatCurrency(periods.previousMonth.amount, userCurrency)} (${periods.previousMonth.count} transaction${periods.previousMonth.count !== 1 ? 's' : ''})`
    },
    {
      title: `${currentQuarterName} (${currentQuarterName === 'Q1' ? 'Jan-Mar' : currentQuarterName === 'Q2' ? 'Apr-Jun' : currentQuarterName === 'Q3' ? 'Jul-Sep' : 'Oct-Dec'})`,
      value: formatCurrency(periods.currentQuarter.amount, userCurrency),
      subtitle: `${periods.currentQuarter.count} transaction${periods.currentQuarter.count !== 1 ? 's' : ''}${quarterlyChange === null ? '' : ` • ${(quarterlyChange ?? 0) >= 0 ? '+' : ''}${quarterlyChange.toFixed(1)}%`}`,
      subtitleColor: (quarterlyChange ?? 0) >= 0 ? 'text-red-600' : 'text-green-600',
      dotColor: (quarterlyChange ?? 0) >= 0 ? 'bg-red-500' : 'bg-green-500',
      tooltipText: `Last quarter (${quarterNames[currentQuarter === 0 ? 3 : currentQuarter - 1]}): ${formatCurrency(periods.previousQuarter.amount, userCurrency)} (${periods.previousQuarter.count} transaction${periods.previousQuarter.count !== 1 ? 's' : ''})`
    },
    {
      title: 'Average per Transaction',
      value: formatCurrency(averagePerExpense, userCurrency),
      subtitle: `across ${allExpenses.length} transaction${allExpenses.length !== 1 ? 's' : ''}`,
      dotColor: 'bg-orange-500',
    },
  ];

  if (itemsError) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6" role="alert">
        <h1 className={pageTitle}>Expenses</h1>
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
        <p className={loadingText}>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className={pageContainer}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageTitle}>Expenses</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setIsAddModalOpen(true)} className={primaryButton}>Add Expense</button>
          <button onClick={() => setIsAddCategoryModalOpen(true)} className={primaryButton}>Manage Categories</button>
          <button onClick={() => setIsBulkImportModalOpen(true)} className={secondaryBlueButton}>Import CSV</button>
          <button onClick={() => handleExportToCSV(filteredExpenses)} disabled={filteredExpenses.length === 0} className={`${secondaryGreenButton} disabled:opacity-50`}>Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.title} className={`${cardLargeContainer} relative min-w-0`}>
            <div className={`absolute top-4 left-4 w-3 h-3 rounded-full ${card.dotColor}`}></div>
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>{card.title}</h3>
              <p className={`${cardValue} ${card.title === 'Expenses in View' ? 'text-red-600' : 'text-black'} mb-1`}>{card.value}</p>
              <p className={`${cardSubtitle} ${card.subtitleColor || 'text-gray-500'}`}>{card.subtitle}</p>
              {card.tooltipText && <p className="mt-2 text-xs text-gray-500">{card.tooltipText}</p>}
            </div>
          </div>
        ))}
      </div>

      <FinancialAreaChart {...chartProps} />

      <ExpenseFrequencyCharts expenses={filteredExpenses} />

      <TransactionCategoryAnalysis
        type="expense"
        transactions={filteredExpenses}
        timeframeTransactions={itemsWithoutDateFilter}
        currency={userCurrency}
        timezone={userTimezone}
      />

      <FinancialFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedBank={selectedBank}
        onBankChange={setSelectedBank}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        categories={categories}
        uniqueBankNames={uniqueBankNames}
        onClearFilters={clearFilters}
        itemType="expense"
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
            {isMonthFilterActive ? "Show All Expenses" : "Show Selected Month"}
          </button>
        </div>
      )}

      <Suspense fallback={<div>Loading expenses...</div>}>
        <ExpenseList
          expenses={filteredExpenses}
          currency={userCurrency}
          onEdit={openEditModal}
          onView={openViewModal}
          onDelete={openDeleteModal}
          onBookmark={handleBookmarkToggle}
          onRefresh={invalidateQueries}
          selectedExpenses={visibleSelection}
          onExpenseSelect={handleItemSelect}
          onSelectAll={(selected) => handleSelectAll(selected, filteredExpenses)}
          showBulkActions={true}
          onBulkDelete={isBulkDeleting ? undefined : handleBulkDelete}
          onClearSelection={() => handleSelectAll(false)}
        />
      </Suspense>

      <AddExpenseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddItem} categories={categoriesWithFrequency} accounts={accounts} expenses={allExpenses} />
      <EditExpenseModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setItemToEdit(null); }} onEdit={handleEditItem} categories={categoriesWithFrequency} accounts={accounts} expense={itemToEdit} />
      <ViewExpenseModal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setItemToView(null); }} onEdit={openEditModal} expense={itemToView} />
      <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }} onConfirm={handleDeleteItem} />
      <AddCategoryModal isOpen={isAddCategoryModalOpen} onClose={() => setIsAddCategoryModalOpen(false)} onAdd={handleAddCategory} onDelete={handleDeleteCategory} type="EXPENSE" categories={categories} />
      <UnifiedBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onSuccess={handleBulkImportSuccess}
        config={expenseImportConfig}
      />

      {/* Disappearing Notification */}
      <DisappearingNotification
        notification={notification}
        onHide={() => setNotification(null)}
      />
    </div>
  );
}


