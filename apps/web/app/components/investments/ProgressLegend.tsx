"use client";

import React from "react";

interface ProgressLegendProps {
    className?: string;
}

export function ProgressLegend({ className = "" }: ProgressLegendProps) {
    return (
        <div className={`flex items-center justify-center gap-2 text-xs text-gray-500 ${className}`}>
            <span>Less</span>
            <div className="flex h-3 w-32 rounded overflow-hidden">
                <div className="bg-blue-50 flex-1"></div>
                <div className="bg-blue-100 flex-1"></div>
                <div className="bg-blue-200 flex-1"></div>
                <div className="bg-blue-300 flex-1"></div>
                <div className="bg-blue-400 flex-1"></div>
                <div className="bg-blue-500 flex-1"></div>
                <div className="bg-blue-600 flex-1"></div>
                <div className="bg-green-500 flex-1"></div>
            </div>
            <span>More</span>
        </div>
    );
}