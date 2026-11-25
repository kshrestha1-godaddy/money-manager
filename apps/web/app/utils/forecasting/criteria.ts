/**
 * Gaussian log-likelihood and the information criteria derived from it.
 *
 * Used to compare candidate SARIMA specifications fitted to the *same*
 * differenced series — comparing across different `d` or `D` is invalid, since
 * differencing changes both the sample size and the quantity being modelled.
 */

import type { InformationCriteria } from "./types";

/**
 * Concentrated Gaussian log-likelihood of a fitted model.
 *
 * With `σ²` profiled out, the likelihood reduces to a function of the residual
 * variance and sample size alone.
 *
 * @param sampleSize - Number of residuals contributing to the fit.
 * @param sigma2 - Estimated innovation variance.
 * @returns The log-likelihood, or `-Infinity` for a degenerate variance.
 */
export function gaussianLogLikelihood(sampleSize: number, sigma2: number): number {
  if (sampleSize <= 0 || sigma2 <= 0 || !Number.isFinite(sigma2)) return -Infinity;
  return -0.5 * sampleSize * (Math.log(2 * Math.PI * sigma2) + 1);
}

/**
 * Compute AIC, corrected AIC and BIC from a log-likelihood.
 *
 * The AICc correction matters here: financial series are often short enough
 * that plain AIC meaningfully under-penalises large models.
 *
 * @param logLikelihood - The model log-likelihood.
 * @param parameterCount - Number of estimated parameters, excluding `σ²`.
 * @param sampleSize - Number of residuals contributing to the fit.
 * @returns The three criteria alongside the log-likelihood.
 */
export function informationCriteria(
  logLikelihood: number,
  parameterCount: number,
  sampleSize: number,
): InformationCriteria {
  const penalised = parameterCount + 1;
  const aic = -2 * logLikelihood + 2 * penalised;
  return {
    logLikelihood,
    aic,
    aicc: aic + correction(penalised, sampleSize),
    bic: -2 * logLikelihood + penalised * Math.log(Math.max(sampleSize, 1)),
  };
}

/**
 * Small-sample correction term added to AIC.
 *
 * Diverges as the parameter count approaches the sample size, so it is capped
 * at `Infinity` rather than allowed to go negative.
 */
function correction(penalised: number, sampleSize: number): number {
  const denominator = sampleSize - penalised - 1;
  if (denominator <= 0) return Infinity;
  return (2 * penalised * (penalised + 1)) / denominator;
}
