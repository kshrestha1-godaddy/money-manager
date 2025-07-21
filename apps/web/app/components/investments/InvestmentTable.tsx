"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { InvestmentInterface } from "../../types/investments";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";
import { getDefaultColumnWidths, getMinColumnWidth, type InvestmentColumnWidths } from "../../config/tableConfig";
import { COLORS, getActionButtonClasses, getGainLossClasses } from "../../config/colorConfig";

interface InvestmentTableProps {
    investments: InvestmentInterface[];
    onEdit: (investment: InvestmentInterface) => void;
    onDelete: (investment: InvestmentInterface) => void;
    onViewDetails: (investment: InvestmentInterface) => void;
    selectedInvestments?: Set<number>;
    onInvestmentSelect?: (investmentId: number, selected: boolean) => void;
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
    showBulkActions = true,
    onBulkDelete,
    onClearSelection 
}: InvestmentTableProps) {
    const [sortField, setSortField] = useState<SortField>('purchaseDate');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const { currency: userCurrency } = useCurrency();

    // Column resizing state - optimized for better space utilization
    const [columnWidths, setColumnWidths] = useState<InvestmentColumnWidths>(
        getDefaultColumnWidths('investments')
    );
    
    const tableRef = useRef<HTMLTableElement>(null);
    const [resizing, setResizing] = useState<string | null>(null);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // Resizing handlers
    const handleMouseDown = useCallback((e: React.MouseEvent, column: string) => {
        e.preventDefault();
        setResizing(column);
        setStartX(e.pageX);
        setStartWidth(columnWidths[column as keyof typeof columnWidths]);
    }, [columnWidths]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizing) return;
        
        const diff = e.pageX - startX;
        const newWidth = Math.max(getMinColumnWidth(), startWidth + diff);
        
        setColumnWidths(prev => ({
            ...prev,
            [resizing]: newWidth
        }));
    }, [resizing, startX, startWidth]);

    const handleMouseUp = useCallback(() => {
        setResizing(null);
    }, []);

    useEffect(() => {
        if (resizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [resizing, handleMouseMove, handleMouseUp]);

    const handleSelectAll = () => {
        if (!onInvestmentSelect) return;
        
        const currentTableInvestmentIds = investments.map(inv => inv.id);
        const allCurrentSelected = currentTableInvestmentIds.every(id => selectedInvestments.has(id));
        
        // Toggle selection for only the investments in this table
        currentTableInvestmentIds.forEach(id => {
            onInvestmentSelect(id, !allCurrentSelected);
        });
    };

    const isAllSelected = investments.length > 0 && investments.every(inv => selectedInvestments.has(inv.id));
    const isPartiallySelected = investments.some(inv => selectedInvestments.has(inv.id)) && !isAllSelected;

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
            <table ref={tableRef} className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                    <tr>
                        {showBulkActions && (
                            <th 
                                className="px-6 py-3 text-left relative border-r border-gray-200"
                                style={{ width: `${columnWidths.checkbox}px` }}
                            >
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    ref={(el) => {
                                        if (el) el.indeterminate = isPartiallySelected;
                                    }}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div 
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                    onMouseDown={(e) => handleMouseDown(e, 'checkbox')}
                                />
                            </th>
                        )}
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.investment}px` }}
                            onClick={() => handleSort('name')}
                        >
                            <div className="flex items-center justify-between">
                                <span>Investment</span>
                                {getSortIcon('name')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'investment')}
                            />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.type}px` }}
                            onClick={() => handleSort('type')}
                        >
                            <div className="flex items-center justify-between">
                                <span>Type</span>
                                {getSortIcon('type')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'type')}
                            />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.quantityInterest}px` }}
                            onClick={() => handleSort('quantity')}
                        >
                            <div className="flex items-center justify-between">
                                <span>Quantity/Interest</span>
                                {getSortIcon('quantity')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'quantityInterest')}
                            />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.purchasePrincipal}px` }}
                            onClick={() => handleSort('purchasePrice')}
                        >
                            <div className="flex items-center justify-between">
                                <span>Purchase/Principal</span>
                                {getSortIcon('purchasePrice')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'purchasePrincipal')}
                            />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.currentValue}px` }}
                            onClick={() => handleSort('currentPrice')}
                        >
                            <div className="flex items-center justify-between">
                                <span>Current Value</span>
                                {getSortIcon('currentPrice')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'currentValue')}
                            />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.totalValue}px` }}
                            onClick={() => handleSort('totalValue')}
                        >
                            <div className="flex items-center justify-between">
                                <span>Total Value</span>
                                {getSortIcon('totalValue')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'totalValue')}
                            />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.gainLoss}px` }}
                            onClick={() => handleSort('gain')}
                        >
                            <div className="flex items-center justify-between">
                                <span>Gain/Loss</span>
                                {getSortIcon('gain')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'gainLoss')}
                            />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative border-r border-gray-200"
                            style={{ width: `${columnWidths.purchaseDate}px` }}
                            onClick={() => handleSort('purchaseDate')}
                        >
                            <div className="flex items-center justify-between">
                                <span>Purchase Date</span>
                                {getSortIcon('purchaseDate')}
                            </div>
                            <div 
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500 hover:bg-opacity-50"
                                onMouseDown={(e) => handleMouseDown(e, 'purchaseDate')}
                            />
                        </th>
                        <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            style={{ width: `${columnWidths.actions}px` }}
                        >
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
                                columnWidths={columnWidths}
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
    getGainColor,
    columnWidths
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
    columnWidths: InvestmentColumnWidths;
}) {
    const handleSelect = () => {
        if (onSelect) {
            onSelect(investment.id, !isSelected);
        }
    };

    return (
        <tr className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
            {showCheckbox && (
                <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.checkbox}px` }}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleSelect}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                </td>
            )}
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.investment}px` }}>
                <div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                        {investment.name}
                    </div>
                    {investment.symbol && (
                        <div className="text-sm text-gray-500 break-words">
                            {investment.symbol}
                        </div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap" style={{ width: `${columnWidths.type}px` }}>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {formatType(investment.type)}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: `${columnWidths.quantityInterest}px` }}>
                {investment.type === 'FIXED_DEPOSIT' ? (
                    <div>
                        <div>{investment.interestRate}% p.a.</div>
                        {investment.maturityDate && (
                            <div className="text-xs text-gray-500 break-words">
                                Matures: {new Date(investment.maturityDate).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                ) : (
                    investment.quantity
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: `${columnWidths.purchasePrincipal}px` }}>
                <div className="break-words">
                    {investment.type === 'FIXED_DEPOSIT' ? 
                        `${formatCurrency(investment.purchasePrice, currency)} (Principal)` : 
                        formatCurrency(investment.purchasePrice, currency)
                    }
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: `${columnWidths.currentValue}px` }}>
                {investment.type === 'FIXED_DEPOSIT' ? (
                    <div>
                        <div className="break-words">{formatCurrency(investment.currentPrice, currency)}</div>
                        <div className="text-xs text-gray-500">Current Value</div>
                    </div>
                ) : (
                    <div className="break-words">{formatCurrency(investment.currentPrice, currency)}</div>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" style={{ width: `${columnWidths.totalValue}px` }}>
                <div className="break-words">{formatCurrency(totalValue, currency)}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ width: `${columnWidths.gainLoss}px` }}>
                <div className={`font-medium break-words ${getGainColor(gain)}`}>
                    {formatCurrency(gain, currency)}
                </div>
                <div className={`text-xs break-words ${getGainColor(gain)}`}>
                    ({gainPercentage}%)
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: `${columnWidths.purchaseDate}px` }}>
                <div>
                    <div className="break-words">{new Date(investment.purchaseDate).toLocaleDateString()}</div>
                    {investment.type === 'FIXED_DEPOSIT' && (
                        <div className="text-xs text-gray-500">Deposit Date</div>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" style={{ width: `${columnWidths.actions}px` }}>
                <div className="flex justify-end space-x-1">
                    <button 
                        onClick={() => onViewDetails(investment)}
                        className={getActionButtonClasses('view', 'investments')}
                    >
                        View
                    </button>
                    <button 
                        onClick={() => onEdit(investment)}
                        className={getActionButtonClasses('edit', 'investments')}
                    >
                        Edit
                    </button>
                    <button 
                        onClick={() => onDelete(investment)}
                        className={getActionButtonClasses('delete', 'investments')}
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
} 