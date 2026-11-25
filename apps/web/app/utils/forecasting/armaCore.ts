/**
 * The ARMA residual recursion — the computational heart of SARIMA estimation
 * and forecasting.
 *
 * Given expanded AR and MA lag polynomials, the one-step innovation is
 * `e_t = x_t - c - Σ_i a_i x_{t-i} - Σ_j b_j e_{t-j}`, where unobserved
 * pre-sample values are held at zero (the conditional, or "CSS", convention).
 */

import { at, sumOfSquares } from "./linalg";

/** Residuals and fitted values from one pass of the ARMA recursion. */
export interface ResidualSeries {
  /** One-step-ahead innovations, aligned with the input series. */
  residuals: number[];
  /** One-step-ahead predictions, aligned with the input series. */
  fitted: number[];
}

/**
 * Run the conditional ARMA recursion over a series.
 *
 * Both polynomials are given in expanded form including the leading `1`, which
 * is ignored; only lags `1..k` contribute.
 *
 * @param series - The (already differenced) series to filter.
 * @param arPolynomial - AR polynomial `[1, a1, ...]` in ascending powers.
 * @param maPolynomial - MA polynomial `[1, b1, ...]` in ascending powers.
 * @param constant - Additive constant of the equation.
 * @returns Residuals and fitted values, both the length of `series`.
 */
export function armaResiduals(
  series: readonly number[],
  arPolynomial: readonly number[],
  maPolynomial: readonly number[],
  constant: number = 0,
): ResidualSeries {
  const residuals = new Array<number>(series.length).fill(0);
  const fitted = new Array<number>(series.length).fill(0);
  for (let t = 0; t < series.length; t += 1) {
    const prediction = predictOneStep(series, residuals, arPolynomial, maPolynomial, constant, t);
    fitted[t] = prediction;
    residuals[t] = at(series, t) - prediction;
  }
  return { residuals, fitted };
}

/**
 * Form the one-step prediction of `series[t]` from earlier values and
 * innovations.
 *
 * Pre-sample terms are treated as zero, which biases the first few residuals
 * but keeps the recursion closed-form and cheap.
 */
function predictOneStep(
  series: readonly number[],
  residuals: readonly number[],
  arPolynomial: readonly number[],
  maPolynomial: readonly number[],
  constant: number,
  t: number,
): number {
  let prediction = constant;
  for (let i = 1; i < arPolynomial.length; i += 1) {
    if (t - i < 0) break;
    prediction -= at(arPolynomial, i) * at(series, t - i);
  }
  for (let j = 1; j < maPolynomial.length; j += 1) {
    if (t - j < 0) break;
    prediction += at(maPolynomial, j) * at(residuals, t - j);
  }
  return prediction;
}

/**
 * Conditional sum of squared innovations — the objective minimised during
 * estimation.
 *
 * @param series - The differenced series.
 * @param arPolynomial - AR polynomial `[1, a1, ...]`.
 * @param maPolynomial - MA polynomial `[1, b1, ...]`.
 * @param constant - Additive constant of the equation.
 * @param burnIn - Leading residuals to exclude, mitigating start-up bias.
 * @returns The sum of squared residuals over the retained span.
 */
export function conditionalSumOfSquares(
  series: readonly number[],
  arPolynomial: readonly number[],
  maPolynomial: readonly number[],
  constant: number,
  burnIn: number = 0,
): number {
  const { residuals } = armaResiduals(series, arPolynomial, maPolynomial, constant);
  return sumOfSquares(residuals.slice(Math.min(burnIn, residuals.length)));
}

/**
 * Innovation variance implied by a residual series.
 *
 * @param residuals - One-step residuals.
 * @param parameterCount - Number of estimated parameters, for the denominator.
 * @returns The variance estimate, never negative.
 */
export function innovationVariance(
  residuals: readonly number[],
  parameterCount: number,
): number {
  const denominator = Math.max(residuals.length - parameterCount, 1);
  return sumOfSquares(residuals) / denominator;
}
