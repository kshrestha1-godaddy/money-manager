"use client";

import { useState, useEffect } from "react";
import { Transaction } from "../../types/financial";
import { formatDate } from "../../utils/date";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { getAllTransactions } from "../../actions/transactions";
import { TransactionPDFReportGenerator } from "../../components/TransactionPDFReportGenerator";
import { CompactPagination } from "../../components/shared/CompactPagination";

const ITEMS_PER_PAGE = 25;

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const { currency: userCurrency } = useCurrency();

    useEffect(() => {
        const loadTransactions = async () => {
            try {
                setLoading(true);
                const allTransactions = await getAllTransactions();
                setTransactions(allTransactions);
            } catch (error) {
                console.error("Error loading transactions:", error);
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };

        loadTransactions();
    }, []);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedType, selectedCategory, startDate, endDate]);

    // Filter transactions
    const filteredTransactions = transactions.filter(transaction => {
        const matchesSearch = 
            transaction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (transaction.description && transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (transaction.notes && transaction.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (transaction.tags && transaction.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
        
        const matchesType = selectedType === "ALL" || transaction.type === selectedType;
        
        const matchesCategory = selectedCategory === "" || transaction.category === selectedCategory;
        
        let matchesDateRange = true;
        if (startDate && endDate) {
            const transactionDate = new Date(transaction.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDateRange = transactionDate >= start && transactionDate <= end;
        } else if (startDate) {
            const transactionDate = new Date(transaction.date);
            const start = new Date(startDate);
            matchesDateRange = transactionDate >= start;
        } else if (endDate) {
            const transactionDate = new Date(transaction.date);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDateRange = transactionDate <= end;
        }
        
        return matchesSearch && matchesType && matchesCategory && matchesDateRange;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    // Get unique categories for filter
    const uniqueCategories = Array.from(new Set(transactions.map(t => t.category))).sort();

    // Calculate totals (for all filtered transactions, not just current page)
    const totalAmount = filteredTransactions.reduce((sum, t) => {
        return t.type === 'INCOME' ? sum + t.amount : sum - t.amount;
    }, 0);
    
    const totalIncome = filteredTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = filteredTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // Scroll to top of table when page changes
        document.querySelector('.bg-white.rounded-lg.shadow')?.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900">All Transactions</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-4">⏳</div>
                    <p className="text-gray-500">Loading transactions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">All Transactions</h1>
                <div className="flex items-center gap-4">
                    <TransactionPDFReportGenerator
                        transactions={filteredTransactions}
                        totalIncome={totalIncome}
                        totalExpenses={totalExpenses}
                        netAmount={totalAmount}
                        filteredTransactionCount={filteredTransactions.length}
                        searchTerm={searchTerm}
                        selectedType={selectedType}
                        selectedCategory={selectedCategory}
                        startDate={startDate}
                        endDate={endDate}
                    />

                </div>
            </div>
            <div className="text-sm text-gray-500">
                {filteredTransactions.length} of {transactions.length} transactions
                {filteredTransactions.length > ITEMS_PER_PAGE && (
                    <span> • Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length}</span>
                )}
            </div>

            {/* Summary Stats */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    <div className="text-center sm:text-left">
                        <p className="text-sm font-medium text-gray-600">Net Amount</p>
                        <p className="text-lg sm:text-2xl font-bold text-blue-600">
                            {totalAmount >= 0 ? '+' : ''}{formatCurrency(totalAmount, userCurrency)}
                        </p>
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-sm font-medium text-gray-600">Total Income</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600">
                            +{formatCurrency(totalIncome, userCurrency)}
                        </p>
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                        <p className="text-lg sm:text-2xl font-bold text-red-600">
                            -{formatCurrency(totalExpenses, userCurrency)}
                        </p>
                    </div>
                    <div className="text-center sm:text-left">
                        <p className="text-sm font-medium text-gray-600">Transaction Count</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900">{filteredTransactions.length}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search transactions..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value as "ALL" | "INCOME" | "EXPENSE")}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="ALL">All Types</option>
                            <option value="INCOME">Income</option>
                            <option value="EXPENSE">Expense</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Categories</option>
                            {uniqueCategories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setSelectedType("ALL");
                                setSelectedCategory("");
                                setStartDate("");
                                setEndDate("");
                            }}
                            className="w-full px-3 py-2 text-lg text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-900">Transactions</h2>
                    {filteredTransactions.length > ITEMS_PER_PAGE && (
                        <CompactPagination
                            currentPage={currentPage}
                            totalItems={filteredTransactions.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
                
                {filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="text-gray-400 text-4xl mb-4">📝</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                        <p className="text-gray-500">
                            {transactions.length === 0 
                                ? "Start by adding some income or expenses."
                                : "Try adjusting your filters to see more results."
                            }
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Transaction
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Account
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tags
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Notes
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedTransactions.map((transaction) => (
                                        <tr key={transaction.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white text-sm ${
                                                        transaction.type === 'INCOME' ? 'bg-green-500' : 'bg-red-500'
                                                    }`}>
                                                        {transaction.type === 'INCOME' ? '↗' : '↙'}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {transaction.title}
                                                        </div>
                                                        {transaction.description && (
                                                            <div className="text-sm text-gray-500">
                                                                {transaction.description}
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-gray-400">
                                                            {transaction.type}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.category}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {transaction.account}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                                <div className="flex flex-wrap gap-1">
                                                    {transaction.tags && transaction.tags.length > 0 ? (
                                                        transaction.tags.map((tag, index) => (
                                                            <span
                                                                key={index}
                                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                                title={tag}
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(transaction.date)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                                <div className="truncate" title={transaction.notes || ''}>
                                                    {transaction.notes || '-'}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                                                transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount, userCurrency)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Bottom pagination */}
                        {filteredTransactions.length > ITEMS_PER_PAGE && (
                            <div className="px-6 py-4 border-t border-gray-200 flex justify-center">
                                <CompactPagination
                                    currentPage={currentPage}
                                    totalItems={filteredTransactions.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
} 