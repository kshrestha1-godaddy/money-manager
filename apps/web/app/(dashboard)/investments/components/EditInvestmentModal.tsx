"use client";

import { useState, useEffect, useMemo } from "react";
import { InvestmentInterface, InvestmentTarget } from "../../../types/investments";
import { getUserAccounts } from "../../accounts/actions/accounts";
import { getInvestmentTargets } from "../actions/investment-targets";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../providers/CurrencyProvider";
import {
    normalizeInvestmentType,
    isDepositStyleType,
    isProvidentOrSafeType,
    isSymbolApplicableType,
    isQuantityBasedInvestmentType,
    requiresCurrentPriceField,
    getInvestmentTypeLabel,
} from "../utils/investmentTypeUi";

interface EditInvestmentModalProps {
    investment: InvestmentInterface | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (id: number, investment: Partial<Omit<InvestmentInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'account' | 'investmentTarget'>>) => void;
}

interface Account {
    id: number;
    holderName: string;
    bankName: string;
    accountNumber: string;
    balance?: number;
}

const INVESTMENT_TYPE_OPTIONS: { value: InvestmentInterface["type"]; label: string }[] = [
    { value: "FIXED_DEPOSIT", label: "Fixed Deposit" },
    { value: "EMERGENCY_FUND", label: "Emergency Fund" },
    { value: "MARRIAGE", label: "Marriage" },
    { value: "VACATION", label: "Vacation" },
    { value: "STOCKS", label: "Stocks" },
    { value: "CRYPTO", label: "Cryptocurrency" },
    { value: "MUTUAL_FUNDS", label: "Mutual Funds" },
    { value: "BONDS", label: "Bonds" },
    { value: "REAL_ESTATE", label: "Real Estate" },
    { value: "GOLD", label: "Gold" },
    { value: "SILVER", label: "Silver" },
    { value: "PROVIDENT_FUNDS", label: "Provident Funds" },
    { value: "SAFE_KEEPINGS", label: "Safe Keepings" },
    { value: "OTHER", label: "Other" },
];

