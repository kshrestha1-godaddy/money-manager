export interface InvestmentInterface {
    id: number;
    name: string;
    type: 'STOCKS' | 'CRYPTO' | 'MUTUAL_FUNDS' | 'BONDS' | 'REAL_ESTATE' | 'GOLD' | 'OTHER';
    symbol?: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    purchaseDate: Date;
    accountId: number;
    userId: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
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