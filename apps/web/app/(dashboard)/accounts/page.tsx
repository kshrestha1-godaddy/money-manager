"use client";

import { useState, useEffect } from "react";
import { AccountList } from "../../components/accounts/AccountList";
import { AccountTable } from "../../components/accounts/AccountTable";
import { AccountInterface } from "../../types/accounts";
import { Button } from "@repo/ui/button";
import { AddAccountModal } from "../../components/accounts/AddAccountModal";
import { EditAccountModal } from "../../components/accounts/EditAccountModal";
import { DeleteAccountModal } from "../../components/accounts/DeleteAccountModal";
import { ViewAccountModal } from "../../components/accounts/ViewAccountModal";
import { getUserAccounts, createAccount, updateAccount, deleteAccount, bulkDeleteAccounts } from "../../actions/accounts";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { BankBalanceChart } from "../../components/BankBalanceChart";
import { triggerBalanceRefresh } from "../../hooks/useTotalBalance";
import { exportAccountsToCSV } from "../../utils/csvExport";
import { ImportAccountModal } from "../../components/accounts/ImportAccountModal";
import { ParsedAccountData } from "../../utils/csvImport";

export default function Accounts() {
    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
    const [accountToEdit, setAccountToEdit] = useState<AccountInterface | null>(null);
    const [accountToDelete, setAccountToDelete] = useState<AccountInterface | null>(null);
    const [accountToView, setAccountToView] = useState<AccountInterface | null>(null);
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
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error: any) {
            console.error("Error adding account:", error);
            const errorMessage = error?.message || "Failed to add account. Please try again.";
            alert(`Add failed: ${errorMessage}`);
        }
    };

    const handleEditAccount = async (id: number, updatedAccount: Partial<Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => {
        try {
            const account = await updateAccount(id, updatedAccount);
            setAccounts(accounts.map(a => a.id === id ? account : a));
            setIsEditModalOpen(false);
            setAccountToEdit(null);
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error: any) {
            console.error("Error updating account:", error);
            const errorMessage = error?.message || "Failed to update account. Please try again.";
            alert(`Update failed: ${errorMessage}`);
        }
    };

    const handleDeleteAccount = async () => {
        if (!accountToDelete) return;
        
        try {
            await deleteAccount(accountToDelete.id);
            setAccounts(accounts.filter(a => a.id !== accountToDelete.id));
            setIsDeleteModalOpen(false);
            setAccountToDelete(null);
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
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

    const handleExportToCSV = () => {
        if (accounts.length === 0) {
            alert("No accounts to export");
            return;
        }
        exportAccountsToCSV(accounts);
    };

    const handleImportAccounts = async (importedAccounts: ParsedAccountData[]) => {
        try {
            let successCount = 0;
            let errorCount = 0;
            const errors: string[] = [];

            for (const accountData of importedAccounts) {
                try {
                    const newAccount = await createAccount(accountData);
                    successCount++;
                } catch (error: any) {
                    errorCount++;
                    const errorMessage = error?.message || "Unknown error";
                    errors.push(`${accountData.holderName} (${accountData.accountNumber}): ${errorMessage}`);
                }
            }

            // Reload accounts to reflect changes
            await loadAccounts();
            
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();

            // Show summary
            if (successCount > 0 && errorCount === 0) {
                alert(`Successfully imported ${successCount} accounts!`);
            } else if (successCount > 0 && errorCount > 0) {
                alert(`Import completed with mixed results:\n✅ ${successCount} accounts imported successfully\n❌ ${errorCount} accounts failed\n\nErrors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n... and more' : ''}`);
            } else {
                alert(`Import failed for all accounts:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n... and more' : ''}`);
            }

            setIsImportModalOpen(false);
        } catch (error) {
            console.error("Error during import:", error);
            alert("An unexpected error occurred during import. Please try again.");
            setIsImportModalOpen(false);
        }
    };

    const handleAccountSelect = (accountId: number, selected: boolean) => {
        const newSelected = new Set(selectedAccounts);
        if (selected) {
            newSelected.add(accountId);
        } else {
            newSelected.delete(accountId);
        }
        setSelectedAccounts(newSelected);
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            const allAccountIds = new Set(accounts.map(a => a.id));
            setSelectedAccounts(allAccountIds);
        } else {
            setSelectedAccounts(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (selectedAccounts.size === 0) return;
        
        const confirmMessage = `Are you sure you want to delete ${selectedAccounts.size} account(s)? This action cannot be undone.`;
        if (!confirm(confirmMessage)) return;

        try {
            await bulkDeleteAccounts(Array.from(selectedAccounts));
            // Remove deleted accounts from the list
            setAccounts(accounts.filter(a => !selectedAccounts.has(a.id)));
            setSelectedAccounts(new Set());
            // Trigger balance refresh in NavBar
            triggerBalanceRefresh();
        } catch (error: any) {
            console.error("Error bulk deleting accounts:", error);
            const errorMessage = error?.message || "Failed to delete accounts. Please try again.";
            alert(`Bulk delete failed: ${errorMessage}`);
        }
    };

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
                    {/* Import/Export Buttons */}
                    <Button onClick={() => setIsImportModalOpen(true)}>
                        Import CSV
                    </Button>
                    {/* Export Button - only show if there are accounts */}
                    {accounts.length > 0 && (
                        <Button onClick={handleExportToCSV}>
                            Export CSV
                        </Button>
                    )}
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
                            <p className="text-sm font-medium text-gray-600">Active</p>
                            <p className="text-2xl font-bold text-purple-600">{accounts.length}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Balance</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0), userCurrency)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-600">Banks</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {new Set(accounts.map(acc => acc.bankName)).size}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bank Balance Chart */}
            {accounts.length > 0 && (
                <BankBalanceChart accounts={accounts} currency={userCurrency} />
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
            ) : (
                <div className="flex flex-col gap-6">
                    {viewMode === "table" ? (
                        <AccountTable 
                            accounts={accounts} 
                            onEdit={openEditModal}
                            onDelete={openDeleteModal}
                            onViewDetails={openViewModal}
                            selectedAccounts={selectedAccounts}
                            onAccountSelect={handleAccountSelect}
                            onSelectAll={handleSelectAll}
                            showBulkActions={true}
                            onBulkDelete={handleBulkDelete}
                            onClearSelection={() => setSelectedAccounts(new Set())}
                        />
                    ) : (
                        <div className="bg-white rounded-lg shadow p-6">
                                                    <AccountList 
                            accounts={accounts} 
                            onEdit={openEditModal}
                            onDelete={openDeleteModal}
                            onViewDetails={openViewModal}
                            selectedAccounts={selectedAccounts}
                            onAccountSelect={handleAccountSelect}
                            onSelectAll={handleSelectAll}
                            showBulkActions={true}
                            onBulkDelete={handleBulkDelete}
                            onClearSelection={() => setSelectedAccounts(new Set())}
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

            {/* Import Account Modal */}
            <ImportAccountModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImportAccounts}
            />
        </div>
    );
}