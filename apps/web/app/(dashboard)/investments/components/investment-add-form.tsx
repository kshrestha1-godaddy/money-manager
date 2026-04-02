"use client";

import { useState, useEffect } from "react";
import { InvestmentInterface, InvestmentTarget } from "../../../types/investments";
import { getUserAccounts } from "../../accounts/actions/accounts";
import { getInvestmentTargets } from "../actions/investment-targets";
import {
  getInvestmentTypeLabel,
  isDepositStyleType,
  isProvidentOrSafeType,
  isQuantityBasedInvestmentType,
  isSymbolApplicableType,
  normalizeInvestmentType,
  requiresCurrentPriceField,
} from "../utils/investmentTypeUi";
import { formatCurrency } from "../../../utils/currency";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { getLocalDateString, buttonClasses } from "../../../utils/formUtils";

interface Account {
  id: number;
  holderName: string;
  bankName: string;
  accountNumber: string;
  balance?: number;
}

export interface InvestmentAddFormProps {
  /** When true, loads accounts and targets (e.g. sheet/modal open). */
  enabled: boolean;
  /** When true, Stocks is hidden — only one Stocks position is allowed per account. */
  hasExistingStocksInvestment?: boolean;
  onSubmit: (
    investment: Omit<
      InvestmentInterface,
      "id" | "userId" | "createdAt" | "updatedAt" | "account" | "investmentTarget"
    >
  ) => void | Promise<void>;
  /** Dismiss without saving (Cancel / back). */
  onCancel: () => void;
  /** If set, called after successful submit and reset instead of `onCancel`. */
  onAfterSuccess?: () => void;
  footerVariant?: "modal" | "mobile";
}

const investmentTypes = [
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
  { value: "PROVIDENT_FUNDS", label: "Provident Funds" },
  { value: "SAFE_KEEPINGS", label: "Safe Keepings" },
  { value: "OTHER", label: "Other" },
] as const;

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

