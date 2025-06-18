"use client";

import { InvestmentInterface } from "../../types/investments";
import { InvestmentCard } from "./InvestmentCard";

interface InvestmentListProps {
    investments: InvestmentInterface[];
    onEdit: (investment: InvestmentInterface) => void;
    onDelete: (investment: InvestmentInterface) => void;
    onViewDetails: (investment: InvestmentInterface) => void;
    selectedInvestments?: Set<number>;
    onInvestmentSelect?: (investmentId: number, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    showBulkActions?: boolean;
    onBulkDelete?: () => void;
    onClearSelection?: () => void;
}

export function InvestmentList({ 
    investments, 
    onEdit, 
    onDelete, 
    onViewDetails,
    selectedInvestments = new Set(),
    onInvestmentSelect,
    onSelectAll,
    showBulkActions = false,
    onBulkDelete,
    onClearSelection
}: InvestmentListProps) {
    const handleSelectAll = () => {
        const allSelected = selectedInvestments.size === investments.length;
        if (onSelectAll) {
            onSelectAll(!allSelected);
        }
    };

    const isAllSelected = selectedInvestments.size === investments.length && investments.length > 0;
    const isPartiallySelected = selectedInvestments.size > 0 && selectedInvestments.size < investments.length;

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
                                {selectedInvestments.size > 0 ? `${selectedInvestments.size} selected` : 'Select all'}
                            </span>
                        </div>
                        {selectedInvestments.size > 0 && (
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
                                    Delete Selected ({selectedInvestments.size})
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {investments.map((investment) => (
                    <InvestmentCard
                        key={investment.id}
                        investment={investment}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onViewDetails={onViewDetails}
                        isSelected={selectedInvestments.has(investment.id)}
                        onSelect={onInvestmentSelect}
                        showCheckbox={showBulkActions}
                    />
                ))}
            </div>
        </div>
    );
} 