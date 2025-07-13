"use client";

import React, { useState, useEffect } from "react";
import { TransactionType, labelClasses, inputClasses } from "../../utils/formUtils";

interface EnhancedTagsInputProps {
    value: string;
    onChange: (value: string) => void;
    transactionType: TransactionType;
    disabled?: boolean;
}

const PREDEFINED_TAGS = {
    INCOME: [
        { id: 'salary', label: 'Salary', value: 'salary' },
        { id: 'friends', label: 'Friends', value: 'friends' },
    ],
    EXPENSE: [
        { id: 'need', label: 'Need', value: 'need' },
        { id: 'wants', label: 'Wants', value: 'wants' },
        { id: 'grocery', label: 'Grocery', value: 'grocery' },
        { id: 'remittance', label: 'Remittance', value: 'remittance' },
    ]
};

export function EnhancedTagsInput({ value, onChange, transactionType, disabled = false }: EnhancedTagsInputProps) {
    const [customTags, setCustomTags] = useState<string>('');
    const [selectedPredefined, setSelectedPredefined] = useState<Set<string>>(new Set());

    const predefinedTags = PREDEFINED_TAGS[transactionType] || [];

    // Parse existing tags on component mount and when value changes
    useEffect(() => {
        if (value) {
            const existingTags = value.split(',').map(tag => tag.trim()).filter(Boolean);
            const predefinedValues = predefinedTags.map(tag => tag.value);
            
            // Separate predefined and custom tags
            const predefinedInValue = existingTags.filter(tag => predefinedValues.includes(tag));
            const customInValue = existingTags.filter(tag => !predefinedValues.includes(tag));
            
            setSelectedPredefined(new Set(predefinedInValue));
            setCustomTags(customInValue.join(', '));
        } else {
            setSelectedPredefined(new Set());
            setCustomTags('');
        }
    }, [value, transactionType]);

    // Update parent component when tags change
    const updateTags = (newPredefined: Set<string>, newCustom: string) => {
        const predefinedArray = Array.from(newPredefined);
        const customArray = newCustom
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean);
        
        const allTags = [...predefinedArray, ...customArray];
        onChange(allTags.join(', '));
    };

    const handleCheckboxChange = (tagValue: string, checked: boolean) => {
        const newSelected = new Set(selectedPredefined);
        
        if (checked) {
            newSelected.add(tagValue);
        } else {
            newSelected.delete(tagValue);
        }
        
        setSelectedPredefined(newSelected);
        updateTags(newSelected, customTags);
    };

    const handleCustomTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCustom = e.target.value;
        setCustomTags(newCustom);
        updateTags(selectedPredefined, newCustom);
    };

    return (
        <div>
            <label className={labelClasses}>Tags</label>
            
            {/* Predefined Tags Checkboxes */}
            {predefinedTags.length > 0 && (
                <div className="mb-3">
                    <div className="flex flex-wrap gap-4">
                        {predefinedTags.map((tag) => (
                            <label key={tag.id} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedPredefined.has(tag.value)}
                                    onChange={(e) => handleCheckboxChange(tag.value, e.target.checked)}
                                    disabled={disabled}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700">{tag.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Tags Input */}
            <div>
                <input
                    type="text"
                    value={customTags}
                    onChange={handleCustomTagsChange}
                    className={inputClasses}
                    placeholder={`Add custom tags (comma separated)`}
                    disabled={disabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                    You can select predefined tags above or add custom tags here
                </p>
            </div>
        </div>
    );
} 