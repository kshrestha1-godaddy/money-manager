"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/button";
import { Income, Category } from "../../types/financial";
import { IncomeList } from "../../components/IncomeList";
import { AddIncomeModal } from "../../components/AddIncomeModal";
import { useSearchParams } from "next/navigation";
import { getCategories } from "../../actions/categories";
import { getIncomes, createIncome } from "../../actions/incomes";

// Mock data - replace with actual API calls
const mockIncomes: Income[] = [
    {
        id: 1,
        title: "Monthly Salary",
        description: "Regular monthly salary from employer",
        amount: 5000,
        date: new Date('2024-01-01'),
        category: {
            id: 1,
            name: "Salary",
            type: "INCOME",
            color: "#10b981",
            createdAt: new Date(),
            updatedAt: new Date()
        },
        categoryId: 1,
        accountId: 1,
        userId: 1,
        tags: ["salary", "regular"],
        isRecurring: true,
        recurringFrequency: "MONTHLY",
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 2,
        title: "Freelance Project",
        description: "Web development project for client",
        amount: 800,
        date: new Date('2024-01-05'),
        category: {
            id: 2,
            name: "Freelance",
            type: "INCOME",
            color: "#3b82f6",
            createdAt: new Date(),
            updatedAt: new Date()
        },
        categoryId: 2,
        accountId: 1,
        userId: 1,
        tags: ["freelance", "web-dev"],
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        id: 3,
        title: "Investment Dividend",
        description: "Quarterly dividend from stock portfolio",
        amount: 150,
        date: new Date('2024-01-10'),
        category: {
            id: 3,
            name: "Investment",
            type: "INCOME",
            color: "#8b5cf6",
            createdAt: new Date(),
            updatedAt: new Date()
        },
        categoryId: 3,
        accountId: 1,
        userId: 1,
        tags: ["dividend", "investment"],
        isRecurring: true,
        recurringFrequency: "QUARTERLY",
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

const mockCategories: Category[] = [
    { id: 1, name: "Salary", type: "INCOME", color: "#10b981", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "Freelance", type: "INCOME", color: "#3b82f6", createdAt: new Date(), updatedAt: new Date() },
    { id: 3, name: "Investment", type: "INCOME", color: "#8b5cf6", createdAt: new Date(), updatedAt: new Date() },
    { id: 4, name: "Business", type: "INCOME", color: "#f59e0b", createdAt: new Date(), updatedAt: new Date() },
    { id: 5, name: "Other", type: "INCOME", color: "#6b7280", createdAt: new Date(), updatedAt: new Date() },
];

export default function Incomes() {
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    
    const searchParams = useSearchParams();
    
    useEffect(() => {
        if (searchParams.get('action') === 'add') {
            setIsAddModalOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        // Load both categories and incomes on component mount
        const loadData = async () => {
            try {
                setLoading(true);
                const [incomeCategories, incomesList] = await Promise.all([
                    getCategories("INCOME"),
                    getIncomes()
                ]);
                setCategories(incomeCategories);
                setIncomes(incomesList);
            } catch (error) {
                console.error("Error loading data:", error);
                setCategories(mockCategories); // Fallback to mock data
                setIncomes(mockIncomes); // Fallback to mock data
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const filteredIncomes = incomes.filter(income => {
        const matchesSearch = income.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            income.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "" || income.category.name === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const totalIncomes = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);

    const handleAddIncome = async (newIncome: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const income = await createIncome(newIncome);
            setIncomes([income, ...incomes]);
            setIsAddModalOpen(false);
        } catch (error) {
            console.error("Error adding income:", error);
            alert("Failed to add income. Please try again.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Incomes</h1>
                    <p className="text-gray-600 mt-1">Track and manage your income sources</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    Add Income
                </Button>
            </div>

            {/* Summary Card */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Total Income</p>
                        <p className="text-2xl font-bold text-green-600">${totalIncomes.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">This Month</p>
                        <p className="text-2xl font-bold text-gray-900">
                            ${filteredIncomes
                                .filter(i => i.date.getMonth() === new Date().getMonth())
                                .reduce((sum, i) => sum + i.amount, 0)
                                .toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600">Average per Source</p>
                        <p className="text-2xl font-bold text-gray-900">
                            ${filteredIncomes.length > 0 ? (totalIncomes / filteredIncomes.length).toFixed(2) : '0'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Income
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

            {/* Income List */}
            {loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">⏳</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading incomes...</h3>
                    <p className="text-gray-500">Please wait while we fetch your income sources.</p>
                </div>
            ) : (
                <IncomeList incomes={filteredIncomes} />
            )}

            {/* Add Income Modal */}
            <AddIncomeModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddIncome}
                categories={categories}
            />
        </div>
    );
}