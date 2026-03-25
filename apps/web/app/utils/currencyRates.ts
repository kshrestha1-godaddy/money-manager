/**
 * USD / INR / NPR exchange anchors and derived matrices.
 *
 * Default anchors match the historical static values. Runtime values are loaded
 * from the database (CurrencyRateConfig) and applied via setClientCurrencyConversionMatrix
 * on the client and getCurrencyRateConfigQuery on the server.
 */

export interface CurrencyRateAnchors {
  inrToNpr: number;
  nprPerUsd: number;
}

export const DEFAULT_CURRENCY_ANCHORS: CurrencyRateAnchors = {
  inrToNpr: 1.6,
  nprPerUsd: 140,
};

/** @deprecated Use DEFAULT_CURRENCY_ANCHORS.inrToNpr */
export const INR_TO_NPR_RATE = DEFAULT_CURRENCY_ANCHORS.inrToNpr;

/** @deprecated Use derived from anchors */
export const NPR_PER_USD = DEFAULT_CURRENCY_ANCHORS.nprPerUsd;

export const NPR_TO_INR_RATE = 1 / DEFAULT_CURRENCY_ANCHORS.inrToNpr;

export const INR_PER_USD =
  DEFAULT_CURRENCY_ANCHORS.nprPerUsd / DEFAULT_CURRENCY_ANCHORS.inrToNpr;

export interface ConversionRatesRow {
  [currency: string]: number;
}

export interface ConversionRateMatrix {
  [sourceCurrency: string]: ConversionRatesRow;
}

/**
 * Multiply amount in `source` by `matrix[source][destination]` to get `destination`.
 * Keys are lowercase ISO codes (aligned with normalizeCurrencyCode).
 */
export function buildStaticConversionRates(
  inrToNpr: number,
  nprPerUsd: number
): ConversionRateMatrix {
  const inrPerUsd = nprPerUsd / inrToNpr;
  return {
    usd: {
      usd: 1,
      inr: inrPerUsd,
      npr: nprPerUsd,
    },
    inr: {
      usd: 1 / inrPerUsd,
      inr: 1,
      npr: inrToNpr,
    },
    npr: {
      usd: 1 / nprPerUsd,
      inr: 1 / inrToNpr,
      npr: 1,
    },
  };
}

export const STATIC_CONVERSION_RATES = buildStaticConversionRates(
  DEFAULT_CURRENCY_ANCHORS.inrToNpr,
  DEFAULT_CURRENCY_ANCHORS.nprPerUsd
);

export function buildUsdBaseExchangeRates(anchors: CurrencyRateAnchors) {
  const inrPerUsd = anchors.nprPerUsd / anchors.inrToNpr;
  return {
    USD: 1,
    INR: inrPerUsd,
    NPR: anchors.nprPerUsd,
  } as const;
}

export const USD_BASE_EXCHANGE_RATES = buildUsdBaseExchangeRates(
  DEFAULT_CURRENCY_ANCHORS
);

export type UsdBaseCurrencyCode = keyof typeof USD_BASE_EXCHANGE_RATES;
