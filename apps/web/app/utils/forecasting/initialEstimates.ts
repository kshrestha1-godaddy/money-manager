/**
 * Starting values for SARIMA estimation.
 *
 * Nelder–Mead is only as good as its seed, so pure AR models are initialised by
 * Yule–Walker and mixed models by Hannan–Rissanen: fit a long autoregression,
 * treat its residuals as proxies for the unobserved innovations, then regress
 * the series on lags of both.
 */

import { autocorrelation } from "./acf";
import { at, leastSquares, mean, solveLinearSystem } from "./linalg";
import type { SarimaCoefficients, SarimaSpec } from "./types";
import { effectivePeriod } from "./sarimaSpec";

/**
 * Solve the Yule–Walker equations for a pure AR model of a given order.
 *
 * @param series - A stationary (differenced) series.
 * @param order - The autoregressive order to fit.
 * @returns AR coefficients in `φ` form, or zeros when the system is singular.
 */
export function yuleWalker(series: readonly number[], order: number): number[] {
  if (order === 0) return [];
  const correlations = autocorrelation(series, order);
  if (correlations.length <= order) return new Array<number>(order).fill(0);
  const matrix = Array.from({ length: order }, (_unused, i) =>
    Array.from({ length: order }, (_ignored, j) => at(correlations, Math.abs(i - j))),
  );
  const target = Array.from({ length: order }, (_unused, i) => at(correlations, i + 1));
  return solveLinearSystem(matrix, target) ?? new Array<number>(order).fill(0);
}

/**
 * Lag indices contributing to a multiplicative SARIMA side.
 *
 * A `(p=1, P=1, m=12)` AR side draws on lags 1, 12 and — through the product
 * term — 13; the initialisation regression only needs the direct lags 1 and 12.
 *
 * @param order - Non-seasonal order.
 * @param seasonalOrder - Seasonal order.
 * @param period - Seasonal period.
 * @returns The direct lags, non-seasonal first.
 */
export function directLags(
  order: number,
  seasonalOrder: number,
  period: number,
): number[] {
  const lags: number[] = [];
  for (let i = 1; i <= order; i += 1) lags.push(i);
  for (let i = 1; i <= seasonalOrder; i += 1) lags.push(i * period);
  return lags;
}

/**
 * Order of the auxiliary autoregression used to proxy the innovations.
 *
 * @param spec - The specification being initialised.
 * @param sampleSize - Length of the differenced series.
 * @returns A lag order long enough to whiten the series but safely estimable.
 */
function auxiliaryOrder(spec: SarimaSpec, sampleSize: number): number {
  const period = effectivePeriod(spec);
  const required = Math.max(spec.p + spec.q, (spec.P + spec.Q) * period) + period;
  return Math.max(1, Math.min(required + 2, Math.floor(sampleSize / 3)));
}

/**
 * Residuals of a long autoregression, used as innovation proxies.
 *
 * @param series - The centred stationary series.
 * @param order - Autoregression order.
 * @returns Residuals aligned with `series`, zero for the first `order` entries.
 */
function autoregressiveResiduals(series: readonly number[], order: number): number[] {
  const coefficients = yuleWalker(series, order);
  const residuals = new Array<number>(series.length).fill(0);
  for (let t = order; t < series.length; t += 1) {
    let prediction = 0;
    for (let i = 0; i < order; i += 1) {
      prediction += at(coefficients, i) * at(series, t - 1 - i);
    }
    residuals[t] = at(series, t) - prediction;
  }
  return residuals;
}

/**
 * Hannan–Rissanen initial estimates for a mixed SARIMA model.
 *
 * @param series - A stationary (differenced) series.
 * @param spec - The specification to initialise.
 * @param includeMean - Whether a mean term is being estimated.
 * @returns Starting coefficients; zeros where the regression is unidentified.
 */
