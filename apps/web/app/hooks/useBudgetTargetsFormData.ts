import { useState, useEffect } from 'react';
import { getAllCategoriesWithBudgetStatus } from '../actions/budget-targets';

interface BudgetTargetsFormData {
    categories: any[];
    loading: boolean;
    error: any;
}

export function useBudgetTargetsFormData(): BudgetTargetsFormData {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                const categoriesResponse = await getAllCategoriesWithBudgetStatus();
                if (categoriesResponse.error) {
                    setError(categoriesResponse.error);
                } else {
                    setCategories(categoriesResponse.data || []);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch data');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    return {
        categories,
        loading,
        error
    };
}
