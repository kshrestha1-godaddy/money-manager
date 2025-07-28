'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Info } from 'lucide-react'
import { useOptimizedFinancialData } from '../../hooks/useOptimizedFinancialData'
import { IncomeList } from '../../components/incomes/IncomeList'
import { AddIncomeModal } from '../../components/incomes/AddIncomeModal'
import { EditIncomeModal } from '../../components/incomes/EditIncomeModal'
import { ViewIncomeModal } from '../../components/incomes/ViewIncomeModal'
import { BulkImportModal } from '../../components/incomes/BulkImportModal'
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal'
import { AddCategoryModal } from '../../components/AddCategoryModal'
import { FinancialAreaChart } from '../../components/FinancialAreaChart'
import { FinancialFilters } from '../../components/shared/FinancialFilters'
import { formatCurrency } from '../../utils/currency'
import { getIncomes, createIncome, updateIncome, deleteIncome, bulkDeleteIncomes } from '../../actions/incomes'
import { exportIncomesToCSV } from '../../utils/csvExportIncomes'
import { createTransactionBookmark, deleteTransactionBookmarkByTransaction } from '../../actions/transaction-bookmarks'
import { Income } from '../../types/financial'
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
const secondaryPurpleButton = BUTTON_COLORS.secondaryBlue;

function IncomesContent() {
  const { currency: userCurrency } = useCurrency()
  const searchParams = useSearchParams()
  
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
  } = useOptimizedFinancialData<Income>("INCOME", {
    getItems: getIncomes,
    createItem: createIncome,
    updateItem: updateIncome,
    deleteItem: deleteIncome,
    bulkDeleteItems: bulkDeleteIncomes,
    exportToCSV: exportIncomesToCSV,
  })

  // Handle bookmark toggle
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
          tags: income.tags || []
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
  
  const currentMonthIncomes = allIncomes
    .filter(income => {
      const incomeDate = new Date(income.date)
      return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear
    })
    .reduce((sum: number, income: Income) => sum + income.amount, 0)
    
  const lastMonthIncomes = allIncomes
    .filter(income => {
      const incomeDate = new Date(income.date)
      return incomeDate.getMonth() === lastMonth && incomeDate.getFullYear() === lastMonthYear
    })
    .reduce((sum: number, income: Income) => sum + income.amount, 0)

  const currentQuarterIncomes = allIncomes
    .filter(income => {
      const incomeDate = new Date(income.date)
      const incomeQuarter = Math.floor(incomeDate.getMonth() / 3)
      return incomeQuarter === currentQuarter && incomeDate.getFullYear() === currentYear
    })
    .reduce((sum: number, income: Income) => sum + income.amount, 0)

  const lastQuarterIncomes = allIncomes
    .filter(income => {
      const incomeDate = new Date(income.date)
      const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1
      const lastQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear
      const incomeQuarter = Math.floor(incomeDate.getMonth() / 3)
      return incomeQuarter === lastQuarter && incomeDate.getFullYear() === lastQuarterYear
    })
    .reduce((sum: number, income: Income) => sum + income.amount, 0)

  const monthlyChange = lastMonthIncomes > 0 
    ? ((currentMonthIncomes - lastMonthIncomes) / lastMonthIncomes) * 100
    : 0

  const quarterlyChange = lastQuarterIncomes > 0
    ? ((currentQuarterIncomes - lastQuarterIncomes) / lastQuarterIncomes) * 100
    : 0

  const averagePerIncome = allIncomes.length > 0 
    ? allIncomes.reduce((sum: number, income: Income) => sum + income.amount, 0) / allIncomes.length
    : 0

  // Get month names for better display
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const quarterNames = ["Q1", "Q2", "Q3", "Q4"]
  
  const currentMonthName = monthNames[currentMonth]
  const currentQuarterName = quarterNames[currentQuarter]
  
  const summaryCards = [
    {
      title: "Total Incomes",
      value: formatCurrency(totalAmount, userCurrency),
      subtitle: `${allIncomes.length} income records`,
      dotColor: "bg-green-500"
    },
    {
      title: `This Month (${currentMonthName})`,
      value: formatCurrency(currentMonthIncomes, userCurrency),
      subtitle: `${monthlyChange >= 0 ? '+' : ''}${monthlyChange.toFixed(1)}%`,
      subtitleColor: monthlyChange >= 0 ? "text-green-600" : "text-red-600",
      dotColor: monthlyChange >= 0 ? "bg-green-500" : "bg-red-500",
      hasPercentage: true,
      tooltipText: `Compared to last month (${monthNames[lastMonth]}): ${formatCurrency(lastMonthIncomes, userCurrency)}`
    },
    {
      title: `${currentQuarterName} (${currentQuarterName === "Q1" ? "Jan-Mar" : currentQuarterName === "Q2" ? "Apr-Jun" : currentQuarterName === "Q3" ? "Jul-Sep" : "Oct-Dec"})`,
      value: formatCurrency(currentQuarterIncomes, userCurrency),
      subtitle: `${quarterlyChange >= 0 ? '+' : ''}${quarterlyChange.toFixed(1)}%`,
      subtitleColor: quarterlyChange >= 0 ? "text-green-600" : "text-red-600",
      dotColor: quarterlyChange >= 0 ? "bg-green-500" : "bg-red-500",
      hasPercentage: true,
      tooltipText: `Compared to last quarter (${quarterNames[currentQuarter === 0 ? 3 : currentQuarter - 1]}): ${formatCurrency(lastQuarterIncomes, userCurrency)}`
    },
    {
      title: "Average per Transaction",
      value: formatCurrency(averagePerIncome, userCurrency),
      subtitle: `across ${allIncomes.length} records`,
      dotColor: "bg-purple-500"
    }
  ]

  // Loading state
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
      {/* Header */}
      <div className={UI_STYLES.header.container}>
                  <div>
            <h1 className={pageTitle}>Incomes</h1>
            <p className={pageSubtitle}>Track and manage your income sources</p>
          </div>
          <div className={UI_STYLES.header.buttonGroup}>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className={primaryButton}
              >
                Add Income
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
                disabled={allIncomes.length === 0}
                className={`${secondaryGreenButton} disabled:opacity-50`}
              >
                Export CSV
              </button>

          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6"> 
          {summaryCards.map((card, index) => (
            <div key={index} className={cardLargeContainer}>
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${card.dotColor}`}></div>
                <h3 className={cardTitle}>{card.title}</h3>
              </div>
              <p className={`${cardValue} ${card.title.includes('Total') ? 'text-green-600' : 'text-black'}`}>
                {isLoading ? '...' : card.value}
              </p>
              <div className="flex items-center justify-center space-x-1">
                <p className={`${cardSubtitle} ${card.subtitleColor || 'text-gray-500'}`}>{card.subtitle}</p>
                {(card as any).hasPercentage && (card as any).tooltipText && (
                  <div className="relative group">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      {(card as any).tooltipText}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      {/* Area Chart */}
      <FinancialAreaChart 
        data={chartItems} 
        currency={userCurrency} 
        type="income" 
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

      {/* Add Income Modal */}
      <AddIncomeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
        categories={categories}
        accounts={accounts}
      />

      {/* Edit Income Modal */}
      <EditIncomeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setItemToEdit(null)
        }}
        onEdit={handleEditItem}
        categories={categories}
        accounts={accounts}
        income={itemToEdit}
      />

      {/* View Income Modal */}
      <ViewIncomeModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setItemToView(null)
        }}
        onEdit={openEditModal}
        income={itemToView}
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
        type="INCOME"
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

export default function IncomesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <IncomesContent />
    </Suspense>
  )
}