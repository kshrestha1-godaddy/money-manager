"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { INPUT_COLORS } from "../../../config/colorConfig";
import { AnnuitySummaryCard } from "./AnnuitySummaryCard";
import {
  buildPremiumIrrCashFlows,
  buildPremiumIrrSchedule,
  computePremiumIrr,
  type PremiumPaymentFrequency,
} from "../premium-irr-math";

const standardInput = INPUT_COLORS.standard;

interface PremiumIrrCalculatorProps {
  baseCurrency: string;
  selectedCurrency: string;
}

function formatDisplay(
  amount: number,
  baseCurrency: string,
  displayCurrency: string
): string {
  const v = convertForDisplaySync(amount, baseCurrency, displayCurrency);
  return formatCurrency(v, displayCurrency);
}

const FREQUENCY_OPTIONS: { value: PremiumPaymentFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

export function PremiumIrrCalculator({ baseCurrency, selectedCurrency }: PremiumIrrCalculatorProps) {
  const [premium, setPremium] = useState(5000);
  const [frequency, setFrequency] = useState<PremiumPaymentFrequency>("monthly");
  const [payYears, setPayYears] = useState(10);
  const [lumpSum, setLumpSum] = useState(1_000_000);
  const [receiptYears, setReceiptYears] = useState(15);

  const result = useMemo(() => {
    if (premium <= 0 || lumpSum <= 0 || payYears <= 0 || receiptYears <= 0) return null;
    return computePremiumIrr({
      premiumPerPeriod: premium,
      frequency,
      payYears,
      lumpSumReceived: lumpSum,
      receiptYears,
    });
  }, [premium, frequency, payYears, lumpSum, receiptYears]);

  const scheduleRows = useMemo(() => {
    if (!result) return null;
    const { flows } = buildPremiumIrrCashFlows({
      premiumPerPeriod: premium,
      frequency,
      payYears,
      lumpSumReceived: lumpSum,
      receiptYears,
    });
    return buildPremiumIrrSchedule(flows, result.monthlyIrr);
  }, [result, premium, frequency, payYears, lumpSum, receiptYears]);

  const npvCheck =
    scheduleRows && scheduleRows.length > 0
      ? scheduleRows[scheduleRows.length - 1]!.cumulativePvAtIrr
      : null;

  return (
    <section className="w-full rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-4 sm:px-5 sm:py-5 border-b border-slate-100 bg-slate-50/60">
        <h2 className="text-lg font-semibold text-slate-900">Premium → lump sum return (IRR)</h2>
        <p className="mt-1 text-sm text-slate-600">
          You pay a fixed premium each period for X years, then receive one lump sum after T years. We solve the
          monthly internal rate of return (IRR) that makes the present value of all cash flows zero, then show the
          equivalent effective annual return (and a simple CAGR on total paid for reference).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3 sm:px-5 sm:py-5">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="irr-premium">
            Premium per period
          </label>
          <input
            id="irr-premium"
            type="number"
            min={0}
            step={100}
            value={premium || ""}
            onChange={(e) => setPremium(Math.max(0, Number.parseFloat(e.target.value) || 0))}
            className={`mt-1 ${standardInput}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="irr-frequency">
            Payment frequency
          </label>
          <select
            id="irr-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as PremiumPaymentFrequency)}
            className={`mt-1 ${standardInput}`}
          >
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="irr-pay-years">
            Pay premiums for (years) — X
          </label>
          <input
            id="irr-pay-years"
            type="number"
            min={0.01}
            step={0.25}
            value={payYears || ""}
            onChange={(e) => setPayYears(Math.max(0, Number.parseFloat(e.target.value) || 0))}
            className={`mt-1 ${standardInput}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="irr-lump">
            Lump sum received — Y
          </label>
          <input
            id="irr-lump"
            type="number"
            min={0}
            step={1000}
            value={lumpSum || ""}
            onChange={(e) => setLumpSum(Math.max(0, Number.parseFloat(e.target.value) || 0))}
            className={`mt-1 ${standardInput}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="irr-receipt-years">
            Receive lump sum after (years) — T
          </label>
          <input
            id="irr-receipt-years"
            type="number"
            min={0.01}
            step={0.25}
            value={receiptYears || ""}
            onChange={(e) => setReceiptYears(Math.max(0, Number.parseFloat(e.target.value) || 0))}
            className={`mt-1 ${standardInput}`}
          />
        </div>
      </div>

      <div className="border-t border-slate-100 bg-gray-50/50 px-4 py-4 sm:px-6">
        {!result ? (
          <p className="text-sm text-slate-600">
            Enter a positive premium, pay period, lump sum, and timelines. If no unique IRR is found, results stay
            hidden.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <AnnuitySummaryCard
              title="Effective annual return (IRR)"
              value={`${result.annualEffectivePercent.toFixed(2)}%`}
              subtitle="(1 + monthly IRR)^12 − 1"
            />
            <AnnuitySummaryCard
              title="Monthly periodic IRR"
              value={`${(result.monthlyIrr * 100).toFixed(4)}%`}
              subtitle={`≈ ${result.nominalAnnualPercent.toFixed(2)}% nominal annual (12 × monthly)`}
            />
            <AnnuitySummaryCard
              title="Total premiums paid"
              value={formatDisplay(result.totalPremiumsPaid, baseCurrency, selectedCurrency)}
              subtitle={`${result.paymentCount} payment${result.paymentCount === 1 ? "" : "s"}`}
            />
            <AnnuitySummaryCard
              title="Net gain (Y − total paid)"
              value={formatDisplay(result.netGain, baseCurrency, selectedCurrency)}
              subtitle="Before tax; not investment advice"
            />
            <AnnuitySummaryCard
              title="Simple CAGR on total paid"
              value={
                result.simpleCagrOnTotalPaidPercent != null
                  ? `${result.simpleCagrOnTotalPaidPercent.toFixed(2)}%`
                  : "—"
              }
              subtitle="(Y ÷ total paid)^(1/T) − 1 · ignores timing vs IRR"
            />
          </div>
        )}
      </div>

      {result && scheduleRows && scheduleRows.length > 0 ? (
        <div className="border-t border-slate-200 px-4 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-slate-900">Cash flow schedule</h3>
          <p className="mt-1 text-xs text-slate-600">
            Each row is month-end: premium outflows and the lump-sum inflow. Present values use the solved monthly IRR
            so the running PV column should end near zero.
          </p>
          <div className="mt-3 max-h-[min(520px,70vh)] overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Month
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Year
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Direction
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Cash flow
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Cumulative
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    PV @ IRR
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    Cumulative PV
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {scheduleRows.map((row, idx) => (
                  <tr
                    key={`${row.month}-${idx}`}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}
                  >
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-900">{row.month}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-700">{row.year}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                      {row.cashFlow >= 0 ? "Inflow" : "Outflow"}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        row.cashFlow >= 0 ? "text-emerald-700" : "text-gray-900"
                      }`}
                    >
                      {formatDisplay(row.cashFlow, baseCurrency, selectedCurrency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                      {formatDisplay(row.cumulativeCashFlow, baseCurrency, selectedCurrency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {formatDisplay(row.presentValueAtIrr, baseCurrency, selectedCurrency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                      {formatDisplay(row.cumulativePvAtIrr, baseCurrency, selectedCurrency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {npvCheck != null ? (
            <p className="mt-2 text-xs text-slate-600">
              NPV at solved IRR (sum of PV column):{" "}
              <span className="font-medium tabular-nums text-slate-900">
                {formatDisplay(npvCheck, baseCurrency, selectedCurrency)}
              </span>
              {" "}
              — should be effectively zero.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="px-4 pb-4 text-xs text-slate-500 sm:px-6 sm:pb-5">
        Cash flows: premiums at the end of each payment period; lump sum at the end of year T (month {Math.round(receiptYears * 12)}). Amounts follow your app currency display.
      </p>
    </section>
  );
}
