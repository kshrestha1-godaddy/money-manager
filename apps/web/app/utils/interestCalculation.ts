// Interest calculation utilities for debts

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
    lentDate: Date,
    dueDate?: Date,
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
    const startDate = lentDate;
    
    // Calculate days elapsed (from lent date to current date)
    const daysElapsed = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calculate total days (from lent date to due date)
    const daysTotal = dueDate 
        ? Math.max(0, Math.floor((dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        : daysElapsed;
    
    // Use term days (daysTotal) for interest calculation when due date is provided
    // Otherwise, use elapsed days
    const daysForInterest = dueDate ? daysTotal : daysElapsed;
    
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
    lentDate: Date,
    dueDate: Date | undefined,
    repayments: { amount: number }[],
    currentDate: Date = new Date(),
    status?: string
): { remainingAmount: number; totalWithInterest: number; interestAmount: number } {
    // Calculate interest first
    const interestCalc = calculateInterest(originalAmount, interestRate, lentDate, dueDate, currentDate);
    const totalRepayments = repayments.reduce((sum, payment) => sum + payment.amount, 0);
    
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

/**
 * Determine debt status based on repayments and total amount with interest
 * @param totalRepayments - Total amount repaid
 * @param totalWithInterest - Total amount owed including interest
 * @param currentStatus - Current debt status
 * @returns New debt status
 */
export function determineDebtStatus(
    totalRepayments: number,
    totalWithInterest: number,
    currentStatus: string = 'ACTIVE'
): string {
    // Round both amounts to 2 decimal places for proper comparison
    const roundedTotalRepayments = Math.round(totalRepayments * 100) / 100;
    const roundedTotalWithInterest = Math.round(totalWithInterest * 100) / 100;
    
    // If repayments equal or exceed total with interest, debt is fully paid
    if (roundedTotalRepayments >= roundedTotalWithInterest) {
        return 'FULLY_PAID';
    }
    
    // If there are repayments but not fully paid, it's partially paid
    if (roundedTotalRepayments > 0) {
        return 'PARTIALLY_PAID';
    }
    
    // If no repayments, return to active status
    return 'ACTIVE';
} 