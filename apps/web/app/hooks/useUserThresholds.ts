"use client";

import { useState, useEffect } from 'react';
import { DEFAULT_HIGH_VALUE_THRESHOLDS } from '../utils/thresholdUtils';

interface UserThresholds {
    autoBookmarkEnabled: boolean;
    incomeThreshold: number;
    expenseThreshold: number;
}

export function useUserThresholds() {
    const [thresholds, setThresholds] = useState<UserThresholds>({
        autoBookmarkEnabled: true,
        incomeThreshold: DEFAULT_HIGH_VALUE_THRESHOLDS.income,
        expenseThreshold: DEFAULT_HIGH_VALUE_THRESHOLDS.expense
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUserThresholds();
    }, []);

    const fetchUserThresholds = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch('/api/user/thresholds');
            if (!response.ok) {
                throw new Error('Failed to fetch user thresholds');
            }
            
            const data = await response.json();
            setThresholds({
                autoBookmarkEnabled: data.autoBookmarkEnabled,
                incomeThreshold: data.incomeThreshold,
                expenseThreshold: data.expenseThreshold
            });
        } catch (err) {
            console.error('Error fetching user thresholds:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch thresholds');
            // Keep using defaults on error
        } finally {
            setLoading(false);
        }
    };

    const refreshThresholds = () => {
        fetchUserThresholds();
    };

    return {
        thresholds,
        loading,
        error,
        refreshThresholds
    };
}
