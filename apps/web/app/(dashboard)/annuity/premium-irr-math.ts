/**
 * IRR for periodic premiums (outflows) and one lump-sum receipt (inflow).
 * Time unit: months; rate solved is the monthly periodic IRR; annual effective = (1+r_m)^12 - 1.
 */

export type PremiumPaymentFrequency = "monthly" | "quarterly" | "annual";

export interface PremiumIrrComputationInput {
  premiumPerPeriod: number;
  frequency: PremiumPaymentFrequency;
  /** Years over which premiums are paid (end-of-period). */
  payYears: number;
  /** Lump sum received (positive number). */
  lumpSumReceived: number;
  /** Years from start until lump sum is received (end of that year in monthly model). */
  receiptYears: number;
}

export interface PremiumIrrComputationResult {
  monthlyIrr: number;
  /** Effective annual return %: (1 + monthly)^12 − 1 */
  annualEffectivePercent: number;
  /** Nominal annual rate if compounded monthly: 12 × monthly (for reference) */
  nominalAnnualPercent: number;
  totalPremiumsPaid: number;
  paymentCount: number;
  netGain: number;
  /** Simple CAGR on total paid: (FV / total paid)^(1/T) − 1; timing-agnostic */
  simpleCagrOnTotalPaidPercent: number | null;
}

function npvAtMonthlyRate(flows: number[], rate: number): number {
  let sum = 0;
  for (let month = 1; month < flows.length; month += 1) {
    sum += flows[month]! / Math.pow(1 + rate, month);
  }
  return sum;
}

/** flows[month] at end of month `month` (1-based months). flows[0] unused. */
export function buildPremiumIrrCashFlows(input: PremiumIrrComputationInput): {
  flows: number[];
  totalPremiumsPaid: number;
  paymentCount: number;
} {
  const premium = Math.max(0, input.premiumPerPeriod);
  const lump = Math.max(0, input.lumpSumReceived);
  const payEndMonth = Math.max(0, Math.round(input.payYears * 12));
  const receiptMonth = Math.max(1, Math.round(input.receiptYears * 12));
  const len = Math.max(receiptMonth, payEndMonth) + 1;
  const flows = new Array<number>(len).fill(0);
  let totalPremiumsPaid = 0;
  let paymentCount = 0;

  if (premium > 0 && payEndMonth > 0) {
    if (input.frequency === "monthly") {
      for (let m = 1; m <= payEndMonth; m += 1) {
        flows[m]! -= premium;
        totalPremiumsPaid += premium;
        paymentCount += 1;
      }
    } else if (input.frequency === "quarterly") {
      for (let m = 3; m <= payEndMonth; m += 3) {
        flows[m]! -= premium;
        totalPremiumsPaid += premium;
        paymentCount += 1;
      }
    } else {
      for (let m = 12; m <= payEndMonth; m += 12) {
        flows[m]! -= premium;
        totalPremiumsPaid += premium;
        paymentCount += 1;
      }
    }
  }

  flows[receiptMonth]! += lump;

  return { flows, totalPremiumsPaid, paymentCount };
}

/**
 * Solves for monthly rate r such that NPV of cash flows = 0.
 */
export function solveMonthlyIrrFromFlows(flows: number[]): number | null {
  if (flows.length < 2) return null;

  const npv = (r: number) => npvAtMonthlyRate(flows, r);

  let lo = -0.95;
  let hi = 0.5;
  let nLo = npv(lo);
  let nHi = npv(hi);
  let guard = 0;

  while (nLo * nHi > 0 && guard < 60) {
    hi *= 1.35;
    if (hi > 200) hi += 2;
    nHi = npv(hi);
    guard += 1;
  }

  if (nLo * nHi > 0) {
    lo = -0.999;
    nLo = npv(lo);
    hi = 0.5;
    nHi = npv(hi);
    guard = 0;
    while (nLo * nHi > 0 && guard < 40) {
      lo += 0.02;
      if (lo >= -0.01) break;
      nLo = npv(lo);
      guard += 1;
    }
  }

  if (nLo * nHi > 0) return null;

  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2;
    const nMid = npv(mid);
    if (Math.abs(nMid) < 1e-11) return mid;
    if (nLo * nMid <= 0) {
      hi = mid;
      nHi = nMid;
    } else {
      lo = mid;
      nLo = nMid;
    }
  }
  return (lo + hi) / 2;
}

export interface PremiumIrrScheduleRow {
  month: number;
  year: number;
  /** Net cash flow this month (outflows negative, inflows positive). */
  cashFlow: number;
  /** Undiscounted sum of cash flows through this month. */
  cumulativeCashFlow: number;
  /** PV of this month’s flow at the solved monthly IRR. */
  presentValueAtIrr: number;
  /** Running sum of PVs (should end near zero at the IRR). */
  cumulativePvAtIrr: number;
}

/** One row per month with non-zero cash flow, in chronological order. */
export function buildPremiumIrrSchedule(flows: number[], monthlyIrr: number): PremiumIrrScheduleRow[] {
  const rows: PremiumIrrScheduleRow[] = [];
  let cumulativeCashFlow = 0;
  let cumulativePv = 0;

  for (let month = 1; month < flows.length; month += 1) {
    const cf = flows[month] ?? 0;
    if (Math.abs(cf) < 1e-9) continue;

    cumulativeCashFlow += cf;
    const pv = cf / Math.pow(1 + monthlyIrr, month);
    cumulativePv += pv;

    rows.push({
      month,
      year: Math.ceil(month / 12),
      cashFlow: cf,
      cumulativeCashFlow,
      presentValueAtIrr: pv,
      cumulativePvAtIrr: cumulativePv,
    });
  }

  return rows;
}

export function computePremiumIrr(input: PremiumIrrComputationInput): PremiumIrrComputationResult | null {
  const { flows, totalPremiumsPaid, paymentCount } = buildPremiumIrrCashFlows(input);
  const lump = Math.max(0, input.lumpSumReceived);

  if (lump <= 0 || totalPremiumsPaid <= 0 || paymentCount === 0) return null;

  const monthlyIrr = solveMonthlyIrrFromFlows(flows);
  if (monthlyIrr === null) return null;

  const annualEffective = Math.pow(1 + monthlyIrr, 12) - 1;
  const nominalAnnual = monthlyIrr * 12;

  const receiptYears = Math.max(input.receiptYears, 1e-9);
  const simpleCagr =
    totalPremiumsPaid > 0
      ? (Math.pow(lump / totalPremiumsPaid, 1 / receiptYears) - 1) * 100
      : null;

  return {
    monthlyIrr,
    annualEffectivePercent: annualEffective * 100,
    nominalAnnualPercent: nominalAnnual * 100,
    totalPremiumsPaid,
    paymentCount,
    netGain: lump - totalPremiumsPaid,
    simpleCagrOnTotalPaidPercent: simpleCagr,
  };
}
