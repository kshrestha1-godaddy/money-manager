"use server";
import {
  getExpensePortfolioPurchases,
  saveExpensePortfolioCurrentValue,
} from "./expense-portfolios";
export async function getStockPurchases() {
  return getExpensePortfolioPurchases("STOCKS");
}
export async function saveStocksCurrentValue(value: number, currency: string) {
  return saveExpensePortfolioCurrentValue("STOCKS", value, currency);
}
