export interface DebtInterface {
    id: number;
    borrowerName: string;
    borrowerContact?: string;
    borrowerEmail?: string;
    amount: number;
    interestRate: number; // Percentage interest rate
    dueDate?: Date;
    lentDate: Date;
    status: 'ACTIVE' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' | 'DEFAULTED';
    purpose?: string;
    notes?: string;
    repayments?: DebtRepaymentInterface[];
    userId: number;
    accountId?: number; // Bank account from which the debt amount is deducted
    createdAt: Date;
    updatedAt: Date;
}

export interface DebtRepaymentInterface {
    id: number;
    amount: number;
    repaymentDate: Date;
    notes?: string;
    debtId: number;
    accountId?: number; // Bank account where the repayment is deposited
    createdAt: Date;
    updatedAt: Date;
} 