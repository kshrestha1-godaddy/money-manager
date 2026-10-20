import type { InvestmentInterface } from "../../../types/investments";
import { getInvestmentTypeLabel } from "./investmentTypeUi";
import { sortInvestmentsByTargetCompletionAsc } from "./investmentTargetSort";

export const INVESTMENT_GROUPING_OPTIONS = [
    { value: "performance", label: "Gainers / Break Even / Losers" },
    { value: "bank", label: "Bank" },
    { value: "type", label: "Type" },
    { value: "target", label: "Target" },
    { value: "withheld", label: "Withheld" },
    { value: "profitMargin", label: "Profit Margin (%)" },
] as const;

export type InvestmentGrouping = (typeof INVESTMENT_GROUPING_OPTIONS)[number]["value"];
export const INVESTMENT_GROUPING_STORAGE_KEY = "investments:groupBy";

export function isInvestmentGrouping(value: unknown): value is InvestmentGrouping {
    return INVESTMENT_GROUPING_OPTIONS.some(option => option.value === value);
}

function groupFor(inv: InvestmentInterface, grouping: InvestmentGrouping) {
    switch (grouping) {
        case "bank": {
            const bank = inv.account?.bankName?.trim();
            return { key: bank ? `bank:${bank.toLowerCase()}` : "no-bank", label: bank || "No bank linked", order: 0 };
        }
        case "type":
            return { key: inv.type, label: getInvestmentTypeLabel(inv.type), order: 0 };
        case "target": {
            const id = inv.investmentTargetId ?? inv.investmentTarget?.id;
            const target = inv.investmentTarget;
            const label = target?.nickname?.trim() || (target ? getInvestmentTypeLabel(target.investmentType) : "Target");
            return { key: id == null ? "no-target" : `target:${id}`, label: id == null ? "No target" : `[${id}] ${label}`, order: id == null ? 1 : 0 };
        }
        case "withheld": {
            const withheld = Boolean(inv.deductFromAccount && inv.accountId);
            return { key: withheld ? "withheld" : "not-withheld", label: withheld ? "Withheld" : "Not withheld", order: withheld ? 0 : 1 };
        }
        case "profitMargin": {
            const gain = inv.quantity * (inv.currentPrice - inv.purchasePrice);
            return gain < 0
                ? { key: "margin:loser", label: "Loser", order: 0 }
                : gain > 0
                  ? { key: "margin:gainer", label: "Gainer", order: 2 }
                  : { key: "margin:breakeven", label: "Breakeven", order: 1 };
        }
        default: {
            const gain = inv.currentPrice - inv.purchasePrice;
            return gain > 0
                ? { key: "gainers", label: "Gainers", order: 0 }
                : gain < 0
                  ? { key: "losers", label: "Losers", order: 2 }
                  : { key: "break-even", label: "Break Even", order: 1 };
        }
    }
}

export function groupInvestments(investments: InvestmentInterface[], grouping: InvestmentGrouping) {
    const groups = new Map<string, ReturnType<typeof groupFor> & { investments: InvestmentInterface[] }>();
    for (const investment of investments) {
        const group = groupFor(investment, grouping);
        const existing = groups.get(group.key);
        if (existing) existing.investments.push(investment);
        else groups.set(group.key, { ...group, investments: [investment] });
    }
    return [...groups.values()]
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
        .map(group => {
            const totalInvested = group.investments.reduce((sum, inv) => sum + inv.quantity * inv.purchasePrice, 0);
            const currentValue = group.investments.reduce((sum, inv) => sum + inv.quantity * inv.currentPrice, 0);
            const gainLoss = currentValue - totalInvested;
            return {
                key: group.key,
                title: `${group.label} (${group.investments.length})`,
                investments: sortInvestmentsByTargetCompletionAsc(group.investments),
                count: group.investments.length,
                totalInvested,
                currentValue,
                gainLoss,
                gainLossPercentage: totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0,
            };
        });
}
