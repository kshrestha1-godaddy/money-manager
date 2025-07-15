"use client";

import { useState, useMemo } from "react";
import { DebtList } from "../../components/debts/DebtList";
import { DebtTable } from "../../components/debts/DebtTable";
import { DebtInterface } from "../../types/debts";
import { Button } from "@repo/ui/button";
import { AddDebtModal } from "../../components/debts/AddDebtModal";
import { EditDebtModal } from "../../components/debts/EditDebtModal";
import { DeleteDebtModal } from "../../components/debts/DeleteDebtModal";
import { ViewDebtModal } from "../../components/debts/ViewDebtModal";
import { AddRepaymentModal } from "../../components/debts/AddRepaymentModal";
import { DebtErrorBoundary } from "../../components/debts/ErrorBoundary";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { calculateRemainingWithInterest } from "../../utils/interestCalculation";
import { useDebts } from "../../hooks/useDebts";
import { exportDebtsToCSV } from "../../utils/csvExportDebts";
import { BulkImportModal } from "../../components/debts/BulkImportModal";
import { bulkDeleteDebts } from "../../actions/debts";


// Modal types for cleaner state management
type ModalType = 'add' | 'edit' | 'delete' | 'view' | 'repayment' | 'import' | null;

interface ModalState {
  type: ModalType;
  debt?: DebtInterface;
}

// Debt section configuration
const DEBT_SECTIONS = [
  { key: 'ACTIVE', title: 'Active Debts', statuses: ['ACTIVE'] },
  { key: 'PARTIALLY_PAID', title: 'Partially Paid Debts', statuses: ['PARTIALLY_PAID'] },
  { key: 'FULLY_PAID', title: 'Fully Paid Debts', statuses: ['FULLY_PAID'] }
] as const;

