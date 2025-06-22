"use client";

import { useEffect, Suspense } from "react";
import { Expense } from "../../types/financial";
import { ExpenseList } from "../../components/expenses/ExpenseList";
import { AddExpenseModal } from "../../components/expenses/AddExpenseModal";
import { EditExpenseModal } from "../../components/expenses/EditExpenseModal";
import { ViewExpenseModal } from "../../components/expenses/ViewExpenseModal";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";
import { AddCategoryModal } from "../../components/AddCategoryModal";
import { BulkImportModal } from "../../components/expenses/BulkImportModal";
import { FinancialAreaChart } from "../../components/FinancialAreaChart";
import { FinancialHeader } from "../../components/shared/FinancialHeader";
import { FinancialSummary } from "../../components/shared/FinancialSummary";
import { FinancialFilters } from "../../components/shared/FinancialFilters";
import { useSearchParams } from "next/navigation";
import { getExpenses, createExpense, updateExpense, deleteExpense, bulkDeleteExpenses } from "../../actions/expenses";
import { useCurrency } from "../../providers/CurrencyProvider";
import { exportExpensesToCSV } from "../../utils/csvExportExpenses";
import { useOptimizedFinancialData } from "../../hooks/useOptimizedFinancialData";

function ExpensesContent() {
    const { currency: userCurrency } = useCurrency();
    const searchParams = useSearchParams();
    
    // Use the optimized financial data hook with caching
    const financialData = useOptimizedFinancialData<Expense>("EXPENSE", {
        getItems: getExpenses,
        createItem: createExpense,
        updateItem: updateExpense,
        deleteItem: deleteExpense,
        bulkDeleteItems: bulkDeleteExpenses,
        exportToCSV: exportExpensesToCSV,
    });

    // Handle URL action parameter
    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            financialData.setIsAddModalOpen(true);
        }
    }, [searchParams, financialData]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <FinancialHeader
                title="Expenses"
                description="Track and manage your expenses"
                itemType="expense"
                onAddClick={() => financialData.setIsAddModalOpen(true)}
                onBulkImportClick={() => financialData.setIsBulkImportModalOpen(true)}
                onExportClick={financialData.handleExportToCSV}
                onAddCategoryClick={() => financialData.setIsAddCategoryModalOpen(true)}
                hasItemsToExport={financialData.items.length > 0}
            />

            {/* Summary Card */}
            <FinancialSummary
                totalAmount={financialData.totalAmount}
                currency={userCurrency}
                items={financialData.items}
                itemType="expense"
            />

            {/* Expense Chart */}
            <FinancialAreaChart 
                data={financialData.chartItems} 
                currency={userCurrency} 
                type="expense" 
                hasPageFilters={financialData.hasActiveFilters}
                pageStartDate={financialData.startDate}
                pageEndDate={financialData.endDate}
            />

            {/* Filters */}
            <FinancialFilters
                searchTerm={financialData.searchTerm}
                onSearchChange={financialData.setSearchTerm}
                selectedCategory={financialData.selectedCategory}
                onCategoryChange={financialData.setSelectedCategory}
                selectedBank={financialData.selectedBank}
                onBankChange={financialData.setSelectedBank}
                startDate={financialData.startDate}
                onStartDateChange={financialData.setStartDate}
                endDate={financialData.endDate}
                onEndDateChange={financialData.setEndDate}
                categories={financialData.categories}
                uniqueBankNames={financialData.uniqueBankNames}
                onClearFilters={financialData.clearFilters}
                itemType="expense"
                hasActiveFilters={financialData.hasActiveFilters}
            />

            {/* Expenses List */}
            {financialData.loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">⏳</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading expenses...</h3>
                    <p className="text-gray-500">Please wait while we fetch your expenses.</p>
                </div>
            ) : (
                <ExpenseList 
                    expenses={financialData.items} 
                    currency={userCurrency}
                    onEdit={financialData.openEditModal}
                    onView={financialData.openViewModal}
                    onDelete={financialData.openDeleteModal}
                    selectedExpenses={financialData.selectedItems}
                    onExpenseSelect={financialData.handleItemSelect}
                    onSelectAll={financialData.handleSelectAll}
                    showBulkActions={true}
                    onBulkDelete={financialData.handleBulkDelete}
                    onClearSelection={() => financialData.handleSelectAll(false)}
                />
            )}

            {/* Add Expense Modal */}
            <AddExpenseModal
                isOpen={financialData.isAddModalOpen}
                onClose={() => financialData.setIsAddModalOpen(false)}
                onAdd={financialData.handleAddItem}
                categories={financialData.categories}
                accounts={financialData.accounts}
            />

            {/* Edit Expense Modal */}
            <EditExpenseModal
                isOpen={financialData.isEditModalOpen}
                onClose={() => {
                    financialData.setIsEditModalOpen(false);
                    financialData.setItemToEdit(null);
                }}
                onEdit={financialData.handleEditItem}
                categories={financialData.categories}
                accounts={financialData.accounts}
                expense={financialData.itemToEdit}
            />

            {/* View Expense Modal */}
            <ViewExpenseModal
                isOpen={financialData.isViewModalOpen}
                onClose={() => {
                    financialData.setIsViewModalOpen(false);
                    financialData.setItemToView(null);
                }}
                onEdit={financialData.openEditModal}
                expense={financialData.itemToView}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={financialData.isDeleteModalOpen}
                onClose={() => {
                    financialData.setIsDeleteModalOpen(false);
                    financialData.setItemToDelete(null);
                }}
                onConfirm={financialData.handleDeleteItem}
                expense={financialData.itemToDelete}
            />

            {/* Bulk Import Modal */}
            <BulkImportModal
                isOpen={financialData.isBulkImportModalOpen}
                onClose={() => financialData.setIsBulkImportModalOpen(false)}
                onSuccess={financialData.handleBulkImportSuccess}
            />

            {/* Add Category Modal */}
            <AddCategoryModal
                isOpen={financialData.isAddCategoryModalOpen}
                onClose={() => financialData.setIsAddCategoryModalOpen(false)}
                onAdd={async (category) => {
                    await financialData.handleAddCategory(category);
                }}
                type="EXPENSE"
            />
        </div>
    );
}

export default function Expenses() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ExpensesContent />
        </Suspense>
    );
}