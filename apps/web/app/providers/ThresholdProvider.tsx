"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useUserThresholds } from '../hooks/useUserThresholds';

interface ThresholdContextType {
    thresholds: {
        autoBookmarkEnabled: boolean;
        incomeThreshold: number;
        expenseThreshold: number;
    };
    loading: boolean;
    error: string | null;
    refreshThresholds: () => void;
}

const ThresholdContext = createContext<ThresholdContextType | undefined>(undefined);

export function ThresholdProvider({ children }: { children: ReactNode }) {
    const thresholdData = useUserThresholds();

    return (
        <ThresholdContext.Provider value={thresholdData}>
            {children}
        </ThresholdContext.Provider>
    );
}

export function useThresholds() {
    const context = useContext(ThresholdContext);
    if (context === undefined) {
        throw new Error('useThresholds must be used within a ThresholdProvider');
    }
    return context;
}
