"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "../../../utils/currency";
import { convertForDisplaySync } from "../../../utils/currencyDisplay";
import { INPUT_COLORS } from "../../../config/colorConfig";
import { AnnuitySummaryCard } from "./AnnuitySummaryCard";
import {
  buildInterestBreakdownsForCorpusResult,
  computeFdIncomeCorpus,
  type FdInterestFromPrincipalBreakdown,
} from "../fd-income-corpus-math";

const standardInput = INPUT_COLORS.standard;

interface FdIncomeCorpusCalculatorProps {
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

function parsePositive(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function FdIncomeCorpusCalculator({
  baseCurrency,
  selectedCurrency,
}: FdIncomeCorpusCalculatorProps) {
  const [targetAnnualIncome, setTargetAnnualIncome] = useState(32_000);
  const [annualInterestRatePercent, setAnnualInterestRatePercent] = useState(5);
  const [taxRatePercent, setTaxRatePercent] = useState(5);
  const [bufferPercent, setBufferPercent] = useState(10);

  const result = useMemo(
    () =>
      computeFdIncomeCorpus({
        targetAnnualIncome,
        annualInterestRatePercent,
        taxRatePercent,
        bufferPercent,
      }),
    [targetAnnualIncome, annualInterestRatePercent, taxRatePercent, bufferPercent]
  );

  const effectiveRateLabel =
    result != null ? `${(result.effectiveRateAfterTax * 100).toFixed(2)}%` : "—";

  const interestBreakdowns = useMemo(() => {
    if (!result) return [];
    return buildInterestBreakdownsForCorpusResult(
      result,
      annualInterestRatePercent,
      taxRatePercent,
      bufferPercent
    );
  }, [result, annualInterestRatePercent, taxRatePercent, bufferPercent]);

  return (
    <section className="w-full rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-4 sm:px-5 sm:py-5 border-b border-slate-100 bg-slate-50/60">
        <h2 className="text-lg font-semibold text-slate-900">FD corpus for target interest</h2>
        <p className="mt-1 text-sm text-slate-600">
          How much principal to place in a fixed deposit at rate <em>r</em> so you receive a target annual
          interest income <em>I</em> after tax. Corpus after tax:{" "}
          <span className="font-mono text-slate-800">C = I ÷ (r × (1 − τ))</span>. An optional buffer adds
          margin on top of that amount.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5 sm:py-5">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="fd-target-income">
            Target annual interest (I)
          </label>
          <p className="mt-0.5 text-xs text-slate-500">Net income you want each year after tax on interest.</p>
          <input
            id="fd-target-income"
            type="number"
            min={0}
            step={1000}
            value={targetAnnualIncome || ""}
            onChange={(e) => setTargetAnnualIncome(parsePositive(e.target.value))}
            className={`mt-1 ${standardInput}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="fd-rate">
            FD interest rate (r) %
          </label>
          <p className="mt-0.5 text-xs text-slate-500">Nominal annual rate on the deposit.</p>
          <input
            id="fd-rate"
            type="number"
            min={0}
            step={0.1}
            value={annualInterestRatePercent || ""}
            onChange={(e) => setAnnualInterestRatePercent(parsePositive(e.target.value))}
            className={`mt-1 ${standardInput}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="fd-tax">
            Tax on interest (τ) %
          </label>
          <p className="mt-0.5 text-xs text-slate-500">Withheld on gross interest (e.g. TDS). Must be below 100%.</p>
          <input
            id="fd-tax"
            type="number"
            min={0}
            max={99.99}
            step={0.5}
            value={taxRatePercent || ""}
            onChange={(e) => setTaxRatePercent(parsePositive(e.target.value))}
            className={`mt-1 ${standardInput}`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="fd-buffer">
            Buffer %
          </label>
          <p className="mt-0.5 text-xs text-slate-500">Extra principal above tax-adjusted corpus (0 = none).</p>
          <input
            id="fd-buffer"
            type="number"
            min={0}
            step={1}
            value={bufferPercent || ""}
            onChange={(e) => setBufferPercent(parsePositive(e.target.value))}
            className={`mt-1 ${standardInput}`}
          />
        </div>
      </div>

      <div className="border-t border-slate-100 bg-gray-50/50 px-4 py-4 sm:px-6">
        {!result ? (
          <p className="text-sm text-slate-600">
            Enter a positive target income and interest rate. Tax must leave a positive effective rate (r × (1 − τ)
            &gt; 0).
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AnnuitySummaryCard
                title="Corpus (gross, no tax)"
                value={formatDisplay(result.corpusGrossNoTax, baseCurrency, selectedCurrency)}
                subtitle={
                  <>
                    <span className="font-mono text-slate-600">C = I ÷ r</span>
                    <br />
                    Reference only — ignores tax on interest.
                  </>
                }
              />
              <AnnuitySummaryCard
                title="Corpus (after tax)"
                value={formatDisplay(result.corpusAfterTax, baseCurrency, selectedCurrency)}
                subtitle={
                  <>
                    <span className="font-mono text-slate-600">C = I ÷ (r × (1 − τ))</span>
                    <br />
                    Effective yield {effectiveRateLabel} · net interest ≈ target I.
                  </>
                }
              />
              <AnnuitySummaryCard
                title="Corpus (after tax + buffer)"
                value={formatDisplay(result.corpusAfterTaxWithBuffer, baseCurrency, selectedCurrency)}
                subtitle={
                  bufferPercent > 0 ? (
                    <>
                      Tax-adjusted corpus × (1 + {bufferPercent}%)
                      <br />
                      Conservative planning amount.
                    </>
                  ) : (
                    "Same as after-tax corpus when buffer is 0%."
                  )
                }
              />
              <AnnuitySummaryCard
                title="Check at tax-adjusted corpus"
                value={formatDisplay(result.netInterestAtTaxAdjustedCorpus, baseCurrency, selectedCurrency)}
                subtitle={
                  <>
                    Gross interest{" "}
                    {formatDisplay(result.grossInterestAtTaxAdjustedCorpus, baseCurrency, selectedCurrency)} at{" "}
                    {(result.interestRateDecimal * 100).toFixed(2)}%, then {(result.taxRateDecimal * 100).toFixed(0)}
                    % tax.
                  </>
                }
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Scenario
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Corpus needed (C)
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Gross {annualInterestRatePercent}% (no tax)</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {formatDisplay(result.corpusGrossNoTax, baseCurrency, selectedCurrency)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">I ÷ r</td>
                  </tr>
                  <tr className="bg-indigo-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      After {taxRatePercent}% tax on interest
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {formatDisplay(result.corpusAfterTax, baseCurrency, selectedCurrency)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      Effective rate {effectiveRateLabel}
                    </td>
                  </tr>
                  {bufferPercent > 0 ? (
                    <tr>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        After tax + {bufferPercent}% buffer
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                        {formatDisplay(result.corpusAfterTaxWithBuffer, baseCurrency, selectedCurrency)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        Tax-adjusted corpus × {(1 + result.bufferRateDecimal).toFixed(2)}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <FdInterestFromPrincipalSection
              breakdowns={interestBreakdowns}
              targetAnnualIncome={targetAnnualIncome}
              baseCurrency={baseCurrency}
              selectedCurrency={selectedCurrency}
              formatDisplay={formatDisplay}
            />
          </>
        )}
      </div>

      <p className="px-4 pb-4 text-xs text-slate-500 sm:px-6 sm:pb-5">
        Assumes interest is paid annually and tax applies to gross interest at rate τ. Amounts use your app currency
        ({baseCurrency} base, displayed in {selectedCurrency} where conversion applies).
      </p>
    </section>
  );
}

interface FdInterestFromPrincipalSectionProps {
  breakdowns: FdInterestFromPrincipalBreakdown[];
  targetAnnualIncome: number;
  baseCurrency: string;
  selectedCurrency: string;
  formatDisplay: (amount: number, base: string, display: string) => string;
}

function FdInterestFromPrincipalSection({
  breakdowns,
  targetAnnualIncome,
  baseCurrency,
  selectedCurrency,
  formatDisplay,
}: FdInterestFromPrincipalSectionProps) {
  if (breakdowns.length === 0) return null;

  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold text-slate-900">Interest from principal (worked calculation)</h3>
      <p className="mt-1 text-sm text-slate-600">
        Using each corpus above with your rate and tax: gross interest = principal × <em>r</em>, then tax on that
        interest, then net you keep. This is the forward check on the corpus formulas.
      </p>

      <div className="mt-4 flex flex-col gap-6">
        {breakdowns.map((breakdown) => {
          const meetsTarget = breakdown.netInterestAfterTax >= targetAnnualIncome - 0.01;
          const surplus = breakdown.netInterestAfterTax - targetAnnualIncome;

          return (
            <div
              key={breakdown.scenarioLabel}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <div className="border-b border-gray-100 bg-slate-50/80 px-4 py-3 sm:px-5">
                <h4 className="text-sm font-semibold text-slate-900">{breakdown.scenarioLabel}</h4>
                <p className="mt-0.5 text-xs text-slate-600">
                  {breakdown.annualInterestRatePercent}% on{" "}
                  {formatDisplay(breakdown.principal, baseCurrency, selectedCurrency)}
                  {breakdown.taxRatePercent > 0
                    ? ` · ${breakdown.taxRatePercent}% tax on gross interest`
                    : " · no tax"}
                </p>
              </div>

              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Step
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Calculation
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {breakdown.steps.map((step) => (
                    <tr
                      key={`${breakdown.scenarioLabel}-${step.label}`}
                      className={
                        step.label.startsWith("Net interest")
                          ? "bg-emerald-50/60"
                          : step.label.startsWith("Gross")
                            ? "bg-indigo-50/40"
                            : undefined
                      }
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-900">{step.label}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{step.expression}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-900">
                        {formatDisplay(step.amount, baseCurrency, selectedCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50/80">
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-xs text-gray-600">
                      Target annual interest (I)
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-xs font-medium text-gray-800">
                      {formatDisplay(targetAnnualIncome, baseCurrency, selectedCurrency)}
                    </td>
                  </tr>
                  {breakdown.scenarioLabel.includes("buffer") && surplus > 0.01 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-2.5 text-xs text-emerald-800">
                        Surplus above target (buffer provides headroom)
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs font-medium text-emerald-800">
                        +{formatDisplay(surplus, baseCurrency, selectedCurrency)}
                      </td>
                    </tr>
                  ) : null}
                  {breakdown.scenarioLabel.includes("tax-adjusted") ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-xs text-slate-600">
                        {meetsTarget
                          ? "Net interest matches your target I (within rounding)."
                          : "Net interest is below target — check inputs."}
                      </td>
                    </tr>
                  ) : null}
                </tfoot>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
