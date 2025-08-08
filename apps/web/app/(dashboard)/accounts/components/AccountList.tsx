"use client";

import React from "react";
import { AccountGrid    } from "./AccountCard";
import { AccountInterface } from "../../../types/accounts";

export function AccountList({ 
  accounts, 
  onEdit, 
  onDelete, 
  onViewDetails,
  onShare,
  selectedAccounts = new Set(),
  onAccountSelect,
  onSelectAll,
  showBulkActions = false,
  onBulkDelete,
  onClearSelection 
}: { 
  accounts: AccountInterface[];
  onEdit?: (account: AccountInterface) => void;
  onDelete?: (account: AccountInterface) => void;
  onViewDetails?: (account: AccountInterface) => void;
  onShare?: (account: AccountInterface) => void;
  selectedAccounts?: Set<number>;
  onAccountSelect?: (accountId: number, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  showBulkActions?: boolean;
  onBulkDelete?: () => void;
  onClearSelection?: () => void;
}) {
  const handleSelectAll = () => {
    const allSelected = selectedAccounts.size === accounts.length;
    if (onSelectAll) {
      onSelectAll(!allSelected);
    }
  };

  const isAllSelected = selectedAccounts.size === accounts.length && accounts.length > 0;
  const isPartiallySelected = selectedAccounts.size > 0 && selectedAccounts.size < accounts.length;

  return (
    <div>
      {showBulkActions && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPartiallySelected;
                }}
                onChange={handleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                {selectedAccounts.size > 0 ? `${selectedAccounts.size} selected` : 'Select all'}
              </span>
            </div>
            {selectedAccounts.size > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={onClearSelection}
                  className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
                >
                  Clear Selection
                </button>
                <button
                  onClick={onBulkDelete}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Delete Selected ({selectedAccounts.size})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <AccountGrid 
        accounts={accounts} 
        onEdit={onEdit} 
        onDelete={onDelete} 
        onViewDetails={onViewDetails}
        onShare={onShare}
        selectedAccounts={selectedAccounts}
        onAccountSelect={onAccountSelect}
        showBulkActions={showBulkActions}
      />
    </div>
  );
} 