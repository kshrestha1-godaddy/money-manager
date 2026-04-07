// Interest calculation utilities for debts

/** Coerce JSON / Prisma dates so interest math matches everywhere (table vs section grouping). */
export function normalizeDebtDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
}

export function normalizeOptionalDebtDate(
    value: Date | string | undefined | null
): Date | undefined {
    if (value === undefined || value === null) return undefined;
    return value instanceof Date ? value : new Date(value);
}

function sumRepaymentAmounts(repayments: { amount: number }[]): number {
    return repayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
}

export interface InterestCalculation {
    originalAmount: number;
    interestAmount: number;
    totalAmountWithInterest: number;
    daysElapsed: number;
    daysTotal: number;
}

/**
 * Calculate interest for a debt based on the interest rate and time period
 * @param originalAmount - The original debt amount
 * @param interestRate - Annual interest rate as percentage (e.g., 5 for 5%)
 * @param lentDate - Date when the money was lent
 * @param dueDate - Due date for repayment (optional)
 * @param currentDate - Current date (defaults to today)
 * @returns Interest calculation details
 */
export function calculateInterest(
    originalAmount: number,
    interestRate: number,
    lentDate: Date | string,
    dueDate?: Date | string | null,
    currentDate: Date = new Date()
): InterestCalculation {
    // If interest rate is 0%, return no interest
    if (interestRate === 0) {
        return {
            originalAmount,
            interestAmount: 0,
            totalAmountWithInterest: originalAmount,
            daysElapsed: 0,
            daysTotal: 0
        };
    }

    // Calculate time period for interest
    const startDate = normalizeDebtDate(lentDate);
    const due = normalizeOptionalDebtDate(dueDate ?? null);
    
    // Calculate days elapsed (from lent date to current date)
    const daysElapsed = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calculate total days (from lent date to due date)
    const daysTotal = due
        ? Math.max(0, Math.floor((due.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        : daysElapsed;
    
    // Use term days (daysTotal) for interest calculation when due date is provided
    // Otherwise, use elapsed days
    const daysForInterest = due ? daysTotal : daysElapsed;
    
    // Calculate interest using simple interest formula
    // Interest = Principal × Rate × Time (in years)
    const timeInYears = daysForInterest / 365;
    const interestAmount = originalAmount * (interestRate / 100) * timeInYears;
    
    const totalAmountWithInterest = originalAmount + interestAmount;
    
    return {
        originalAmount,
        interestAmount,
        totalAmountWithInterest,
        daysElapsed,
        daysTotal
    };
}

/**
 * Calculate remaining amount including interest
 * @param originalAmount - The original debt amount
 * @param interestRate - Annual interest rate as percentage
 * @param lentDate - Date when the money was lent
 * @param dueDate - Due date for repayment (optional)
 * @param repayments - Array of repayments made
 * @param currentDate - Current date (defaults to today)
 * @param status - Debt status (optional)
 * @returns Remaining amount including interest
 */
export function calculateRemainingWithInterest(
    originalAmount: number,
    interestRate: number,
    lentDate: Date | string,
    dueDate: Date | string | undefined,
    repayments: { amount: number }[],
    currentDate: Date = new Date(),
    status?: string
): { remainingAmount: number; totalWithInterest: number; interestAmount: number } {
    const lent = normalizeDebtDate(lentDate);
    const due = normalizeOptionalDebtDate(dueDate ?? null);
    // Calculate interest first
    const interestCalc = calculateInterest(originalAmount, interestRate, lent, due, currentDate);
    const totalRepayments = sumRepaymentAmounts(repayments);
    
    // If debt is fully paid, return zero remaining amount and no additional interest
    if (status === 'FULLY_PAID') {
        return {
            remainingAmount: 0,
            totalWithInterest: interestCalc.totalAmountWithInterest,
            interestAmount: interestCalc.interestAmount
        };
    }
    
    // Calculate remaining amount
    const remainingAmount = Math.max(0, interestCalc.totalAmountWithInterest - totalRepayments);
    
    // Additional validation: if remaining amount is effectively zero (within 0.01), treat as fully paid
    const isEffectivelyPaid = remainingAmount < 0.01;
    
    return {
        remainingAmount: isEffectivelyPaid ? 0 : remainingAmount,
        totalWithInterest: interestCalc.totalAmountWithInterest,
        interestAmount: interestCalc.interestAmount
    };
}

/** Outstanding balance below this (in currency units) counts as fully repaid (float + rounding). */
const FULLY_REPAID_EPSILON = 0.01;

/**
 * Determine debt status based on repayments and total amount with interest
 * @param totalRepayments - Total amount repaid
 * @param totalWithInterest - Total amount owed including interest
 * @param _currentStatus - Reserved for future use (e.g. preserving OVERDUE rules)
 * @returns New debt status
 */
export function determineDebtStatus(
    totalRepayments: number,
    totalWithInterest: number,
    _currentStatus: string = 'ACTIVE'
): string {
    const remaining = totalWithInterest - totalRepayments;

    // Prefer remaining-based check so float drift cannot leave a 0-balance loan as PARTIALLY_PAID
    if (remaining <= FULLY_REPAID_EPSILON) {
        return 'FULLY_PAID';
    }

    const roundedTotalRepayments = Math.round(totalRepayments * 100) / 100;

    if (roundedTotalRepayments > 0) {
        return 'PARTIALLY_PAID';
    }

    return 'ACTIVE';
}

export interface DebtLikeForStatus {
    amount: number;
    interestRate: number;
    lentDate: Date | string;
    dueDate?: Date | string;
    repayments?: { amount: number }[];
    status: string;
}

/**
 * Which accordion/table section a debt belongs to — driven only by computed balance + repayments
 * (not stored status), so a loan cannot appear under "Partially Paid" when it is fully settled.
 */
export function getDebtSectionKey(
    debt: DebtLikeForStatus
): "ACTIVE" | "PARTIALLY_PAID" | "FULLY_PAID" {
    const lentDate = normalizeDebtDate(debt.lentDate);
    const dueDate = normalizeOptionalDebtDate(debt.dueDate ?? null);
    const repayments = debt.repayments ?? [];

    const remainingCalc = calculateRemainingWithInterest(
        debt.amount,
        debt.interestRate,
        lentDate,
        dueDate,
        repayments,
        new Date(),
        debt.status
    );
    const totalRep = sumRepaymentAmounts(repayments);

    if (remainingCalc.remainingAmount <= FULLY_REPAID_EPSILON) {
        return "FULLY_PAID";
    }
    if (totalRep > FULLY_REPAID_EPSILON) {
        return "PARTIALLY_PAID";
    }
    return "ACTIVE";
}

/**
 * Status derived from principal, interest, and repayments — matches table math.
 * Use this for grouping and badges when stored `status` may be stale (e.g. after edge-case repayments).
 */
export function getEffectiveDebtStatus(debt: DebtLikeForStatus): string {
    const lentDate = normalizeDebtDate(debt.lentDate);
    const dueDate = normalizeOptionalDebtDate(debt.dueDate ?? null);
    const repayments = debt.repayments ?? [];

    const remainingCalc = calculateRemainingWithInterest(
        debt.amount,
        debt.interestRate,
        lentDate,
        dueDate,
        repayments,
        new Date(),
        debt.status
    );
    const totalRepayments = sumRepaymentAmounts(repayments);

    if (remainingCalc.remainingAmount <= FULLY_REPAID_EPSILON) {
        return 'FULLY_PAID';
    }

    if (debt.status === 'DEFAULTED') {
        return 'DEFAULTED';
    }

    if (debt.status === 'OVERDUE') {
        return 'OVERDUE';
    }

    return determineDebtStatus(
        totalRepayments,
        remainingCalc.totalWithInterest,
        debt.status
    );
} 