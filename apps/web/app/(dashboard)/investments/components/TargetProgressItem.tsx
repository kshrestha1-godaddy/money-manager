"use client";

import React from "react";
import { InvestmentTargetProgress } from "../../../types/investments";
import { formatCurrency } from "../../../utils/currency";
import { TrendingUp, Edit, Calendar, AlertCircle, Clock } from "lucide-react";

// Shared constants for investment components
export const INVESTMENT_TYPES = [
    { value: 'STOCKS', label: 'Stocks' },
    { value: 'CRYPTO', label: 'Cryptocurrency' },
    { value: 'MUTUAL_FUNDS', label: 'Mutual Funds' },
    { value: 'BONDS', label: 'Bonds' },
    { value: 'REAL_ESTATE', label: 'Real Estate' },
    { value: 'GOLD', label: 'Gold' },
    { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit' },
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
        case 'FIXED_DEPOSIT': return 'Fixed Deposit';
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
    onEditTarget?: (investmentType: string) => void;
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

// Utility function to format target date
const formatTargetDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(date);
};

// Utility function to get date status display
const getDateStatusDisplay = (target: InvestmentTargetProgress) => {
    if (!target.targetCompletionDate) return null;
    
    const formattedDate = formatTargetDate(target.targetCompletionDate);
    
    if (target.isComplete) {
        return {
            icon: TrendingUp,
            text: `Target achieved by ${formattedDate}`,
            className: "text-green-600"
        };
    }
    
    if (target.isOverdue) {
        return {
            icon: AlertCircle,
            text: `Overdue since ${formattedDate}`,
            className: "text-red-600"
        };
    }
    
    if (typeof target.daysRemaining === 'number') {
        const daysText = target.daysRemaining === 1 ? 'day' : 'days';
        return {
            icon: Clock,
            text: `${target.daysRemaining} ${daysText} remaining (${formattedDate})`,
            className: target.daysRemaining <= 30 ? "text-red-600" : "text-gray-900"
        };
    }
    
    return {
        icon: Calendar,
        text: `Target: ${formattedDate}`,
        className: "text-gray-900"
    };
};

// Utility function to get target date display for the main UI
const getTargetDateDisplay = (target: InvestmentTargetProgress) => {
    if (!target.targetCompletionDate) return null;
    
    const formattedDate = formatTargetDate(target.targetCompletionDate);
    
    // Determine color based on days remaining
    let dateClassName = "text-gray-900"; // default black
    if (typeof target.daysRemaining === 'number' && target.daysRemaining <= 30 && target.daysRemaining >= 0) {
        dateClassName = "text-red-600"; // red for less than one month
    } else if (target.isOverdue) {
        dateClassName = "text-red-600"; // red for overdue
    }
    
    return {
        date: formattedDate,
        className: dateClassName
    };
};

export function TargetProgressItem({ target, currency, onEditTarget }: TargetProgressItemProps) {
    const dateStatus = getDateStatusDisplay(target);
    const targetDateDisplay = getTargetDateDisplay(target);
    
    return (
        <div className={`p-4 rounded-lg border ${getProgressBgColor(target.progress, target.isComplete, target.isOverdue)}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                    <div>
                        <h4 className="font-medium text-gray-900">
                            {target.nickname || formatInvestmentType(target.investmentType)}
                        </h4>
                        {target.nickname && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                {formatInvestmentType(target.investmentType)}
                            </p>
                        )}
                    </div>
                    {target.isComplete && (
                        <TrendingUp className="w-4 h-4 text-green-600 ml-2" />
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                        {target.progress.toFixed(1)}%
                    </span>
                    {onEditTarget && (
                        <button
                            onClick={() => onEditTarget(target.investmentType)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit target"
                        >
                            <Edit className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ease-out ${getProgressColor(target.progress)}`}
                    style={{ width: `${Math.min(target.progress, 100)}%` }}
                />
            </div>

            {/* Progress Details */}
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-600">
                            Current: <span className="font-medium text-gray-900">{formatCurrency(target.currentAmount, currency)}</span>
                        </span>
                        <span className="text-gray-600">
                            Target: <span className="font-medium text-gray-900">{formatCurrency(target.targetAmount, currency)}</span>
                        </span>
                    </div>
                    <div className="text-right">
                        {target.isComplete ? (
                            <span className="text-green-600 font-medium">Target Achieved! 🎉</span>
                        ) : (
                            <span className="text-gray-600">
                                Remaining: <span className="font-medium text-gray-900">
                                    {formatCurrency(Math.max(0, target.targetAmount - target.currentAmount), currency)}
                                </span>
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Target Date Information */}
                {(dateStatus || targetDateDisplay) && (
                    <div className="flex justify-between items-center text-sm">
                        {/* Target Date Display - Left Side */}
                        <div>
                            {targetDateDisplay && (
                                <span className="text-gray-600">
                                    Target Date: <span className={`font-medium ${targetDateDisplay.className}`}>
                                        {targetDateDisplay.date}
                                    </span>
                                </span>
                            )}
                        </div>
                        
                        {/* Days Remaining Status - Right Side */}
                        <div>
                            {dateStatus && (
                                <div className="flex items-center">
                                    <dateStatus.icon className="w-4 h-4 mr-2" />
                                    <span className={dateStatus.className}>{dateStatus.text}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}