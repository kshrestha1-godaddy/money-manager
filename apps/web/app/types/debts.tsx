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
    createdAt: Date;
    updatedAt: Date;
}

export interface DebtRepaymentInterface {
    id: number;
    amount: number;
    repaymentDate: Date;
    notes?: string;
    debtId: number;
    createdAt: Date;
    updatedAt: Date;
} 