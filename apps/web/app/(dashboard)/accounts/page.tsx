"use client";

import { useState, useEffect } from "react";
import { AccountList } from "../../components/AccountList";
import { AccountTable } from "../../components/AccountTable";
import { AccountInterface } from "../../types/accounts";
import { Button } from "@repo/ui/button";
import { AddAccountModal } from "../../components/AddAccountModal";
import { EditAccountModal } from "../../components/EditAccountModal";
import { DeleteAccountModal } from "../../components/DeleteAccountModal";
import { ViewAccountModal } from "../../components/ViewAccountModal";
import { getUserAccounts, createAccount, updateAccount, deleteAccount } from "../../actions/accounts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";

export default function Accounts() {
    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState<AccountInterface | null>(null);
    const [accountToDelete, setAccountToDelete] = useState<AccountInterface | null>(null);
    const [accountToView, setAccountToView] = useState<AccountInterface | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBank, setSelectedBank] = useState("");
    const [sortBy, setSortBy] = useState<"bank" | "holder" | "balance">("bank");
    const [viewMode, setViewMode] = useState<"cards" | "table">("table");
    const { currency: userCurrency } = useCurrency();

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            setLoading(true);
            const userAccounts = await getUserAccounts();
            // console.log("Load accounts result:", userAccounts);
            
            if (userAccounts && !('error' in userAccounts)) {
                setAccounts(userAccounts);
            } else {
                const errorMessage = userAccounts?.error || "Unknown error";
                console.error("Error loading accounts:", errorMessage);
                alert(`Error loading accounts: ${errorMessage}`);
                setAccounts([]);
            }
        } catch (error) {
            console.error("Error loading accounts:", error);
            alert(`Error loading accounts: ${error}`);
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = async (newAccount: Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
        try {
            const account = await createAccount(newAccount);
            setAccounts([account, ...accounts]);
            setIsAddModalOpen(false);
        } catch (error) {
            console.error("Error adding account:", error);
            alert("Failed to add account. Please try again.");
        }
    };

    const handleEditAccount = async (id: number, updatedAccount: Partial<Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
        try {
            const account = await updateAccount(id, updatedAccount);
            setAccounts(accounts.map(a => a.id === id ? account : a));
            setIsEditModalOpen(false);
            setAccountToEdit(null);
        } catch (error) {
            console.error("Error updating account:", error);
            alert("Failed to update account. Please try again.");
        }
    };

    const handleDeleteAccount = async () => {
        if (!accountToDelete) return;
        
        try {
            await deleteAccount(accountToDelete.id);
            setAccounts(accounts.filter(a => a.id !== accountToDelete.id));
            setIsDeleteModalOpen(false);
            setAccountToDelete(null);
        } catch (error) {
            console.error("Error deleting account:", error);
            alert("Failed to delete account. Please try again.");
        }
    };

    const openEditModal = (account: AccountInterface) => {
        setAccountToEdit(account);
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (account: AccountInterface) => {
        setAccountToDelete(account);
        setIsDeleteModalOpen(true);
    };

    const openViewModal = (account: AccountInterface) => {
        setAccountToView(account);
        setIsViewModalOpen(true);
    };

    // Get unique bank names for filter
    const uniqueBanks = Array.from(new Set(accounts.map(account => account.bankName))).sort();

    // Filter and sort accounts
    const filteredAndSortedAccounts = accounts
        .filter(account => {
            const matchesSearch = 
                account.holderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                account.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                account.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                account.branchName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesBank = selectedBank === "" || account.bankName === selectedBank;
            
            return matchesSearch && matchesBank;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "bank":
                    return a.bankName.localeCompare(b.bankName);
                case "holder":
                    return a.holderName.localeCompare(b.holderName);
                case "balance":
                    const balanceA = a.balance || 0;
                    const balanceB = b.balance || 0;
                    return balanceB - balanceA; // Descending order
                default:
                    return 0;
            }
        });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
                    <p className="text-gray-600 mt-1">Manage your bank accounts and financial information</p>
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
                        Add Account
                    </Button>
                </div>
            </div>

            {/* Summary Card */}
            {accounts.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                            <p className="text-2xl font-bold text-blue-600">{accounts.length}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Showing</p>
                            <p className="text-2xl font-bold text-purple-600">{filteredAndSortedAccounts.length}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Balance</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(filteredAndSortedAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0), userCurrency)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Banks</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {new Set(filteredAndSortedAccounts.map(acc => acc.bankName)).size}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters and Search */}
            {accounts.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search Accounts
                            </label>
                            <input
                                type="text"
                                placeholder="Search by name, bank, account number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
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
                                {uniqueBanks.map(bank => (
                                    <option key={bank} value={bank}>
                                        {bank}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sort By
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as "bank" | "holder" | "balance")}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="bank">Bank Name</option>
                                <option value="holder">Account Holder</option>
                                <option value="balance">Balance</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Clear Filters Button */}
                    {(searchTerm || selectedBank) && (
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setSelectedBank("");
                                }}
                                className="text-sm px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Account List */}
            {loading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">⏳</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading accounts...</h3>
                    <p className="text-gray-500">Please wait while we fetch your account information.</p>
                </div>
            ) : accounts.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">🏦</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts found</h3>
                    <p className="text-gray-500 mb-4">Get started by adding your first bank account.</p>
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        Add Your First Account
                    </Button>
                </div>
            ) : filteredAndSortedAccounts.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts match your filters</h3>
                    <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria.</p>
                    <button
                        onClick={() => {
                            setSearchTerm("");
                            setSelectedBank("");
                        }}
                        className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Clear Filters
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {viewMode === "table" ? (
                        <AccountTable 
                            accounts={filteredAndSortedAccounts} 
                            onEdit={openEditModal}
                            onDelete={openDeleteModal}
                            onViewDetails={openViewModal}
                        />
                    ) : (
                        <div className="p-6 flex flex-col gap-6 items-center">
                            <AccountList 
                                accounts={filteredAndSortedAccounts} 
                                onEdit={openEditModal}
                                onDelete={openDeleteModal}
                                onViewDetails={openViewModal}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Add Account Modal */}
            <AddAccountModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddAccount}
            />

            {/* Edit Account Modal */}
            <EditAccountModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setAccountToEdit(null);
                }}
                onEdit={handleEditAccount}
                account={accountToEdit}
            />

            {/* Delete Confirmation Modal */}
            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setAccountToDelete(null);
                }}
                onConfirm={handleDeleteAccount}
                account={accountToDelete}
            />

            {/* View Account Modal */}
            <ViewAccountModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setAccountToView(null);
                }}
                account={accountToView}
            />
        </div>
    );
}