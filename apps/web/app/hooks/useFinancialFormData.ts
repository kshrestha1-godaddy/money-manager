import { useState, useEffect } from "react";
import { getUserAccounts } from "../actions/accounts";
import { getCategories } from "../actions/categories";
import { AccountInterface } from "../types/accounts";
import { Category } from "../types/financial";
import { TransactionType } from "../utils/formUtils";

interface UseFinancialFormDataReturn {
    accounts: AccountInterface[];
    categories: Category[];
    loading: boolean;
    error: string | null;
}

export function useFinancialFormData(transactionType: TransactionType): UseFinancialFormDataReturn {
    const [accounts, setAccounts] = useState<AccountInterface[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const [userAccounts, transactionCategories] = await Promise.all([
                    getUserAccounts(),
                    getCategories(transactionType)
                ]);
                
                if (userAccounts && !('error' in userAccounts)) {
                    setAccounts(userAccounts);
                } else {
                    setError('Failed to load accounts');
                }
                
                if (transactionCategories && !('error' in transactionCategories)) {
                    setCategories(transactionCategories);
                } else {
                    setError('Failed to load categories');
                }
            } catch (err) {
                console.error("Error loading financial form data:", err);
                setError(err instanceof Error ? err.message : 'Unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [transactionType]);

    return {
        accounts,
        categories,
        loading,
        error
    };
} 