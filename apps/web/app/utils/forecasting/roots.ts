/**
 * Complex polynomial root finding, used to test stationarity and
 * invertibility.
 *
 * An AR polynomial is stationary when every root of `φ(B)` lies strictly
 * outside the unit circle; the same condition on `θ(B)` gives invertibility.
 */

import { at } from "./linalg";

/** A complex number in rectangular form. */
export interface Complex {
  re: number;
  im: number;
}

const MAX_ITERATIONS = 500;
const CONVERGENCE_TOLERANCE = 1e-12;

/** Complex addition. */
function add(left: Complex, right: Complex): Complex {
  return { re: left.re + right.re, im: left.im + right.im };
}

/** Complex subtraction. */
function subtract(left: Complex, right: Complex): Complex {
  return { re: left.re - right.re, im: left.im - right.im };
}

/** Complex multiplication. */
function multiply(left: Complex, right: Complex): Complex {
  return {
    re: left.re * right.re - left.im * right.im,
    im: left.re * right.im + left.im * right.re,
  };
}

/** Complex division; returns a large finite value rather than dividing by zero. */
function divide(left: Complex, right: Complex): Complex {
  const denominator = right.re * right.re + right.im * right.im;
  if (denominator < Number.MIN_VALUE) return { re: 0, im: 0 };
  return {
    re: (left.re * right.re + left.im * right.im) / denominator,
    im: (left.im * right.re - left.re * right.im) / denominator,
  };
}

/** Modulus of a complex number. */
export function modulus(value: Complex): number {
  return Math.hypot(value.re, value.im);
}

/** Evaluate a real-coefficient polynomial at a complex point. */
function evaluateComplex(polynomial: readonly number[], point: Complex): Complex {
  let accumulated: Complex = { re: 0, im: 0 };
  for (let i = polynomial.length - 1; i >= 0; i -= 1) {
    accumulated = add(multiply(accumulated, point), { re: at(polynomial, i), im: 0 });
  }
  return accumulated;
}

/** Drop numerically negligible trailing coefficients. */
function trimTrailingZeros(polynomial: readonly number[]): number[] {
  const trimmed = [...polynomial];
  while (trimmed.length > 1 && Math.abs(at(trimmed, trimmed.length - 1)) < 1e-14) {
    trimmed.pop();
  }
  return trimmed;
}

/** Seed the Durand–Kerner iteration with points spread around a circle. */
function initialGuesses(degree: number): Complex[] {
  const guesses: Complex[] = [];
  for (let i = 0; i < degree; i += 1) {
    const angle = (2 * Math.PI * i) / degree + 0.5;
    guesses.push({ re: 0.4 * Math.cos(angle), im: 0.4 * Math.sin(angle) });
  }
  return guesses;
}

/**
 * Find all complex roots of a real polynomial via Durand–Kerner iteration.
 *
 * @param polynomial - Coefficients in ascending powers of the variable.
 * @returns The roots; an empty array for constant or degenerate polynomials.
 */
export function polynomialRoots(polynomial: readonly number[]): Complex[] {
  const trimmed = trimTrailingZeros(polynomial);
  const degree = trimmed.length - 1;
  if (degree < 1) return [];
  const leading = at(trimmed, degree);
  const normalised = trimmed.map((coefficient) => coefficient / leading);
  let roots = initialGuesses(degree);
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    const { next, shift } = refineRoots(normalised, roots);
    roots = next;
    if (shift < CONVERGENCE_TOLERANCE) break;
  }
  return roots;
}

/** Perform one Durand–Kerner sweep, returning the new roots and the step size. */
function refineRoots(
  normalised: readonly number[],
  roots: readonly Complex[],
): { next: Complex[]; shift: number } {
  const next: Complex[] = [];
  let shift = 0;
  for (let i = 0; i < roots.length; i += 1) {
    const current = roots[i];
    if (current === undefined) continue;
    let denominator: Complex = { re: 1, im: 0 };
    for (let j = 0; j < roots.length; j += 1) {
      const other = roots[j];
      if (j === i || other === undefined) continue;
      denominator = multiply(denominator, subtract(current, other));
    }
    const step = divide(evaluateComplex(normalised, current), denominator);
    shift = Math.max(shift, modulus(step));
    next.push(subtract(current, step));
  }
  return { next, shift };
}

/**
 * Test whether every root of a lag polynomial lies outside the unit circle.
 *
 * Applied to `φ(B)` this is the stationarity condition; applied to `θ(B)` it is
 * the invertibility condition. A polynomial of degree zero is trivially valid.
 *
 * @param polynomial - Lag polynomial `[1, c1, ...]` in ascending powers.
 * @param margin - Required clearance beyond the unit circle.
 * @returns `true` when all roots satisfy `|root| > 1 + margin`.
 */
export function rootsOutsideUnitCircle(
  polynomial: readonly number[],
  margin: number = 1e-6,
): boolean {
  const roots = polynomialRoots(polynomial);
  if (roots.length === 0) return true;
  return roots.every((root) => modulus(root) > 1 + margin);
}

/**
 * Whether an AR lag polynomial describes a stationary process.
 *
 * @param arPolynomial - AR polynomial `[1, a1, ...]`.
 * @returns `true` when the process is stationary.
 */
export function isStationary(arPolynomial: readonly number[]): boolean {
  return rootsOutsideUnitCircle(arPolynomial);
}

/**
 * Whether an MA lag polynomial describes an invertible process.
 *
 * @param maPolynomial - MA polynomial `[1, b1, ...]`.
 * @returns `true` when the process is invertible.
 */
export function isInvertible(maPolynomial: readonly number[]): boolean {
  return rootsOutsideUnitCircle(maPolynomial);
}
