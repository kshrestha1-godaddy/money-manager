/**
 * Currency Conversion Utility
 * Rates: defaults in currencyRates.ts; DB-backed on server (CurrencyRateConfig);
 * client uses matrix hydrated from getCurrencyRateConfig in CurrencyProvider.
 */

import {
  buildStaticConversionRates,
  DEFAULT_CURRENCY_ANCHORS,
  type ConversionRateMatrix,
} from "./currencyRates";

interface ConversionRates {
  [currency: string]: number;
}

export const SUPPORTED_CURRENCIES = ["USD", "INR", "NPR"] as const;

const defaultMatrix = buildStaticConversionRates(
  DEFAULT_CURRENCY_ANCHORS.inrToNpr,
  DEFAULT_CURRENCY_ANCHORS.nprPerUsd
);

let clientConversionMatrix: ConversionRateMatrix = defaultMatrix;

export function setClientCurrencyConversionMatrix(
  inrToNpr: number,
  nprPerUsd: number
) {
  clientConversionMatrix = buildStaticConversionRates(inrToNpr, nprPerUsd);
}

/** INR→NPR multiplier from the active client matrix (browser only; forms / dual currency UI). */
export function getEffectiveInrToNprRate(): number {
  return clientConversionMatrix.inr.npr;
}

function matrixForSyncConversion(
  explicit?: ConversionRateMatrix
): ConversionRateMatrix {
  if (explicit) return explicit;
  if (typeof window !== "undefined") return clientConversionMatrix;
  return defaultMatrix;
}

async function getMatrixForAsyncConversion(): Promise<ConversionRateMatrix> {
  if (typeof window !== "undefined") {
    return clientConversionMatrix;
  }
  const { getCurrencyRateConfigQuery } = await import("../data/currency-rate-config");
  return (await getCurrencyRateConfigQuery()).matrix;
}

/**
 * Normalizes currency codes from DB/UI (trim whitespace, lowercase).
 * Prevents failed rate lookups when codes are stored as "INR " etc., which
 * would otherwise fall back to returning the unconverted amount.
 */
export function normalizeCurrencyCode(code: string | undefined | null): string {
  if (code == null || typeof code !== "string") return "";
  const t = code.trim().toLowerCase();
  if (!t) return "";
  const aliases: Record<string, string> = {
    rs: "inr",
    nrs: "npr",
  };
  return aliases[t] ?? t;
}

export function convertCurrencySync(
  amount: number,
  sourceCurrency: string,
  destinationCurrency: string,
  matrixOverride?: ConversionRateMatrix
): number {
  const source = normalizeCurrencyCode(sourceCurrency);
  const destination = normalizeCurrencyCode(destinationCurrency);

  if (!source || !destination) {
    console.warn(
      `Sync conversion skipped: invalid currency (source=${String(sourceCurrency)}, dest=${String(destinationCurrency)})`
    );
    return amount;
  }

  if (source === destination) return amount;

  const matrix = matrixForSyncConversion(matrixOverride);
  const rates = matrix[source];
  const rate = rates?.[destination];

  if (rate === undefined) {
    console.warn(
      `Sync conversion not available for ${source.toUpperCase()} to ${destination.toUpperCase()}, supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`
    );
    return amount;
  }

  return amount * rate;
}

async function fetchConversionRates(
  sourceCurrency: string
): Promise<ConversionRates> {
  const source = normalizeCurrencyCode(sourceCurrency);
  const matrix = await getMatrixForAsyncConversion();

  if (!matrix[source]) {
    throw new Error(
      `Conversion rates not available for currency: ${sourceCurrency.toUpperCase()}. Supported currencies: USD, INR, NPR`
    );
  }

  return matrix[source];
}

/**
 * Converts an amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  sourceCurrency: string,
  destinationCurrency: string
): Promise<number> {
  if (!amount || isNaN(amount) || amount < 0) {
    throw new Error("Invalid amount provided for currency conversion");
  }

  if (!sourceCurrency || !destinationCurrency) {
    throw new Error("Source and destination currencies are required");
  }

  const source = normalizeCurrencyCode(sourceCurrency);
  const destination = normalizeCurrencyCode(destinationCurrency);

  if (!source || !destination) {
    throw new Error("Source and destination currencies are required");
  }

  if (source === destination) {
    return amount;
  }

  try {
    const rates = await fetchConversionRates(source);
    const rate = rates[destination];

    if (rate === undefined || rate === null) {
      throw new Error(`Conversion rate not found for ${destination.toUpperCase()}`);
    }

    const convertedAmount = amount * rate;

    console.info(
      `Converted ${amount} ${source.toUpperCase()} to ${convertedAmount.toFixed(4)} ${destination.toUpperCase()}`
    );

    return Math.round(convertedAmount * 10000) / 10000;
  } catch (error) {
    console.error(
      `Currency conversion failed: ${amount} ${source.toUpperCase()} to ${destination.toUpperCase()}:`,
      error
    );
    throw error;
  }
}

export async function convertCurrencyFormatted(
  amount: number,
  sourceCurrency: string,
  destinationCurrency: string,
  options: {
    decimals?: number;
    includeSymbol?: boolean;
    locale?: string;
  } = {}
): Promise<string> {
  const {
    decimals = 2,
    includeSymbol = true,
    locale = "en-US",
  } = options;

  try {
    const convertedAmount = await convertCurrency(
      amount,
      sourceCurrency,
      destinationCurrency
    );

    if (includeSymbol) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: destinationCurrency.toUpperCase(),
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(convertedAmount);
    }
    return convertedAmount.toFixed(decimals);
  } catch (error) {
    console.error("Failed to format converted currency:", error);
    throw error;
  }
}

export async function getAvailableCurrencies(
  _baseCurrency: string = "usd"
): Promise<string[]> {
  return [...SUPPORTED_CURRENCIES];
}

export function clearCurrencyCache(): void {
  console.info("Currency rate cache: use revalidation / provider refresh for DB-backed rates.");
}

export function getCacheStatus(): { size: number; entries: string[] } {
  const m = matrixForSyncConversion();
  return {
    size: Object.keys(m).length,
    entries: Object.keys(m).map((currency) => currency.toUpperCase()),
  };
}
