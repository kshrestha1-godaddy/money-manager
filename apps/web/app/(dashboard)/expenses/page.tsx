"use client";

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { Expense } from '../../types/financial'
import { useCurrency } from '../../providers/CurrencyProvider'

export default function ExpensesPage() {
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
    clearFilters
  } = useOptimizedFinancialData<Expense>("EXPENSE", {
    getItems: getExpenses,
    createItem: createExpense,
    updateItem: updateExpense,
    deleteItem: deleteExpense,
    bulkDeleteItems: bulkDeleteExpenses,
    exportToCSV: exportExpensesToCSV,
  })

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
  
  const currentMonthExpenses = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
    })
    .reduce((sum: number, expense: Expense) => sum + expense.amount, 0)
    
  const lastMonthExpenses = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date)
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
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
      dotColor: monthlyChange >= 0 ? "bg-red-500" : "bg-green-500"
    },
    {
      title: `${currentQuarterName} (${currentQuarterName === "Q1" ? "Jan-Mar" : currentQuarterName === "Q2" ? "Apr-Jun" : currentQuarterName === "Q3" ? "Jul-Sep" : "Oct-Dec"})`,
      value: formatCurrency(currentQuarterExpenses, userCurrency),
      subtitle: `${quarterlyChange >= 0 ? '+' : ''}${quarterlyChange.toFixed(1)}%`,
      subtitleColor: quarterlyChange >= 0 ? "text-red-600" : "text-green-600",
      dotColor: quarterlyChange >= 0 ? "bg-red-500" : "bg-green-500"
    },
    {
      title: "Average per Transaction",
      value: formatCurrency(averagePerExpense, userCurrency),
      subtitle: `across ${allExpenses.length} records`,
      dotColor: "bg-orange-500"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-gray-600">Track and manage your expenses</p>
        </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Add Expense
            </button>
            <button
              onClick={() => setIsBulkImportModalOpen(true)}
              className="px-4 py-2 border border-gray-600 text-gray-600 hover:bg-blue-50 rounded-md"
            >
              Import CSV
            </button>
            <button
              onClick={handleExportToCSV}
              disabled={allExpenses.length === 0}
              className="px-4 py-2 border border-gray-600 text-gray-600 hover:bg-green-50 rounded-md disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              onClick={() => setIsAddCategoryModalOpen(true)}
              className="px-4 py-2 border border-gray-600 text-gray-600 hover:bg-purple-50 rounded-md"
            >
              Add Category
            </button>
          </div>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg border p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${card.dotColor}`}></div>
              <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
            </div>
            <p className={`text-2xl font-bold ${card.title.includes('Total') ? 'text-red-600' : 'text-gray-500'}`}>
              {isLoading ? '...' : card.value}
            </p>
            <p className={`text-sm ${card.subtitleColor || 'text-gray-500'}`}>{card.subtitle}</p>
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
      />

      <Suspense fallback={<div>Loading expenses...</div>}>
        <ExpenseList
          expenses={expenses}
          currency={userCurrency}
          onEdit={openEditModal}
          onView={openViewModal}
          onDelete={openDeleteModal}
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
        type="EXPENSE"
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