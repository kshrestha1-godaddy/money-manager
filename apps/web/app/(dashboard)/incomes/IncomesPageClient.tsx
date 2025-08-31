"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Info } from 'lucide-react';
import { useOptimizedFinancialData } from '../../hooks/useOptimizedFinancialData';
import { IncomeList, AddIncomeModal, EditIncomeModal, ViewIncomeModal } from './components';
import { UnifiedBulkImportModal } from '../../components/shared/UnifiedBulkImportModal';
import { incomeImportConfig } from '../../config/bulkImportConfig';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { AddCategoryModal } from '../../components/category/AddCategoryModal';
import { FinancialAreaChart } from '../../components/FinancialAreaChart';
import { FinancialFilters } from '../../components/shared/FinancialFilters';
import { formatCurrency } from '../../utils/currency';
import { getIncomes, createIncome, updateIncome, deleteIncome, bulkDeleteIncomes } from './actions/incomes';
import { exportIncomesToCSV } from '../../utils/csvExportIncomes';
import { createTransactionBookmark, deleteTransactionBookmarkByTransaction } from '../transactions/actions/transaction-bookmarks';
import { Income } from '../../types/financial';
import { useCurrency } from '../../providers/CurrencyProvider';
import { DisappearingNotification, NotificationData } from '../../components/DisappearingNotification';
import { BUTTON_COLORS, TEXT_COLORS, CONTAINER_COLORS, LOADING_COLORS, UI_STYLES } from '../../config/colorConfig';

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

