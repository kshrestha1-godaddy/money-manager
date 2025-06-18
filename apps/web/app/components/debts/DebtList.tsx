"use client";

import React from "react";
import { DebtGrid } from "./DebtCard";
import { DebtInterface } from "../../types/debts";

export function DebtList({ 
    debts, 
    onEdit, 
    onDelete, 
    onViewDetails, 
    onAddRepayment,
    selectedDebts = new Set(),
    onDebtSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection
}: { 
    debts: DebtInterface[];
    onEdit?: (debt: DebtInterface) => void;
    onDelete?: (debt: DebtInterface) => void;
    onViewDetails?: (debt: DebtInterface) => void;
    onAddRepayment?: (debt: DebtInterface) => void;
    selectedDebts?: Set<number>;
    onDebtSelect?: (debtId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: () => void;
    onClearSelection?: () => void;
}) {
    const handleSelectAll = () => {
        const allSelected = selectedDebts.size === debts.length;
        if (onSelectAll) {
            onSelectAll(!allSelected);
        }
    };

    const isAllSelected = selectedDebts.size === debts.length && debts.length > 0;
    const isPartiallySelected = selectedDebts.size > 0 && selectedDebts.size < debts.length;

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
                                {selectedDebts.size > 0 ? `${selectedDebts.size} selected` : 'Select all'}
                            </span>
                        </div>
                        {selectedDebts.size > 0 && (
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
                                    Delete Selected ({selectedDebts.size})
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <DebtGrid 
                debts={debts} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                onViewDetails={onViewDetails}
                onAddRepayment={onAddRepayment}
                selectedDebts={selectedDebts}
                onDebtSelect={onDebtSelect}
                showBulkActions={showBulkActions}
            />
        </div>
    );
} 