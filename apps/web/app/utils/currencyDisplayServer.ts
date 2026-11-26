import { convertCurrencySync } from "./currencyConversion";
import { getCurrencyRateConfigQuery } from "../data/currency-rate-config";

/**
 * Server-only: converts using rates from CurrencyRateConfig. Use from server actions, not client components.
 */
export async function convertForDisplayWithDbRates(
  amount: number,
  storedCurrency: string,
  userCurrency: string,
  userId?: number
): Promise<number> {
  const { matrix } = await getCurrencyRateConfigQuery(userId);
  return convertCurrencySync(amount, storedCurrency, userCurrency, matrix);
}
