"use client";

import { useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import { FilterMultiselect } from "../../components/shared/FilterMultiselect";
import { AccountTable } from "./components/AccountTable";
import { BulkAdjustBalancesModal } from "./components/BulkAdjustBalancesModal";
import { AddAccountModal } from "./components/AddAccountModal";
import { EditAccountModal } from "./components/EditAccountModal";
import { ViewAccountModal } from "./components/ViewAccountModal";
import { ShareAccountModal } from "./components/ShareAccountModal";
import { ImportAccountModal } from "./components/ImportAccountModal";
import { TransferModal } from "./components/TransferModal";
import { getAccountBalanceTotals, sumAccountWithheld } from "./utils/accountWithheld";
import { formatCurrency } from "../../utils/currency";
import { convertForDisplaySync } from "../../utils/currencyDisplay";
import { useCurrency } from "../../providers/CurrencyProvider";
import { useDisplayCurrency } from "../../hooks/useDisplayCurrency";
import { BankBalanceChart } from "./components/BankBalanceChart";
import { AccountIncomeExpenseActivityTable } from "./components/AccountIncomeExpenseActivityTable";
import { useOptimizedAccounts } from "../../hooks/useOptimizedAccounts";
import { useGatedAction } from "@repo/applock";
import { getWithheldInvestmentDetailsByAccount } from "./actions/accounts";
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
const cardContainer = CONTAINER_COLORS.card;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

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
    const { displayCurrency: selectedCurrency } = useDisplayCurrency();

    // Use the optimized accounts hook
    const {
        // Data
        accounts,
        loading,
        error,
        actionError,
        clearActionError,
        retryAccounts,
        isFetching: accountsFetching,
        isDeleting,
        hasActiveFilters,

        // Modal states
        isAddModalOpen,
        setIsAddModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        isViewModalOpen,
        setIsViewModalOpen,
        isShareModalOpen,
        setIsShareModalOpen,
        isImportModalOpen,
        setIsImportModalOpen,
        isTransferModalOpen,
        setIsTransferModalOpen,
        isBulkBalancesModalOpen,
        setIsBulkBalancesModalOpen,

        // Filter states
        selectedAccounts,
        setSelectedAccounts,
        searchTerm,
        setSearchTerm,
        selectedBanks,
        setSelectedBanks,
        selectedAccountTypes,
        setSelectedAccountTypes,
        startDate,
        setStartDate,
        endDate,
        setEndDate,

        // Selected items
        accountToEdit,
        setAccountToEdit,
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
        handleBulkBalanceUpdate,
        handleAccountSelect,
        handleSelectAll,
        clearFilters,
        openEditModal,
        openViewModal,
        openShareModal,
        isImporting,
        allAccounts,
        isBulkBalanceSaving,
    } = useOptimizedAccounts();

    const {
        data: withheldDetails = {},
        isLoading: withheldDetailsLoading,
        error: withheldDetailsError,
        refetch: retryWithheldDetails,
        isFetching: withheldDetailsFetching,
    } = useQuery({
        queryKey: ['withheld-amounts', 'account-details'],
        queryFn: getWithheldInvestmentDetailsByAccount,
    });
    const withheldByAccount = sumAccountWithheld(withheldDetails);
    const totals = getAccountBalanceTotals(accounts, withheldByAccount);

    const chartAccounts = accounts.filter(account => account.showInBalanceChart !== false);
    const chartWithheldAmounts = new Map<string, number>();
    for (const account of chartAccounts) {
        chartWithheldAmounts.set(account.bankName, (chartWithheldAmounts.get(account.bankName) ?? 0) +
            (withheldByAccount[account.id] ?? 0));
    }

    const uniqueBankNames = Array.from(new Set(allAccounts.map(account => account.bankName))).sort();
    const uniqueAccountTypes = Array.from(new Set(allAccounts.map(account => account.accountType).filter(Boolean))).sort();

    // Set localStorage when user has accounts (for tutorial system)
    useEffect(() => {
        if (allAccounts.length > 0) {
            try { localStorage.setItem('user-has-accounts', 'true'); } catch {}
        }
    }, [allAccounts.length]);

    // Deletions require the lock screen password. The gate supplies the
    // verified password, which the server action re-checks before deleting.
    const deleteAccount = useGatedAction(
        (appLockPassword: string, accountId: number) => handleDeleteAccount(appLockPassword, accountId),
        {
            title: "Delete account",
            description: "This cannot be undone. Enter your lock screen password to delete this account.",
            confirmLabel: "Delete account",
        },
    );

    const bulkDeleteAccounts = useGatedAction(
        (appLockPassword: string) => handleBulkDelete(appLockPassword),
        { title: "Confirm bulk deletion", description: "Enter your lock screen password to delete the selected accounts.", confirmLabel: "Delete accounts" },
    );

    // Display error if there's one
    if (error || withheldDetailsError) {
        return (
            <div className="p-8 text-center">
                <div className={errorContainer} role="alert">
                    <h3 className={errorTitle}>Error Loading Accounts</h3>
                    <p className={errorMessage}>{error || "Unable to load withheld investment details. Please retry."}</p>
                    <button
                        onClick={() => {
                            if (error) void retryAccounts();
                            if (withheldDetailsError) void retryWithheldDetails();
                        }}
                        disabled={(!!error && accountsFetching) || (!!withheldDetailsError && withheldDetailsFetching)}
                        className={primaryButton + " mt-4"}
                    >
                        {(error && accountsFetching) || (withheldDetailsError && withheldDetailsFetching) ? "Retrying…" : "Retry"}
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading || withheldDetailsLoading) {
        return (
            <div className={loadingContainer} role="status">
                <div className={loadingSpinner} aria-hidden="true" />
                <p className={loadingText}>Loading accounts...</p>
            </div>
        );
    }

    return (
        <div className={pageContainer}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="sr-only">Accounts</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                                        <button
                        id="add-account-btn"
                        onClick={() => setIsAddModalOpen(true)}
                        className={primaryButton}
                    >
                        Add Account
                    </button>
                    <button
                        style={{ display: "none" }}
                        onClick={() => setIsImportModalOpen(true)}
                        className={secondaryBlueButton}
                    >
                        Import CSV
                    </button>
                    <button
                        style={{ display: "none" }}
                        onClick={handleExportToCSV}
                        className={secondaryGreenButton}
                        disabled={accounts.length === 0}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {actionError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p>{actionError}</p>
                    <button type="button" onClick={clearActionError} className="underline">Dismiss</button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('totalAccounts', 'accounts').indicator}`}></div>
                        <h3 className={cardTitle}>Total Accounts</h3>
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('totalAccounts', 'accounts').text}`}>
                        {accounts.length}
                    </p>
                    <p className={cardSubtitle}>matching accounts</p>
                </div>
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('totalBalance', 'accounts').indicator}`}></div>
                        <h3 className={cardTitle}>Total Balance</h3>
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('totalBalance', 'accounts').text}`}>
                        {formatCurrency(convertForDisplaySync(totals.balance, userCurrency, selectedCurrency), selectedCurrency)}
                    </p>
                    <p className={cardSubtitle}>accounts total</p>
                </div>
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} ${totals.free >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <h3 className={cardTitle}>Free Balance</h3>
                    </div>
                    <p className={`${cardValue} ${totals.free >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(convertForDisplaySync(totals.free, userCurrency, selectedCurrency), selectedCurrency)}
                    </p>
                    <p className={cardSubtitle}>available to use</p>
                </div>
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} bg-gray-400`}></div>
                        <h3 className={cardTitle}>Withheld Balance</h3>
                    </div>
                    <p className={`${cardValue} text-gray-600`}>
                        {formatCurrency(convertForDisplaySync(totals.withheld, userCurrency, selectedCurrency), selectedCurrency)}
                    </p>
                    <p className={cardSubtitle}>in investments</p>
                </div>
                <div className={cardContainer}>
                    <div className={UI_STYLES.summaryCard.indicatorRow}>
                        <div className={`${UI_STYLES.summaryCard.indicator} ${getSummaryCardClasses('bankTypes', 'accounts').indicator}`}></div>
                        <h3 className={cardTitle}>Banks</h3>
                    </div>
                    <p className={`${cardValue} ${getSummaryCardClasses('bankTypes', 'accounts').text}`}>
                        {new Set(accounts.map(account => account.bankName)).size}
                    </p>
                    <p className={cardSubtitle}>unique banks</p>
                </div>
            </div>

            {/* Balance Chart */}
            {accounts.length > 0 && (
                <div className={UI_STYLES.chart.container}>
                    <BankBalanceChart
                        accounts={chartAccounts}
                        sourceCurrency={userCurrency}
                        currency={selectedCurrency}
                        withheldAmounts={Object.fromEntries(chartWithheldAmounts)}
                    />
                </div>
            )}

            {allAccounts.length > 0 && (
                <div className={UI_STYLES.filters.container}>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                        <div>
                            <label htmlFor="account-search" className={labelText}>
                                Search Accounts
                            </label>
                            <input
                                type="text"
                                placeholder="Search by name, bank, number..."
                                id="account-search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={standardInput}
                            />
                        </div>
                        <FilterMultiselect
                            label="Filter by Bank"
                            itemNamePlural="banks"
                            options={uniqueBankNames.map(bank => ({ label: bank }))}
                            selected={selectedBanks}
                            onChange={setSelectedBanks}
                        />
                        <FilterMultiselect
                            label="Filter by Type"
                            itemNamePlural="types"
                            options={uniqueAccountTypes.map(type => ({ label: type }))}
                            selected={selectedAccountTypes}
                            onChange={setSelectedAccountTypes}
                        />
                        <div>
                            <label htmlFor="account-start-date" className={labelText}>
                                Start Date
                            </label>
                            <input
                                type="date"
                                id="account-start-date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={standardInput}
                            />
                        </div>
                        <div>
                            <label htmlFor="account-end-date" className={labelText}>
                                End Date
                            </label>
                            <input
                                type="date"
                                id="account-end-date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={standardInput}
                            />
                        </div>
                        <div className={UI_STYLES.filters.clearButtonContainer}>
                            <button
                                onClick={clearFilters}
                                className={clearFilterButton}
                                disabled={!hasActiveFilters}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Accounts List/Table */}
            {accounts.length === 0 ? (
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
                        <button onClick={clearFilters} className={clearButton}>
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
                    selectedCurrency={selectedCurrency}
                    accounts={accounts}
                    selectedAccounts={selectedAccounts}
                    onAccountSelect={handleAccountSelect}
                    onSelectAll={(checked: boolean) => handleSelectAll(checked)}
                    showBulkActions={true}
                    onBulkDelete={bulkDeleteAccounts}
                    isDeleting={isDeleting}
                    onClearSelection={() => setSelectedAccounts(new Set())}
                    onEdit={openEditModal}
                    onDelete={(account) => void deleteAccount(account.id)}
                    onViewDetails={openViewModal}
                    onShare={openShareModal}
                    withheldDetails={withheldDetails}
                    headerActions={
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsBulkBalancesModalOpen(true)}
                                className={`${secondaryBlueButton} flex items-center space-x-2 disabled:opacity-50`}
                                disabled={allAccounts.length === 0}
                                title="Adjust balances for all accounts in one place"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7h16M4 12h16M4 17h10" />
                                </svg>
                                <span>Adjust balances</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsTransferModalOpen(true)}
                                className={`${primaryButton} flex items-center space-x-2 disabled:opacity-50`}
                                disabled={allAccounts.length < 2}
                                title={allAccounts.length < 2 ? "You need at least 2 accounts to transfer money" : "Transfer money between accounts"}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <span>Transfer between accounts</span>
                            </button>
                        </div>
                    }
                />
            )}

            {allAccounts.length > 0 && (
                <AccountIncomeExpenseActivityTable displayCurrency={selectedCurrency} />
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

            {isBulkBalancesModalOpen && (
                <BulkAdjustBalancesModal
                    isOpen={isBulkBalancesModalOpen}
                    onClose={() => setIsBulkBalancesModalOpen(false)}
                    accounts={allAccounts}
                    withheldAmounts={withheldByAccount}
                    currency={userCurrency}
                    onApply={handleBulkBalanceUpdate}
                    isSaving={isBulkBalanceSaving}
                />
            )}
        </div>
    );
}
