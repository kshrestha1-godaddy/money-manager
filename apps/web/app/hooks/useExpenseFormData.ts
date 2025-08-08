import { useState, useEffect } from "react";
import { getUserAccounts } from "../(dashboard)/accounts/actions/accounts";
import { getCategories } from "..//actions/categories";
import { AccountInterface } from "../types/accounts";
import { Category } from "../types/financial";

interface UseExpenseFormDataReturn {
    accounts: AccountInterface[];
    categories: Category[];
    loading: boolean;
    error: string | null;
}

export function useExpenseFormData(): UseExpenseFormDataReturn {
    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const [userAccounts, expenseCategories] = await Promise.all([
                    getUserAccounts(),
                    getCategories("EXPENSE")
                ]);
                
                if (userAccounts && !('error' in userAccounts)) {
                    setAccounts(userAccounts);
                } else {
                    setError('Failed to load accounts');
                }
                
                if (expenseCategories && !('error' in expenseCategories)) {
                    setCategories(expenseCategories);
                } else {
                    setError('Failed to load categories');
                }
            } catch (err) {
                console.error("Error loading expense form data:", err);
                setError(err instanceof Error ? err.message : 'Unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return {
        accounts,
        categories,
        loading,
        error
    };
} 