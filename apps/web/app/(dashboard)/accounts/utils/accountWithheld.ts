import type { AccountInterface } from "../../../types/accounts";

export function sumAccountWithheld(details: Record<string, { amount: number }[]>) {
    return Object.fromEntries(
        Object.entries(details).map(([id, items]) => [
            id,
            items.reduce((total, item) => total + item.amount, 0),
        ])
    );
}

export function getAccountBalanceTotals(
    accounts: Pick<AccountInterface, "id" | "balance">[],
    withheldByAccount: Record<string, number>
) {
    let balance = 0;
    let withheld = 0;
    for (const account of accounts) {
        balance += account.balance ?? 0;
        withheld += withheldByAccount[account.id] ?? 0;
    }
    return { balance, withheld, free: balance - withheld };
}
