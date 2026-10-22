import type { InvestmentInterface } from "../../../types/investments";

type InvestmentInput = Omit<
  InvestmentInterface,
  "id" | "userId" | "createdAt" | "updatedAt" | "account" | "investmentTarget"
>;

/** Persist an expense-backed preview without charging for its purchases a second time. */
export function materializeExpensePortfolio(
  source: InvestmentInterface,
  changes: Partial<InvestmentInput>,
): InvestmentInput {
  if (source.id >= 0 || (source.type !== "STOCKS" && source.type !== "SIP")) {
    throw new Error(
      "Only an unsaved expense-backed portfolio can be created from a preview.",
    );
  }
  const quantity = changes.quantity ?? source.quantity;
  if (!Number.isFinite(quantity) || quantity <= 0)
    throw new Error("Quantity must be greater than zero.");
  return {
    name: changes.name ?? source.name,
    type: source.type,
    symbol: changes.symbol ?? source.symbol,
    quantity,
    purchasePrice: (source.quantity * source.purchasePrice) / quantity,
    currentPrice: changes.currentPrice ?? source.currentPrice,
    purchaseDate: changes.purchaseDate ?? source.purchaseDate,
    accountId: changes.accountId ?? source.accountId,
    notes: changes.notes ?? source.notes,
    deductFromAccount: false,
    investmentTargetId:
      changes.investmentTargetId === undefined
        ? source.investmentTargetId
        : changes.investmentTargetId,
  };
}