export function EditInvestmentModal({ investment, isOpen, onClose, onEdit }: EditInvestmentModalProps) {
    const { currency: userCurrency } = useCurrency();
    
    const [formData, setFormData] = useState({
        name: "",
        type: "STOCKS" as InvestmentInterface["type"],
        symbol: "",
        quantity: "",
        purchasePrice: "",
        currentPrice: "",
        purchaseDate: "",
        accountId: "",
        notes: "",
        // Fixed Deposit specific fields
        interestRate: "",
        maturityDate: "",
        // Account deduction control
        deductFromAccount: true,
        investmentTargetId: "",
    });

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [targets, setTargets] = useState<InvestmentTarget[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadAccounts();
            void (async () => {
                const result = await getInvestmentTargets();
                if (result.data) setTargets(result.data);
                else setTargets([]);
            })();
        }
    }, [isOpen]);

    const investmentSyncKey = useMemo(() => {
        if (!investment) return "";
        const updated =
            investment.updatedAt instanceof Date
                ? investment.updatedAt.getTime()
                : String(investment.updatedAt ?? "");
        return `${investment.id}-${updated}-${investment.type}-${investment.investmentTargetId ?? ""}`;
    }, [investment]);

    useEffect(() => {
        if (!investment || !isOpen) return;

        const normalizedType = normalizeInvestmentType(investment.type);
        setFormData({
            name: investment.name,
            type: normalizedType,
            symbol: investment.symbol || "",
            quantity: investment.quantity.toString(),
            purchasePrice: investment.purchasePrice.toString(),
            currentPrice: investment.currentPrice.toString(),
            purchaseDate: investment.purchaseDate
                ? new Date(investment.purchaseDate).toISOString().split("T")[0]
                : "",
            accountId: investment.accountId?.toString() || "",
            notes: investment.notes ?? "",
            interestRate: investment.interestRate?.toString() || "",
            maturityDate: investment.maturityDate
                ? new Date(investment.maturityDate).toISOString().split("T")[0]
                : "",
            deductFromAccount: investment.deductFromAccount ?? true,
            investmentTargetId:
                investment.investmentTargetId != null
                    ? String(investment.investmentTargetId)
                    : "",
        });
    }, [investmentSyncKey, isOpen]);

    const loadAccounts = async () => {
        try {
            const result = await getUserAccounts();
            if (Array.isArray(result)) {
                // Successfully got accounts array
                setAccounts(result);
                setError(null);
            } else if (result.error) {
                // Got error response
                setError(result.error);
                setAccounts([]);
            } else {
                // Unexpected response format
                setError("Failed to load accounts");
                setAccounts([]);
            }
        } catch (err) {
            console.error("Error loading accounts:", err);
            setError("Failed to load accounts");
            setAccounts([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!investment) return;

        const resolvedType = normalizeInvestmentType(formData.type);
        const isQuantityBased = isQuantityBasedInvestmentType(resolvedType);
        const needsCurrentPrice = requiresCurrentPriceField(resolvedType);

        setLoading(true);
        setError(null);

        try {
            if (!formData.name.trim()) {
                setError("Investment name is required");
                return;
            }

            if (isQuantityBased && (!formData.quantity || parseFloat(formData.quantity) <= 0)) {
                setError("Quantity must be greater than 0");
                return;
            }
            if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
                setError("Purchase price must be greater than 0");
                return;
            }
            if (needsCurrentPrice && (!formData.currentPrice || parseFloat(formData.currentPrice) < 0)) {
                setError("Current price must be 0 or greater");
                return;
            }

            const purchasePriceNum = parseFloat(formData.purchasePrice || "0");
            const investmentData: Record<string, unknown> = {
                name: formData.name.trim(),
                type: resolvedType,
                symbol: formData.symbol.trim() || undefined,
                quantity: isQuantityBased ? parseFloat(formData.quantity || "0") : 1,
                purchasePrice: purchasePriceNum,
                currentPrice: needsCurrentPrice
                    ? parseFloat(formData.currentPrice || "0")
                    : purchasePriceNum,
                purchaseDate: new Date(`${formData.purchaseDate}T00:00:00`),
                accountId: formData.accountId ? parseInt(formData.accountId, 10) : null,
                notes: formData.notes.trim() || undefined,
                deductFromAccount: formData.deductFromAccount,
                investmentTargetId: formData.investmentTargetId
                    ? parseInt(formData.investmentTargetId, 10)
                    : null,
            };

            if (resolvedType === "FIXED_DEPOSIT") {
                investmentData.interestRate = parseFloat(formData.interestRate || "0");
                investmentData.maturityDate = formData.maturityDate
                    ? new Date(`${formData.maturityDate}T00:00:00`)
                    : undefined;
            } else if (
                resolvedType === "PROVIDENT_FUNDS" ||
                resolvedType === "SAFE_KEEPINGS" ||
                resolvedType === "EMERGENCY_FUND" ||
                resolvedType === "MARRIAGE" ||
                resolvedType === "VACATION"
            ) {
                if (formData.interestRate) {
                    investmentData.interestRate = parseFloat(formData.interestRate);
                }
                if (formData.maturityDate) {
                    investmentData.maturityDate = new Date(`${formData.maturityDate}T00:00:00`);
                }
            }

            await onEdit(
                investment.id,
                investmentData as Partial<Omit<InvestmentInterface, "id" | "userId" | "createdAt" | "updatedAt" | "account" | "investmentTarget">>
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update investment");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        if (field === 'deductFromAccount') {
            setFormData(prev => ({ ...prev, [field]: value === 'true' }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
        setError(null);
    };

    if (!isOpen || !investment) return null;

    const resolvedType = normalizeInvestmentType(formData.type);
    const needsCurrentPriceFieldUi = requiresCurrentPriceField(resolvedType);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start gap-3 mb-4">
                    <div>
                        <h2 className="text-xl font-semibold">Edit Investment</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {getInvestmentTypeLabel(resolvedType)} — fields match the add form for this category.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 shrink-0"
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
                            Investment type *
                        </label>
                        <select
                            id="type"
                            value={formData.type}
                            onChange={(e) =>
                                handleInputChange(
                                    "type",
                                    normalizeInvestmentType(e.target.value)
                                )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            {INVESTMENT_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Change category if needed; field labels below follow this type. You can also link a savings target below.
                        </p>
                    </div>

                    {isSymbolApplicableType(resolvedType) && (
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

                    {isDepositStyleType(resolvedType) ? (
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
                    ) : isProvidentOrSafeType(resolvedType) ? (
                        <>
                            <div>
                                <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
                                    Investment Amount *
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
                                        Interest Rate (Optional)
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
                                    />
                                </div>

                                <div>
                                    <label htmlFor="maturityDate" className="block text-sm font-medium text-gray-700 mb-1">
                                        Maturity Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        id="maturityDate"
                                        value={formData.maturityDate}
                                        onChange={(e) => handleInputChange("maturityDate", e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        {resolvedType === "GOLD" || resolvedType === "SILVER"
                                            ? "Purchase price per unit *"
                                            : "Purchase Price *"}
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
                                    {resolvedType === "GOLD" || resolvedType === "SILVER" ? (
                                        <p className="mt-1 text-xs text-gray-500">
                                            Total purchase cost is quantity × this price. Current value uses the spot
                                            rate on the investments page.
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            {needsCurrentPriceFieldUi ? (
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
                            ) : null}
                        </>
                    )}

                    <div>
                        <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
                            {isDepositStyleType(resolvedType) ? "Deposit Date *" : "Purchase Date *"}
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
                            Account (Optional)
                            {formData.accountId && (() => {
                                const selectedAccount = accounts.find(
                                    (acc) => acc.id === parseInt(formData.accountId, 10)
                                );
                                const q = isQuantityBasedInvestmentType(resolvedType)
                                    ? parseFloat(formData.quantity || "0")
                                    : 1;
                                const totalAmount = q * parseFloat(formData.purchasePrice || "0");
                                if (selectedAccount && totalAmount > 0) {
                                    return (
                                        <span className="text-sm text-gray-500 font-normal">
                                            {" "}
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
                        >
                            <option value="">No account selected</option>
                            {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.bankName} - {account.accountNumber} (
                                    {formatCurrency(account.balance || 0, userCurrency)})
                                </option>
                            ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                            {formData.accountId 
                                ? (formData.deductFromAccount 
                                    ? "Investment amount will be marked as withheld from the selected account." 
                                    : "Investment will be tracked independently without being withheld from the account.")
                                : "Investment will be tracked independently without being linked to any account."
                            }
                        </p>
                        
                        {/* Withhold from Account Option - only show when account is selected */}
                        {formData.accountId && (
                            <div className="mt-3">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.deductFromAccount}
                                        onChange={(e) => handleInputChange("deductFromAccount", e.target.checked.toString())}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">
                                        Mark investment amount as withheld from account
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 ml-6 mt-1">
                                    {formData.deductFromAccount 
                                        ? "This investment amount will show as withheld in the accounts section"
                                        : "This investment amount will not be considered as withheld from the account"
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label htmlFor="investmentTargetId" className="block text-sm font-medium text-gray-700 mb-1">
                            Savings target (optional)
                        </label>
                        <select
                            id="investmentTargetId"
                            value={formData.investmentTargetId}
                            onChange={(e) => handleInputChange("investmentTargetId", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">None — not linked to a target</option>
                            {targets.map((t) => (
                                <option key={t.id} value={String(t.id)}>
                                    {t.nickname?.trim()
                                        ? `${t.nickname} (${getInvestmentTypeLabel(t.investmentType)})`
                                        : getInvestmentTypeLabel(t.investmentType)}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Invested amount (purchase cost) for this position counts toward the selected goal. Choose none to track without a goal.
                        </p>
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
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                        >
                            {loading ? "Updating..." : "Update Investment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 