export function InvestmentAddForm({
  enabled,
  hasExistingStocksInvestment = false,
  onSubmit,
  onCancel,
  onAfterSuccess,
  footerVariant = "modal",
}: InvestmentAddFormProps) {
  const { currency: userCurrency } = useCurrency();

  const [formData, setFormData] = useState({
    name: "",
    type: (hasExistingStocksInvestment
      ? "MUTUAL_FUNDS"
      : "STOCKS") as InvestmentInterface["type"],
    symbol: "",
    quantity: "1",
    purchasePrice: "",
    currentPrice: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    accountId: "",
    notes: "",
    interestRate: "",
    maturityDate: "",
    deductFromAccount: true,
    investmentTargetId: "",
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [targets, setTargets] = useState<InvestmentTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    void loadAccounts();
    void (async () => {
      const result = await getInvestmentTargets();
      if (result.data) setTargets(result.data);
      else setTargets([]);
    })();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !hasExistingStocksInvestment) return;
    setFormData((prev) =>
      prev.type === "STOCKS" ? { ...prev, type: "MUTUAL_FUNDS" } : prev
    );
  }, [enabled, hasExistingStocksInvestment]);

  const loadAccounts = async () => {
    try {
      const result = await getUserAccounts();
      if (Array.isArray(result)) {
        setAccounts(result);
        setError(null);
      } else if (result && "error" in result && result.error) {
        setError(result.error);
        setAccounts([]);
      } else {
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
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        setError("Investment name is required");
        return;
      }

      const resolvedType = normalizeInvestmentType(formData.type);
      const isQuantityBased = isQuantityBasedInvestmentType(resolvedType);
      const needsCurrentPrice = requiresCurrentPriceField(resolvedType);

      if (resolvedType === "STOCKS" && hasExistingStocksInvestment) {
        setError(
          "You already have a Stocks investment. Only one Stocks position is allowed."
        );
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

      const investmentData: Record<string, unknown> = {
        name: formData.name.trim(),
        type: resolvedType,
        symbol: formData.symbol.trim() || undefined,
        quantity: isQuantityBased ? parseFloat(formData.quantity || "0") : 1,
        purchasePrice: parseFloat(formData.purchasePrice || "0"),
        currentPrice: needsCurrentPrice
          ? parseFloat(formData.currentPrice || "0")
          : parseFloat(formData.purchasePrice || "0"),
        purchaseDate: new Date(formData.purchaseDate + "T00:00:00"),
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
          ? new Date(formData.maturityDate + "T00:00:00")
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
          investmentData.maturityDate = new Date(formData.maturityDate + "T00:00:00");
        }
      }

      await onSubmit(
        investmentData as Omit<
          InvestmentInterface,
          "id" | "userId" | "createdAt" | "updatedAt" | "account" | "investmentTarget"
        >
      );

      setFormData({
        name: "",
        type: hasExistingStocksInvestment ? "MUTUAL_FUNDS" : "STOCKS",
        symbol: "",
        quantity: "1",
        purchasePrice: "",
        currentPrice: "",
        purchaseDate: getLocalDateString(),
        accountId: "",
        notes: "",
        interestRate: "",
        maturityDate: "",
        deductFromAccount: true,
        investmentTargetId: "",
      });
      if (onAfterSuccess) onAfterSuccess();
      else onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add investment");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === "deductFromAccount") {
      setFormData((prev) => ({ ...prev, [field]: value === "true" }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    setError(null);
  };

  const resolvedType = normalizeInvestmentType(formData.type);

  const investmentTypeOptions = hasExistingStocksInvestment
    ? investmentTypes.filter((t) => t.value !== "STOCKS")
    : investmentTypes;

  const formFields = (
    <>
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label htmlFor="inv-add-name" className="block text-sm font-medium text-gray-700 mb-1">
            Investment Name *
          </label>
          <input
            type="text"
            id="inv-add-name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={inputClass}
            placeholder="e.g., Apple Inc., Bitcoin, S&P 500 ETF"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="inv-add-type" className="block text-sm font-medium text-gray-700 mb-1">
            Investment Type *
          </label>
          <select
            id="inv-add-type"
            value={formData.type}
            onChange={(e) => handleInputChange("type", e.target.value)}
            className={inputClass}
            required
            disabled={loading}
          >
            {investmentTypeOptions.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {resolvedType === "STOCKS" ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-950">
            <p className="font-medium text-blue-900">Stocks cost basis</p>
            <p className="mt-1.5 leading-relaxed text-blue-800/95">
              In your portfolio, <strong>purchase cost</strong> for this position is taken from the{" "}
              <strong>sum of expenses</strong> you record under the expense category{" "}
              <strong>{getInvestmentTypeLabel("STOCKS")}</strong> (converted to your currency), not
              strictly from the purchase price and quantity fields below. Use those fields for
              reference, account deduction, or current market value; the table reflects
              expense-based cost when you have Stocks expenses.
            </p>
          </div>
        ) : null}

        {isSymbolApplicableType(resolvedType) ? (
          <div>
            <label htmlFor="inv-add-symbol" className="block text-sm font-medium text-gray-700 mb-1">
              Symbol (Optional)
            </label>
            <input
              type="text"
              id="inv-add-symbol"
              value={formData.symbol}
              onChange={(e) => handleInputChange("symbol", e.target.value.toUpperCase())}
              className={inputClass}
              placeholder="e.g., AAPL, BTC, SPY"
              disabled={loading}
            />
          </div>
        ) : null}

        {isDepositStyleType(resolvedType) ? (
          <>
            <div>
              <label htmlFor="inv-add-purchasePrice-fd" className="block text-sm font-medium text-gray-700 mb-1">
                Principal Amount *
              </label>
              <input
                type="number"
                id="inv-add-purchasePrice-fd"
                step="0.01"
                min="0"
                value={formData.purchasePrice}
                onChange={(e) => handleInputChange("purchasePrice", e.target.value)}
                className={inputClass}
                placeholder="0.00"
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="inv-add-interest-fd" className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Rate (% per annum) *
                </label>
                <input
                  type="number"
                  id="inv-add-interest-fd"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.interestRate}
                  onChange={(e) => handleInputChange("interestRate", e.target.value)}
                  className={inputClass}
                  placeholder="5.50"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="inv-add-maturity-fd" className="block text-sm font-medium text-gray-700 mb-1">
                  Maturity Date *
                </label>
                <input
                  type="date"
                  id="inv-add-maturity-fd"
                  value={formData.maturityDate}
                  onChange={(e) => handleInputChange("maturityDate", e.target.value)}
                  className={inputClass}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </>
        ) : isProvidentOrSafeType(resolvedType) ? (
          <>
            <div>
              <label htmlFor="inv-add-purchasePrice-pv" className="block text-sm font-medium text-gray-700 mb-1">
                Investment Amount *
              </label>
              <input
                type="number"
                id="inv-add-purchasePrice-pv"
                step="0.01"
                min="0"
                value={formData.purchasePrice}
                onChange={(e) => handleInputChange("purchasePrice", e.target.value)}
                className={inputClass}
                placeholder="0.00"
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="inv-add-interest-pv" className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Rate (Optional)
                </label>
                <input
                  type="number"
                  id="inv-add-interest-pv"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.interestRate}
                  onChange={(e) => handleInputChange("interestRate", e.target.value)}
                  className={inputClass}
                  placeholder="5.50"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="inv-add-maturity-pv" className="block text-sm font-medium text-gray-700 mb-1">
                  Maturity Date (Optional)
                </label>
                <input
                  type="date"
                  id="inv-add-maturity-pv"
                  value={formData.maturityDate}
                  onChange={(e) => handleInputChange("maturityDate", e.target.value)}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="inv-add-quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  id="inv-add-quantity"
                  step="0.00000001"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="inv-add-purchasePrice-q" className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Price *
                </label>
                <input
                  type="number"
                  id="inv-add-purchasePrice-q"
                  step="0.01"
                  min="0"
                  value={formData.purchasePrice}
                  onChange={(e) => handleInputChange("purchasePrice", e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="inv-add-currentPrice" className="block text-sm font-medium text-gray-700 mb-1">
                Current Price *
              </label>
              <input
                type="number"
                id="inv-add-currentPrice"
                step="0.01"
                min="0"
                value={formData.currentPrice}
                onChange={(e) => handleInputChange("currentPrice", e.target.value)}
                className={inputClass}
                placeholder="0.00"
                required
                disabled={loading}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="inv-add-purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
            {isDepositStyleType(resolvedType) ? "Deposit Date *" : "Purchase Date *"}
          </label>
          <input
            type="date"
            id="inv-add-purchaseDate"
            value={formData.purchaseDate}
            onChange={(e) => handleInputChange("purchaseDate", e.target.value)}
            className={inputClass}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="inv-add-accountId" className="block text-sm font-medium text-gray-700 mb-1">
            Account (Optional){" "}
            {formData.accountId
              ? (() => {
                  const selectedAccount = accounts.find((acc) => acc.id === parseInt(formData.accountId, 10));
                  const totalAmount =
                    parseFloat(formData.quantity || "0") * parseFloat(formData.purchasePrice || "0");
                  if (selectedAccount && totalAmount > 0) {
                    return (
                      <span className="text-sm text-gray-500">
                        (Investment: {formatCurrency(totalAmount, userCurrency)})
                      </span>
                    );
                  }
                  return null;
                })()
              : null}
          </label>
          <select
            id="inv-add-accountId"
            value={formData.accountId}
            onChange={(e) => handleInputChange("accountId", e.target.value)}
            className={inputClass}
            disabled={loading}
          >
            <option value="">No account selected</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.bankName} - {account.accountNumber} ({formatCurrency(account.balance || 0, userCurrency)})
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            {formData.accountId
              ? formData.deductFromAccount
                ? "Investment amount will be marked as withheld from the selected account."
                : "Investment will be tracked independently without being withheld from the account."
              : "Investment will be tracked independently without being linked to any account."}
          </p>

          {formData.accountId ? (
            <div className="mt-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.deductFromAccount}
                  onChange={(e) => handleInputChange("deductFromAccount", e.target.checked.toString())}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-700">
                  Mark investment amount as withheld from account
                </span>
              </label>
              <p className="text-xs text-gray-500 ml-6 mt-1">
                {formData.deductFromAccount
                  ? "This investment amount will show as withheld in the accounts section"
                  : "This investment amount will not be considered as withheld from the account"}
              </p>
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="inv-add-target" className="block text-sm font-medium text-gray-700 mb-1">
            Savings target (optional)
          </label>
          <select
            id="inv-add-target"
            value={formData.investmentTargetId}
            onChange={(e) => handleInputChange("investmentTargetId", e.target.value)}
            className={inputClass}
            disabled={loading}
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
            If selected, this position&apos;s invested amount (cost) counts toward that goal. You can leave this
            empty.
          </p>
        </div>

        <div>
          <label htmlFor="inv-add-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="inv-add-notes"
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="Any additional notes about this investment..."
            disabled={loading}
          />
        </div>
      </div>
    </>
  );

  if (footerVariant === "mobile") {
    return (
      <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
          {formFields}
        </div>
        <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className={buttonClasses.secondary}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className={buttonClasses.primary}>
              {loading ? "Adding…" : "Add investment"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formFields}
      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-md disabled:opacity-50 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? "Adding..." : "Add Investment"}
        </button>
      </div>
    </form>
  );
}
