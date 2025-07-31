// Shared constants for investment components
export const INVESTMENT_TYPES = [
    { value: 'STOCKS', label: 'Stocks' },
    { value: 'CRYPTO', label: 'Cryptocurrency' },
    { value: 'MUTUAL_FUNDS', label: 'Mutual Funds' },
    { value: 'BONDS', label: 'Bonds' },
    { value: 'REAL_ESTATE', label: 'Real Estate' },
    { value: 'GOLD', label: 'Gold' },
    { value: 'FIXED_DEPOSIT', label: 'Fixed Deposit' },
    { value: 'PROVIDENT_FUNDS', label: 'Provident Funds' },
    { value: 'SAFE_KEEPINGS', label: 'Safe Keepings' },
    { value: 'OTHER', label: 'Other' },
] as const;

export const formatInvestmentType = (type: string): string => {
    switch (type) {
        case 'STOCKS': return 'Stocks';
        case 'CRYPTO': return 'Cryptocurrency';
        case 'MUTUAL_FUNDS': return 'Mutual Funds';
        case 'BONDS': return 'Bonds';
        case 'REAL_ESTATE': return 'Real Estate';
        case 'GOLD': return 'Gold';
        case 'FIXED_DEPOSIT': return 'Fixed Deposit';
        case 'PROVIDENT_FUNDS': return 'Provident Funds';
        case 'SAFE_KEEPINGS': return 'Safe Keepings';
        case 'OTHER': return 'Other';
        default: return type;
    }
};

// Type guards and utilities
export type InvestmentType = typeof INVESTMENT_TYPES[number]['value'];

export const getInvestmentTypeLabel = (value: string): string => {
    return INVESTMENT_TYPES.find(type => type.value === value)?.label || value;
};