export default function Debts() {
    const { currency: userCurrency } = useCurrency();
    const { debts, loading, error, addDebt: handleAddDebt, editDebt: handleEditDebt, removeDebt: handleDeleteDebt, addRepaymentToDebt, deleteRepaymentFromDebt, clearError } = useDebts();
    
    // Modal state
    const [modal, setModal] = useState<ModalState>({ type: null });
    const [viewMode, setViewMode] = useState<"table" | "cards">("table");
    const [selectedDebts, setSelectedDebts] = useState<Set<number>>(new Set());
    
    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    const openModal = (type: ModalType, debt?: DebtInterface) => setModal({ type, debt });
    const closeModal = () => setModal({ type: null });

    const handleDebtSelect = (debtId: number, selected: boolean) => {
        setSelectedDebts(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(debtId);
            } else {
                newSet.delete(debtId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (selected: boolean, sectionDebts: DebtInterface[]) => {
        setSelectedDebts(prev => {
            const newSet = new Set(prev);
            sectionDebts.forEach(debt => {
                if (selected) {
                    newSet.add(debt.id);
                } else {
                    newSet.delete(debt.id);
                }
            });
            return newSet;
        });
    };

    const handleBulkDelete = async (sectionDebts: DebtInterface[]) => {
        const selectedInSection = sectionDebts.filter(debt => selectedDebts.has(debt.id));
        
        if (selectedInSection.length === 0) {
            alert("No debts selected for deletion");
            return;
        }

        const confirmMessage = `Are you sure you want to delete ${selectedInSection.length} debt(s)? This action cannot be undone.`;
        if (!confirm(confirmMessage)) return;

        try {
            // Delete debts one by one (since we don't have bulk delete for debts yet)
            await Promise.all(selectedInSection.map(debt => handleDeleteDebt(debt)));
            
            // Clear selection
            setSelectedDebts(new Set());
        } catch (error) {
            console.error("Error during bulk delete:", error);
            alert("Some debts could not be deleted. Please try again.");
        }
    };

    const handleExportToCSV = () => {
        if (debts.length === 0) {
            alert("No debts to export");
            return;
        }
        exportDebtsToCSV(debts);
    };

    // Memoized calculations to avoid redundant processing
    const processedData = useMemo(() => {
        // Pre-calculate all debt calculations once
        const debtsWithCalculations = debts.map(debt => {
            const calc = calculateRemainingWithInterest(
                debt.amount,
                debt.interestRate,
                debt.lentDate,
                debt.dueDate,
                debt.repayments || [],
                new Date(),
                debt.status
            );
            const totalRepayments = debt.repayments?.reduce((sum, rep) => sum + rep.amount, 0) || 0;
            const isOverdue = debt.dueDate && new Date() > debt.dueDate && calc.remainingAmount > 0;
            
            return {
                ...debt,
                calculations: calc,
                totalRepayments,
                isOverdue
            };
        });

        // Filter debts
        const filteredDebts = debtsWithCalculations.filter(debt => {
            const matchesSearch = !searchTerm || [
                debt.borrowerName,
                debt.purpose,
                debt.borrowerContact,
                debt.borrowerEmail
            ].some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesStatus = !selectedStatus || debt.status === selectedStatus;
            
            return matchesSearch && matchesStatus;
        });

        // Group by sections
        const sections = DEBT_SECTIONS.map(section => ({
            ...section,
            debts: filteredDebts.filter(debt => (section.statuses as readonly string[]).includes(debt.status))
        }));

        // Calculate summary statistics
        const stats = {
            totalDebts: debts.length,
            activeDebts: debts.filter(d => d.status === 'ACTIVE' || d.status === 'PARTIALLY_PAID').length,
            overdueDebts: debtsWithCalculations.filter(d => d.isOverdue).length,
            totalLentAmount: debts.reduce((sum, debt) => sum + debt.amount, 0),
            totalRepaidAmount: debtsWithCalculations.reduce((sum, debt) => sum + debt.totalRepayments, 0),
            totalWithInterest: debtsWithCalculations.reduce((sum, debt) => sum + debt.calculations.totalWithInterest, 0),
            totalRemainingAmount: debtsWithCalculations.reduce((sum, debt) => sum + debt.calculations.remainingAmount, 0)
        };

        const totalInterestAmount = stats.totalWithInterest - stats.totalLentAmount;

        return {
            sections,
            filteredDebts,
            stats: { ...stats, totalInterestAmount },
            uniqueStatuses: Array.from(new Set(debts.map(debt => debt.status))).sort()
        };
    }, [debts, searchTerm, selectedStatus]);

    // Simplified CRUD handlers
    const handleAddDebtAction = async (newDebt: Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) => {
        try {
            await handleAddDebt(newDebt);
            closeModal();
        } catch (error) {
            console.error("Error adding debt:", error);
            // Error is handled by the hook
        }
    };

    const handleEditDebtAction = async (id: number, updatedDebt: Partial<Omit<DebtInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) => {
        try {
            await handleEditDebt(id, updatedDebt);
            closeModal();
        } catch (error) {
            console.error("Error updating debt:", error);
            // Error is handled by the hook
        }
    };

    const handleDeleteDebtAction = async () => {
        if (!modal.debt) return;
        try {
            await handleDeleteDebt(modal.debt);
            closeModal();
        } catch (error) {
            console.error("Error deleting debt:", error);
            // Error is handled by the hook
        }
    };

    // Memoized calculations to avoid redundant processing
    const renderSection = (section: { key: string; title: string; statuses: readonly string[]; debts: DebtInterface[] }) => {
        if (section.debts.length === 0) return null;

        const SectionComponent = viewMode === "table" ? DebtTable : DebtList;
        
        return (
            <div key={section.key}>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">{section.title}</h2>
                <SectionComponent
                    debts={section.debts}
                    onEdit={(debt) => openModal('edit', debt)}
                    onDelete={(debt) => openModal('delete', debt)}
                    onViewDetails={(debt) => openModal('view', debt)}
                    onAddRepayment={(debt) => openModal('repayment', debt)}
                    selectedDebts={selectedDebts}
                    onDebtSelect={handleDebtSelect}
                    onSelectAll={(selected) => handleSelectAll(selected, section.debts)}
                    showBulkActions={true}
                    onBulkDelete={() => handleBulkDelete(section.debts)}
                    onClearSelection={() => handleSelectAll(false, section.debts)}
                />
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <DebtErrorBoundary>
            <div className="space-y-6">
                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-red-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                            <button
                                onClick={clearError}
                                className="text-red-500 hover:text-red-700"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Debts</h1>
                        <p className="text-gray-600 mt-1">Track money you've lent and manage repayments</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* View Toggle */}
                        <div className="flex rounded-md border border-gray-300 bg-white">
                            <button
                                onClick={() => setViewMode("table")}
                                className={`px-3 py-2 text-sm font-medium rounded-l-md transition-colors ${
                                    viewMode === "table" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                📋 Table
                            </button>
                            <button
                                onClick={() => setViewMode("cards")}
                                className={`px-3 py-2 text-sm font-medium rounded-r-md transition-colors ${
                                    viewMode === "cards" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                🗃️ Cards
                            </button>
                        </div>
                        <Button onClick={() => openModal('import')}>Import CSV</Button>
                        {debts.length > 0 && <Button onClick={handleExportToCSV}>Export CSV</Button>}
                        <Button onClick={() => openModal('add')}>Add Debt</Button>
                    </div>
                </div>

                {/* Summary Cards */}
                {debts.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-6">
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-600 mb-2">Total Debts</p>
                                <p className="text-2xl font-bold text-blue-600">{processedData.stats.totalDebts}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-600 mb-2">Active</p>
                                <p className="text-2xl font-bold text-green-600">{processedData.stats.activeDebts}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-600 mb-2">Overdue</p>
                                <p className="text-2xl font-bold text-red-600">{processedData.stats.overdueDebts}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-600 mb-2">Principal Lent</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {formatCurrency(processedData.stats.totalLentAmount, userCurrency)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-600 mb-2">Interest Accrued</p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {formatCurrency(processedData.stats.totalInterestAmount, userCurrency)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-600 mb-2">Total Repaid</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(processedData.stats.totalRepaidAmount, userCurrency)}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-600 mb-2">Outstanding</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(processedData.stats.totalRemainingAmount, userCurrency)}
                                </p>
                                <p className="text-sm text-gray-500">with interest</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                {debts.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                <input
                                    type="text"
                                    placeholder="Search borrowers, purpose, contact..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Statuses</option>
                                    {processedData.uniqueStatuses.map(status => (
                                        <option key={status} value={status}>
                                            {status.replace('_', ' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <div className="text-sm text-gray-600">
                                    Showing {processedData.filteredDebts.length} of {debts.length} debts
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
                        <Button onClick={() => openModal('add')}>Add Your First Debt</Button>
                    </div>
                ) : processedData.filteredDebts.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No matching debts</h3>
                        <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {processedData.sections.map(renderSection)}
                    </div>
                )}

                {/* Modals */}
                <AddDebtModal
                    isOpen={modal.type === 'add'}
                    onClose={closeModal}
                    onAdd={handleAddDebtAction}
                />

                <EditDebtModal
                    debt={modal.debt || null}
                    isOpen={modal.type === 'edit'}
                    onClose={closeModal}
                    onEdit={handleEditDebtAction}
                />

                <DeleteDebtModal
                    debt={modal.debt || null}
                    isOpen={modal.type === 'delete'}
                    onClose={closeModal}
                    onConfirm={handleDeleteDebtAction}
                />

                <ViewDebtModal
                    debtId={modal.debt?.id || null}
                    isOpen={modal.type === 'view'}
                    onClose={closeModal}
                    onEdit={(debt) => openModal('edit', debt)}
                    onAddRepayment={(debt) => openModal('repayment', debt)}
                    onDeleteRepayment={async (repaymentId, debtId) => {
                        await deleteRepaymentFromDebt(repaymentId, debtId);
                    }}
                />

                <AddRepaymentModal
                    debt={modal.debt || null}
                    isOpen={modal.type === 'repayment'}
                    onClose={closeModal}
                    onAdd={async (repaymentData) => {
                        // Add the repayment using the optimized hook
                        await addRepaymentToDebt(modal.debt!.id, repaymentData);
                    }}
                />

                <BulkImportModal
                    isOpen={modal.type === 'import'}
                    onClose={closeModal}
                    onSuccess={() => {
                        closeModal();
                        // loadDebts(); // This line is removed as per the new_code's handleBulkDelete
                    }}
                />
            </div>
        </DebtErrorBoundary>
    );
} 