"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { InvestmentList } from "../../components/investments/InvestmentList";
import { InvestmentTable } from "../../components/investments/InvestmentTable";
import { InvestmentInterface } from "../../types/investments";
import { Button } from "@repo/ui/button";
import { AddInvestmentModal } from "../../components/investments/AddInvestmentModal";
import { EditInvestmentModal } from "../../components/investments/EditInvestmentModal";
import { DeleteInvestmentModal } from "../../components/investments/DeleteInvestmentModal";
import { ViewInvestmentModal } from "../../components/investments/ViewInvestmentModal";
import { getUserInvestments, createInvestment, updateInvestment, deleteInvestment } from "../../actions/investments";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { triggerBalanceRefresh } from "../../hooks/useTotalBalance";
import { exportInvestmentsToCSV } from "../../utils/csvExportInvestments";
import { BulkImportModal } from "../../components/investments/BulkImportModal";

export default function Investments() {
    const [investments, setInvestments] = useState<InvestmentInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [investmentToEdit, setInvestmentToEdit] = useState<InvestmentInterface | null>(null);
    const [investmentToDelete, setInvestmentToDelete] = useState<InvestmentInterface | null>(null);
    const [investmentToView, setInvestmentToView] = useState<InvestmentInterface | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState("");

    const [viewMode, setViewMode] = useState<"cards" | "table">("table");
    const { currency: userCurrency } = useCurrency();

    useEffect(() => {
        loadInvestments();
    }, []);

    const loadInvestments = async () => {
        try {
            setLoading(true);
            setError(null);
            const userInvestments = await getUserInvestments();
            
            if (userInvestments && !('error' in userInvestments)) {
                setInvestments(userInvestments.data || []);
            } else {
                const errorMessage = userInvestments?.error || "Unknown error";
                console.error("Error loading investments:", errorMessage);
                
                // Handle authentication/session errors differently
                if (errorMessage === "User not found" || errorMessage === "Unauthorized") {
                    console.log("Authentication error detected, signing out user");
                    setError("Your session has expired. Please sign in again.");
                    // Sign out the user and redirect to login
                    setTimeout(() => {
                        signOut({ 
                            callbackUrl: "/api/auth/signin",
                            redirect: true 
                        });
                    }, 2000);
                } else {
                    setError(`Failed to load investments: ${errorMessage}`);
                }
                setInvestments([]);
            }
        } catch (error) {
            console.error("Error loading investments:", error);
            setError(`An unexpected error occurred: ${error}`);
            setInvestments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddInvestment = async (newInvestment: Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account'>) => {
        try {
            const investment = await createInvestment(newInvestment);
            setInvestments(prevInvestments => [investment, ...prevInvestments]);
            setIsAddModalOpen(false);
            setError(null); // Clear any previous errors
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error adding investment:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            // Handle authentication errors
            if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
                setError("Your session has expired. Please sign in again.");
                setTimeout(() => {
                    signOut({ callbackUrl: "/api/auth/signin", redirect: true });
                }, 2000);
            } else {
                setError(`Failed to add investment: ${errorMessage}`);
            }
        }
    };

    const handleEditInvestment = async (id: number, updatedInvestment: Partial<Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account'>>) => {
        try {
            const investment = await updateInvestment(id, updatedInvestment);
            setInvestments(prevInvestments => prevInvestments.map(i => i.id === id ? investment : i));
            setIsEditModalOpen(false);
            setInvestmentToEdit(null);
            setError(null); // Clear any previous errors
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error updating investment:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            // Handle authentication errors
            if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
                setError("Your session has expired. Please sign in again.");
                setTimeout(() => {
                    signOut({ callbackUrl: "/api/auth/signin", redirect: true });
                }, 2000);
            } else {
                setError(`Failed to update investment: ${errorMessage}`);
            }
        }
    };

    const handleDeleteInvestment = async () => {
        if (!investmentToDelete) return;
        
        try {
            await deleteInvestment(investmentToDelete.id);
            setInvestments(prevInvestments => prevInvestments.filter(i => i.id !== investmentToDelete.id));
            setIsDeleteModalOpen(false);
            setInvestmentToDelete(null);
            setError(null); // Clear any previous errors
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error) {
            console.error("Error deleting investment:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            // Handle authentication errors
            if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
                setError("Your session has expired. Please sign in again.");
                setTimeout(() => {
                    signOut({ callbackUrl: "/api/auth/signin", redirect: true });
                }, 2000);
            } else {
                setError(`Failed to delete investment: ${errorMessage}`);
            }
        }
    };

    const openEditModal = (investment: InvestmentInterface) => {
        setInvestmentToEdit(investment);
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (investment: InvestmentInterface) => {
        setInvestmentToDelete(investment);
        setIsDeleteModalOpen(true);
    };

    const openViewModal = (investment: InvestmentInterface) => {
        setInvestmentToView(investment);
        setIsViewModalOpen(true);
    };

    const handleExportToCSV = () => {
        if (investments.length === 0) {
            alert("No investments to export");
            return;
        }
        exportInvestmentsToCSV(investments);
    };

    // Get unique types for filter
    const uniqueTypes = Array.from(new Set(investments.map(investment => investment.type))).sort();

    // Filter investments
    const filteredAndSortedInvestments = investments
        .filter(investment => {
            const matchesSearch = 
                investment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                investment.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                investment.notes?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesType = selectedType === "" || investment.type === selectedType;
            
            return matchesSearch && matchesType;
        });

    // Calculate summary statistics
    const totalInvested = investments.reduce((sum, investment) => sum + (investment.quantity * investment.purchasePrice), 0);
    const totalCurrentValue = investments.reduce((sum, investment) => sum + (investment.quantity * investment.currentPrice), 0);
    const totalGain = totalCurrentValue - totalInvested;
    const totalGainPercentage = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(2) : "0.00";
    const gainers = investments.filter(investment => investment.currentPrice > investment.purchasePrice).length;
    const losers = investments.filter(investment => investment.currentPrice < investment.purchasePrice).length;

    const formatType = (type: string) => {
        return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-red-800">{error}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <div className="-mx-1.5 -my-1.5">
                                <button
                                    onClick={() => setError(null)}
                                    className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                                >
                                    <span className="sr-only">Dismiss</span>
                                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Investments</h1>
                    <p className="text-gray-600 mt-1">Track your investment portfolio and performance</p>
                </div>
                <div className="flex items-start space-x-3">
                    {/* View Toggle */}
                    <div className="flex rounded-md border border-gray-300 bg-white">
                        <button
                            onClick={() => setViewMode("table")}
                            className={`px-3 py-2.5 text-sm font-medium rounded-l-md transition-colors flex items-center ${
                                viewMode === "table"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            📋 Table
                        </button>
                        <button
                            onClick={() => setViewMode("cards")}
                            className={`px-3 py-2.5 text-sm font-medium rounded-r-md transition-colors flex items-center ${
                                viewMode === "cards"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            🗃️ Cards
                        </button>
                    </div>
                    <Button onClick={() => setIsBulkImportModalOpen(true)}>
                        Import CSV
                    </Button>
                    {investments.length > 0 && (
                        <Button onClick={handleExportToCSV}>
                            Export CSV
                        </Button>
                    )}
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        Add Investment
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {investments.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Investments</p>
                            <p className="text-2xl font-bold text-blue-600">{investments.length}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Gainers</p>
                            <p className="text-2xl font-bold text-green-600">{gainers}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Losers</p>
                            <p className="text-2xl font-bold text-red-600">{losers}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Invested</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {formatCurrency(totalInvested, userCurrency)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Current Value</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(totalCurrentValue, userCurrency)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Gain/Loss</p>
                            <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(totalGain, userCurrency)}
                            </p>
                            <p className={`text-sm ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({totalGainPercentage}%)
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters and Search */}
            {investments.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search */}
                        <div>
                            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                                Search
                            </label>
                            <input
                                type="text"
                                id="search"
                                placeholder="Search investments, symbols, notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Type Filter */}
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                                Type
                            </label>
                            <select
                                id="type"
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Types</option>
                                {uniqueTypes.map(type => (
                                    <option key={type} value={type}>
                                        {formatType(type)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Results Count */}
                        <div className="flex items-end">
                            <div className="text-sm text-gray-600">
                                Showing {filteredAndSortedInvestments.length} of {investments.length} investments
                                <br />
                                <span className="text-xs text-gray-500">
                                    Click column headers to sort
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {investments.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No investments found</h3>
                    <p className="text-gray-600 mb-6">Start building your investment portfolio by adding your first investment.</p>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        Add Your First Investment
                    </Button>
                </div>
            ) : filteredAndSortedInvestments.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No matching investments</h3>
                    <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                </div>
            ) : (
                <>
                    {viewMode === "table" ? (
                        <InvestmentTable
                            investments={filteredAndSortedInvestments}
                            onEdit={openEditModal}
                            onDelete={openDeleteModal}
                            onViewDetails={openViewModal}
                        />
                    ) : (
                        <InvestmentList
                            investments={filteredAndSortedInvestments}
                            onEdit={openEditModal}
                            onDelete={openDeleteModal}
                            onViewDetails={openViewModal}
                        />
                    )}
                </>
            )}

            {/* Modals */}
            <AddInvestmentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddInvestment}
            />

            <EditInvestmentModal
                investment={investmentToEdit}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setInvestmentToEdit(null);
                }}
                onEdit={handleEditInvestment}
            />

            <DeleteInvestmentModal
                investment={investmentToDelete}
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setInvestmentToDelete(null);
                }}
                onConfirm={handleDeleteInvestment}
            />

            <ViewInvestmentModal
                investment={investmentToView}
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setInvestmentToView(null);
                }}
                onEdit={openEditModal}
            />

            <BulkImportModal
                isOpen={isBulkImportModalOpen}
                onClose={() => setIsBulkImportModalOpen(false)}
                onSuccess={() => {
                    setIsBulkImportModalOpen(false);
                    loadInvestments();
                }}
            />
        </div>
    );
}