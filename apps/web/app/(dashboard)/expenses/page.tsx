"use client";

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Info } from 'lucide-react'
import { useOptimizedFinancialData } from '../../hooks/useOptimizedFinancialData'
import { ExpenseList } from '../../components/expenses/ExpenseList'
import { AddExpenseModal } from '../../components/expenses/AddExpenseModal'
import { EditExpenseModal } from '../../components/expenses/EditExpenseModal'
import { ViewExpenseModal } from '../../components/expenses/ViewExpenseModal'
import { BulkImportModal } from '../../components/expenses/BulkImportModal'
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal'
import { AddCategoryModal } from '../../components/AddCategoryModal'
import { FinancialAreaChart } from '../../components/FinancialAreaChart'
import { FinancialFilters } from '../../components/shared/FinancialFilters'
import { formatCurrency } from '../../utils/currency'
import { getExpenses, createExpense, updateExpense, deleteExpense, bulkDeleteExpenses } from '../../actions/expenses'
import { exportExpensesToCSV } from '../../utils/csvExportExpenses'
import { createTransactionBookmark, deleteTransactionBookmarkByTransaction } from '../../actions/transaction-bookmarks'
import { Expense } from '../../types/financial'
import { useCurrency } from '../../providers/CurrencyProvider'
import { 
    getSummaryCardClasses,
    BUTTON_COLORS,
    TEXT_COLORS,
    CONTAINER_COLORS,
    LOADING_COLORS,
    UI_STYLES,
} from '../../config/colorConfig'

// Extract color variables for better readability
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

