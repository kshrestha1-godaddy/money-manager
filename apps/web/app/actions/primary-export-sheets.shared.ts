/** No "use server" — safe for client and server imports. */

export const PRIMARY_EXPORT_SHEETS = [
  "accounts",
  "debts",
  "debt_repayments",
  "expenses",
  "incomes",
  "investments",
  "investment_targets",
  "passwords",
  "all_categories",
  "income_categories",
  "expense_categories",
] as const;

export type PrimaryExportSheet = (typeof PRIMARY_EXPORT_SHEETS)[number];
