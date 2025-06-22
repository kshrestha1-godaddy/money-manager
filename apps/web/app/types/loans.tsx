export interface LoanInterface {
    id: number;
    lenderName: string;
    lenderContact?: string;
    lenderEmail?: string;
    amount: number;
    interestRate: number; // Percentage interest rate
    dueDate?: Date;
    takenDate: Date;
    status: 'ACTIVE' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'OVERDUE' | 'DEFAULTED';
    purpose?: string;
    notes?: string;
    repayments?: LoanRepaymentInterface[];
    userId: number;
    accountId?: number; // Bank account where the loan amount is deposited
    createdAt: Date;
    updatedAt: Date;
}

export interface LoanRepaymentInterface {
    id: number;
    amount: number;
    repaymentDate: Date;
    notes?: string;
    loanId: number;
    accountId?: number; // Bank account from which the repayment is made
    createdAt: Date;
    updatedAt: Date;
} 