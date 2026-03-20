import { AccountInterface } from "../../../types/accounts";

/**
 * Investment withheld amount allocated to this account (same proportional rule as AccountTable).
 * Uses the given accounts' balances for the proportion denominator (per bank).
 */
export function getProportionalWithheldForAccount(
    account: Pick<AccountInterface, "id" | "bankName" | "balance">,
    accountsInProportionBasis: Pick<AccountInterface, "bankName" | "balance">[],
    withheldAmounts: Record<string, number>
): number {
    const bankName = account.bankName;
    const withheldForBank = withheldAmounts[bankName] || 0;
    if (withheldForBank === 0) return 0;

    const inBank = accountsInProportionBasis.filter((a) => a.bankName === bankName);
    const totalBankBalance = inBank.reduce((sum, acc) => sum + (acc.balance ?? 0), 0);
    if (totalBankBalance <= 0) return 0;

    const proportion = (account.balance ?? 0) / totalBankBalance;
    return withheldForBank * proportion;
}

export function accountsWithDraftBalances(
    accounts: AccountInterface[],
    draftBalances: Record<number, number>
): AccountInterface[] {
    return accounts.map((a) => ({
        ...a,
        balance: draftBalances[a.id] ?? a.balance ?? 0
    }));
}
