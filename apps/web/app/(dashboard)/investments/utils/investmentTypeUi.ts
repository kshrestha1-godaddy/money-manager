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

/** Distinct badge colors so the table scans by category at a glance. */
export function getInvestmentTypeBadgeClassName(type: InvestmentInterface["type"]): string {
    const map: Record<InvestmentInterface["type"], string> = {
        FIXED_DEPOSIT: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80",
        EMERGENCY_FUND: "bg-teal-100 text-teal-900 ring-1 ring-teal-200/80",
        MARRIAGE: "bg-rose-100 text-rose-900 ring-1 ring-rose-200/80",
        VACATION: "bg-sky-100 text-sky-900 ring-1 ring-sky-200/80",
        STOCKS: "bg-blue-100 text-blue-900 ring-1 ring-blue-200/80",
        CRYPTO: "bg-violet-100 text-violet-900 ring-1 ring-violet-200/80",
        MUTUAL_FUNDS: "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200/80",
        BONDS: "bg-cyan-100 text-cyan-900 ring-1 ring-cyan-200/80",
        REAL_ESTATE: "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80",
        GOLD: "bg-yellow-100 text-yellow-900 ring-1 ring-yellow-200/80",
        PROVIDENT_FUNDS: "bg-lime-100 text-lime-900 ring-1 ring-lime-200/80",
        SAFE_KEEPINGS: "bg-orange-100 text-orange-900 ring-1 ring-orange-200/80",
        OTHER: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80",
    };
    return map[type] ?? map.OTHER;
}
