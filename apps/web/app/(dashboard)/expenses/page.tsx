"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@repo/ui/button";
import { Expense, Category } from "../../types/financial";
import { AccountInterface } from "../../types/accounts";
import { ExpenseList } from "../../components/expenses/ExpenseList";
import { AddExpenseModal } from "../../components/expenses/AddExpenseModal";
import { EditExpenseModal } from "../../components/expenses/EditExpenseModal";
import { ViewExpenseModal } from "../../components/expenses/ViewExpenseModal";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";
import { AddCategoryModal } from "../../components/AddCategoryModal";
import { BulkImportModal } from "../../components/expenses/BulkImportModal";
import { useSearchParams } from "next/navigation";
import { getCategories, createCategory } from "../../actions/categories";
import { getExpenses, createExpense, updateExpense, deleteExpense, bulkDeleteExpenses } from "../../actions/expenses";
import { getUserAccounts } from "../../actions/accounts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { FinancialAreaChart } from "../../components/FinancialAreaChart";
import { triggerBalanceRefresh } from "../../hooks/useTotalBalance";

function ExpensesContent() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [selectedExpenses, setSelectedExpenses] = useState<Set<number>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedBank, setSelectedBank] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [expenseToView, setExpenseToView] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const { currency: userCurrency } = useCurrency();
    
    const searchParams = useSearchParams();
    
    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            setIsAddModalOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        // Load both categories and expenses on component mount
        const loadData = async () => {
            try {
                setLoading(true);
                const [expenseCategories, expensesList, userAccounts] = await Promise.all([
                    getCategories("EXPENSE"),
                    getExpenses(),
                    getUserAccounts()
                ]);
                setCategories(expenseCategories);
                setExpenses(expensesList);
                
                // Handle accounts response
                if (userAccounts && !('error' in userAccounts)) {
                    setAccounts(userAccounts);
                } else {
                    console.error("Error loading accounts:", userAccounts?.error);
                    setAccounts([]);
                }
            } catch (error) {
                console.error("Error loading data:", error);
                // Show error to user instead of fallback data
                alert("Failed to load data. Please refresh the page.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Check if any filters are applied
    const hasActiveFilters = !!(searchTerm || selectedCategory || selectedBank || startDate || endDate);
    
    // Base filtering logic (without default date filtering)
    const getBaseFilteredExpenses = (applyDefaultDateFilter: boolean) => {
        return expenses.filter(expense => {
            const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                expense.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                expense.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = selectedCategory === "" || expense.category.name === selectedCategory;
            
            // Bank filtering
            const matchesBank = selectedBank === "" || (expense.account && expense.account.bankName === selectedBank);
            
            // Date filtering
            let matchesDateRange = true;
            if (startDate && endDate) {
                const expenseDate = new Date(expense.date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                // Set end date to end of day to include the entire end date
                end.setHours(23, 59, 59, 999);
                matchesDateRange = expenseDate >= start && expenseDate <= end;
            } else if (startDate) {
                const expenseDate = new Date(expense.date);
                const start = new Date(startDate);
                matchesDateRange = expenseDate >= start;
            } else if (endDate) {
                const expenseDate = new Date(expense.date);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchesDateRange = expenseDate <= end;
            } else if (applyDefaultDateFilter && !hasActiveFilters) {
                // Apply default 30-day filter only when specified and no other filters are active
                const expenseDate = new Date(expense.date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                matchesDateRange = expenseDate >= thirtyDaysAgo;
            }
            
            return matchesSearch && matchesCategory && matchesBank && matchesDateRange;
        });
    };

    // Filtered expenses for the list (no default date filter)
    const filteredExpenses = getBaseFilteredExpenses(false);
    
    // For the chart, pass the same filtered data as the list (no default date filtering)
    // Let the chart handle its own date filtering logic
    const chartFilteredExpenses = getBaseFilteredExpenses(false);

    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Get unique bank names for filter from user's actual accounts only
    const uniqueBankNames = Array.from(new Set(
        accounts.map(account => account.bankName)
    )).sort();

    const handleAddExpense = async (newExpense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const expense = await createExpense(newExpense);
            setExpenses([expense, ...expenses]);
            setIsAddModalOpen(false);
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error adding expense:", error);
            alert("Failed to add expense. Please try again.");
        }
    };

    const handleEditExpense = async (id: number, updatedExpense: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>) => {
        try {
            const expense = await updateExpense(id, updatedExpense);
            setExpenses(expenses.map(e => e.id === id ? expense : e));
            setIsEditModalOpen(false);
            setExpenseToEdit(null);
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error updating expense:", error);
            alert("Failed to update expense. Please try again.");
        }
    };

    const handleDeleteExpense = async () => {
        if (!expenseToDelete) return;
        
        try {
            await deleteExpense(expenseToDelete.id);
            setExpenses(expenses.filter(e => e.id !== expenseToDelete.id));
            setIsDeleteModalOpen(false);
            setExpenseToDelete(null);
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error deleting expense:", error);
            alert("Failed to delete expense. Please try again.");
        }
    };

    const handleAddCategory = async (newCategory: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const category = await createCategory(newCategory);
            setCategories([...categories, category]);
            setIsAddCategoryModalOpen(false);
        } catch (error) {
            console.error("Error adding category:", error);
            alert("Failed to add category. Please try again.");
        }
    };

    const openEditModal = (expense: Expense) => {
        setExpenseToEdit(expense);
        setIsEditModalOpen(true);
    };

    const openViewModal = (expense: Expense) => {
        setExpenseToView(expense);
        setIsViewModalOpen(true);
    };

    const openDeleteModal = (expense: Expense) => {
        setExpenseToDelete(expense);
        setIsDeleteModalOpen(true);
    };

    const handleExpenseSelect = (expenseId: number, selected: boolean) => {
        const newSelected = new Set(selectedExpenses);
        if (selected) {
            newSelected.add(expenseId);
        } else {
            newSelected.delete(expenseId);
        }
        setSelectedExpenses(newSelected);
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            const allExpenseIds = new Set(filteredExpenses.map(e => e.id));
            setSelectedExpenses(allExpenseIds);
        } else {
            setSelectedExpenses(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (selectedExpenses.size === 0) return;
        
        const confirmMessage = `Are you sure you want to delete ${selectedExpenses.size} expense(s)?`;
        if (!confirm(confirmMessage)) return;

        try {
            await bulkDeleteExpenses(Array.from(selectedExpenses));
            // Remove deleted expenses from the list
            setExpenses(expenses.filter(e => !selectedExpenses.has(e.id)));
            setSelectedExpenses(new Set());
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error bulk deleting expenses:", error);
            alert("Failed to delete expenses. Please try again.");
        }
    };



    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
                    <p className="text-gray-600 mt-1">Track and manage your expenses</p>
                </div>
                <div className="flex space-x-3">
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        Add Expense
                    </Button>
                    <Button onClick={() => setIsBulkImportModalOpen(true)}>
                        Import CSV
                    </Button>
                    <Button onClick={() => setIsAddCategoryModalOpen(true)}>
                        Add Category
                    </Button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses, userCurrency)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">This Month</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(
                                filteredExpenses
                                    .filter(e => e.date.getMonth() === new Date().getMonth())
                                    .reduce((sum, e) => sum + e.amount, 0),
                                userCurrency
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Average per Transaction</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {filteredExpenses.length > 0 ? formatCurrency(totalExpenses / filteredExpenses.length, userCurrency) : formatCurrency(0, userCurrency)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Expense Chart */}
            <FinancialAreaChart 
                data={chartFilteredExpenses} 
                currency={userCurrency} 
                type="expense" 
                hasPageFilters={hasActiveFilters}
                pageStartDate={startDate}
                pageEndDate={endDate}
            />

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Expenses
                        </label>
                        <input
                            type="text"
                            placeholder="Search by title, description, or notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Category
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Categories</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.name}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter by Bank
                        </label>
                        <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Banks</option>
                            {uniqueBankNames.map(bankName => (
                                <option key={bankName} value={bankName}>
                                    {bankName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                
                {/* Clear Filters Button */}
                {(searchTerm || selectedCategory || selectedBank || startDate || endDate) && (
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setSelectedCategory("");
                                setSelectedBank("");
                                setStartDate("");
                                setEndDate("");
                            }}
                            className="text-sm px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Expenses List */}
            {loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">⏳</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading expenses...</h3>
                    <p className="text-gray-500">Please wait while we fetch your expenses.</p>
                </div>
            ) : (
                <ExpenseList 
                    expenses={filteredExpenses} 
                    currency={userCurrency}
                    onEdit={openEditModal}
                    onView={openViewModal}
                    onDelete={openDeleteModal}
                    selectedExpenses={selectedExpenses}
                    onExpenseSelect={handleExpenseSelect}
                    onSelectAll={handleSelectAll}
                    showBulkActions={true}
                    onBulkDelete={handleBulkDelete}
                    onClearSelection={() => setSelectedExpenses(new Set())}
                />
            )}

            {/* Add Expense Modal */}
            <AddExpenseModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddExpense}
                categories={categories}
                accounts={accounts}
            />

            {/* Edit Expense Modal */}
            <EditExpenseModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setExpenseToEdit(null);
                }}
                onEdit={handleEditExpense}
                categories={categories}
                accounts={accounts}
                expense={expenseToEdit}
            />

            {/* View Expense Modal */}
            <ViewExpenseModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setExpenseToView(null);
                }}
                onEdit={openEditModal}
                expense={expenseToView}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setExpenseToDelete(null);
                }}
                onConfirm={handleDeleteExpense}
                expense={expenseToDelete}
            />

            {/* Bulk Import Modal */}
            <BulkImportModal
                isOpen={isBulkImportModalOpen}
                onClose={() => setIsBulkImportModalOpen(false)}
                onSuccess={() => {
                    // Refresh expenses list
                    const loadData = async () => {
                        try {
                            const expensesList = await getExpenses();
                            setExpenses(expensesList);
                            triggerBalanceRefresh();
                        } catch (error) {
                            console.error("Error refreshing expenses:", error);
                        }
                    };
                    loadData();
                }}
            />

            {/* Add Category Modal */}
            <AddCategoryModal
                isOpen={isAddCategoryModalOpen}
                onClose={() => setIsAddCategoryModalOpen(false)}
                onAdd={handleAddCategory}
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