// Default high-value thresholds (used as fallback)
export const DEFAULT_HIGH_VALUE_THRESHOLDS = {
    income: 50000,   // 50K for income
    expense: 10000   // 10K for expenses
};

/**
 * Checks if a transaction amount exceeds the high-value threshold
 */
export function isHighValueTransaction(
    amount: number, 
    type: 'income' | 'expense',
    thresholds?: { income: number; expense: number }
): boolean {
    const activeThresholds = thresholds || DEFAULT_HIGH_VALUE_THRESHOLDS;
    return amount > activeThresholds[type];
}
