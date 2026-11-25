/**
 * Shared types for the forecasting primitives.
 *
 * The numeric layer of this folder operates exclusively on `number[]`; only
 * `timeGrid.ts` is aware of `Date`.
 */

/** A single observation of a dated numeric series. */
export interface TimeSeriesPoint {
  date: Date;
  value: number;
}

/** Sampling interval of a regular series. */
export type Frequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

/** Non-seasonal ARIMA order `(p, d, q)`. */
export interface ArimaOrder {
  /** Autoregressive order. */
  p: number;
  /** Degree of non-seasonal differencing. */
  d: number;
  /** Moving-average order. */
  q: number;
}

/** Seasonal order `(P, D, Q)` with period `m`. */
export interface SeasonalOrder {
  /** Seasonal autoregressive order. */
  P: number;
  /** Degree of seasonal differencing. */
  D: number;
  /** Seasonal moving-average order. */
  Q: number;
  /** Season length in observations (e.g. 12 for monthly data). */
  m: number;
}

/** A SARIMA specification: `(p,d,q)(P,D,Q)[m]`. */
export interface SarimaSpec extends ArimaOrder, SeasonalOrder {}

/** Estimated SARIMA coefficients. */
export interface SarimaCoefficients {
  /** Non-seasonal AR coefficients, length `p`. */
  ar: number[];
  /** Non-seasonal MA coefficients, length `q`. */
  ma: number[];
  /** Seasonal AR coefficients, length `P`. */
  seasonalAr: number[];
  /** Seasonal MA coefficients, length `Q`. */
  seasonalMa: number[];
  /** Mean of the differenced series; `0` when no mean term is estimated. */
  mean: number;
}

/** Goodness-of-fit scores for a fitted model. */
export interface InformationCriteria {
  logLikelihood: number;
  aic: number;
  aicc: number;
  bic: number;
}

/** A fitted SARIMA model, sufficient to produce forecasts on its own. */
export interface SarimaModel {
  spec: SarimaSpec;
  coefficients: SarimaCoefficients;
  /** Whether a mean term was estimated. */
  includeMean: boolean;
  /**
   * Expanded AR polynomial in `B`, including both differencing operators,
   * stored as `[1, a1, ..., ak]`.
   */
  expandedAr: number[];
  /** Expanded MA polynomial in `B`, stored as `[1, b1, ..., bk]`. */
  expandedMa: number[];
  /** Constant of the expanded equation (`A(1) * mean`). */
  constant: number;
  /** Innovation variance estimated from the one-step residuals. */
  sigma2: number;
  /** One-step-ahead residuals aligned with `observations`. */
  residuals: number[];
  /** The observations the model was fitted to, on the original scale. */
  observations: number[];
  criteria: InformationCriteria;
}

/** A point forecast with an optional prediction interval. */
export interface ForecastPoint {
  /** 1-based steps ahead of the final observation. */
  step: number;
  /** Point forecast (conditional mean). */
  mean: number;
  /** Forecast standard error. */
  standardError: number;
  /** Lower prediction bound. */
  lower: number;
  /** Upper prediction bound. */
  upper: number;
}

/** A forecast whose steps have been mapped back onto calendar dates. */
export interface DatedForecastPoint extends ForecastPoint {
  date: Date;
}

