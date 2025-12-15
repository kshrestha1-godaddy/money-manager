"use client";

import { useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { AccountTable } from "./components/AccountTable";
import { AddAccountModal } from "./components/AddAccountModal";
import { EditAccountModal } from "./components/EditAccountModal";
import { DeleteAccountModal } from "./components/DeleteAccountModal";
import { ViewAccountModal } from "./components/ViewAccountModal";
import { ShareAccountModal } from "./components/ShareAccountModal";
import { ImportAccountModal } from "./components/ImportAccountModal";
import { TransferModal } from "./components/TransferModal";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { BankBalanceChart } from "./components/BankBalanceChart";
import { useOptimizedAccounts } from "../../hooks/useOptimizedAccounts";
import { getUserAccounts, getWithheldAmountsByBank } from "./actions/accounts";
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
        freeBalance,
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
        isTransferModalOpen,
        setIsTransferModalOpen,

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
        handleTransfer,
        handleAccountSelect,
        handleSelectAll,
        clearFilters,
        openEditModal,
        openViewModal,
        openDeleteModal,
        openShareModal,
        isImporting,
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

    // Fetch withheld amounts from investments
    const { data: withheldAmounts = {} } = useQuery({
        queryKey: ['withheld-amounts'],
        queryFn: getWithheldAmountsByBank,
    });
    
    // Calculate total withheld amount
    const totalWithheldAmount = Object.values(withheldAmounts).reduce((sum, amount) => sum + amount, 0);
    
    const uniqueBankNames = Array.from(new Set(allAccounts.map(account => account.bankName)));
    const uniqueAccountTypes = Array.from(new Set(allAccounts.map(account => account.accountType)));

    // Set localStorage when user has accounts (for tutorial system)
    useEffect(() => {
        if (allAccounts.length > 0) {
            localStorage.setItem('user-has-accounts', 'true');
        }
    }, [allAccounts.length]);

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
                        id="add-account-btn"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
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
                    <p className={cardSubtitle}>accounts total</p>
                </div>
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} bg-green-500`}></div>
                        <h3 className={cardTitle}>Free Balance</h3>
                    </div>
                    <p className={`${cardValue} text-green-600`}>
                        {loading ? "..." : formatCurrency(freeBalance, userCurrency)}
                    </p>
                    <p className={cardSubtitle}>available to use</p>
                </div>
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} bg-gray-400`}></div>
                        <h3 className={cardTitle}>Withheld Balance</h3>
                    </div>
                    <p className={`${cardValue} text-gray-600`}>
                        {loading ? "..." : formatCurrency(totalWithheldAmount, userCurrency)}
                    </p>
                    <p className={cardSubtitle}>in investments</p>
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
                    <BankBalanceChart 
                        accounts={accounts} 
                        currency={userCurrency} 
                        withheldAmounts={withheldAmounts}
                    />
                </div>
            )}

            {/* Filters and Actions */}
            {/* <div className={UI_STYLES.filters.container}>
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
            </div> */}

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
                    withheldAmounts={withheldAmounts}
                    headerActions={
                        <button
                            onClick={() => setIsTransferModalOpen(true)}
                            className={`${primaryButton} flex items-center space-x-2 disabled:opacity-50`}
                            disabled={filteredAccounts.length < 2}
                            title={filteredAccounts.length < 2 ? "You need at least 2 accounts to transfer money" : "Transfer money between accounts"}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <span>Self Transfer of Money</span>
                        </button>
                    }
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
                isImporting={isImporting}
            />

            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onTransfer={handleTransfer}
                accounts={allAccounts}
            />
        </div>
    );
}