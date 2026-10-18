import { calculateRemainingWithInterest, getDebtSectionKey, type DebtLikeForStatus } from "./interestCalculation";

/** Recovery amounts use the same balance calculations and sections as the debts table. */
export function calculateDebtRecovery(debts: DebtLikeForStatus[]) {
    let totalWithInterest = 0;
    let fullyPaidAmount = 0;
    let partialRepaidAmount = 0;
    let partialRemainingAmount = 0;
    let activeAmount = 0;
    const counts = { total: 0, full: 0, partial: 0, active: 0 };
    const now = new Date();

    for (const debt of debts) {
        const result = calculateRemainingWithInterest(
            debt.amount, debt.interestRate, debt.lentDate, debt.dueDate,
            debt.repayments || [], now, debt.status
        );
        const section = getDebtSectionKey(debt);
        totalWithInterest += result.totalWithInterest;
        counts.total++;
        if (section === "FULLY_PAID") {
            fullyPaidAmount += result.totalWithInterest;
            counts.full++;
        } else if (section === "PARTIALLY_PAID") {
            partialRemainingAmount += result.remainingAmount;
            partialRepaidAmount += result.totalWithInterest - result.remainingAmount;
            counts.partial++;
        } else {
            activeAmount += result.remainingAmount;
            counts.active++;
        }
    }

    return { totalWithInterest, fullyPaidAmount, partialRepaidAmount, partialRemainingAmount, activeAmount, counts };
}
