/**
 * Multi-step forecasting from a fitted SARIMA model.
 *
 * Forecasts are produced directly on the original scale using the fully
 * expanded AR polynomial — which already carries both differencing operators —
 * so no separate integration step is needed. Future innovations are set to
 * their expectation of zero; residuals inside the MA memory are carried over
 * from the fit.
 */

import { at } from "./linalg";
import { psiWeights } from "./polynomial";
import type { ForecastPoint, SarimaModel } from "./types";

/** Options controlling interval construction. */
export interface ForecastOptions {
  /**
   * Normal critical value for the prediction interval. Defaults to 1.96,
   * giving a nominal 95% interval.
   */
  criticalValue?: number;
}

/**
 * Forecast `horizon` steps beyond the end of the fitted sample.
 *
 * @param model - A model produced by `fitSarima`.
 * @param horizon - Number of steps to forecast; must be at least 1.
 * @returns One forecast point per step, with standard errors and bounds.
 * @throws RangeError If `horizon` is not a positive integer.
 */
export function forecastSarima(
  model: SarimaModel,
  horizon: number,
  options: ForecastOptions = {},
): ForecastPoint[] {
  if (!Number.isInteger(horizon) || horizon < 1) {
    throw new RangeError(`Horizon must be a positive integer, received ${horizon}.`);
  }
  const criticalValue = options.criticalValue ?? 1.96;
  const means = projectMeans(model, horizon);
  const errors = standardErrors(model, horizon);
  return means.map((value, index) => {
    const standardError = at(errors, index);
    const margin = criticalValue * standardError;
    return {
      step: index + 1,
      mean: value,
      standardError,
      lower: value - margin,
      upper: value + margin,
    };
  });
}

/**
 * Iterate the difference equation forward to obtain conditional means.
 *
 * The AR side reads from history extended with forecasts already produced; the
 * MA side reads from fitted residuals, contributing zero once the horizon moves
 * past the residual memory.
 */
function projectMeans(model: SarimaModel, horizon: number): number[] {
  const history = [...model.observations];
  const innovations = alignInnovations(model);
  const forecasts: number[] = [];
  for (let step = 0; step < horizon; step += 1) {
    const next = nextValue(model, history, innovations);
    forecasts.push(next);
    history.push(next);
    innovations.push(0);
  }
  return forecasts;
}

/**
 * Pad the fitted residuals so their indices line up with the original scale.
 *
 * Residuals are estimated on the differenced series and so are shorter than the
 * observations by the number of values differencing consumed. The recursion
 * below indexes history and innovations with the same time cursor, so the
 * leading gap is filled with zeros — the conventional value for pre-sample
 * innovations, which are unobservable in any case.
 */
function alignInnovations(model: SarimaModel): number[] {
  const loss = model.observations.length - model.residuals.length;
  return [...new Array<number>(Math.max(loss, 0)).fill(0), ...model.residuals];
}

/** Compute the one-step-ahead conditional mean at the end of `history`. */
function nextValue(
  model: SarimaModel,
  history: readonly number[],
  innovations: readonly number[],
): number {
  const t = history.length;
  let value = model.constant;
  for (let i = 1; i < model.expandedAr.length; i += 1) {
    if (t - i < 0) break;
    value -= at(model.expandedAr, i) * at(history, t - i);
  }
  for (let j = 1; j < model.expandedMa.length; j += 1) {
    if (t - j < 0) break;
    value += at(model.expandedMa, j) * at(innovations, t - j);
  }
  return value;
}

/**
 * Forecast standard errors from the MA(∞) representation.
 *
 * The `h`-step error variance is `σ² Σ_{j<h} ψ_j²`, where the psi-weights come
 * from expanding `θ(B)/φ(B)` with differencing included — which is why the
 * variance grows without bound for integrated models.
 */
function standardErrors(model: SarimaModel, horizon: number): number[] {
  const weights = psiWeights(model.expandedAr, model.expandedMa, horizon);
  const errors: number[] = [];
  let accumulated = 0;
  for (let step = 0; step < horizon; step += 1) {
    accumulated += at(weights, step) ** 2;
    errors.push(Math.sqrt(model.sigma2 * accumulated));
  }
  return errors;
}
