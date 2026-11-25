"use client";

import type { ReactElement } from "react";
import { Lightbulb } from "lucide-react";

interface ForecastToggleButtonProps {
    isOn: boolean;
    onToggle: () => void;
}

export function ForecastToggleButton({
    isOn,
    onToggle,
}: ForecastToggleButtonProps): ReactElement {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-pressed={isOn}
            title={isOn ? "Hide forecast" : "Show forecast"}
            aria-label={isOn ? "Hide forecast" : "Show forecast"}
            className={`rounded-md p-1.5 transition-colors sm:p-2 ${
                isOn
                    ? "bg-amber-50 text-amber-500 hover:bg-amber-100"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            }`}
        >
            <Lightbulb
                className={`h-4 w-4 sm:h-5 sm:w-5 ${isOn ? "fill-amber-400" : ""}`}
            />
        </button>
    );
}