export default function IncomesPageClient() {
  const { currency: userCurrency } = useCurrency();
  const searchParams = useSearchParams();
  const [notification, setNotification] = useState<NotificationData | null>(null);

  const {
    items: incomes,
    allItems: allIncomes,
    chartItems,
    categories,
    accounts,
    loading: isLoading,
    totalAmount,
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
  } = useOptimizedFinancialData<Income>('INCOME', {
    getItems: getIncomes,
    createItem: createIncome,
    updateItem: updateIncome,
    deleteItem: deleteIncome,
    bulkDeleteItems: bulkDeleteIncomes,
    exportToCSV: exportIncomesToCSV,
  }, {
    onNotification: setNotification,
    userCurrency: userCurrency
  });

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

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(currentMonth / 3);
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthIncomes = allIncomes
    .filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear;
    })
    .reduce((sum: number, income: Income) => sum + income.amount, 0);

  const lastMonthIncomes = allIncomes
    .filter(income => {
      const incomeDate = new Date(income.date);
      return incomeDate.getMonth() === lastMonth && incomeDate.getFullYear() === lastMonthYear;
    })
    .reduce((sum: number, income: Income) => sum + income.amount, 0);

  const currentQuarterIncomes = allIncomes
    .filter(income => {
      const incomeDate = new Date(income.date);
      const incomeQuarter = Math.floor(incomeDate.getMonth() / 3);
      return incomeQuarter === currentQuarter && incomeDate.getFullYear() === currentYear;
    })
    .reduce((sum: number, income: Income) => sum + income.amount, 0);

  const lastQuarterIncomes = allIncomes
    .filter(income => {
      const incomeDate = new Date(income.date);
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
      const lastQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear;
      const incomeQuarter = Math.floor(incomeDate.getMonth() / 3);
      return incomeQuarter === lastQuarter && incomeDate.getFullYear() === lastQuarterYear;
    })
    .reduce((sum: number, income: Income) => sum + income.amount, 0);

  const monthlyChange = lastMonthIncomes > 0 ? ((currentMonthIncomes - lastMonthIncomes) / lastMonthIncomes) * 100 : 0;
  const quarterlyChange = lastQuarterIncomes > 0 ? ((currentQuarterIncomes - lastQuarterIncomes) / lastQuarterIncomes) * 100 : 0;
  const averagePerIncome = allIncomes.length > 0 ? allIncomes.reduce((sum: number, income: Income) => sum + income.amount, 0) / allIncomes.length : 0;

  const chartProps = useMemo(
    () => ({
      data: chartItems,
      currency: userCurrency,
      type: 'income' as const,
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
    { title: 'Total Incomes', value: formatCurrency(totalAmount, userCurrency), subtitle: `${allIncomes.length} income records`, dotColor: 'bg-green-500' },
    { title: `This Month (${currentMonthName})`, value: formatCurrency(currentMonthIncomes, userCurrency), subtitle: `${monthlyChange >= 0 ? '+' : ''}${monthlyChange.toFixed(1)}%`, subtitleColor: monthlyChange >= 0 ? 'text-green-600' : 'text-red-600', dotColor: monthlyChange >= 0 ? 'bg-green-500' : 'bg-red-500', hasPercentage: true, tooltipText: `Compared to last month (${monthNames[lastMonth]}): ${formatCurrency(lastMonthIncomes, userCurrency)}` },
    { title: `${currentQuarterName} (${currentQuarterName === 'Q1' ? 'Jan-Mar' : currentQuarterName === 'Q2' ? 'Apr-Jun' : currentQuarterName === 'Q3' ? 'Jul-Sep' : 'Oct-Dec'})`, value: formatCurrency(currentQuarterIncomes, userCurrency), subtitle: `${quarterlyChange >= 0 ? '+' : ''}${quarterlyChange.toFixed(1)}%`, subtitleColor: quarterlyChange >= 0 ? 'text-green-600' : 'text-red-600', dotColor: quarterlyChange >= 0 ? 'bg-green-500' : 'bg-red-500', hasPercentage: true, tooltipText: `Compared to last quarter (${quarterNames[currentQuarter === 0 ? 3 : currentQuarter - 1]}): ${formatCurrency(lastQuarterIncomes, userCurrency)}` },
    { title: 'Average per Transaction', value: formatCurrency(averagePerIncome, userCurrency), subtitle: `across ${allIncomes.length} records`, dotColor: 'bg-purple-500', hasPercentage: true, tooltipText: 'Average amount of income per transaction' },
  ];

  if (isLoading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner}></div>
        <p className={loadingText}>Loading incomes...</p>
      </div>
    );
  }

  return (
    <div className={pageContainer}>
      <div className={UI_STYLES.header.container}>
        <div>
          <h1 className={pageTitle}>Incomes</h1>
          <p className={pageSubtitle}>Track and manage your income sources</p>
        </div>
        <div className={UI_STYLES.header.buttonGroup}>
          <button onClick={() => setIsAddModalOpen(true)} className={primaryButton}>Add Income</button>
          <button onClick={() => setIsAddCategoryModalOpen(true)} className={primaryButton}>Add Category</button>
          <button onClick={() => setIsBulkImportModalOpen(true)} className={secondaryBlueButton}>Import CSV</button>
          <button onClick={handleExportToCSV} disabled={allIncomes.length === 0} className={`${secondaryGreenButton} disabled:opacity-50`}>Export CSV</button>
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
              <p className={`${cardValue} ${card.title.includes('Total') ? 'text-green-600' : 'text-black'} mb-1`}>{card.value}</p>
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
        itemType="income"
        hasActiveFilters={hasActiveFilters}
        showBookmarkedOnly={showBookmarkedOnly}
        onShowBookmarkedOnlyChange={setShowBookmarkedOnly}
      />

      <Suspense fallback={<div>Loading incomes...</div>}>
        <IncomeList
          incomes={incomes}
          currency={userCurrency}
          onEdit={openEditModal}
          onView={openViewModal}
          onDelete={openDeleteModal}
          onBookmark={handleBookmarkToggle}
          selectedIncomes={selectedItems}
          onIncomeSelect={handleItemSelect}
          onSelectAll={handleSelectAll}
          showBulkActions={true}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => handleSelectAll(false)}
        />
      </Suspense>

      <AddIncomeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddItem} categories={categories} accounts={accounts} />
      <EditIncomeModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setItemToEdit(null); }} onEdit={handleEditItem} categories={categories} accounts={accounts} income={itemToEdit} />
      <ViewIncomeModal isOpen={isViewModalOpen} onClose={() => { setIsViewModalOpen(false); setItemToView(null); }} onEdit={openEditModal} income={itemToView} />
      <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }} onConfirm={handleDeleteItem} />
      <AddCategoryModal isOpen={isAddCategoryModalOpen} onClose={() => setIsAddCategoryModalOpen(false)} onAdd={handleAddCategory} onDelete={handleDeleteCategory} type="INCOME" categories={categories} />
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


