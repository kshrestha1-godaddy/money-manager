"use client";

import React from "react";
import { Check } from "lucide-react";

import {
    FORECAST_MODELS,
    MAX_SELECTED_MODELS,
    formatSpec,
    horizonBounds,
    orderBounds,
    specFromParams,
} from "./forecastModels";
import type { AdjustableOrder, ForecastOrderParams } from "./forecastModels";

const ORDER_LABELS: Record<AdjustableOrder, string> = {
    p: "p",
    d: "d",
    q: "q",
    P: "P",
    D: "D",
    Q: "Q",
    m: "m",
};

interface ForecastModelSelectorProps {
    selectedIds: string[];
    onSelectedIdsChange: (ids: string[]) => void;
    paramsById: Record<string, ForecastOrderParams>;
    onParamsChange: (modelId: string, params: ForecastOrderParams) => void;
    horizon: number;
    onHorizonChange: (horizon: number) => void;
}

export function ForecastModelSelector({
    selectedIds,
    onSelectedIdsChange,
    paramsById,
    onParamsChange,
    horizon,
    onHorizonChange,
}: ForecastModelSelectorProps): React.ReactElement {
    const horizonRange = horizonBounds();

    const toggle = (id: string): void => {
        if (selectedIds.includes(id)) {
            onSelectedIdsChange(selectedIds.filter((entry) => entry !== id));
            return;
        }
        if (selectedIds.length >= MAX_SELECTED_MODELS) return;
        onSelectedIdsChange([...selectedIds, id]);
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-sm text-gray-600">
                    {selectedIds.length} of {MAX_SELECTED_MODELS} models selected. Click a card to
                    include it on every forecasting chart.
                </p>
                <div className="w-full sm:max-w-sm">
                    <OrderSlider
                        label="Horizon"
                        value={horizon}
                        min={horizonRange.min}
                        max={horizonRange.max}
                        onChange={onHorizonChange}
                        suffix=" months"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {FORECAST_MODELS.map((model) => {
                    const isSelected = selectedIds.includes(model.id);
                    const isFull = !isSelected && selectedIds.length >= MAX_SELECTED_MODELS;
                    const params = paramsById[model.id] ?? model.defaultParams;
                    return (
                        <article
                            key={model.id}
                            className={`flex flex-col rounded-xl border p-4 transition ${
                                isSelected
                                    ? "border-gray-900 bg-white shadow-sm ring-2 ring-gray-900/10"
                                    : "border-gray-200 bg-white hover:border-gray-400"
                            } ${isFull ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        >
                            <button
                                type="button"
                                onClick={() => toggle(model.id)}
                                disabled={isFull}
                                aria-pressed={isSelected}
                                className="flex w-full items-start gap-3 text-left disabled:cursor-not-allowed"
                            >
                                <span
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                        isSelected
                                            ? "border-gray-900 bg-gray-900 text-white"
                                            : "border-gray-300 bg-white"
                                    }`}
                                    aria-hidden="true"
                                >
                                    {isSelected && <Check className="h-3 w-3" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span
                                            aria-hidden="true"
                                            className="inline-block h-0.5 w-5 rounded-full"
                                            style={{ backgroundColor: model.colour }}
                                        />
                                        <span className="text-sm font-semibold text-gray-900">
                                            {model.label}
                                        </span>
                                    </span>
                                    <span className="mt-1 block text-xs leading-snug text-gray-600">
                                        {model.description}
                                    </span>
                                    {!model.isAuto && (
                                        <span className="mt-1 block font-mono text-[11px] text-gray-400">
                                            {formatSpec(specFromParams(params))}
                                        </span>
                                    )}
                                    <span className="mt-3 block space-y-2 text-xs leading-relaxed text-gray-600">
                                        <span className="block">
                                            <span className="font-medium text-gray-800">Essence. </span>
                                            {model.copy.essence}
                                        </span>
                                        <span className="block">
                                            <span className="font-medium text-gray-800">How it uses the series. </span>
                                            {model.copy.uses}
                                        </span>
                                        <span className="block">
                                            <span className="font-medium text-gray-800">What it produces. </span>
                                            {model.copy.produces}
                                        </span>
                                        <span className="block">
                                            <span className="font-medium text-gray-800">Algorithm. </span>
                                            {model.copy.algorithm}
                                        </span>
                                    </span>
                                </span>
                            </button>

                            {isSelected && model.adjustable.length > 0 && (
                                <div
                                    className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
                                    onClick={(event) => event.stopPropagation()}
                                    onKeyDown={(event) => event.stopPropagation()}
                                >
                                    {model.adjustable.map((order) => {
                                        const bounds = orderBounds(order);
                                        return (
                                            <OrderSlider
                                                key={order}
                                                label={ORDER_LABELS[order]}
                                                value={params[order]}
                                                min={bounds.min}
                                                max={bounds.max}
                                                onChange={(value) =>
                                                    onParamsChange(model.id, {
                                                        ...params,
                                                        [order]: value,
                                                    })
                                                }
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </div>
    );
}

interface OrderSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    suffix?: string;
}

function OrderSlider({
    label,
    value,
    min,
    max,
    onChange,
    suffix,
}: OrderSliderProps): React.ReactElement {
    return (
        <label className="flex w-full min-w-0 flex-col gap-1">
            <span className="flex items-baseline justify-between text-xs font-medium uppercase tracking-wide text-gray-500">
                <span>{label}</span>
                <span className="tabular-nums text-gray-800">
                    {value}
                    {suffix}
                </span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={1}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full accent-blue-600"
            />
        </label>
    );
}
