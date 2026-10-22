import type { AccountInterface } from "../../../types/accounts";

export type AccountGrouping = "nickname" | "accountType" | "withheld" | "none";

export function groupAccounts(
    accounts: AccountInterface[],
    grouping: AccountGrouping,
    withheldDetails: Record<string, readonly unknown[]>
): { key: string; label: string; accounts: AccountInterface[] }[] {
    if (grouping === "none") return [{ key: "all", label: "All accounts", accounts }];
    const groups = new Map<string, { key: string; label: string; accounts: AccountInterface[] }>();
    for (const account of accounts) {
        const label = grouping === "withheld"
            ? (withheldDetails[account.id]?.length ? "Withheld investments" : "No withheld investments")
            : (grouping === "nickname" ? account.nickname?.trim() : account.accountType?.trim()) ||
                (grouping === "nickname" ? "No nickname" : "No account type");
        const key = grouping === "withheld"
            ? (withheldDetails[account.id]?.length ? "withheld" : "not-withheld")
            : ((grouping === "nickname" ? account.nickname?.trim() : account.accountType?.trim())?.toLowerCase() || "__missing__");
        const group = groups.get(key);
        if (group) group.accounts.push(account);
        else groups.set(key, { key, label, accounts: [account] });
    }
    return [...groups.values()].sort((a, b) => {
        if (a.key === "__missing__") return 1;
        if (b.key === "__missing__") return -1;
        if (grouping === "withheld") return a.key === "withheld" ? -1 : 1;
        return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    });
}
