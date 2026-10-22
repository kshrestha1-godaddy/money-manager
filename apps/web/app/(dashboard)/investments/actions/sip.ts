"use server";
import {
  getExpensePortfolioPurchases,
  saveExpensePortfolioCurrentValue,
} from "./expense-portfolios";
export async function getSIPPurchases() {
  return getExpensePortfolioPurchases("SIP");
}
export async function saveSIPCurrentValue(value: number, currency: string) {
  return saveExpensePortfolioCurrentValue("SIP", value, currency);
}
