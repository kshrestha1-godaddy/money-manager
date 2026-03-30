import type { AccountInterface } from "../../../types/accounts";

/** Matches desktop accounts table: withheld is split across accounts in the same bank by balance share. */
export function computeAccountFreeBalance(
  account: AccountInterface,
  allAccounts: AccountInterface[],
  withheldAmounts: Record<string, number>
): number {
  const bankName = account.bankName;
  const withheldAmountForBank = withheldAmounts[bankName] || 0;
  if (withheldAmountForBank === 0) return account.balance || 0;
  const accountsInBank = allAccounts.filter((acc) => acc.bankName === bankName);
  const totalBankBalance = accountsInBank.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const accountProportion = totalBankBalance > 0 ? (account.balance || 0) / totalBankBalance : 0;
  const accountWithheldAmount = withheldAmountForBank * accountProportion;
  return (account.balance || 0) - accountWithheldAmount;
}
