"use client";

import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { AccountTable } from "../../components/accounts/AccountTable";
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
import { 
    getSummaryCardClasses,
    BUTTON_COLORS,
    TEXT_COLORS,
    CONTAINER_COLORS,
    INPUT_COLORS,
    LOADING_COLORS,
    UI_STYLES,
} from "../../config/colorConfig";

// Extract color variables for better readability
const pageContainer = CONTAINER_COLORS.page;
const errorContainer = CONTAINER_COLORS.error;
const whiteContainer = CONTAINER_COLORS.whiteWithPadding;
const cardContainer = CONTAINER_COLORS.card;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

const pageTitle = TEXT_COLORS.title;
const pageSubtitle = TEXT_COLORS.subtitle;
const errorTitle = TEXT_COLORS.errorTitle;
const errorMessage = TEXT_COLORS.errorMessage;
const cardTitle = TEXT_COLORS.cardTitle;
const cardValue = TEXT_COLORS.cardValue;
const cardSubtitle = TEXT_COLORS.cardSubtitle;
const emptyTitle = TEXT_COLORS.emptyTitle;
const emptyMessage = TEXT_COLORS.emptyMessage;
const resultText = TEXT_COLORS.resultText;
const chartTitle = TEXT_COLORS.chartTitle;
const labelText = TEXT_COLORS.label;

const primaryButton = BUTTON_COLORS.primary;
const secondaryBlueButton = BUTTON_COLORS.secondaryBlue;
const secondaryGreenButton = BUTTON_COLORS.secondaryGreen;
const clearButton = BUTTON_COLORS.clear;
const clearFilterButton = BUTTON_COLORS.clearFilter;

const standardInput = INPUT_COLORS.standard;

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
        startDate,
        setStartDate,
        endDate,
        setEndDate,

        // Selected items
        accountToEdit,
        setAccountToEdit,
        accountToDelete,
        setAccountToDelete,
        accountToView,
        setAccountToView,
        accountToShare,
        setAccountToShare,

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
                <div className={errorContainer}>
                    <h3 className={errorTitle}>Error Loading Accounts</h3>
                    <p className={errorMessage}>{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className={primaryButton + " mt-4"}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className={loadingContainer}>
                <div className={loadingSpinner}></div>
                <p className={loadingText}>Loading accounts...</p>
            </div>
        );
    }

    return (
        <div className={pageContainer}>
            {/* Header */}
            <div className={UI_STYLES.header.container}>
                <div>
                    <h1 className={pageTitle}>Accounts</h1>
                    <p className={pageSubtitle}>Manage your bank accounts and financial institutions</p>
                </div>
                <div className={UI_STYLES.header.buttonGroup}>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className={primaryButton}
                    >
                        Add Account
                    </button>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className={secondaryBlueButton}
                    >
                        Import CSV
                    </button>
                    <button
                        onClick={handleExportToCSV}
                        className={secondaryGreenButton}
                        disabled={filteredAccounts.length === 0}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('totalAccounts', 'accounts').indicator}`}></div>
                        <h3 className={cardTitle}>Total Accounts</h3>
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('totalAccounts', 'accounts').text}`}>
                        {loading ? "..." : filteredAccounts.length}
                    </p>
                    <p className={cardSubtitle}>active accounts</p>
                </div>
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('totalBalance', 'accounts').indicator}`}></div>
                        <h3 className={cardTitle}>Total Balance</h3>
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('totalBalance', 'accounts').text}`}>
                        {loading ? "..." : formatCurrency(filteredTotalBalance, userCurrency)}
                    </p>
                    <p className={cardSubtitle}>total balance</p>
                </div>
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('selected', 'accounts').indicator}`}></div>
                        <h3 className={cardTitle}>Selected</h3>
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('selected', 'accounts').text}`}>
                        {selectedAccounts.size}
                    </p>
                    <p className={cardSubtitle}>accounts selected</p>
                </div>
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('bankTypes', 'accounts').indicator}`}></div>
                        <h3 className={cardTitle}>Bank Types</h3>
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('bankTypes', 'accounts').text}`}>
                        {loading ? "..." : [...new Set(filteredAccounts.map(acc => acc.bankName))].length}
                    </p>
                    <p className={cardSubtitle}>unique banks</p>
                </div>
            </div>

            {/* Balance Chart */}
            {!loading && accounts.length > 0 && (
                <div className={UI_STYLES.chart.container}>
                    <h3 className={chartTitle}>Account Balances</h3>
                    <BankBalanceChart accounts={accounts} currency={userCurrency} />
                </div>
            )}

            {/* Filters and Actions */}
            <div className={UI_STYLES.filters.container}>
                <div className={UI_STYLES.filters.gridSix}>
                    <div>
                        <label className={labelText}>
                            Search Accounts
                        </label>
                        <input
                            type="text"
                            placeholder="Search by name, bank, number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={standardInput}
                        />
                    </div>
                    <div>
                        <label className={labelText}>
                            Filter by Bank
                        </label>
                        <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className={standardInput}
                        >
                            <option value="">All Banks</option>
                            {uniqueBankNames.map((bank) => (
                                <option key={bank} value={bank}>
                                    {bank}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelText}>
                            Filter by Type
                        </label>
                        <select
                            value={selectedAccountType}
                            onChange={(e) => setSelectedAccountType(e.target.value)}
                            className={standardInput}
                        >
                            <option value="">All Types</option>
                            {uniqueAccountTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelText}>
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={standardInput}
                        />
                    </div>
                    <div>
                        <label className={labelText}>
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={standardInput}
                        />
                    </div>
                    <div className={UI_STYLES.filters.clearButtonContainer}>
                        <button
                            onClick={handleClearFilters}
                            className={clearFilterButton}
                            disabled={!hasActiveFilters}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
                <div className={UI_STYLES.filters.resultContainer}>
                    <div className={resultText}>
                        {loading ? "Loading..." : `${filteredAccounts.length} of ${allAccounts.length} accounts`}
                    </div>
                </div>
            </div>

            {/* Accounts List/Table */}
            {filteredAccounts.length === 0 ? (
                <div className={UI_STYLES.empty.container}>
                    <div className={UI_STYLES.empty.icon}>
                        <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0H3" />
                        </svg>
                    </div>
                    <h3 className={emptyTitle}>
                        {hasActiveFilters ? "No accounts match your filters" : "No accounts yet"}
                    </h3>
                    <p className={emptyMessage}>
                        {hasActiveFilters 
                            ? "Try adjusting your search criteria or clearing filters." 
                            : "Get started by adding your first bank account."
                        }
                    </p>
                    {hasActiveFilters ? (
                        <button onClick={handleClearFilters} className={clearButton}>
                            Clear Filters
                        </button>
                    ) : (
                        <button onClick={() => setIsAddModalOpen(true)} className={primaryButton}>
                            Add Your First Account
                        </button>
                    )}
                </div>
            ) : (
                <AccountTable
                    accounts={filteredAccounts}
                    selectedAccounts={selectedAccounts}
                    onAccountSelect={handleAccountSelect}
                    onSelectAll={(checked: boolean) => handleSelectAll(checked)}
                    showBulkActions={true}
                    onBulkDelete={handleBulkDelete}
                    onClearSelection={() => setSelectedAccounts(new Set())}
                    onEdit={openEditModal}
                    onDelete={openDeleteModal}
                    onViewDetails={openViewModal}
                    onShare={openShareModal}
                />
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