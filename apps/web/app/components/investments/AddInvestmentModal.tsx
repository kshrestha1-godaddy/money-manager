"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/button";
import { InvestmentInterface } from "../../types/investments";
import { getUserAccounts } from "../../actions/investments";
import { formatCurrency } from "../../utils/currency";
import { useCurrency } from "../../providers/CurrencyProvider";

interface AddInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (investment: Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account'>) => void;
}

interface Account {
    id: number;
    holderName: string;
    bankName: string;
    accountNumber: string;
    balance: number;
}

export function AddInvestmentModal({ isOpen, onClose, onAdd }: AddInvestmentModalProps) {
    const { currency: userCurrency } = useCurrency();
    
    const [formData, setFormData] = useState({
        name: "",
        type: "STOCKS" as 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'FIXED_DEPOSIT' | 'OTHER',
        symbol: "",
        quantity: "",
        purchasePrice: "",
        currentPrice: "",
        purchaseDate: new Date().toISOString().split('T')[0],
        accountId: "",
        notes: "",
        // Fixed Deposit specific fields
        interestRate: "",
        maturityDate: "",
    });

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadAccounts();
        }
    }, [isOpen]);

    const loadAccounts = async () => {
        try {
            const result = await getUserAccounts();
            if (result.data) {
                setAccounts(result.data);
            } else {
                setError(result.error || "Failed to load accounts");
            }
        } catch (err) {
            setError("Failed to load accounts");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validation
            if (!formData.name.trim()) {
                setError("Investment name is required");
                return;
            }
            
            if (formData.type === 'FIXED_DEPOSIT') {
                // Fixed Deposit specific validation
                if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
                    setError("Principal amount must be greater than 0");
                    return;
                }
                if (formData.interestRate === "" || parseFloat(formData.interestRate) < 0) {
                    setError("Interest rate must be 0 or greater");
                    return;
                }
                if (!formData.maturityDate) {
                    setError("Maturity date is required for Fixed Deposits");
                    return;
                }
                if (formData.maturityDate && formData.purchaseDate && new Date(formData.maturityDate) <= new Date(formData.purchaseDate)) {
                    setError("Maturity date must be after the purchase date");
                    return;
                }
            } else {
                // Regular investment validation
                if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
                    setError("Quantity must be greater than 0");
                    return;
                }
                if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
                    setError("Purchase price must be greater than 0");
                    return;
                }
                if (!formData.currentPrice || parseFloat(formData.currentPrice) < 0) {
                    setError("Current price must be 0 or greater");
                    return;
                }
            }
            
            if (!formData.accountId) {
                setError("Please select an account");
                return;
            }

            // Validate account balance for investment amount
            const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
            let totalInvestmentAmount: number;
            
            if (formData.type === 'FIXED_DEPOSIT') {
                totalInvestmentAmount = parseFloat(formData.purchasePrice); // Principal amount for FD
            } else {
                totalInvestmentAmount = parseFloat(formData.quantity || "0") * parseFloat(formData.purchasePrice || "0");
            }
            
            if (selectedAccount && selectedAccount.balance !== undefined) {
                if (totalInvestmentAmount > selectedAccount.balance) {
                    setError(`Insufficient balance. Investment total of ${formatCurrency(totalInvestmentAmount, userCurrency)} exceeds account balance of ${formatCurrency(selectedAccount.balance, userCurrency)}.`);
                    return;
                }
            }

            const investmentData: any = {
                name: formData.name.trim(),
                type: formData.type,
                symbol: formData.symbol.trim() || undefined,
                quantity: formData.type === 'FIXED_DEPOSIT' ? 1 : parseFloat(formData.quantity || "0"),
                purchasePrice: parseFloat(formData.purchasePrice || "0"),
                currentPrice: formData.type === 'FIXED_DEPOSIT' ? parseFloat(formData.purchasePrice || "0") : parseFloat(formData.currentPrice || "0"),
                purchaseDate: new Date(formData.purchaseDate + 'T00:00:00'),
                accountId: parseInt(formData.accountId),
                notes: formData.notes.trim() || undefined,
            };

            // Add Fixed Deposit specific fields
            if (formData.type === 'FIXED_DEPOSIT') {
                investmentData.interestRate = parseFloat(formData.interestRate || "0");
                investmentData.maturityDate = formData.maturityDate ? new Date(formData.maturityDate + 'T00:00:00') : undefined;
            }

            await onAdd(investmentData);
            
            // Reset form
            setFormData({
                name: "",
                type: "STOCKS",
                symbol: "",
                quantity: "",
                purchasePrice: "",
                currentPrice: "",
                purchaseDate: new Date().toISOString().split('T')[0],
                accountId: "",
                notes: "",
                // Fixed Deposit specific fields
                interestRate: "",
                maturityDate: "",
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add investment");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const investmentTypes = [
        { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit' },
        { value: 'STOCKS', label: 'Stocks' },
        { value: 'CRYPTO', label: 'Cryptocurrency' },
        { value: 'MUTUAL_FUNDS', label: 'Mutual Funds' },
        { value: 'BONDS', label: 'Bonds' },
        { value: 'REAL_ESTATE', label: 'Real Estate' },
        { value: 'GOLD', label: 'Gold' },
        { value: 'OTHER', label: 'Other' },
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Add New Investment</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Investment Name *
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Apple Inc., Bitcoin, S&P 500 ETF"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                            Investment Type *
                        </label>
                        <select
                            id="type"
                            value={formData.type}
                            onChange={(e) => handleInputChange("type", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            {investmentTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {formData.type !== 'FIXED_DEPOSIT' && (
                        <div>
                            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-1">
                                Symbol (Optional)
                            </label>
                            <input
                                type="text"
                                id="symbol"
                                value={formData.symbol}
                                onChange={(e) => handleInputChange("symbol", e.target.value.toUpperCase())}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., AAPL, BTC, SPY"
                            />
                        </div>
                    )}

                    {formData.type === 'FIXED_DEPOSIT' ? (
                        <>
                            <div>
                                <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
                                    Principal Amount *
                                </label>
                                <input
                                    type="number"
                                    id="purchasePrice"
                                    step="0.01"
                                    min="0"
                                    value={formData.purchasePrice}
                                    onChange={(e) => handleInputChange("purchasePrice", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700 mb-1">
                                        Interest Rate (% per annum) *
                                    </label>
                                    <input
                                        type="number"
                                        id="interestRate"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={formData.interestRate}
                                        onChange={(e) => handleInputChange("interestRate", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="5.50"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="maturityDate" className="block text-sm font-medium text-gray-700 mb-1">
                                        Maturity Date *
                                    </label>
                                    <input
                                        type="date"
                                        id="maturityDate"
                                        value={formData.maturityDate}
                                        onChange={(e) => handleInputChange("maturityDate", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        id="quantity"
                                        step="0.00000001"
                                        min="0"
                                        value={formData.quantity}
                                        onChange={(e) => handleInputChange("quantity", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
                                        Purchase Price *
                                    </label>
                                    <input
                                        type="number"
                                        id="purchasePrice"
                                        step="0.01"
                                        min="0"
                                        value={formData.purchasePrice}
                                        onChange={(e) => handleInputChange("purchasePrice", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="currentPrice" className="block text-sm font-medium text-gray-700 mb-1">
                                    Current Price *
                                </label>
                                <input
                                    type="number"
                                    id="currentPrice"
                                    step="0.01"
                                    min="0"
                                    value={formData.currentPrice}
                                    onChange={(e) => handleInputChange("currentPrice", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
                            {formData.type === 'FIXED_DEPOSIT' ? 'Deposit Date *' : 'Purchase Date *'}
                        </label>
                        <input
                            type="date"
                            id="purchaseDate"
                            value={formData.purchaseDate}
                            onChange={(e) => handleInputChange("purchaseDate", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-1">
                            Account * {formData.accountId && (() => {
                                const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
                                let totalAmount: number;
                                if (formData.type === 'FIXED_DEPOSIT') {
                                    totalAmount = parseFloat(formData.purchasePrice || "0");
                                } else {
                                    totalAmount = parseFloat(formData.quantity || "0") * parseFloat(formData.purchasePrice || "0");
                                }
                                if (selectedAccount && totalAmount > 0) {
                                    return (
                                        <span className="text-sm text-gray-500">
                                            (Investment: {formatCurrency(totalAmount, userCurrency)})
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </label>
                        <select
                            id="accountId"
                            value={formData.accountId}
                            onChange={(e) => handleInputChange("accountId", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">Select an account</option>
                            {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.bankName} - {account.accountNumber} ({formatCurrency(account.balance, userCurrency)})
                                </option>
                            ))}
                        </select>
                        {formData.accountId && formData.purchasePrice && (formData.type === 'FIXED_DEPOSIT' || formData.quantity) && (() => {
                            const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
                            let totalAmount: number;
                            if (formData.type === 'FIXED_DEPOSIT') {
                                totalAmount = parseFloat(formData.purchasePrice);
                            } else {
                                totalAmount = parseFloat(formData.quantity || "0") * parseFloat(formData.purchasePrice);
                            }
                            if (selectedAccount && selectedAccount.balance !== undefined && totalAmount > selectedAccount.balance) {
                                return (
                                    <p className="text-sm text-red-600 mt-1">
                                        Insufficient balance. Available: {formatCurrency(selectedAccount.balance, userCurrency)}
                                    </p>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => handleInputChange("notes", e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Any additional notes about this investment..."
                        />
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (() => {
                                if (formData.accountId && formData.purchasePrice && (formData.type === 'FIXED_DEPOSIT' || formData.quantity)) {
                                    const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
                                    let totalAmount: number;
                                    if (formData.type === 'FIXED_DEPOSIT') {
                                        totalAmount = parseFloat(formData.purchasePrice);
                                    } else {
                                        totalAmount = parseFloat(formData.quantity || "0") * parseFloat(formData.purchasePrice);
                                    }
                                    return selectedAccount && selectedAccount.balance !== undefined && totalAmount > selectedAccount.balance;
                                }
                                return false;
                            })()}
                            className={`flex-1 px-4 py-2 rounded-md disabled:opacity-50 ${
                                (() => {
                                    if (formData.accountId && formData.purchasePrice && (formData.type === 'FIXED_DEPOSIT' || formData.quantity)) {
                                        const selectedAccount = accounts.find(acc => acc.id === parseInt(formData.accountId));
                                        let totalAmount: number;
                                        if (formData.type === 'FIXED_DEPOSIT') {
                                            totalAmount = parseFloat(formData.purchasePrice);
                                        } else {
                                            totalAmount = parseFloat(formData.quantity || "0") * parseFloat(formData.purchasePrice);
                                        }
                                        if (selectedAccount && selectedAccount.balance !== undefined && totalAmount > selectedAccount.balance) {
                                            return 'bg-gray-400 text-white cursor-not-allowed';
                                        }
                                    }
                                    return 'bg-blue-600 hover:bg-blue-700 text-white';
                                })()
                            }`}
                        >
                            {loading ? "Adding..." : "Add Investment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 