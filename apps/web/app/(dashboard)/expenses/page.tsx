"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/button";
import { Expense, Category } from "../../types/financial";
import { ExpenseList } from "../../components/ExpenseList";
import { AddExpenseModal } from "../../components/AddExpenseModal";
import { EditExpenseModal } from "../../components/EditExpenseModal";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";
import { AddCategoryModal } from "../../components/AddCategoryModal";
import { useSearchParams } from "next/navigation";
import { getCategories, createCategory } from "../../actions/categories";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "../../actions/expenses";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";


export default function Expenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
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
                const [expenseCategories, expensesList] = await Promise.all([
                    getCategories("EXPENSE"),
                    getExpenses()
                ]);
                setCategories(expenseCategories);
                setExpenses(expensesList);
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

    const filteredExpenses = expenses.filter(expense => {
        const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            expense.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "" || expense.category.name === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    const handleAddExpense = async (newExpense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const expense = await createExpense(newExpense);
            setExpenses([expense, ...expenses]);
            setIsAddModalOpen(false);
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

    const openDeleteModal = (expense: Expense) => {
        setExpenseToDelete(expense);
        setIsDeleteModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
                    <p className="text-gray-600 mt-1">Track and manage your expenses</p>
                </div>
                <div className="flex space-x-3">
                    <Button onClick={() => setIsAddCategoryModalOpen(true)}>
                        Add Category
                    </Button>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        Add Expense
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

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Expenses
                        </label>
                        <input
                            type="text"
                            placeholder="Search by title or description..."
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
                </div>
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
                    onDelete={openDeleteModal}
                />
            )}

            {/* Add Expense Modal */}
            <AddExpenseModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddExpense}
                categories={categories}
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
                expense={expenseToEdit}
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