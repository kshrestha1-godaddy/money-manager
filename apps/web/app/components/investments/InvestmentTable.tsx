"use client";

import { useState } from "react";
import { InvestmentInterface } from "../../types/investments";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";

interface InvestmentTableProps {
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

type SortField = 'name' | 'type' | 'quantity' | 'purchasePrice' | 'currentPrice' | 'totalValue' | 'gain' | 'purchaseDate';
type SortOrder = 'asc' | 'desc';

export function InvestmentTable({ 
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
}: InvestmentTableProps) {
    const [sortField, setSortField] = useState<SortField>('purchaseDate');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const { currency: userCurrency } = useCurrency();

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleSelectAll = () => {
        const allSelected = selectedInvestments.size === investments.length;
        if (onSelectAll) {
            onSelectAll(!allSelected);
        }
    };

    const isAllSelected = selectedInvestments.size === investments.length && investments.length > 0;
    const isPartiallySelected = selectedInvestments.size > 0 && selectedInvestments.size < investments.length;

    const sortedInvestments = [...investments].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'type':
                aValue = a.type;
                bValue = b.type;
                break;
            case 'quantity':
                aValue = a.quantity;
                bValue = b.quantity;
                break;
            case 'purchasePrice':
                aValue = a.purchasePrice;
                bValue = b.purchasePrice;
                break;
            case 'currentPrice':
                aValue = a.currentPrice;
                bValue = b.currentPrice;
                break;
            case 'totalValue':
                aValue = a.quantity * a.currentPrice;
                bValue = b.quantity * b.currentPrice;
                break;
            case 'gain':
                aValue = (a.currentPrice - a.purchasePrice) * a.quantity;
                bValue = (b.currentPrice - b.purchasePrice) * b.quantity;
                break;
            case 'purchaseDate':
                aValue = new Date(a.purchaseDate).getTime();
                bValue = new Date(b.purchaseDate).getTime();
                break;
            default:
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return '⇅';
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    const getGainColor = (gain: number) => {
        if (gain > 0) return 'text-green-600';
        if (gain < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getGainPercentage = (investment: InvestmentInterface) => {
        const gain = (investment.currentPrice - investment.purchasePrice) / investment.purchasePrice * 100;
        return gain.toFixed(2);
    };

    const formatType = (type: string) => {
        return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr>
                        {showBulkActions && (
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    ref={(el) => {
                                        if (el) el.indeterminate = isPartiallySelected;
                                    }}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                            </th>
                        )}
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('name')}
                        >
                            Investment {getSortIcon('name')}
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('type')}
                        >
                            Type {getSortIcon('type')}
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('quantity')}
                        >
                            Quantity/Interest {getSortIcon('quantity')}
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('purchasePrice')}
                        >
                            Purchase/Principal {getSortIcon('purchasePrice')}
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('currentPrice')}
                        >
                            Current Value {getSortIcon('currentPrice')}
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('totalValue')}
                        >
                            Total Value {getSortIcon('totalValue')}
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('gain')}
                        >
                            Gain/Loss {getSortIcon('gain')}
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('purchaseDate')}
                        >
                            Purchase Date {getSortIcon('purchaseDate')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {sortedInvestments.map((investment) => {
                        const totalValue = investment.quantity * investment.currentPrice;
                        const totalCost = investment.quantity * investment.purchasePrice;
                        const gain = totalValue - totalCost;
                        const gainPercentage = getGainPercentage(investment);

                        return (
                            <InvestmentRow
                                key={investment.id}
                                investment={investment}
                                currency={userCurrency}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onViewDetails={onViewDetails}
                                isSelected={selectedInvestments.has(investment.id)}
                                onSelect={onInvestmentSelect}
                                showCheckbox={showBulkActions}
                                totalValue={totalValue}
                                gain={gain}
                                gainPercentage={gainPercentage}
                                formatType={formatType}
                                getGainColor={getGainColor}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function InvestmentRow({ 
    investment, 
    currency, 
    onEdit, 
    onDelete, 
    onViewDetails, 
    isSelected = false, 
    onSelect, 
    showCheckbox = false,
    totalValue,
    gain,
    gainPercentage,
    formatType,
    getGainColor
}: { 
    investment: InvestmentInterface;
    currency: string;
    onEdit: (investment: InvestmentInterface) => void;
    onDelete: (investment: InvestmentInterface) => void;
    onViewDetails: (investment: InvestmentInterface) => void;
    isSelected?: boolean;
    onSelect?: (investmentId: number, selected: boolean) => void;
    showCheckbox?: boolean;
    totalValue: number;
    gain: number;
    gainPercentage: string;
    formatType: (type: string) => string;
    getGainColor: (gain: number) => string;
}) {
    const handleSelect = () => {
        if (onSelect) {
            onSelect(investment.id, !isSelected);
        }
    };

    return (
        <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
            {showCheckbox && (
                <td className="px-6 py-4 whitespace-nowrap">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                </td>
            )}
            <td className="px-6 py-4 whitespace-nowrap">
                <div>
                    <div className="text-sm font-medium text-gray-900">
                        {investment.name}
                    </div>
                    {investment.symbol && (
                        <div className="text-sm text-gray-500">
                            {investment.symbol}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {formatType(investment.type)}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {investment.type === 'FIXED_DEPOSIT' ? (
                    <div>
                        <div>{investment.interestRate}% p.a.</div>
                        {investment.maturityDate && (
                            <div className="text-xs text-gray-500">
                                Matures: {new Date(investment.maturityDate).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                ) : (
                    investment.quantity
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {investment.type === 'FIXED_DEPOSIT' ? 
                    `${formatCurrency(investment.purchasePrice, currency)} (Principal)` : 
                    formatCurrency(investment.purchasePrice, currency)
                }
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {investment.type === 'FIXED_DEPOSIT' ? (
                    <div>
                        <div>{formatCurrency(investment.currentPrice, currency)}</div>
                        <div className="text-xs text-gray-500">Current Value</div>
                    </div>
                ) : (
                    formatCurrency(investment.currentPrice, currency)
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatCurrency(totalValue, currency)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className={`font-medium ${getGainColor(gain)}`}>
                    {formatCurrency(gain, currency)}
                </div>
                <div className={`text-xs ${getGainColor(gain)}`}>
                    ({gainPercentage}%)
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>
                    <div>{new Date(investment.purchaseDate).toLocaleDateString()}</div>
                    {investment.type === 'FIXED_DEPOSIT' && (
                        <div className="text-xs text-gray-500">Deposit Date</div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                    <button 
                        onClick={() => onViewDetails(investment)}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                    >
                        View
                    </button>
                    <button 
                        onClick={() => onEdit(investment)}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={() => onDelete(investment)}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
} 