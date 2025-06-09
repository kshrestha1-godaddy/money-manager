import { useState, useEffect, useCallback } from "react";
import { getUserAccounts } from "../actions/accounts";
import { AccountInterface } from "../types/accounts";

// Create a custom event for balance refresh
const BALANCE_REFRESH_EVENT = 'balanceRefresh';

export function useTotalBalance() {
    const [totalBalance, setTotalBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTotalBalance = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const accounts = await getUserAccounts();
            
            if (accounts && !('error' in accounts)) {
                const total = accounts.reduce((sum: number, acc: AccountInterface) => sum + (acc.balance || 0), 0);
                setTotalBalance(total);
            } else {
                setError(accounts?.error || "Failed to fetch accounts");
                setTotalBalance(0);
            }
        } catch (err) {
            console.error("Error fetching total balance:", err);
            setError("Failed to fetch total balance");
            setTotalBalance(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTotalBalance();

        // Listen for balance refresh events
        const handleBalanceRefresh = () => {
            fetchTotalBalance();
        };

        window.addEventListener(BALANCE_REFRESH_EVENT, handleBalanceRefresh);

        return () => {
            window.removeEventListener(BALANCE_REFRESH_EVENT, handleBalanceRefresh);
        };
    }, [fetchTotalBalance]);

    // Add a refresh function that can be called externally
    const refreshBalance = useCallback(() => {
        fetchTotalBalance();
    }, [fetchTotalBalance]);

    return { totalBalance, loading, error, refreshBalance };
}

// Export a function to trigger balance refresh globally
export const triggerBalanceRefresh = () => {
    window.dispatchEvent(new CustomEvent(BALANCE_REFRESH_EVENT));
}; 