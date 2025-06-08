import { useState, useEffect } from "react";
import { getUserAccounts } from "../actions/accounts";
import { AccountInterface } from "../types/accounts";

export function useTotalBalance() {
    const [totalBalance, setTotalBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTotalBalance = async () => {
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
        };

        fetchTotalBalance();
    }, []);

    return { totalBalance, loading, error };
} 