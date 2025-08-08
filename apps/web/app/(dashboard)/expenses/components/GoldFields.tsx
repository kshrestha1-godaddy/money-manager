"use client";

import React from "react";
import { inputClasses, labelClasses } from "../../../utils/formUtils";

export interface GoldData {
    weight: string;
    purity: string;
    ratePerGram: string;
    makingCharges: string;
    jewelerName: string;
    itemType: string;
    hallmarkNumber: string;
}

interface GoldFieldsProps {
    data: GoldData;
    onChange: (data: GoldData) => void;
    onNotesChange: (notes: string) => void;
    disabled?: boolean;
}

export function GoldFields({ data, onChange, onNotesChange, disabled = false }: GoldFieldsProps) {
    const handleInputChange = (field: keyof GoldData, value: string) => {
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-yellow-800 mb-3">🏅 Gold Purchase Details</h4>
            
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClasses}>Weight (grams)</label>
                    <input
                        type="number"
                        value={data.weight}
                        onChange={(e) => handleInputChange('weight', e.target.value)}
                        className={inputClasses}
                        placeholder="e.g., 10.50"
                        disabled={disabled}
                        step="0.001"
                    />
                </div>
                
                <div>
                    <label className={labelClasses}>Purity</label>
                    <select
                        value={data.purity}
                        onChange={(e) => handleInputChange('purity', e.target.value)}
                        className={inputClasses}
                        disabled={disabled}
                    >
                        <option value="">Select purity</option>
                        <option value="24K (99.9%)">24K (99.9%)</option>
                        <option value="22K (91.6%)">22K (91.6%)</option>
                        <option value="21K (87.5%)">21K (87.5%)</option>
                        <option value="18K (75%)">18K (75%)</option>
                        <option value="14K (58.5%)">14K (58.5%)</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClasses}>Rate per Gram (₹)</label>
                    <input
                        type="number"
                        value={data.ratePerGram}
                        onChange={(e) => handleInputChange('ratePerGram', e.target.value)}
                        className={inputClasses}
                        placeholder="e.g., 6250"
                        disabled={disabled}
                        step="0.01"
                    />
                </div>
                
                <div>
                    <label className={labelClasses}>Making Charges (₹)</label>
                    <input
                        type="number"
                        value={data.makingCharges}
                        onChange={(e) => handleInputChange('makingCharges', e.target.value)}
                        className={inputClasses}
                        placeholder="e.g., 5000"
                        disabled={disabled}
                        step="0.01"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClasses}>Item Type</label>
                    <select
                        value={data.itemType}
                        onChange={(e) => handleInputChange('itemType', e.target.value)}
                        className={inputClasses}
                        disabled={disabled}
                    >
                        <option value="">Select item type</option>
                        <option value="Ring">Ring</option>
                        <option value="Necklace">Necklace</option>
                        <option value="Earrings">Earrings</option>
                        <option value="Bracelet">Bracelet</option>
                        <option value="Chain">Chain</option>
                        <option value="Bangle">Bangle</option>
                        <option value="Coin">Coin</option>
                        <option value="Bar">Bar</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                
                <div>
                    <label className={labelClasses}>Jeweler Name</label>
                    <input
                        type="text"
                        value={data.jewelerName}
                        onChange={(e) => handleInputChange('jewelerName', e.target.value)}
                        className={inputClasses}
                        placeholder="e.g., Tanishq"
                        disabled={disabled}
                    />
                </div>
            </div>

            <div>
                <label className={labelClasses}>Hallmark Number</label>
                <input
                    type="text"
                    value={data.hallmarkNumber}
                    onChange={(e) => handleInputChange('hallmarkNumber', e.target.value)}
                    className={inputClasses}
                    placeholder="e.g., BIS123456"
                    disabled={disabled}
                />
            </div>
            
            {data.weight && data.ratePerGram && (
                <div className="text-sm text-yellow-700 bg-yellow-100 rounded p-2">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <strong>Gold Value:</strong> ₹{(parseFloat(data.weight) * parseFloat(data.ratePerGram)).toFixed(2)}
                        </div>
                        {data.makingCharges && (
                            <div>
                                <strong>Total Cost:</strong> ₹{(
                                    parseFloat(data.weight) * parseFloat(data.ratePerGram) + parseFloat(data.makingCharges)
                                ).toFixed(2)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 