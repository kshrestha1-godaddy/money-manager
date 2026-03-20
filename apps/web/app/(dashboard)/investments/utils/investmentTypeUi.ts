import { InvestmentInterface } from "../../../types/investments";

const KNOWN_TYPES: InvestmentInterface["type"][] = [
    "STOCKS",
    "CRYPTO",
    "MUTUAL_FUNDS",
    "BONDS",
    "REAL_ESTATE",
    "GOLD",
    "FIXED_DEPOSIT",
    "PROVIDENT_FUNDS",
    "SAFE_KEEPINGS",
    "EMERGENCY_FUND",
    "MARRIAGE",
    "VACATION",
    "OTHER",
];

export function normalizeInvestmentType(type: string | undefined): InvestmentInterface["type"] {
    if (!type) return "OTHER";
    const upper = String(type).toUpperCase().trim();
    return (KNOWN_TYPES as readonly string[]).includes(upper)
        ? (upper as InvestmentInterface["type"])
        : "OTHER";
}

/** Principal + required interest + maturity (matches AddInvestmentModal first branch). */
export function isDepositStyleType(t: InvestmentInterface["type"]): boolean {
    return t === "FIXED_DEPOSIT" || t === "EMERGENCY_FUND" || t === "MARRIAGE" || t === "VACATION";
}

export function isProvidentOrSafeType(t: InvestmentInterface["type"]): boolean {
    return t === "PROVIDENT_FUNDS" || t === "SAFE_KEEPINGS";
}

/** Symbol field is not used for these types (matches AddInvestmentModal). */
export function isSymbolApplicableType(t: InvestmentInterface["type"]): boolean {
    return !(
        t === "FIXED_DEPOSIT" ||
        t === "PROVIDENT_FUNDS" ||
        t === "SAFE_KEEPINGS" ||
        t === "EMERGENCY_FUND" ||
        t === "MARRIAGE" ||
        t === "VACATION"
    );
}

export function isQuantityBasedInvestmentType(t: InvestmentInterface["type"]): boolean {
    return !isDepositStyleType(t) && !isProvidentOrSafeType(t);
}

export function requiresCurrentPriceField(t: InvestmentInterface["type"]): boolean {
    return isQuantityBasedInvestmentType(t);
}

export const INVESTMENT_TYPE_LABELS: { value: InvestmentInterface["type"]; label: string }[] = [
    { value: "FIXED_DEPOSIT", label: "Fixed Deposit" },
    { value: "EMERGENCY_FUND", label: "Emergency Fund" },
    { value: "MARRIAGE", label: "Marriage" },
    { value: "VACATION", label: "Vacation" },
    { value: "STOCKS", label: "Stocks" },
    { value: "CRYPTO", label: "Cryptocurrency" },
    { value: "MUTUAL_FUNDS", label: "Mutual Funds" },
    { value: "BONDS", label: "Bonds" },
    { value: "REAL_ESTATE", label: "Real Estate" },
    { value: "GOLD", label: "Gold" },
    { value: "PROVIDENT_FUNDS", label: "Provident Funds" },
    { value: "SAFE_KEEPINGS", label: "Safe Keepings" },
    { value: "OTHER", label: "Other" },
];

export function getInvestmentTypeLabel(type: InvestmentInterface["type"]): string {
    return INVESTMENT_TYPE_LABELS.find((x) => x.value === type)?.label ?? type.replace(/_/g, " ");
}
