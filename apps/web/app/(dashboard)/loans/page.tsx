"use client";

import { useState } from "react";
import { LoanList } from "../../components/loans/LoanList";
import { LoanTable } from "../../components/loans/LoanTable";
import { LoanInterface } from "../../types/loans";
import { Button } from "@repo/ui/button";
import { AddLoanModal } from "../../components/loans/AddLoanModal";
import { EditLoanModal } from "../../components/loans/EditLoanModal";
import { DeleteLoanModal } from "../../components/loans/DeleteLoanModal";
import { ViewLoanModal } from "../../components/loans/ViewLoanModal";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useLoans } from "../../hooks/useLoans";

export default function Loans() {
    const { loans, loading, error, addLoan, editLoan, removeLoan } = useLoans();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [loanToEdit, setLoanToEdit] = useState<LoanInterface | null>(null);
    const [loanToDelete, setLoanToDelete] = useState<LoanInterface | null>(null);
    const [loanToView, setLoanToView] = useState<LoanInterface | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [viewMode, setViewMode] = useState<"cards" | "table">("table");
    const { currency: userCurrency } = useCurrency();

    const handleAddLoan = async (newLoan: Omit<LoanInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>) => {
        try {
            await addLoan(newLoan);
            setIsAddModalOpen(false);
        } catch (error) {
            console.error("Error in handleAddLoan:", error);
        }
    };

    const handleEditLoan = async (id: number, updatedLoan: Partial<Omit<LoanInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'repayments'>>) => {
        try {
            await editLoan(id, updatedLoan);
            setIsEditModalOpen(false);
            setLoanToEdit(null);
        } catch (error) {
            console.error("Error in handleEditLoan:", error);
        }
    };

    const handleDeleteLoan = async () => {
        if (!loanToDelete) return;
        try {
            await removeLoan(loanToDelete);
            setIsDeleteModalOpen(false);
            setLoanToDelete(null);
        } catch (error) {
            console.error("Error in handleDeleteLoan:", error);
        }
    };

    const openEditModal = (loan: LoanInterface) => {
        setLoanToEdit(loan);
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (loan: LoanInterface) => {
        setLoanToDelete(loan);
        setIsDeleteModalOpen(true);
    };

    const openViewModal = (loan: LoanInterface) => {
        setLoanToView(loan);
        setIsViewModalOpen(true);
    };

    // Filter loans
    const filteredLoans = loans.filter(loan => {
        const matchesSearch =
            loan.lenderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loan.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loan.lenderContact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loan.lenderEmail?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = selectedStatus === "" || loan.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    // Get unique statuses for filter
    const uniqueStatuses = Array.from(new Set(loans.map(loan => loan.status))).sort();

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Loans</h1>
                <Button onClick={() => setIsAddModalOpen(true)}>Add Loan</Button>
            </div>
            <div className="mb-4 flex gap-2">
                <input
                    type="text"
                    placeholder="Search by lender, purpose, contact, or email"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="border rounded px-2 py-1"
                />
                <select
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="border rounded px-2 py-1"
                >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
                <Button onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}>{viewMode === "table" ? "Card View" : "Table View"}</Button>
            </div>
            {viewMode === "table" ? (
                <LoanTable
                    loans={filteredLoans}
                    onEdit={openEditModal}
                    onDelete={openDeleteModal}
                    onView={openViewModal}
                />
            ) : (
                <LoanList
                    loans={filteredLoans}
                    onEdit={openEditModal}
                    onDelete={openDeleteModal}
                    onView={openViewModal}
                />
            )}
            <AddLoanModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={handleAddLoan} />
            <EditLoanModal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} loan={loanToEdit} onEdit={handleEditLoan} />
            <DeleteLoanModal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} loan={loanToDelete} onDelete={handleDeleteLoan} />
            <ViewLoanModal open={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} loan={loanToView} />
        </div>
    );
} 