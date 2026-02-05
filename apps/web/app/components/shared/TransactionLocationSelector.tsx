"use client";

import { useEffect, useMemo, useState } from "react";
import { labelClasses } from "../../utils/formUtils";
import { LocationMapSelector } from "./LocationMapSelector";
import { DEFAULT_LOCATION } from "../../utils/locationDefaults";
import { getSavedLocations, SavedLocationData } from "../../actions/saved-locations";

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
    disabled?: boolean;
}


export function TransactionLocationSelector({ 
    value, 
    onChange, 
    disabled = false
}: TransactionLocationSelectorProps) {
    const defaultLocation = useMemo<TransactionLocation>(() => ({
        id: -1,
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude
    }), []);

    const currentLocation = value ?? defaultLocation;
    const [savedLocations, setSavedLocations] = useState<SavedLocationData[]>([]);
    const [selectedSavedLocationId, setSelectedSavedLocationId] = useState<string>("");

    // Initialize with default location if no value is provided
    useEffect(() => {
        if (!value) onChange(defaultLocation);
    }, [value, onChange, defaultLocation]);

    useEffect(() => {
        const loadSavedLocations = async () => {
            try {
                const locations = await getSavedLocations();
                setSavedLocations(locations);
            } catch (error) {
                console.error("Failed to load saved locations:", error);
                setSavedLocations([]);
            }
        };

        loadSavedLocations();
    }, []);

    useEffect(() => {
        if (!value) {
            setSelectedSavedLocationId("");
            return;
        }

        // Only match if the location was explicitly set from a saved location
        // Don't auto-select saved locations when coordinates happen to match
        const matchedLocation = savedLocations.find(location =>
            Number(location.latitude).toFixed(6) === Number(value.latitude).toFixed(6)
            && Number(location.longitude).toFixed(6) === Number(value.longitude).toFixed(6)
        );

        // Only set if we have a match and the current selection is empty
        // This prevents auto-selection when just dragging on the map
        if (matchedLocation && !selectedSavedLocationId) {
            setSelectedSavedLocationId(String(matchedLocation.id));
        } else if (!matchedLocation) {
            setSelectedSavedLocationId("");
        }
    }, [value, savedLocations]);


    const handleMapLocationSelect = (lat: number, lng: number) => {
        // Create a simple location object with just coordinates
        const locationData: TransactionLocation = {
            id: -1, // Temporary ID for new locations
            latitude: lat,
            longitude: lng
        };

        setSelectedSavedLocationId("");
        onChange(locationData);
    };

    const handleSavedLocationChange = (locationId: string) => {
        if (selectedSavedLocationId === locationId) {
            // If clicking the same location, deselect it
            setSelectedSavedLocationId("");
            return;
        }

        setSelectedSavedLocationId(locationId);

        if (!locationId) return;

        const savedLocation = savedLocations.find(location => String(location.id) === locationId);
        if (!savedLocation) return;

        onChange({
            id: -1,
            latitude: savedLocation.latitude,
            longitude: savedLocation.longitude
        });
    };



    return (
        <div>
            <label className={labelClasses}> Saved Locations</label>

            <div className="mb-4">
                {savedLocations.length === 0 ? (
                    <p className="text-xs text-gray-500 mb-2">
                        Add saved locations in Notification Settings.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                        {savedLocations.map(location => (
                            <button
                                key={location.id}
                                type="button"
                                onClick={() => handleSavedLocationChange(String(location.id))}
                                disabled={disabled}
                                className={`px-3 py-2 text-xs font-medium rounded-md border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    selectedSavedLocationId === String(location.id)
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {location.name}
                            </button>
                        ))}
                    </div>
                )}
                {selectedSavedLocationId && (
                    <button
                        type="button"
                        onClick={() => handleSavedLocationChange("")}
                        disabled={disabled}
                        className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                    >
                        Clear selection
                    </button>
                )}
            </div>

            {/* Map Section - Only the map selector */}
            <div className="mb-4">
                <div className="h-[300px] w-full border border-gray-300 rounded-lg overflow-hidden">
                    <LocationMapSelector
                        isOpen={true}
                        latitude={currentLocation.latitude}
                        longitude={currentLocation.longitude}
                        onLocationSelect={handleMapLocationSelect}
                        onClose={() => {}} // Empty function since map is always visible
                        embedded={true} // New prop to indicate embedded mode
                    />
                </div>
            </div>

            {/* GPS Coordinates Display */}
            {currentLocation.latitude && currentLocation.longitude && (
                <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-green-700">
                        📍 Location set: {Number(currentLocation.latitude).toFixed(6)}, {Number(currentLocation.longitude).toFixed(6)}
                    </p>
                </div>
            )}
        </div>
    );
}