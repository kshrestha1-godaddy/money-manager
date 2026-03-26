"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  CalculationType,
  CalculatorInputs,
  CompoundingFrequency,
  FixedDepositInterestMode,
} from "../types";
import { clampYears, parseSafeNumber } from "../calculator-input-utils";

export interface CalculatorInputsFieldsProps {
  inputs: CalculatorInputs;
  onInputsChange: Dispatch<SetStateAction<CalculatorInputs>>;
  inputClassName: string;
  /** Single column — use in narrow panels so fields stay readable. */
  layout?: "responsive-two-column" | "stacked";
}

export function CalculatorInputsFields({
  inputs,
  onInputsChange,
  inputClassName,
  layout = "responsive-two-column",
}: CalculatorInputsFieldsProps) {
  const effectiveCompoundingFrequency = inputs.compoundingFrequency;
  const gridClassName =
    layout === "stacked"
      ? "grid grid-cols-1 gap-4"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2";

  return (
    <div className={gridClassName}>
      <div>
        <InfoLabel
          label="Calculation Type"
          description="Choose the calculator mode: standard annuity, target annuity (find required monthly contribution), or fixed deposit."
        />
        <select
          value={inputs.calculationType}
          onChange={(event) =>
            onInputsChange((previous) => ({
              ...previous,
              calculationType: event.target.value as CalculationType,
            }))
          }
          className={inputClassName}
        >
          <option value="annuity">Annuity (Monthly Investment)</option>
          <option value="annuity-target-future-value">
            Annuity Target (Find Monthly Investment)
          </option>
          <option value="fixed-deposit">Fixed Deposit</option>
        </select>
      </div>
      <NumericInput
        label={
          inputs.calculationType === "annuity-target-future-value"
            ? "Current Balance (Optional)"
            : "Initial Balance"
        }
        description={
          inputs.calculationType === "annuity-target-future-value"
            ? "Money you already have invested now. This amount also grows with compounding and reduces required monthly contribution."
            : "Starting amount at month 0 before new deposits and future interest are applied."
        }
        value={inputs.initialBalance}
        onChange={(value) => onInputsChange((previous) => ({ ...previous, initialBalance: value }))}
        min={0}
        step={100}
        className={inputClassName}
      />
      {inputs.calculationType === "annuity" ? (
        <NumericInput
          label="Monthly Investment"
          description="Amount invested at the beginning of each month."
          value={inputs.monthlyInvestment}
          onChange={(value) => onInputsChange((previous) => ({ ...previous, monthlyInvestment: value }))}
          min={0}
          step={100}
          className={inputClassName}
        />
      ) : inputs.calculationType === "annuity-target-future-value" ? (
        <NumericInput
          label="Target Future Value"
          description="Goal amount you want to reach at the end of the selected time period."
          value={inputs.targetFutureValue}
          onChange={(value) => onInputsChange((previous) => ({ ...previous, targetFutureValue: value }))}
          min={0}
          step={1000}
          className={inputClassName}
        />
      ) : (
        <div>
          <InfoLabel
            label="Fixed Deposit Interest Handling"
            description="Choose whether each compounding period's interest is added back into principal (compounding) or kept separate (simple-style accrual)."
          />
          <select
            value={inputs.fixedDepositInterestMode}
            onChange={(event) =>
              onInputsChange((previous) => ({
                ...previous,
                fixedDepositInterestMode: event.target.value as FixedDepositInterestMode,
              }))
            }
            className={inputClassName}
          >
            <option value="add-to-principal">Interest Added to Principal</option>
            <option value="not-added-to-principal">Interest Not Added to Principal</option>
          </select>
        </div>
      )}
      <NumericInput
        label="Annual Interest Rate (%)"
        description="Nominal yearly interest rate used to derive the per-compounding-period rate."
        value={inputs.annualInterestRatePercent}
        onChange={(value) =>
          onInputsChange((previous) => ({ ...previous, annualInterestRatePercent: value }))
        }
        min={0}
        step={0.1}
        className={inputClassName}
      />
      <NumericInput
        label="Years"
        description="Total investment duration in years. The table shows all months in this period."
        value={inputs.years}
        onChange={(value) => onInputsChange((previous) => ({ ...previous, years: clampYears(value) }))}
        min={1}
        max={100}
        step={1}
        className={inputClassName}
      />
      <div>
        <InfoLabel
          label="Compounding Frequency"
          description="How often interest is applied to the balance: annually (every 12 months) or quarterly (every 3 months)."
        />
        <select
          value={effectiveCompoundingFrequency}
          onChange={(event) =>
            onInputsChange((previous) => ({
              ...previous,
              compoundingFrequency: event.target.value as CompoundingFrequency,
            }))
          }
          className={inputClassName}
        >
          <option value="annual">Annually</option>
          <option value="quarterly">Quarterly</option>
        </select>
        {inputs.calculationType === "annuity-target-future-value" ? (
          <p className="mt-1 text-xs text-gray-500">
            Target mode calculates required monthly investment for the selected compounding frequency.
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface NumericInputProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className: string;
}

function NumericInput({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  className,
}: NumericInputProps) {
  return (
    <div>
      <InfoLabel label={label} description={description} />
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(parseSafeNumber(event.target.value))}
        className={className}
      />
    </div>
  );
}

interface InfoLabelProps {
  label: string;
  description: string;
}

function InfoLabel({ label, description }: InfoLabelProps) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="group relative inline-flex">
        <button
          type="button"
          tabIndex={0}
          aria-label={`${label} information`}
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-[10px] font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          i
        </button>
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          {description}
        </div>
      </div>
    </div>
  );
}