function ExpensesContent() {
  const { currency: userCurrency } = useCurrency()
  const searchParams = useSearchParams()
  
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
    // Modal states
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
    // Selected items
    selectedItems,
    itemToEdit,
    setItemToEdit,
    itemToView,
    setItemToView,
    itemToDelete,
    setItemToDelete,
    // Handlers
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
    // Filter states
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
    invalidateQueries
  } = useOptimizedFinancialData<Expense>("EXPENSE", {
    getItems: getExpenses,
    createItem: createExpense,
    updateItem: updateExpense,
    deleteItem: deleteExpense,
    bulkDeleteItems: bulkDeleteExpenses,
    exportToCSV: exportExpensesToCSV,
  })

  // Handle bookmark toggle
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
          tags: expense.tags || []
        });
      }
      
      // Invalidate queries to refetch data with updated bookmark status
      invalidateQueries();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      // Still refresh on error to ensure consistency
      invalidateQueries();
    }
  };

  // Handle URL action parameter
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsAddModalOpen(true)
    }
  }, [searchParams, setIsAddModalOpen])

  // Calculate monthly and quarterly data
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(currentMonth / 3)
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
  
  const currentMonthExpenses = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
    })
    .reduce((sum: number, expense: Expense) => sum + expense.amount, 0)
    
  const lastMonthExpenses = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate.getMonth() === lastMonth && expenseDate.getFullYear() === lastMonthYear
    })
    .reduce((sum: number, expense: Expense) => sum + expense.amount, 0)

  const currentQuarterExpenses = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date)
      const expenseQuarter = Math.floor(expenseDate.getMonth() / 3)
      return expenseQuarter === currentQuarter && expenseDate.getFullYear() === currentYear
    })
    .reduce((sum: number, expense: Expense) => sum + expense.amount, 0)

  const lastQuarterExpenses = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date)
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1
      const lastQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear
      const expenseQuarter = Math.floor(expenseDate.getMonth() / 3)
      return expenseQuarter === lastQuarter && expenseDate.getFullYear() === lastQuarterYear
    })
    .reduce((sum: number, expense: Expense) => sum + expense.amount, 0)

  const monthlyChange = lastMonthExpenses > 0 
    ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
    : 0

  const quarterlyChange = lastQuarterExpenses > 0
    ? ((currentQuarterExpenses - lastQuarterExpenses) / lastQuarterExpenses) * 100
    : 0

  const averagePerExpense = allExpenses.length > 0 
    ? allExpenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0) / allExpenses.length
    : 0

  // Get month names for better display
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const quarterNames = ["Q1", "Q2", "Q3", "Q4"]
  
  const currentMonthName = monthNames[currentMonth]
  const lastMonthName = currentMonth === 0 ? monthNames[11] : monthNames[currentMonth - 1]
  const currentQuarterName = quarterNames[currentQuarter]

  const summaryCards = [
    {
      title: "Total Expenses",
      value: formatCurrency(totalExpenseAmount, userCurrency),
      subtitle: `${allExpenses.length} expense records`,
      dotColor: "bg-red-500"
    },
    {
      title: `This Month (${currentMonthName})`,
      value: formatCurrency(currentMonthExpenses, userCurrency),
      subtitle: `${monthlyChange >= 0 ? '+' : ''}${monthlyChange.toFixed(1)}%`,
      subtitleColor: monthlyChange >= 0 ? "text-red-600" : "text-green-600",
      dotColor: monthlyChange >= 0 ? "bg-red-500" : "bg-green-500",
      hasPercentage: true,
      tooltipText: `Compared to last month (${monthNames[lastMonth]}): ${formatCurrency(lastMonthExpenses, userCurrency)}`
    },
    {
      title: `${currentQuarterName} (${currentQuarterName === "Q1" ? "Jan-Mar" : currentQuarterName === "Q2" ? "Apr-Jun" : currentQuarterName === "Q3" ? "Jul-Sep" : "Oct-Dec"})`,
      value: formatCurrency(currentQuarterExpenses, userCurrency),
      subtitle: `${quarterlyChange >= 0 ? '+' : ''}${quarterlyChange.toFixed(1)}%`,
      subtitleColor: quarterlyChange >= 0 ? "text-red-600" : "text-green-600",
      dotColor: quarterlyChange >= 0 ? "bg-red-500" : "bg-green-500",
      hasPercentage: true,
      tooltipText: `Compared to last quarter (${quarterNames[currentQuarter === 0 ? 3 : currentQuarter - 1]}): ${formatCurrency(lastQuarterExpenses, userCurrency)}`
    },
    {
      title: "Average per Transaction",
      value: formatCurrency(averagePerExpense, userCurrency),
      subtitle: `across ${allExpenses.length} records`,
      dotColor: "bg-orange-500"
    }
  ]

  // Loading state
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
      {/* Header */}
      <div className={UI_STYLES.header.container}>
        <div>
          <h1 className={pageTitle}>Expenses</h1>
          <p className={pageSubtitle}>Track and manage your expenses</p>
        </div>
          <div className={UI_STYLES.header.buttonGroup}>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className={primaryButton}
            >
              Add Expense
            </button>
            <button
              onClick={() => setIsAddCategoryModalOpen(true)}
              className={primaryButton}
            >
              Add Category
            </button>
            <button
              onClick={() => setIsBulkImportModalOpen(true)}
              className={secondaryBlueButton}
            >
              Import CSV
            </button>
            <button
              onClick={handleExportToCSV}
              disabled={allExpenses.length === 0}
              className={`${secondaryGreenButton} disabled:opacity-50`}
            >
              Export CSV
            </button>

          </div>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        {summaryCards.map((card, index) => (
          <div key={index} className={`${cardLargeContainer} relative`}>
            <div className={`absolute top-4 left-4 w-3 h-3 rounded-full ${card.dotColor}`}></div>
            {(card as any).hasPercentage && (card as any).tooltipText && (
              <div className="absolute top-4 right-4">
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    {(card as any).tooltipText}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col items-center justify-center h-full text-center pt-6">
              <h3 className={`${cardTitle} mb-2`}>{card.title}</h3>
              <p className={`${cardValue} ${card.title.includes('Total') ? 'text-red-600' : 'text-black'} mb-1`}>
                {isLoading ? '...' : card.value}
              </p>
              <p className={`${cardSubtitle} ${card.subtitleColor || 'text-gray-500'}`}>{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Area Chart */}
      <FinancialAreaChart 
        data={chartItems} 
        currency={userCurrency} 
        type="expense" 
        hasPageFilters={hasActiveFilters}
        pageStartDate={startDate}
        pageEndDate={endDate}
      />

      {/* Filters */}
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

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
        categories={categories}
        accounts={accounts}
      />

      {/* Edit Expense Modal */}
      <EditExpenseModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setItemToEdit(null)
        }}
        onEdit={handleEditItem}
        categories={categories}
        accounts={accounts}
        expense={itemToEdit}
      />

      {/* View Expense Modal */}
      <ViewExpenseModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setItemToView(null)
        }}
        onEdit={openEditModal}
        expense={itemToView}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setItemToDelete(null)
        }}
        onConfirm={handleDeleteItem}
      />

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        onAdd={handleAddCategory}
        onDelete={handleDeleteCategory}
        type="EXPENSE"
        categories={categories}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onSuccess={handleBulkImportSuccess}
      />
    </div>
  )
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExpensesContent />
    </Suspense>
  )
}