export function hannanRissanen(
  series: readonly number[],
  spec: SarimaSpec,
  includeMean: boolean,
): SarimaCoefficients {
  const centre = includeMean ? mean(series) : 0;
  const centred = series.map((value) => value - centre);
  const period = effectivePeriod(spec);
  const arLags = directLags(spec.p, spec.P, period);
  const maLags = directLags(spec.q, spec.Q, period);
  const innovations = autoregressiveResiduals(centred, auxiliaryOrder(spec, centred.length));
  const fallback = emptyCoefficients(spec, centre);
  if (arLags.length + maLags.length === 0) return fallback;
  const solved = solveRegression(centred, innovations, arLags, maLags);
  return solved === null ? fallback : assignCoefficients(solved, spec, centre);
}

/** Build the lagged design matrix and solve it by least squares. */
function solveRegression(
  centred: readonly number[],
  innovations: readonly number[],
  arLags: readonly number[],
  maLags: readonly number[],
): number[] | null {
  const start = Math.max(...arLags, ...maLags, 1);
  if (start >= centred.length) return null;
  const design: number[][] = [];
  const response: number[] = [];
  for (let t = start; t < centred.length; t += 1) {
    design.push([
      ...arLags.map((lag) => at(centred, t - lag)),
      ...maLags.map((lag) => at(innovations, t - lag)),
    ]);
    response.push(at(centred, t));
  }
  return design.length <= arLags.length + maLags.length ? null : leastSquares(design, response);
}

/** Slot a flat regression solution into the named coefficient groups. */
function assignCoefficients(
  solution: readonly number[],
  spec: SarimaSpec,
  centre: number,
): SarimaCoefficients {
  let offset = 0;
  const take = (count: number): number[] => {
    const slice = solution.slice(offset, offset + count).map(damp);
    offset += count;
    return [...slice, ...new Array<number>(Math.max(count - slice.length, 0)).fill(0)];
  };
  const ar = take(spec.p);
  const seasonalAr = take(spec.P);
  const ma = take(spec.q);
  const seasonalMa = take(spec.Q);
  return { ar, seasonalAr, ma, seasonalMa, mean: centre };
}

/**
 * Pull a starting coefficient inside the unit interval.
 *
 * Hannan–Rissanen can return explosive values on short samples, which would
 * make the first objective evaluation infinite and starve the simplex.
 */
function damp(coefficient: number): number {
  if (!Number.isFinite(coefficient)) return 0;
  return Math.max(-0.95, Math.min(0.95, coefficient));
}

/** All-zero coefficients, retaining only the mean. */
function emptyCoefficients(spec: SarimaSpec, centre: number): SarimaCoefficients {
  return {
    ar: new Array<number>(spec.p).fill(0),
    seasonalAr: new Array<number>(spec.P).fill(0),
    ma: new Array<number>(spec.q).fill(0),
    seasonalMa: new Array<number>(spec.Q).fill(0),
    mean: centre,
  };
}

/**
 * Choose initial coefficients by the cheapest adequate method.
 *
 * @param series - A stationary (differenced) series.
 * @param spec - The specification to initialise.
 * @param includeMean - Whether a mean term is being estimated.
 * @returns Starting coefficients for the optimiser.
 */
export function initialCoefficients(
  series: readonly number[],
  spec: SarimaSpec,
  includeMean: boolean,
): SarimaCoefficients {
  const isPureAr = spec.q === 0 && spec.Q === 0;
  if (isPureAr && spec.P === 0) {
    return {
      ar: yuleWalker(includeMean ? centreSeries(series) : series, spec.p).map(damp),
      seasonalAr: [],
      ma: [],
      seasonalMa: [],
      mean: includeMean ? mean(series) : 0,
    };
  }
  return hannanRissanen(series, spec, includeMean);
}

/** Subtract the sample mean from a series. */
function centreSeries(series: readonly number[]): number[] {
  const centre = mean(series);
  return series.map((value) => value - centre);
}
