"use client";

import { useState, useEffect } from "react";
import { labelClasses } from "../../utils/formUtils";

interface EnhancedLocationInputProps {
    value: string;
    onChange: (value: string) => void;
    transactionType: 'EXPENSE' | 'INCOME';
    disabled?: boolean;
}

const PREDEFINED_LOCATIONS = {
    INCOME: [
        { id: 'office', label: 'Office', value: 'office' },
        { id: 'home', label: 'Home', value: 'home' },
        { id: 'bank', label: 'Bank', value: 'bank' },
        { id: 'online', label: 'Online', value: 'online' },
    ],
    EXPENSE: [
        { id: 'home', label: 'Home', value: 'home' },
        { id: 'office', label: 'Office', value: 'office' },
        { id: 'mall', label: 'Mall', value: 'mall' },
        { id: 'restaurant', label: 'Restaurant', value: 'restaurant' },
        { id: 'supermarket', label: 'Supermarket', value: 'supermarket' },
        { id: 'pharmacy', label: 'Pharmacy', value: 'pharmacy' },
        { id: 'gas-station', label: 'Gas Station', value: 'gas station' },
        { id: 'online', label: 'Online', value: 'online' },
    ]
};

export function EnhancedLocationInput({ value, onChange, transactionType, disabled = false }: EnhancedLocationInputProps) {
    const [customLocations, setCustomLocations] = useState<string>('');
    const [selectedPredefined, setSelectedPredefined] = useState<Set<string>>(new Set());

    const predefinedLocations = PREDEFINED_LOCATIONS[transactionType] || [];

    // Parse existing locations on component mount and when value changes
    useEffect(() => {
        if (value) {
            const existingLocations = value.split(',').map(location => location.trim()).filter(Boolean);
            const predefinedValues = predefinedLocations.map(location => location.value);
            
            // Separate predefined and custom locations
            const predefinedInValue = existingLocations.filter(location => predefinedValues.includes(location));
            const customInValue = existingLocations.filter(location => !predefinedValues.includes(location));
            
            setSelectedPredefined(new Set(predefinedInValue));
            setCustomLocations(customInValue.join(', '));
        } else {
            setSelectedPredefined(new Set());
            setCustomLocations('');
        }
    }, [value, transactionType]);

    // Update parent component when locations change
    const updateLocations = (newPredefined: Set<string>, newCustom: string) => {
        const predefinedArray = Array.from(newPredefined);
        const customArray = newCustom
            .split(',')
            .map(location => location.trim())
            .filter(Boolean);
        
        const allLocations = [...predefinedArray, ...customArray];
        onChange(allLocations.join(', '));
    };

    const handleCheckboxChange = (locationValue: string, checked: boolean) => {
        const newSelected = new Set(selectedPredefined);
        
        if (checked) {
            newSelected.add(locationValue);
        } else {
            newSelected.delete(locationValue);
        }
        
        setSelectedPredefined(newSelected);
        updateLocations(newSelected, customLocations);
    };

    const handleCustomLocationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCustom = e.target.value;
        setCustomLocations(newCustom);
        updateLocations(selectedPredefined, newCustom);
    };

    return (
        <div>
            <label className={labelClasses}>Location</label>
            
            {/* Predefined Locations Checkboxes */}
            {predefinedLocations.length > 0 && (
                <div className="mb-3">
                    <div className="flex flex-wrap gap-4">
                        {predefinedLocations.map((location) => (
                            <label key={location.id} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedPredefined.has(location.value)}
                                    onChange={(e) => handleCheckboxChange(location.value, e.target.checked)}
                                    disabled={disabled}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700">{location.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Locations Input */}
            <div>
                <input
                    type="text"
                    value={customLocations}
                    onChange={handleCustomLocationsChange}
                    placeholder="Add custom locations separated by commas (optional)"
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Select common locations above or add custom ones like "Downtown, Central Park, Airport"
                </p>
            </div>
        </div>
    );
}
