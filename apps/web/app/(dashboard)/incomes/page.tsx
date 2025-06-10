"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@repo/ui/button";
import { Income, Category } from "../../types/financial";
import { AccountInterface } from "../../types/accounts";
import { IncomeList } from "../../components/incomes/IncomeList";
import { AddIncomeModal } from "../../components/incomes/AddIncomeModal";
import { EditIncomeModal } from "../../components/incomes/EditIncomeModal";
import { ViewIncomeModal } from "../../components/incomes/ViewIncomeModal";
import { BulkImportModal } from "../../components/shared/BulkImportModal";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";
import { AddCategoryModal } from "../../components/AddCategoryModal";
import { FinancialAreaChart } from "../../components/FinancialAreaChart";
import { useSearchParams } from "next/navigation";
import { getCategories, createCategory } from "../../actions/categories";
import { getIncomes, createIncome, updateIncome, deleteIncome, bulkImportIncomes, parseCSVForUI, importCorrectedRow } from "../../actions/incomes";
import { getUserAccounts } from "../../actions/accounts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { triggerBalanceRefresh } from "../../hooks/useTotalBalance";

function IncomesContent() {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [selectedIncomes, setSelectedIncomes] = useState<Set<number>>(new Set());
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedBank, setSelectedBank] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [incomeToEdit, setIncomeToEdit] = useState<Income | null>(null);
    const [incomeToView, setIncomeToView] = useState<Income | null>(null);
    const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
    const { currency: userCurrency } = useCurrency();
    
    const searchParams = useSearchParams();
    
    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            setIsAddModalOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        // Load categories, incomes, and accounts on component mount
        const loadData = async () => {
            try {
                setLoading(true);
                const [incomeCategories, incomesList, userAccounts] = await Promise.all([
                    getCategories("INCOME"),
                    getIncomes(),
                    getUserAccounts()
                ]);
                setCategories(incomeCategories);
                setIncomes(incomesList);
                
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
    const getBaseFilteredIncomes = (applyDefaultDateFilter: boolean) => {
        return incomes.filter(income => {
            const matchesSearch = income.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                income.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                income.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                income.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
                                
            const matchesCategory = selectedCategory === "" || income.category.name === selectedCategory;
            
            // Bank filtering
            const matchesBank = selectedBank === "" || (income.account && income.account.bankName === selectedBank);
            
            // Date filtering
            let matchesDateRange = true;
            if (startDate && endDate) {
                const incomeDate = new Date(income.date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                // Set end date to end of day to include the entire end date
                end.setHours(23, 59, 59, 999);
                matchesDateRange = incomeDate >= start && incomeDate <= end;
            } else if (startDate) {
                const incomeDate = new Date(income.date);
                const start = new Date(startDate);
                matchesDateRange = incomeDate >= start;
            } else if (endDate) {
                const incomeDate = new Date(income.date);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchesDateRange = incomeDate <= end;
            } else if (applyDefaultDateFilter && !hasActiveFilters) {
                // Apply default 30-day filter only when specified and no other filters are active
                const incomeDate = new Date(income.date);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                matchesDateRange = incomeDate >= thirtyDaysAgo;
            }
            
            return matchesSearch && matchesCategory && matchesBank && matchesDateRange;
        });
    };

    // Filtered incomes for the list (no default date filter)
    const filteredIncomes = getBaseFilteredIncomes(false);
    
    // For the chart, pass the same filtered data as the list (no default date filtering)
    // Let the chart handle its own date filtering logic
    const chartFilteredIncomes = getBaseFilteredIncomes(false);

    const totalIncomes = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);

    // Get unique bank names for filter from user's actual accounts only
    const uniqueBankNames = Array.from(new Set(
        accounts.map(account => account.bankName)
    )).sort();

    const handleAddIncome = async (newIncome: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const income = await createIncome(newIncome);
            setIncomes([income, ...incomes]);
            setIsAddModalOpen(false);
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error adding income:", error);
            alert("Failed to add income. Please try again.");
        }
    };

    const handleEditIncome = async (id: number, updatedIncome: Partial<Omit<Income, 'id' | 'createdAt' | 'updatedAt'>>) => {
        try {
            const income = await updateIncome(id, updatedIncome);
            setIncomes(incomes.map(i => i.id === id ? income : i));
            setIsEditModalOpen(false);
            setIncomeToEdit(null);
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error updating income:", error);
            alert("Failed to update income. Please try again.");
        }
    };

    const handleDeleteIncome = async () => {
        if (!incomeToDelete) return;
        
        try {
            await deleteIncome(incomeToDelete.id);
            setIncomes(incomes.filter(i => i.id !== incomeToDelete.id));
            setIsDeleteModalOpen(false);
            setIncomeToDelete(null);
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error deleting income:", error);
            alert("Failed to delete income. Please try again.");
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

    const openEditModal = (income: Income) => {
        setIncomeToEdit(income);
        setIsEditModalOpen(true);
    };

    const openViewModal = (income: Income) => {
        setIncomeToView(income);
        setIsViewModalOpen(true);
    };

    const openDeleteModal = (income: Income) => {
        setIncomeToDelete(income);
        setIsDeleteModalOpen(true);
    };

    // Bulk operations handlers
    const handleIncomeSelect = (incomeId: number, selected: boolean) => {
        setSelectedIncomes(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(incomeId);
            } else {
                newSet.delete(incomeId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            setSelectedIncomes(new Set(filteredIncomes.map(income => income.id)));
        } else {
            setSelectedIncomes(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIncomes.size === 0) return;
        
        const confirmMessage = `Are you sure you want to delete ${selectedIncomes.size} income(s)?`;
        if (!confirm(confirmMessage)) return;

        try {
            await Promise.all(Array.from(selectedIncomes).map(id => deleteIncome(id)));
            setIncomes(incomes.filter(income => !selectedIncomes.has(income.id)));
            setSelectedIncomes(new Set());
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error bulk deleting incomes:", error);
            alert("Failed to delete incomes. Please try again.");
        }
    };

    const handleBulkImportSuccess = () => {
        // Reload incomes after successful import
        const loadData = async () => {
            try {
                const incomesList = await getIncomes();
                setIncomes(incomesList);
                // Trigger balance refresh in NavBar
                triggerBalanceRefresh();
            } catch (error) {
                console.error("Error reloading incomes:", error);
            }
        };
        loadData();
    };



    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Incomes</h1>
                    <p className="text-gray-600 mt-1">Track and manage your income sources</p>
                </div>
                <div className="flex space-x-3">
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        Add Income
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
                        <p className="text-sm font-medium text-gray-600">Total Income</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncomes, userCurrency)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">This Month</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(
                                filteredIncomes
                                    .filter(i => i.date.getMonth() === new Date().getMonth())
                                    .reduce((sum, i) => sum + i.amount, 0),
                                userCurrency
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Average per Transaction</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {filteredIncomes.length > 0 ? formatCurrency(totalIncomes / filteredIncomes.length, userCurrency) : formatCurrency(0, userCurrency)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Income Area Chart */}
            <FinancialAreaChart 
                data={chartFilteredIncomes} 
                currency={userCurrency} 
                type="income" 
                hasPageFilters={hasActiveFilters}
                pageStartDate={startDate}
                pageEndDate={endDate}
            />

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Incomes
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

            {/* Incomes List */}
            {loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">⏳</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading incomes...</h3>
                    <p className="text-gray-500">Please wait while we fetch your incomes.</p>
                </div>
            ) : (
                <IncomeList 
                    incomes={filteredIncomes} 
                    currency={userCurrency}
                    onEdit={openEditModal}
                    onView={openViewModal}
                    onDelete={openDeleteModal}
                    selectedIncomes={selectedIncomes}
                    onIncomeSelect={handleIncomeSelect}
                    onSelectAll={handleSelectAll}
                    showBulkActions={true}
                    onBulkDelete={handleBulkDelete}
                    onClearSelection={() => setSelectedIncomes(new Set())}
                />
            )}

            {/* Add Income Modal */}
            <AddIncomeModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddIncome}
                categories={categories}
                accounts={accounts}
            />

            {/* Edit Income Modal */}
            <EditIncomeModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setIncomeToEdit(null);
                }}
                onEdit={handleEditIncome}
                categories={categories}
                accounts={accounts}
                income={incomeToEdit}
            />

            {/* View Income Modal */}
            <ViewIncomeModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setIncomeToView(null);
                }}
                onEdit={openEditModal}
                income={incomeToView}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setIncomeToDelete(null);
                }}
                onConfirm={handleDeleteIncome}
                income={incomeToDelete}
            />

            {/* Add Category Modal */}
            <AddCategoryModal
                isOpen={isAddCategoryModalOpen}
                onClose={() => setIsAddCategoryModalOpen(false)}
                onAdd={handleAddCategory}
                type="INCOME"
            />

            <BulkImportModal
                isOpen={isBulkImportModalOpen}
                onClose={() => setIsBulkImportModalOpen(false)}
                onSuccess={handleBulkImportSuccess}
                transactionType="INCOME"
                bulkImportAction={(file: File, defaultAccountId: string) => 
                    bulkImportIncomes(file, defaultAccountId)
                }
                parseCSVAction={parseCSVForUI}
                importCorrectedRowAction={importCorrectedRow}
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