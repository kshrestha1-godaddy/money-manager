"use client";

import React, { useState } from "react";
import { useTimezone } from "../../providers/TimezoneProvider";
import { COMMON_TIMEZONES, getTimezoneInfo, detectUserTimezone } from "../../utils/timezone";

interface TimezoneSelectorProps {
  className?: string;
  showAutoDetect?: boolean;
  compact?: boolean;
}

export function TimezoneSelector({ 
  className = "", 
  showAutoDetect = true,
  compact = false 
}: TimezoneSelectorProps) {
  const { timezone, updateTimezone, autoDetectAndSet, isLoading } = useTimezone();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAutoDetectPrompt, setShowAutoDetectPrompt] = useState(false);

  const handleTimezoneChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimezone = e.target.value;
    if (newTimezone === timezone) return;

    try {
      setIsUpdating(true);
      await updateTimezone(newTimezone);
    } catch (error) {
      console.error("Failed to update timezone:", error);
      // Reset select to current timezone on error
      e.target.value = timezone;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAutoDetect = async () => {
    try {
      setIsUpdating(true);
      await autoDetectAndSet();
      setShowAutoDetectPrompt(false);
    } catch (error) {
      console.error("Failed to auto-detect timezone:", error);
      alert("Could not detect your timezone automatically. Please select manually.");
    } finally {
      setIsUpdating(false);
    }
  };

  const currentTimezoneInfo = getTimezoneInfo(timezone);
  const detectedTimezone = detectUserTimezone();
  const shouldShowAutoDetect = showAutoDetect && detectedTimezone !== timezone && detectedTimezone !== "UTC";

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <select
          value={timezone}
          onChange={handleTimezoneChange}
          disabled={isLoading || isUpdating}
          className="px-2 py-1 border rounded-md bg-white text-sm min-w-[120px] disabled:opacity-50"
          title={`Current timezone: ${currentTimezoneInfo.label} (${currentTimezoneInfo.offset})`}
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label.split('(')[0].trim()} {tz.offset}
            </option>
          ))}
        </select>
        {(isLoading || isUpdating) && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor="timezone-select" className="text-sm font-medium text-gray-700">
          Timezone
        </label>
        {shouldShowAutoDetect && (
          <button
            onClick={() => setShowAutoDetectPrompt(true)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Auto-detect
          </button>
        )}
      </div>
      
      <div className="relative">
        <select
          id="timezone-select"
          value={timezone}
          onChange={handleTimezoneChange}
          disabled={isLoading || isUpdating}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label} ({tz.offset})
            </option>
          ))}
        </select>
        {(isLoading || isUpdating) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500">
        Current: {currentTimezoneInfo.label} ({currentTimezoneInfo.offset})
      </div>

      {/* Auto-detect confirmation modal */}
      {showAutoDetectPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Auto-detect Timezone
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              We detected your timezone as <strong>{getTimezoneInfo(detectedTimezone).label}</strong>. 
              Would you like to switch to this timezone?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleAutoDetect}
                disabled={isUpdating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isUpdating ? "Setting..." : "Yes, Switch"}
              </button>
              <button
                onClick={() => setShowAutoDetectPrompt(false)}
                disabled={isUpdating}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
