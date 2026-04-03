"use client";

import { X } from "lucide-react";
import { InvestmentInterface } from "../../../types/investments";
import { formatCurrency } from "../../../utils/currency";
import { formatDateYearMonthDay } from "../../../utils/date";
import { useCurrency } from "../../../providers/CurrencyProvider";
import { cn } from "@/lib/utils";
import {
    getInvestmentTypeBadgeClassName,
    getInvestmentTypeLabel,
    normalizeInvestmentType,
} from "../utils/investmentTypeUi";
import { InvestmentSavingsTargetChart } from "./InvestmentSavingsTargetChart";

interface ViewInvestmentModalProps {
    investment: InvestmentInterface | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (investment: InvestmentInterface) => void;
}

export function ViewInvestmentModal({ investment, isOpen, onClose, onEdit }: ViewInvestmentModalProps) {
    const { currency: userCurrency } = useCurrency();

    if (!isOpen || !investment) return null;

    const totalValue = investment.quantity * investment.currentPrice;
    const totalCost = investment.quantity * investment.purchasePrice;
    const gain = totalValue - totalCost;
    const gainPercentage = ((investment.currentPrice - investment.purchasePrice) / investment.purchasePrice * 100).toFixed(2);

    const getGainColor = (gain: number) => {
        if (gain > 0) return 'text-green-600';
        if (gain < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getGainBgColor = (gain: number) => {
        if (gain > 0) return 'bg-green-50 border-green-200';
        if (gain < 0) return 'bg-red-50 border-red-200';
        return 'bg-gray-50 border-gray-200';
    };

    const invType = normalizeInvestmentType(investment.type);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="min-w-0">
                        <h2 className="text-2xl font-bold text-gray-900 break-words">{investment.name}</h2>
                        {investment.symbol && (
                            <p className="text-sm text-gray-600 mt-1">{investment.symbol}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" aria-hidden />
                    </button>
                </div>

                <div className="rounded-lg border border-gray-200 bg-slate-50/70 px-4 py-3 mb-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                                Category
                            </p>
                            <span
                                className={cn(
                                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                                    getInvestmentTypeBadgeClassName(invType)
                                )}
                            >
                                {getInvestmentTypeLabel(invType)}
                            </span>
                        </div>
                        {investment.investmentTarget ? (
                            <div className="min-w-0 sm:max-w-[min(100%,20rem)] sm:text-right">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
                                    Linked savings target
                                </p>
                                <p className="text-sm font-semibold text-gray-900 break-words">
                                    {investment.investmentTarget.nickname?.trim() ||
                                        getInvestmentTypeLabel(
                                            normalizeInvestmentType(
                                                investment.investmentTarget.investmentType
                                            )
                                        )}
                                </p>
                                {investment.investmentTarget.nickname?.trim() ? (
                                    <p className="text-xs text-gray-600 mt-1">
                                        Goal type:{" "}
                                        {getInvestmentTypeLabel(
                                            normalizeInvestmentType(
                                                investment.investmentTarget.investmentType
                                            )
                                        )}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="space-y-6">
                    {investment.investmentTarget && (
                        <div>
                            <InvestmentSavingsTargetChart
                                targetAmount={investment.investmentTarget.targetAmount}
                                fulfilledAmount={investment.investmentTarget.fulfilledAmount}
                                currency={userCurrency}
                            />
                        </div>
                    )}

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                        <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3.5">
                            <h3 className="mb-3 text-sm font-semibold tracking-tight text-gray-800">
                                Investment Details
                            </h3>
                            <div className="space-y-0 divide-y divide-gray-100/90">
                                {(investment.type !== 'FIXED_DEPOSIT' && investment.type !== 'PROVIDENT_FUNDS' && investment.type !== 'SAFE_KEEPINGS' && investment.type !== 'EMERGENCY_FUND' && investment.type !== 'MARRIAGE' && investment.type !== 'VACATION') && (
                                    <div className="flex justify-between gap-3 py-2.5 first:pt-0">
                                        <span className="text-xs text-gray-500">Quantity</span>
                                        <span className="text-sm font-medium tabular-nums text-gray-900">{investment.quantity}</span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-3 py-2.5">
                                    <span className="text-xs text-gray-500">
                                        {(investment.type === 'FIXED_DEPOSIT' || investment.type === 'EMERGENCY_FUND' || investment.type === 'MARRIAGE' || investment.type === 'VACATION') ? 'Principal amount' : 
                                         investment.type === 'PROVIDENT_FUNDS' || investment.type === 'SAFE_KEEPINGS' ? 'Investment amount' : 
                                         investment.type === 'GOLD' || investment.type === 'SILVER' ? 'Purchase price (/gm)' : 'Purchase price'}
                                    </span>
                                    <span className="text-sm font-medium tabular-nums text-gray-900">
                                        {formatCurrency(investment.purchasePrice, userCurrency)}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-3 py-2.5">
                                    <span className="text-xs text-gray-500">
                                        {investment.type === "GOLD" || investment.type === "SILVER"
                                            ? "Spot (/gm)"
                                            : "Current price"}
                                    </span>
                                    <span className="text-sm font-medium tabular-nums text-gray-900">
                                        {formatCurrency(investment.currentPrice, userCurrency)}
                                    </span>
                                </div>
                                {investment.type === "GOLD" || investment.type === "SILVER" ? (
                                    <p className="py-2.5 text-[11px] leading-relaxed text-gray-500">
                                        Total purchase = quantity (g) × purchase price per gm. Current total = quantity × spot
                                        per gm (set on the investments page).
                                    </p>
                                ) : null}
                                {(investment.type === 'FIXED_DEPOSIT' || investment.type === 'PROVIDENT_FUNDS' || investment.type === 'SAFE_KEEPINGS' || investment.type === 'EMERGENCY_FUND' || investment.type === 'MARRIAGE' || investment.type === 'VACATION') && investment.interestRate && (
                                    <div className="flex justify-between gap-3 py-2.5">
                                        <span className="text-xs text-gray-500">Interest rate</span>
                                        <span className="text-sm font-medium text-gray-900">{investment.interestRate}% p.a.</span>
                                    </div>
                                )}
                                {(investment.type === 'FIXED_DEPOSIT' || investment.type === 'PROVIDENT_FUNDS' || investment.type === 'SAFE_KEEPINGS' || investment.type === 'EMERGENCY_FUND' || investment.type === 'MARRIAGE' || investment.type === 'VACATION') && investment.maturityDate && (
                                    <div className="flex justify-between gap-3 py-2.5">
                                        <span className="text-xs text-gray-500">Maturity date</span>
                                        <span className="text-sm font-medium tabular-nums text-gray-900">
                                            {formatDateYearMonthDay(investment.maturityDate)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between gap-3 py-2.5 last:pb-0">
                                    <span className="text-xs text-gray-500">
                                        {(investment.type === 'FIXED_DEPOSIT' || investment.type === 'EMERGENCY_FUND' || investment.type === 'MARRIAGE' || investment.type === 'VACATION') ? 'Deposit date' : 
                                         investment.type === 'PROVIDENT_FUNDS' || investment.type === 'SAFE_KEEPINGS' ? 'Investment date' : 
                                         'Purchase date'}
                                    </span>
                                    <span className="text-sm font-medium tabular-nums text-gray-900">
                                        {formatDateYearMonthDay(investment.purchaseDate)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3.5">
                            <h3 className="mb-3 text-sm font-semibold tracking-tight text-gray-800">Performance</h3>
                            <div className="space-y-0 divide-y divide-gray-100/90">
                                <div className="flex justify-between gap-3 py-2.5 first:pt-0">
                                    <span className="text-xs text-gray-500">Total cost</span>
                                    <span className="text-sm font-medium tabular-nums text-gray-900">
                                        {formatCurrency(totalCost, userCurrency)}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-3 py-2.5">
                                    <span className="text-xs text-gray-500">Current value</span>
                                    <span className="text-sm font-semibold tabular-nums text-gray-900">
                                        {formatCurrency(totalValue, userCurrency)}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-3 py-2.5 last:pb-0">
                                    <span className="text-xs text-gray-500">Gain / loss</span>
                                    <div className="text-right">
                                        <div className={`text-sm font-semibold tabular-nums ${getGainColor(gain)}`}>
                                            {formatCurrency(gain, userCurrency)}
                                        </div>
                                        <div className={`mt-0.5 text-xs tabular-nums ${getGainColor(gain)}`}>
                                            {gainPercentage}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Summary */}
                    <div className={`rounded-lg border p-3.5 ${getGainBgColor(gain)}`}>
                        <div className="text-center">
                            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
                                Overall performance
                            </h3>
                            <div className={`text-xl font-bold tabular-nums ${getGainColor(gain)}`}>
                                {formatCurrency(gain, userCurrency)}
                            </div>
                            <div className={`mt-1 text-sm ${getGainColor(gain)}`}>
                                {gainPercentage}% {gain >= 0 ? "gain" : "loss"}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {investment.notes && (
                        <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3.5">
                            <h3 className="mb-2 text-sm font-semibold text-gray-800">Notes</h3>
                            <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">{investment.notes}</p>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3.5">
                        <h3 className="mb-2 text-sm font-semibold text-gray-800">Record information</h3>
                        <div className="grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2 sm:gap-3">
                            <div>
                                <span className="text-gray-500">Created</span>
                                <span className="mt-0.5 block font-medium text-gray-800">
                                    {new Date(investment.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Last updated</span>
                                <span className="mt-0.5 block font-medium text-gray-800">
                                    {new Date(investment.updatedAt).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            onEdit(investment);
                            onClose();
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                    >
                        Edit Investment
                    </button>
                </div>
            </div>
        </div>
    );
} 