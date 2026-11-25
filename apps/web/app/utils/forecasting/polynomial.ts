/**
 * Polynomial algebra in the backshift operator `B`.
 *
 * Polynomials are stored as coefficient arrays in ascending powers, so
 * `[1, -0.5]` denotes `1 - 0.5B`. SARIMA needs this to collapse the product
 * `φ(B) Φ(Bᵐ) (1-B)^d (1-Bᵐ)^D` into a single AR polynomial.
 */

import { at } from "./linalg";

/** The multiplicative identity, `1`. */
export function polynomialOne(): number[] {
  return [1];
}

/**
 * Multiply two polynomials by convolving their coefficients.
 *
 * @param left - First polynomial in ascending powers of `B`.
 * @param right - Second polynomial in ascending powers of `B`.
 * @returns The product, of degree `deg(left) + deg(right)`.
 */
export function multiplyPolynomials(
  left: readonly number[],
  right: readonly number[],
): number[] {
  if (left.length === 0 || right.length === 0) return [];
  const product = new Array<number>(left.length + right.length - 1).fill(0);
  for (let i = 0; i < left.length; i += 1) {
    const leftCoefficient = at(left, i);
    if (leftCoefficient === 0) continue;
    for (let j = 0; j < right.length; j += 1) {
      product[i + j] = at(product, i + j) + leftCoefficient * at(right, j);
    }
  }
  return product;
}

/**
 * Multiply an arbitrary number of polynomials.
 *
 * @param factors - Polynomials to multiply.
 * @returns The product, or `1` when no factors are given.
 */
export function multiplyAll(factors: readonly (readonly number[])[]): number[] {
  let product = polynomialOne();
  for (const factor of factors) product = multiplyPolynomials(product, factor);
  return product;
}

/**
 * Build `1 + c_1 B^lag + c_2 B^{2 lag} + ...` from seasonal coefficients.
 *
 * Passing `lag = 1` yields the ordinary (non-seasonal) lag polynomial.
 *
 * @param coefficients - Coefficients `c_1 .. c_k` as they appear in the model.
 * @param lag - Spacing between successive powers.
 * @returns The expanded polynomial in ascending powers of `B`.
 */
export function lagPolynomial(
  coefficients: readonly number[],
  lag: number,
): number[] {
  const degree = coefficients.length * lag;
  const polynomial = new Array<number>(degree + 1).fill(0);
  polynomial[0] = 1;
  for (let i = 0; i < coefficients.length; i += 1) {
    polynomial[(i + 1) * lag] = at(coefficients, i);
  }
  return polynomial;
}

/**
 * Build the differencing operator `(1 - B^lag)^order`.
 *
 * @param order - Degree of differencing.
 * @param lag - Lag of the operator; `1` for regular, `m` for seasonal.
 * @returns The expanded operator in ascending powers of `B`.
 */
export function differencingPolynomial(order: number, lag: number): number[] {
  const single = new Array<number>(lag + 1).fill(0);
  single[0] = 1;
  single[lag] = -1;
  let product = polynomialOne();
  for (let i = 0; i < order; i += 1) product = multiplyPolynomials(product, single);
  return product;
}

/**
 * Evaluate a polynomial at a real argument via Horner's method.
 *
 * @param polynomial - Coefficients in ascending powers.
 * @param argument - The value of `B` to substitute.
 * @returns The evaluated result.
 */
export function evaluatePolynomial(
  polynomial: readonly number[],
  argument: number,
): number {
  let accumulated = 0;
  for (let i = polynomial.length - 1; i >= 0; i -= 1) {
    accumulated = accumulated * argument + at(polynomial, i);
  }
  return accumulated;
}

/**
 * Expand `θ(B) / φ(B)` as the leading psi-weights of an MA(∞) representation.
 *
 * These weights drive the multi-step forecast variance: the `h`-step error
 * variance is `σ² Σ_{j<h} ψ_j²`.
 *
 * @param arPolynomial - AR polynomial `[1, a1, ...]` in ascending powers.
 * @param maPolynomial - MA polynomial `[1, b1, ...]` in ascending powers.
 * @param count - Number of weights to return, starting at `ψ_0 = 1`.
 * @returns The first `count` psi-weights.
 */
export function psiWeights(
  arPolynomial: readonly number[],
  maPolynomial: readonly number[],
  count: number,
): number[] {
  const weights = new Array<number>(Math.max(count, 1)).fill(0);
  weights[0] = 1;
  for (let j = 1; j < weights.length; j += 1) {
    let value = j < maPolynomial.length ? at(maPolynomial, j) : 0;
    for (let i = 1; i < arPolynomial.length && i <= j; i += 1) {
      value -= at(arPolynomial, i) * at(weights, j - i);
    }
    weights[j] = value;
  }
  return weights.slice(0, count);
}
