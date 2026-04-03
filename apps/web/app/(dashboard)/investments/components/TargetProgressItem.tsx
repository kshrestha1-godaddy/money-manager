"use client";

import React from "react";
import { InvestmentTargetProgress } from "../../../types/investments";
import { formatCurrency } from "../../../utils/currency";
import { formatDateYearMonthDay } from "../../../utils/date";
import { Edit, Calendar, AlertCircle, Clock } from "lucide-react";

// Shared constants for investment components
export const INVESTMENT_TYPES = [
    { value: 'STOCKS', label: 'Stocks' },
    { value: 'CRYPTO', label: 'Cryptocurrency' },
    { value: 'MUTUAL_FUNDS', label: 'Mutual Funds' },
    { value: 'BONDS', label: 'Bonds' },
    { value: 'REAL_ESTATE', label: 'Real Estate' },
    { value: 'GOLD', label: 'Gold' },
    { value: 'SILVER', label: 'Silver' },
    { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit' },
    { value: 'EMERGENCY_FUND', label: 'Emergency Fund' },
    { value: 'MARRIAGE', label: 'Marriage' },
    { value: 'VACATION', label: 'Vacation' },
    { value: 'PROVIDENT_FUNDS', label: 'Provident Funds' },
    { value: 'SAFE_KEEPINGS', label: 'Safe Keepings' },
    { value: 'OTHER', label: 'Other' },
] as const;

export const formatInvestmentType = (type: string): string => {
    switch (type) {
        case 'STOCKS': return 'Stocks';
        case 'CRYPTO': return 'Cryptocurrency';
        case 'MUTUAL_FUNDS': return 'Mutual Funds';
        case 'BONDS': return 'Bonds';
        case 'REAL_ESTATE': return 'Real Estate';
        case 'GOLD': return 'Gold';
        case 'SILVER': return 'Silver';
        case 'FIXED_DEPOSIT': return 'Fixed Deposit';
        case 'EMERGENCY_FUND': return 'Emergency Fund';
        case 'MARRIAGE': return 'Marriage';
        case 'VACATION': return 'Vacation';
        case 'PROVIDENT_FUNDS': return 'Provident Funds';
        case 'SAFE_KEEPINGS': return 'Safe Keepings';
        case 'OTHER': return 'Other';
        default: return type;
    }
};

// Type guards and utilities
export type InvestmentType = typeof INVESTMENT_TYPES[number]['value'];

export const getInvestmentTypeLabel = (value: string): string => {
    return INVESTMENT_TYPES.find(type => type.value === value)?.label || value;
};

interface TargetProgressItemProps {
    target: InvestmentTargetProgress;
    currency: string;
    onEditTarget?: (targetId: number) => void;
}

const getProgressColor = (progress: number): string => {
    // Convert progress to a value between 0 and 1
    const intensity = Math.min(progress / 100, 1);
    
    // Use a blue gradient that gets more intense as progress increases
    if (intensity >= 0.9) return "bg-blue-600";
    if (intensity >= 0.8) return "bg-blue-500";
    if (intensity >= 0.7) return "bg-blue-400";
    if (intensity >= 0.6) return "bg-blue-400";
    if (intensity >= 0.5) return "bg-blue-300";
    if (intensity >= 0.4) return "bg-blue-300";
    if (intensity >= 0.3) return "bg-blue-200";
    if (intensity >= 0.2) return "bg-blue-200";
    if (intensity >= 0.1) return "bg-blue-100";
    return "bg-blue-50";
};

const getProgressBgColor = (progress: number, isComplete: boolean, isOverdue?: boolean): string => {
    if (isComplete) return "bg-green-50 border-green-200";
    if (isOverdue) return "bg-red-50 border-red-200";
    return "bg-blue-50/30 border-blue-100";
};

/** Footer status for in-progress targets only (date lives in title). */
const getDateStatusDisplay = (target: InvestmentTargetProgress) => {
    if (target.isComplete) return null;

    if (!target.targetCompletionDate) return null;

    const formattedDate = formatDateYearMonthDay(target.targetCompletionDate);

    if (target.isOverdue) {
        return {
            icon: AlertCircle,
            text: `Overdue since ${formattedDate}`,
            className: "text-red-600",
        };
    }

    if (typeof target.daysRemaining === "number") {
        const daysText = target.daysRemaining === 1 ? "day" : "days";
        return {
            icon: Clock,
            text: `${target.daysRemaining} ${daysText} remaining`,
            className: target.daysRemaining <= 30 ? "text-red-600" : "text-gray-900",
        };
    }

    return {
        icon: Calendar,
        text: `Due ${formattedDate}`,
        className: "text-gray-900",
    };
};

export function TargetProgressItem({ target, currency, onEditTarget }: TargetProgressItemProps) {
    const dateStatus = getDateStatusDisplay(target);
    const titleText = target.nickname?.trim() || formatInvestmentType(target.investmentType);
    const targetDateLabel = target.targetCompletionDate
        ? formatDateYearMonthDay(target.targetCompletionDate)
        : null;

    return (
        <div className={`p-4 rounded-lg border ${getProgressBgColor(target.progress, target.isComplete, target.isOverdue)}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 leading-snug">
                        [{target.targetId}] {titleText}
                        {targetDateLabel && (
                            <>
                                {" "}
                                <span className="text-gray-400 font-normal">•</span>{" "}
                                <span className="text-gray-600 font-normal">{targetDateLabel}</span>
                            </>
                        )}
                    </h4>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                        {target.progress.toFixed(1)}%
                    </span>
                    {onEditTarget && (
                        <button
                            onClick={() => onEditTarget(target.targetId)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit target"
                        >
                            <Edit className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ease-out ${getProgressColor(target.progress)}`}
                    style={{ width: `${Math.min(target.progress, 100)}%` }}
                />
            </div>

            {/* Progress Details */}
            <div className="space-y-2">
                <div className="flex flex-wrap justify-between items-start gap-x-4 gap-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="text-gray-600">
                            Present value:{" "}
                            <span className="font-medium text-gray-900">
                                {formatCurrency(target.currentAmount, currency)}
                            </span>
                        </span>
                        <span className="text-gray-600">
                            Target:{" "}
                            <span className="font-medium text-gray-900">
                                {formatCurrency(target.targetAmount, currency)}
                            </span>
                        </span>
                    </div>
                    <div className="text-right shrink-0">
                        {target.isComplete ? (
                            <span className="text-green-600 font-medium">
                                {target.targetCompletionDate
                                    ? `Achieved on ${formatDateYearMonthDay(target.targetCompletionDate)}`
                                    : ""}
                            </span>
                        ) : (
                            <span className="text-gray-600">
                                Remaining:{" "}
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(Math.max(0, target.targetAmount - target.currentAmount), currency)}
                                </span>
                            </span>
                        )}
                    </div>
                </div>

                {dateStatus && (
                    <div className="flex justify-end items-center text-sm pt-0.5">
                        <div className="flex items-center gap-2">
                            <dateStatus.icon className="w-4 h-4 shrink-0" />
                            <span className={dateStatus.className}>{dateStatus.text}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}