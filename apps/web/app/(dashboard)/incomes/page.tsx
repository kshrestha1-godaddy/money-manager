"use client";

import { useEffect, Suspense } from "react";
import { Income } from "../../types/financial";
import { IncomeList } from "../../components/incomes/IncomeList";
import { AddIncomeModal } from "../../components/incomes/AddIncomeModal";
import { EditIncomeModal } from "../../components/incomes/EditIncomeModal";
import { ViewIncomeModal } from "../../components/incomes/ViewIncomeModal";
import { BulkImportModal } from "../../components/incomes/BulkImportModal";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";
import { AddCategoryModal } from "../../components/AddCategoryModal";
import { FinancialAreaChart } from "../../components/FinancialAreaChart";
import { FinancialHeader } from "../../components/shared/FinancialHeader";
import { FinancialSummary } from "../../components/shared/FinancialSummary";
import { FinancialFilters } from "../../components/shared/FinancialFilters";
import { useSearchParams } from "next/navigation";
import { getIncomes, createIncome, updateIncome, deleteIncome, bulkDeleteIncomes } from "../../actions/incomes";
import { useCurrency } from "../../providers/CurrencyProvider";
import { exportIncomesToCSV } from "../../utils/csvExportIncomes";
import { useOptimizedFinancialData } from "../../hooks/useOptimizedFinancialData";

function IncomesContent() {
    const { currency: userCurrency } = useCurrency();
    const searchParams = useSearchParams();
    
    // Use the optimized financial data hook with caching
    const financialData = useOptimizedFinancialData<Income>("INCOME", {
        getItems: getIncomes,
        createItem: createIncome,
        updateItem: updateIncome,
        deleteItem: deleteIncome,
        bulkDeleteItems: bulkDeleteIncomes,
        exportToCSV: exportIncomesToCSV,
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
                title="Incomes"
                description="Track and manage your income sources"
                itemType="income"
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
                itemType="income"
            />

            {/* Area Chart */}
            <FinancialAreaChart 
                data={financialData.chartItems} 
                currency={userCurrency} 
                type="income" 
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
                itemType="income"
                hasActiveFilters={financialData.hasActiveFilters}
            />

            {/* Incomes List */}
            {financialData.loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">⏳</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading incomes...</h3>
                    <p className="text-gray-500">Please wait while we fetch your incomes.</p>
                </div>
            ) : (
                <IncomeList 
                    incomes={financialData.items} 
                    currency={userCurrency}
                    onEdit={financialData.openEditModal}
                    onView={financialData.openViewModal}
                    onDelete={financialData.openDeleteModal}
                    selectedIncomes={financialData.selectedItems}
                    onIncomeSelect={financialData.handleItemSelect}
                    onSelectAll={financialData.handleSelectAll}
                    showBulkActions={true}
                    onBulkDelete={financialData.handleBulkDelete}
                    onClearSelection={() => financialData.handleSelectAll(false)}
                />
            )}

            {/* Add Income Modal */}
            <AddIncomeModal
                isOpen={financialData.isAddModalOpen}
                onClose={() => financialData.setIsAddModalOpen(false)}
                onAdd={financialData.handleAddItem}
                categories={financialData.categories}
                accounts={financialData.accounts}
            />

            {/* Edit Income Modal */}
            <EditIncomeModal
                isOpen={financialData.isEditModalOpen}
                onClose={() => {
                    financialData.setIsEditModalOpen(false);
                    financialData.setItemToEdit(null);
                }}
                onEdit={financialData.handleEditItem}
                categories={financialData.categories}
                accounts={financialData.accounts}
                income={financialData.itemToEdit}
            />

            {/* View Income Modal */}
            <ViewIncomeModal
                isOpen={financialData.isViewModalOpen}
                onClose={() => {
                    financialData.setIsViewModalOpen(false);
                    financialData.setItemToView(null);
                }}
                onEdit={financialData.openEditModal}
                income={financialData.itemToView}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={financialData.isDeleteModalOpen}
                onClose={() => {
                    financialData.setIsDeleteModalOpen(false);
                    financialData.setItemToDelete(null);
                }}
                onConfirm={financialData.handleDeleteItem}
                income={financialData.itemToDelete}
            />

            {/* Add Category Modal */}
            <AddCategoryModal
                isOpen={financialData.isAddCategoryModalOpen}
                onClose={() => financialData.setIsAddCategoryModalOpen(false)}
                onAdd={async (category) => {
                    // If the modal is used for multiple categories, handleAddCategory may be called multiple times in quick succession.
                    // We close the modal only after all are processed (handled in modal logic), so just call the handler.
                    await financialData.handleAddCategory(category);
                }}
                type="INCOME"
            />

            {/* Bulk Import Modal */}
            <BulkImportModal
                isOpen={financialData.isBulkImportModalOpen}
                onClose={() => financialData.setIsBulkImportModalOpen(false)}
                onSuccess={financialData.handleBulkImportSuccess}
            />
        </div>
    );
}

export default function Incomes() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <IncomesContent />
        </Suspense>
    );
} 