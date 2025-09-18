"use client";

import { Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Info } from 'lucide-react';
import { useOptimizedFinancialData } from '../../hooks/useOptimizedFinancialData';
import { ExpenseList } from './components/ExpenseList';
import { AddExpenseModal } from './components/AddExpenseModal';
import { EditExpenseModal } from './components/EditExpenseModal';
import { ViewExpenseModal } from './components/ViewExpenseModal';
import { UnifiedBulkImportModal } from '../../components/shared/UnifiedBulkImportModal';
import { expenseImportConfig } from '../../config/bulkImportConfig';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { AddCategoryModal } from '../../components/category/AddCategoryModal';
import { FinancialAreaChart } from '../../components/FinancialAreaChart';
import { FinancialFilters } from '../../components/shared/FinancialFilters';
import { formatCurrency } from '../../utils/currency';
import { getExpenses, createExpense, updateExpense, deleteExpense, bulkDeleteExpenses } from './actions/expenses';
import { exportExpensesToCSV } from '../../utils/csvExportExpenses';
import { createTransactionBookmark, deleteTransactionBookmarkByTransaction } from '../transactions/actions/transaction-bookmarks';
import { Expense } from '../../types/financial';
import { useCurrency } from '../../providers/CurrencyProvider';
import { useTimezone } from '../../providers/TimezoneProvider';
import { DisappearingNotification, NotificationData } from '../../components/DisappearingNotification';
import { useState } from 'react';
import { convertForDisplaySync } from '../../utils/currencyDisplay';
import {
  BUTTON_COLORS,
  TEXT_COLORS,
  CONTAINER_COLORS,
  LOADING_COLORS,
  UI_STYLES,
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
const pageSubtitle = TEXT_COLORS.subtitle;
const primaryButton = BUTTON_COLORS.primary;
const secondaryBlueButton = BUTTON_COLORS.secondaryBlue;
const secondaryGreenButton = BUTTON_COLORS.secondaryGreen;

export default function ExpensesPageClient() {
  const { currency: userCurrency } = useCurrency();
  const { timezone: userTimezone } = useTimezone();
  const searchParams = useSearchParams();
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const {
    items: expenses,
    allItems: allExpenses,
    chartItems,
    categories,
    accounts,
    loading: isLoading,
    totalAmount: totalExpenseAmount,
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
    selectedCategory,
    setSelectedCategory,
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
  } = useOptimizedFinancialData<Expense>('EXPENSE', {
    getItems: getExpenses,
    createItem: createExpense,
    updateItem: updateExpense,
    deleteItem: deleteExpense,
    bulkDeleteItems: bulkDeleteExpenses,
    exportToCSV: exportExpensesToCSV,
  }, {
    onNotification: setNotification,
    userCurrency: userCurrency
  });

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

  useEffect(() => {
    if (searchParams.get('action') === 'add') setIsAddModalOpen(true);
    
    // Handle date filter URL parameters
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');
    
    if (urlStartDate) {
      setStartDate(urlStartDate);
    }
    if (urlEndDate) {
      setEndDate(urlEndDate);
    }
  }, [searchParams, setIsAddModalOpen, setStartDate, setEndDate]);

  // Use timezone-aware date calculations to match notification system
  const now = new Date();
  const nowInUserTimezone = new Date(now.toLocaleString("en-US", { timeZone: userTimezone }));
  const currentMonth = nowInUserTimezone.getMonth();
  const currentYear = nowInUserTimezone.getFullYear();
  const currentQuarter = Math.floor(currentMonth / 3);
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthExpenses = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      const expenseDateInUserTimezone = new Date(expenseDate.toLocaleString("en-US", { timeZone: userTimezone }));
      return expenseDateInUserTimezone.getMonth() === currentMonth && expenseDateInUserTimezone.getFullYear() === currentYear;
    })
    .reduce((sum: number, expense: Expense) => sum + convertForDisplaySync(expense.amount, expense.currency, userCurrency), 0);

  const lastMonthExpenses = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      const expenseDateInUserTimezone = new Date(expenseDate.toLocaleString("en-US", { timeZone: userTimezone }));
      return expenseDateInUserTimezone.getMonth() === lastMonth && expenseDateInUserTimezone.getFullYear() === lastMonthYear;
    })
    .reduce((sum: number, expense: Expense) => sum + convertForDisplaySync(expense.amount, expense.currency, userCurrency), 0);

  const currentQuarterExpenses = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      const expenseDateInUserTimezone = new Date(expenseDate.toLocaleString("en-US", { timeZone: userTimezone }));
      const expenseQuarter = Math.floor(expenseDateInUserTimezone.getMonth() / 3);
      return expenseQuarter === currentQuarter && expenseDateInUserTimezone.getFullYear() === currentYear;
    })
    .reduce((sum: number, expense: Expense) => sum + convertForDisplaySync(expense.amount, expense.currency, userCurrency), 0);

  const lastQuarterExpenses = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      const expenseDateInUserTimezone = new Date(expenseDate.toLocaleString("en-US", { timeZone: userTimezone }));
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const lastQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear;
      const expenseQuarter = Math.floor(expenseDateInUserTimezone.getMonth() / 3);
      return expenseQuarter === lastQuarter && expenseDateInUserTimezone.getFullYear() === lastQuarterYear;
    })
    .reduce((sum: number, expense: Expense) => sum + convertForDisplaySync(expense.amount, expense.currency, userCurrency), 0);

  const monthlyChange = lastMonthExpenses > 0 ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;
  const quarterlyChange = lastQuarterExpenses > 0 ? ((currentQuarterExpenses - lastQuarterExpenses) / lastQuarterExpenses) * 100 : 0;
  const averagePerExpense = allExpenses.length > 0 ? allExpenses.reduce((sum: number, expense: Expense) => sum + convertForDisplaySync(expense.amount, expense.currency, userCurrency), 0) / allExpenses.length : 0;

  const chartProps = useMemo(
    () => ({
      data: chartItems,
      currency: userCurrency,
      type: 'expense' as const,
      hasPageFilters: hasActiveFilters,
      pageStartDate: startDate,
      pageEndDate: endDate,
    }),
    [chartItems, userCurrency, hasActiveFilters, startDate, endDate]
  );

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
  const currentMonthName = monthNames[currentMonth];
  const currentQuarterName = quarterNames[currentQuarter];

  const summaryCards = [
    { title: 'Total Expenses', value: formatCurrency(totalExpenseAmount, userCurrency), subtitle: `${allExpenses.length} expense records`, dotColor: 'bg-red-500' },
    { title: `This Month (${currentMonthName})`, value: formatCurrency(currentMonthExpenses, userCurrency), subtitle: `${monthlyChange >= 0 ? '+' : ''}${monthlyChange.toFixed(1)}%`, subtitleColor: monthlyChange >= 0 ? 'text-red-600' : 'text-green-600', dotColor: monthlyChange >= 0 ? 'bg-red-500' : 'bg-green-500', hasPercentage: true, tooltipText: `Compared to last month (${monthNames[lastMonth]}): ${formatCurrency(lastMonthExpenses, userCurrency)}` },
    { title: `${currentQuarterName} (${currentQuarterName === 'Q1' ? 'Jan-Mar' : currentQuarterName === 'Q2' ? 'Apr-Jun' : currentQuarterName === 'Q3' ? 'Jul-Sep' : 'Oct-Dec'})`, value: formatCurrency(currentQuarterExpenses, userCurrency), subtitle: `${quarterlyChange >= 0 ? '+' : ''}${quarterlyChange.toFixed(1)}%`, subtitleColor: quarterlyChange >= 0 ? 'text-red-600' : 'text-green-600', dotColor: quarterlyChange >= 0 ? 'bg-red-500' : 'bg-green-500', hasPercentage: true, tooltipText: `Compared to last quarter (${quarterNames[currentQuarter === 0 ? 3 : currentQuarter - 1]}): ${formatCurrency(lastQuarterExpenses, userCurrency)}` },
    { title: 'Average per Transaction', value: formatCurrency(averagePerExpense, userCurrency), subtitle: `across ${allExpenses.length} records`, dotColor: 'bg-orange-500', hasPercentage: true, tooltipText: 'Average amount of income per transaction' },
  ];

  if (isLoading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner}></div>
        <p className={loadingText}>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className={pageContainer}>
      <div className={UI_STYLES.header.container}>
        <div>
          <h1 className={pageTitle}>Expenses</h1>
          <p className={pageSubtitle}>Track and manage your expenses</p>
        </div>
        <div className={UI_STYLES.header.buttonGroup}>
          <button onClick={() => setIsAddModalOpen(true)} className={primaryButton}>Add Expense</button>
          <button onClick={() => setIsAddCategoryModalOpen(true)} className={primaryButton}>Add Category</button>
          <button onClick={() => setIsBulkImportModalOpen(true)} className={secondaryBlueButton}>Import CSV</button>
          <button onClick={handleExportToCSV} disabled={allExpenses.length === 0} className={`${secondaryGreenButton} disabled:opacity-50`}>Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-6">
        {summaryCards.map((card: any, index: number) => (
          <div key={index} className={`${cardLargeContainer} relative`}>
            <div className={`absolute top-4 left-4 w-3 h-3 rounded-full ${card.dotColor}`}></div>
            {card.hasPercentage && card.tooltipText && (
              <div className="absolute top-4 right-4">
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    {card.tooltipText}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>{card.title}</h3>
              <p className={`${cardValue} ${card.title.includes('Total') ? 'text-red-600' : 'text-black'} mb-1`}>{card.value}</p>
              <p className={`${cardSubtitle} ${card.subtitleColor || 'text-gray-500'}`}>{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <FinancialAreaChart {...chartProps} />

      <FinancialFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
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

      <Suspense fallback={<div>Loading expenses...</div>}>
        <ExpenseList
          expenses={expenses}
          currency={userCurrency}
          onEdit={openEditModal}
          onView={openViewModal}
          onDelete={openDeleteModal}
          onBookmark={handleBookmarkToggle}
          selectedExpenses={selectedItems}
          onExpenseSelect={handleItemSelect}
          onSelectAll={handleSelectAll}
          showBulkActions={true}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => handleSelectAll(false)}
        />
      </Suspense>

      <AddExpenseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddItem} categories={categories} accounts={accounts} />
      <EditExpenseModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setItemToEdit(null); }} onEdit={handleEditItem} categories={categories} accounts={accounts} expense={itemToEdit} />
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


