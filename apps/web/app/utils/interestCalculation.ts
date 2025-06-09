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
    // If due date exists, use it as the end period, otherwise use current date
    const endDate = dueDate || currentDate;
    const startDate = lentDate;
    
    // Calculate days elapsed
    const daysElapsed = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysTotal = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Use the longer period for interest calculation (either days elapsed or days total)
    const daysForInterest = Math.max(daysElapsed, daysTotal);
    
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
 * @returns Remaining amount including interest
 */
export function calculateRemainingWithInterest(
    originalAmount: number,
    interestRate: number,
    lentDate: Date,
    dueDate: Date | undefined,
    repayments: { amount: number }[],
    currentDate: Date = new Date()
): { remainingAmount: number; totalWithInterest: number; interestAmount: number } {
    const interestCalc = calculateInterest(originalAmount, interestRate, lentDate, dueDate, currentDate);
    const totalRepayments = repayments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = Math.max(0, interestCalc.totalAmountWithInterest - totalRepayments);
    
    return {
        remainingAmount,
        totalWithInterest: interestCalc.totalAmountWithInterest,
        interestAmount: interestCalc.interestAmount
    };
} 