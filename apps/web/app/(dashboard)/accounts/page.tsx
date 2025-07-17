"use client";

import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { AccountList } from "../../components/accounts/AccountList";
import { AccountTable } from "../../components/accounts/AccountTable";
import { Button } from "@repo/ui/button";
import { AddAccountModal } from "../../components/accounts/AddAccountModal";
import { EditAccountModal } from "../../components/accounts/EditAccountModal";
import { DeleteAccountModal } from "../../components/accounts/DeleteAccountModal";
import { ViewAccountModal } from "../../components/accounts/ViewAccountModal";
import { ShareAccountModal } from "../../components/accounts/ShareAccountModal";
import { ImportAccountModal } from "../../components/accounts/ImportAccountModal";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { BankBalanceChart } from "../../components/BankBalanceChart";
import { useOptimizedAccounts } from "../../hooks/useOptimizedAccounts";
import { getUserAccounts } from "../../actions/accounts";
import { AccountInterface } from "../../types/accounts";

export default function Accounts() {
    const { currency: userCurrency } = useCurrency();

    // Use the optimized accounts hook
    const {
        // Data
        accounts,
        loading,
        error,
        totalBalance,
        hasActiveFilters,

        // Modal states
        isAddModalOpen,
        setIsAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isViewModalOpen,
        setIsViewModalOpen,
        isShareModalOpen,
        setIsShareModalOpen,
        isImportModalOpen,
        setIsImportModalOpen,

        // Filter states
        selectedAccounts,
        setSelectedAccounts,
        searchTerm,
        setSearchTerm,
        selectedBank,
        setSelectedBank,
        selectedAccountType,
        setSelectedAccountType,

        // Selected items
        accountToEdit,
        setAccountToEdit,
        accountToDelete,
        setAccountToDelete,
        accountToView,
        setAccountToView,
        accountToShare,
        setAccountToShare,

        // View mode
        viewMode,
        setViewMode,

        // Handlers
        handleAddAccount,
        handleEditAccount,
        handleDeleteAccount,
        handleBulkDelete,
        handleBulkImportSuccess,
        handleExportToCSV,
        handleAccountSelect,
        handleSelectAll,
        clearFilters,
        openEditModal,
        openViewModal,
        openDeleteModal,
        openShareModal,
    } = useOptimizedAccounts();

    // The accounts from the hook are already filtered
    const filteredAccounts = accounts;
    const filteredTotalBalance = totalBalance;

    // Get unique bank names and account types for filters from the hook's allAccounts
    // We need to get all accounts for the filter options, not just filtered ones
    const { data: allAccountsData } = useQuery({
        queryKey: ['accounts'],
        queryFn: getUserAccounts,
    });
    const allAccounts = allAccountsData && !('error' in allAccountsData) ? allAccountsData : [];
    
    const uniqueBankNames = Array.from(new Set(allAccounts.map(account => account.bankName)));
    const uniqueAccountTypes = Array.from(new Set(allAccounts.map(account => account.accountType)));

    const handleClearFilters = () => {
        setSearchTerm("");
        setSelectedBank("");
        setSelectedAccountType("");
        clearFilters();
    };

    // Display error if there's one
    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Accounts</h3>
                    <p className="text-red-600">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Accounts</h1>
                    <p className="text-gray-600">Manage your bank accounts and financial institutions</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                    >
                        Add Account
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-4 py-2 border border-gray-600 text-gray-600 hover:bg-blue-50 rounded-md"
                    >
                        Import CSV
                    </button>
                    <button
                        onClick={handleExportToCSV}
                        className="px-4 py-2 border border-gray-600 text-gray-600 hover:bg-green-50 rounded-md disabled:opacity-50"
                        disabled={filteredAccounts.length === 0}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <h3 className="text-sm font-medium text-gray-600">Total Accounts</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                        {loading ? "..." : filteredAccounts.length}
                    </p>
                    <p className="text-sm text-gray-500">active accounts</p>
                </div>
                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <h3 className="text-sm font-medium text-gray-600">Total Balance</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                        {loading ? "..." : formatCurrency(filteredTotalBalance, userCurrency)}
                    </p>
                    <p className="text-sm text-gray-500">total balance</p>
                </div>
                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <h3 className="text-sm font-medium text-gray-600">Selected</h3>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                        {selectedAccounts.size}
                    </p>
                    <p className="text-sm text-gray-500">accounts selected</p>
                </div>
                <div className="bg-white rounded-lg border p-4 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <h3 className="text-sm font-medium text-gray-600">Bank Types</h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                        {loading ? "..." : [...new Set(filteredAccounts.map(acc => acc.bankName))].length}
                    </p>
                    <p className="text-sm text-gray-500">unique banks</p>
                </div>
            </div>

            {/* Balance Chart */}
            {!loading && accounts.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Balances</h3>
                    <BankBalanceChart accounts={accounts} />
                </div>
            )}

            {/* Filters and Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex flex-col lg:flex-row gap-4 mb-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search accounts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:w-auto">
                        <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Banks</option>
                            {uniqueBankNames.map((bank) => (
                                <option key={bank} value={bank}>
                                    {bank}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedAccountType}
                            onChange={(e) => setSelectedAccountType(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Types</option>
                            {uniqueAccountTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <button
                                onClick={handleClearFilters}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                disabled={!hasActiveFilters}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>



                {/* View Mode Toggle */}
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">View:</span>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`px-3 py-1 rounded text-sm ${
                                viewMode === "table"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            Table
                        </button>
                        <button
                            onClick={() => setViewMode("cards")}
                            className={`px-3 py-1 rounded text-sm ${
                                viewMode === "cards"
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            Cards
                        </button>
                    </div>
                    <div className="text-sm text-gray-600">
                        {loading ? "Loading..." : `${filteredAccounts.length} of ${allAccounts.length} accounts`}
                    </div>
                </div>
            </div>

            {/* Accounts List/Table */}
            {loading ? (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                    <div className="animate-spin mx-auto mb-4 h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <p className="text-gray-600">Loading accounts...</p>
                </div>
            ) : filteredAccounts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0H3" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {hasActiveFilters ? "No accounts match your filters" : "No accounts yet"}
                    </h3>
                    <p className="text-gray-600 mb-6">
                        {hasActiveFilters 
                            ? "Try adjusting your search criteria or clearing filters." 
                            : "Get started by adding your first bank account."
                        }
                    </p>
                    {hasActiveFilters ? (
                        <button onClick={handleClearFilters} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                            Clear Filters
                        </button>
                    ) : (
                        <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            Add Your First Account
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {viewMode === "table" ? (
                        <AccountTable
                            accounts={filteredAccounts}
                            selectedAccounts={selectedAccounts}
                            onAccountSelect={handleAccountSelect}
                            onSelectAll={(checked) => handleSelectAll(checked)}
                            showBulkActions={true}
                            onBulkDelete={handleBulkDelete}
                            onClearSelection={() => setSelectedAccounts(new Set())}
                            onEdit={openEditModal}
                            onDelete={openDeleteModal}
                            onViewDetails={openViewModal}
                            onShare={openShareModal}
                        />
                    ) : (
                        <AccountList
                            accounts={filteredAccounts}
                            selectedAccounts={selectedAccounts}
                            onAccountSelect={handleAccountSelect}
                            onSelectAll={(checked) => handleSelectAll(checked)}
                            showBulkActions={true}
                            onBulkDelete={handleBulkDelete}
                            onClearSelection={() => setSelectedAccounts(new Set())}
                            onEdit={openEditModal}
                            onDelete={openDeleteModal}
                            onViewDetails={openViewModal}
                            onShare={openShareModal}
                        />
                    )}
                </>
            )}

            {/* Modals */}
            <AddAccountModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddAccount}
            />

            <EditAccountModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setAccountToEdit(null);
                }}
                onEdit={handleEditAccount}
                account={accountToEdit}
            />

            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setAccountToDelete(null);
                }}
                onConfirm={handleDeleteAccount}
                account={accountToDelete}
            />

            <ViewAccountModal
                isOpen={isViewModalOpen}
                onClose={() => {
                    setIsViewModalOpen(false);
                    setAccountToView(null);
                }}
                account={accountToView}
            />

            <ShareAccountModal
                isOpen={isShareModalOpen}
                onClose={() => {
                    setIsShareModalOpen(false);
                    setAccountToShare(null);
                }}
                account={accountToShare}
            />

            <ImportAccountModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleBulkImportSuccess}
            />
        </div>
    );
}