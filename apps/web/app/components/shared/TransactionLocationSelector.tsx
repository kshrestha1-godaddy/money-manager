"use client";

import { useState, useEffect } from "react";
import { labelClasses } from "../../utils/formUtils";
import { LocationMapSelector } from "./LocationMapSelector";

interface TransactionLocation {
    id: number;
    latitude: number;
    longitude: number;
    userId?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface TransactionLocationSelectorProps {
    value?: TransactionLocation | null;
    onChange: (location: TransactionLocation | null) => void;
    transactionType: 'EXPENSE' | 'INCOME';
    disabled?: boolean;
}


export function TransactionLocationSelector({ 
    value, 
    onChange, 
    transactionType, 
    disabled = false
}: TransactionLocationSelectorProps) {
    const [newLocation, setNewLocation] = useState<Partial<TransactionLocation>>({
        latitude: 27.735863,
        longitude: 85.356584
    });

    // Initialize with default location if no value is provided
    useEffect(() => {
        if (!value) {
            const defaultLocation: TransactionLocation = {
                id: -1,
                latitude: 27.735863,
                longitude: 85.356584
            };
            onChange(defaultLocation);
        }
    }, [value, onChange]);



    const handleMapLocationSelect = (lat: number, lng: number) => {
        const updatedLocation = {
            latitude: lat,
            longitude: lng
        };
        setNewLocation(updatedLocation);

        // Create a simple location object with just coordinates
        const locationData: TransactionLocation = {
            id: -1, // Temporary ID for new locations
            latitude: lat,
            longitude: lng
        };
        
        onChange(locationData);
    };



    return (
        <div>
            <label className={labelClasses}>Transaction Location</label>
            
            {/* Map Section - Only the map selector */}
            <div className="mb-4">
                <div className="h-[300px] w-full border border-gray-300 rounded-lg overflow-hidden">
                    <LocationMapSelector
                        isOpen={true}
                        latitude={newLocation.latitude ? Number(newLocation.latitude) : undefined}
                        longitude={newLocation.longitude ? Number(newLocation.longitude) : undefined}
                        onLocationSelect={handleMapLocationSelect}
                        onClose={() => {}} // Empty function since map is always visible
                        embedded={true} // New prop to indicate embedded mode
                    />
                </div>
            </div>

            {/* GPS Coordinates Display */}
            {newLocation.latitude && newLocation.longitude && (
                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-green-700">
                        📍 Location set: {Number(newLocation.latitude).toFixed(6)}, {Number(newLocation.longitude).toFixed(6)}
                    </p>
                </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
                Click anywhere on the map or drag the marker to set the transaction location.
            </p>
        </div>
    );
}