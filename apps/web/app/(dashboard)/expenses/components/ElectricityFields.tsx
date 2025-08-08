"use client";

import React from "react";
import { inputClasses, labelClasses } from "../../../utils/formUtils";

export interface ElectricityData {
    previousUnits: string;
    currentUnits: string;
    ratePerUnit: string;
    connectionType: string;
    meterNumber: string;
}

interface ElectricityFieldsProps {
    data: ElectricityData;
    onChange: (data: ElectricityData) => void;
    onNotesChange: (notes: string) => void;
    disabled?: boolean;
}

export function ElectricityFields({ data, onChange, onNotesChange, disabled = false }: ElectricityFieldsProps) {
    const handleInputChange = (field: keyof ElectricityData, value: string) => {
        const updatedData = {
            ...data,
            [field]: value
        };
        onChange(updatedData);
    };

    // Generate notes function that can be called externally
    // This is kept for potential future use or if we want to add auto-generation back
    // The actual notes generation is now handled in the parent ExpenseForm component

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-blue-800 mb-3">⚡ Electricity Bill Details</h4>
            
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClasses}>Previous Units</label>
                    <input
                        type="number"
                        value={data.previousUnits}
                        onChange={(e) => handleInputChange('previousUnits', e.target.value)}
                        className={inputClasses}
                        placeholder="e.g., 1250"
                        disabled={disabled}
                        step="0.01"
                    />
                </div>
                
                <div>
                    <label className={labelClasses}>Current Units</label>
                    <input
                        type="number"
                        value={data.currentUnits}
                        onChange={(e) => handleInputChange('currentUnits', e.target.value)}
                        className={inputClasses}
                        placeholder="e.g., 1350"
                        disabled={disabled}
                        step="0.01"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClasses}>Rate per Unit (₹)</label>
                    <input
                        type="number"
                        value={data.ratePerUnit}
                        onChange={(e) => handleInputChange('ratePerUnit', e.target.value)}
                        className={inputClasses}
                        placeholder="e.g., 8.50"
                        disabled={disabled}
                        step="0.01"
                    />
                </div>
                
                <div>
                    <label className={labelClasses}>Connection Type</label>
                    <select
                        value={data.connectionType}
                        onChange={(e) => handleInputChange('connectionType', e.target.value)}
                        className={inputClasses}
                        disabled={disabled}
                    >
                        <option value="">Select type</option>
                        <option value="Domestic">Domestic</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Industrial">Industrial</option>
                    </select>
                </div>
            </div>

            <div>
                <label className={labelClasses}>Meter Number</label>
                <input
                    type="text"
                    value={data.meterNumber}
                    onChange={(e) => handleInputChange('meterNumber', e.target.value)}
                    className={inputClasses}
                    placeholder="e.g., EB12345678"
                    disabled={disabled}
                />
            </div>
            
            {data.previousUnits && data.currentUnits && (
                <div className="text-sm text-blue-700 bg-blue-100 rounded p-2">
                    <strong>Calculated Consumption:</strong> {
                        (parseFloat(data.currentUnits) - parseFloat(data.previousUnits)).toFixed(2)
                    } units
                    {data.ratePerUnit && (
                        <span className="ml-2">
                            (≈ ₹{((parseFloat(data.currentUnits) - parseFloat(data.previousUnits)) * parseFloat(data.ratePerUnit)).toFixed(2)})
                        </span>
                    )}
                </div>
            )}
        </div>
    );
} 