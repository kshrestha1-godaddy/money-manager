"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { DebtList } from "../../components/DebtList";
import { DebtTable } from "../../components/DebtTable";
import { DebtInterface } from "../../types/debts";
import { Button } from "@repo/ui/button";
import { AddDebtModal } from "../../components/AddDebtModal";
import { EditDebtModal } from "../../components/EditDebtModal";
import { DeleteDebtModal } from "../../components/DeleteDebtModal";
import { ViewDebtModal } from "../../components/ViewDebtModal";
import { AddRepaymentModal } from "../../components/AddRepaymentModal";
import { getUserDebts, createDebt, updateDebt, deleteDebt } from "../../actions/debts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { calculateRemainingWithInterest } from "../../utils/interestCalculation";

export default function Debts() {
    const [debts, setDebts] = useState<DebtInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isAddRepaymentModalOpen, setIsAddRepaymentModalOpen] = useState(false);
    const [debtToEdit, setDebtToEdit] = useState<DebtInterface | null>(null);
    const [debtToDelete, setDebtToDelete] = useState<DebtInterface | null>(null);
    const [debtToView, setDebtToView] = useState<DebtInterface | null>(null);
    const [debtForRepayment, setDebtForRepayment] = useState<DebtInterface | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    const [viewMode, setViewMode] = useState<"cards" | "table">("table");
    const { currency: userCurrency } = useCurrency();

    useEffect(() => {
        loadDebts();
    }, []);

    const loadDebts = async () => {
        try {
            setLoading(true);
            setError(null);
            const userDebts = await getUserDebts();
            
            if (userDebts && !('error' in userDebts)) {
                setDebts(userDebts.data || []);
            } else {
                const errorMessage = userDebts?.error || "Unknown error";
                console.error("Error loading debts:", errorMessage);
                
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
                    setError(`Failed to load debts: ${errorMessage}`);
                }
                setDebts([]);
            }
        } catch (error) {
            console.error("Error loading debts:", error);
            setError(`An unexpected error occurred: ${error}`);
            setDebts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDebt = async (newDebt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) => {
        try {
            const debt = await createDebt(newDebt);
            setDebts(prevDebts => [debt, ...prevDebts]);
            setIsAddModalOpen(false);
            setError(null); // Clear any previous errors
        } catch (error) {
            console.error("Error adding debt:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            // Handle authentication errors
            if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
                setError("Your session has expired. Please sign in again.");
                setTimeout(() => {
                    signOut({ callbackUrl: "/api/auth/signin", redirect: true });
                }, 2000);
            } else {
                setError(`Failed to add debt: ${errorMessage}`);
            }
        }
    };

    const handleEditDebt = async (id: number, updatedDebt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) => {
        try {
            const debt = await updateDebt(id, updatedDebt);
            setDebts(prevDebts => prevDebts.map(d => d.id === id ? debt : d));
            setIsEditModalOpen(false);
            setDebtToEdit(null);
            setError(null); // Clear any previous errors
        } catch (error) {
            console.error("Error updating debt:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            // Handle authentication errors
            if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
                setError("Your session has expired. Please sign in again.");
                setTimeout(() => {
                    signOut({ callbackUrl: "/api/auth/signin", redirect: true });
                }, 2000);
            } else {
                setError(`Failed to update debt: ${errorMessage}`);
            }
        }
    };

    const handleDeleteDebt = async () => {
        if (!debtToDelete) return;
        
        try {
            await deleteDebt(debtToDelete.id);
            setDebts(prevDebts => prevDebts.filter(d => d.id !== debtToDelete.id));
            setIsDeleteModalOpen(false);
            setDebtToDelete(null);
            setError(null); // Clear any previous errors
        } catch (error) {
            console.error("Error deleting debt:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            
            // Handle authentication errors
            if (errorMessage.includes("Unauthorized") || errorMessage.includes("User not found")) {
                setError("Your session has expired. Please sign in again.");
                setTimeout(() => {
                    signOut({ callbackUrl: "/api/auth/signin", redirect: true });
                }, 2000);
            } else {
                setError(`Failed to delete debt: ${errorMessage}`);
            }
        }
    };

    const openEditModal = (debt: DebtInterface) => {
        setDebtToEdit(debt);
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (debt: DebtInterface) => {
        setDebtToDelete(debt);
        setIsDeleteModalOpen(true);
    };

    const openViewModal = (debt: DebtInterface) => {
        setDebtToView(debt);
        setIsViewModalOpen(true);
    };

    const openAddRepaymentModal = (debt: DebtInterface) => {
        setDebtForRepayment(debt);
        setIsAddRepaymentModalOpen(true);
    };

    // Get unique statuses for filter
    const uniqueStatuses = Array.from(new Set(debts.map(debt => debt.status))).sort();

    // Filter debts (sorting is now handled in DebtTable component)
    const filteredAndSortedDebts = debts
        .filter(debt => {
            const matchesSearch = 
                debt.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                debt.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                debt.borrowerContact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                debt.borrowerEmail?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = selectedStatus === "" || debt.status === selectedStatus;
            
            return matchesSearch && matchesStatus;
        });

    // Calculate summary statistics
    const totalLentAmount = debts.reduce((sum, debt) => sum + debt.amount, 0);
    const totalRepaidAmount = debts.reduce((sum, debt) => {
        const repaid = debt.repayments?.reduce((repSum, rep) => repSum + rep.amount, 0) || 0;
        return sum + repaid;
    }, 0);
    
    // Calculate totals including interest
    const totalWithInterest = debts.reduce((sum, debt) => {
        const calc = calculateRemainingWithInterest(debt.amount, debt.interestRate, debt.lentDate, debt.dueDate, debt.repayments || []);
        return sum + calc.totalWithInterest;
    }, 0);
    
    const totalRemainingAmount = debts.reduce((sum, debt) => {
        const calc = calculateRemainingWithInterest(debt.amount, debt.interestRate, debt.lentDate, debt.dueDate, debt.repayments || []);
        return sum + calc.remainingAmount;
    }, 0);
    
    const totalInterestAmount = totalWithInterest - totalLentAmount;
    
    const activeDebts = debts.filter(debt => debt.status === 'ACTIVE' || debt.status === 'PARTIALLY_PAID').length;
    const overdueDebts = debts.filter(debt => {
        const calc = calculateRemainingWithInterest(debt.amount, debt.interestRate, debt.lentDate, debt.dueDate, debt.repayments || []);
        return debt.dueDate && new Date() > debt.dueDate && calc.remainingAmount > 0;
    }).length;

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
                    <h1 className="text-3xl font-bold text-gray-900">Debts</h1>
                    <p className="text-gray-600 mt-1">Track money you've lent and manage repayments</p>
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
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        Add Debt
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {debts.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Debts</p>
                            <p className="text-2xl font-bold text-blue-600">{debts.length}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Active</p>
                            <p className="text-2xl font-bold text-green-600">{activeDebts}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Overdue</p>
                            <p className="text-2xl font-bold text-red-600">{overdueDebts}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Principal Lent</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {formatCurrency(totalLentAmount, userCurrency)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Interest Accrued</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {formatCurrency(totalInterestAmount, userCurrency)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Repaid</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(totalRepaidAmount, userCurrency)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Outstanding</p>
                            <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(totalRemainingAmount, userCurrency)}
                            </p>
                            <p className="text-xs text-gray-500">with interest</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters and Search */}
            {debts.length > 0 && (
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
                                placeholder="Search borrowers, purpose, contact..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                id="status"
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Statuses</option>
                                {uniqueStatuses.map(status => (
                                    <option key={status} value={status}>
                                        {status.replace('_', ' ')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Results Count */}
                        <div className="flex items-end">
                            <div className="text-sm text-gray-600">
                                Showing {filteredAndSortedDebts.length} of {debts.length} debts
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
            {debts.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No debts found</h3>
                    <p className="text-gray-600 mb-6">Start tracking money you've lent by adding your first debt record.</p>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        Add Your First Debt
                    </Button>
                </div>
            ) : filteredAndSortedDebts.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No matching debts</h3>
                    <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                </div>
            ) : (
                <>
                    {viewMode === "table" ? (
                        <DebtTable
                            debts={filteredAndSortedDebts}
                            onEdit={openEditModal}
                            onDelete={openDeleteModal}
                            onViewDetails={openViewModal}
                            onAddRepayment={openAddRepaymentModal}
                        />
                    ) : (
                        <DebtList
                            debts={filteredAndSortedDebts}
                            onEdit={openEditModal}
                            onDelete={openDeleteModal}
                            onViewDetails={openViewModal}
                            onAddRepayment={openAddRepaymentModal}
                        />
                    )}
                </>
            )}

            {/* Modals */}
            <AddDebtModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddDebt}
            />

            <EditDebtModal
                debt={debtToEdit}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setDebtToEdit(null);
                }}
                onEdit={handleEditDebt}
            />

            <DeleteDebtModal
                debt={debtToDelete}
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDebtToDelete(null);
                }}
                onConfirm={handleDeleteDebt}
            />

            <ViewDebtModal
                debt={debtToView}
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setDebtToView(null);
                }}
                onEdit={openEditModal}
                onAddRepayment={openAddRepaymentModal}
            />

            <AddRepaymentModal
                debt={debtForRepayment}
                isOpen={isAddRepaymentModalOpen}
                onClose={() => {
                    setIsAddRepaymentModalOpen(false);
                    setDebtForRepayment(null);
                }}
                onSuccess={loadDebts}
            />
        </div>
    );
} 