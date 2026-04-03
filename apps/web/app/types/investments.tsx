export interface InvestmentInterface {
    id: number;
    name: string;
    type: 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'SILVER' | 'FIXED_DEPOSIT' | 'PROVIDENT_FUNDS' | 'SAFE_KEEPINGS' | 'EMERGENCY_FUND' | 'MARRIAGE' | 'VACATION' | 'OTHER';
    symbol?: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    purchaseDate: Date;
    accountId?: number;
    userId: number;
    notes?: string;
    // Fixed Deposit specific fields
    interestRate?: number; // Annual interest rate as percentage
    maturityDate?: Date; // When the FD matures
    // Account deduction control
    deductFromAccount?: boolean; // Whether to deduct investment amount from linked account balance
    /** When set, this position counts toward the linked savings target (explicit user choice). */
    investmentTargetId?: number | null;
    investmentTarget?: {
        id: number;
        investmentType: InvestmentInterface['type'];
        nickname?: string | null;
        /** Goal amount for this savings target. */
        targetAmount: number;
        /** Sum of quantity × purchasePrice for all positions linked to this target (progress toward the goal). */
        fulfilledAmount: number;
        targetCompletionDate?: Date | null;
    } | null;
    createdAt: Date;
    updatedAt: Date;
    // Account information (populated when included)
    account?: {
        id: number;
        holderName: string;
        bankName: string;
        accountNumber: string;
        balance: number;
        accountOpeningDate: Date;
        createdAt: Date;
        updatedAt: Date;
        [key: string]: any; // For other account properties
    };
}

export interface InvestmentTransaction {
    id: number;
    investmentId: number;
    type: 'BUY' | 'SELL' | 'DIVIDEND';
    quantity: number;
    price: number;
    transactionDate: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface InvestmentTarget {
    id: number;
    userId: number;
    investmentType: 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'SILVER' | 'FIXED_DEPOSIT' | 'PROVIDENT_FUNDS' | 'SAFE_KEEPINGS' | 'EMERGENCY_FUND' | 'MARRIAGE' | 'VACATION' | 'OTHER';
    targetAmount: number;
    targetCompletionDate?: Date;
    nickname?: string;
    createdAt: Date;
    updatedAt: Date;
}

export type InvestmentTargetFormData = {
    investmentType: 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'SILVER' | 'FIXED_DEPOSIT' | 'PROVIDENT_FUNDS' | 'SAFE_KEEPINGS' | 'EMERGENCY_FUND' | 'MARRIAGE' | 'VACATION' | 'OTHER';
    targetAmount: number;
    targetCompletionDate?: Date;
    nickname?: string;
};

export interface InvestmentTargetProgress {
    /** Stable id for this target row (multiple targets may share the same investmentType). */
    targetId: number;
    investmentType: string;
    targetAmount: number;
    /** Sum of quantity × purchasePrice for positions linked to this target (invested toward goal). */
    currentAmount: number;
    progress: number; // percentage
    isComplete: boolean;
    targetCompletionDate?: Date;
    nickname?: string;
    daysRemaining?: number; // calculated field for days until target date
    isOverdue?: boolean; // calculated field if current date is past target date
} 