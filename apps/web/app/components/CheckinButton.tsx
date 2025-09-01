"use client";

import { useState, useEffect } from "react";
import { recordUserCheckin, getLastCheckinDate } from "../actions/checkins";
import { DisappearingNotification, NotificationData } from "./DisappearingNotification";

/**
 * Manual check-in button - this is the ONLY way users can record check-ins.
 * No automatic check-ins occur anywhere else in the application.
 */

export function CheckinButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<Date | null>(null);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Load last check-in date when component mounts
  useEffect(() => {
    const loadLastCheckin = async () => {
      try {
        const lastCheckinDate = await getLastCheckinDate();
        setLastCheckin(lastCheckinDate);
      } catch (error) {
        console.error("Failed to load last checkin date:", error);
      }
    };

    loadLastCheckin();
  }, []);

  // Helper function to format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate next check-in date (15 days from last check-in to avoid password sharing)
  const getNextCheckinDate = (lastCheckinDate: Date) => {
    const nextDate = new Date(lastCheckinDate);
    nextDate.setDate(nextDate.getDate() + 15);
    return nextDate;
  };

  // Calculate days since last check-in
  const getDaysSinceLastCheckin = (lastCheckinDate: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - lastCheckinDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCheckin = async () => {
    try {
      setIsLoading(true);
      await recordUserCheckin();
      const newLastCheckin = await getLastCheckinDate();
      setLastCheckin(newLastCheckin);
      
      // Show success notification
      setNotification({
        title: "Check-in Successful!",
        message: "Your activity has been recorded",
        type: "info",
        duration: 3000
      });
    } catch (error) {
      console.error("Failed to record checkin:", error);
      alert("Failed to record check-in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleCheckin}
          disabled={isLoading}
          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md text-xs font-medium border border-blue-100 shadow-sm flex items-center gap-1.5 transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {isLoading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Checking In...</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Check In</span>
            </>
          )}
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50">
            <div className="space-y-1">
              {lastCheckin ? (
                <>
                  <div className="font-medium">Last Check-in:</div>
                  <div className="text-gray-300">{formatDate(lastCheckin)}</div>
                  <div className="text-gray-400">({getDaysSinceLastCheckin(lastCheckin)} days ago)</div>
                  
                  <div className="border-t border-gray-700 pt-1 mt-2">
                    <div className="font-medium">Next Check-in by:</div>
                    <div className="text-gray-300">{formatDate(getNextCheckinDate(lastCheckin))}</div>
                    <div className={`${15 - getDaysSinceLastCheckin(lastCheckin) <= 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {15 - getDaysSinceLastCheckin(lastCheckin) <= 0 
                        ? `⚠️ Overdue by ${getDaysSinceLastCheckin(lastCheckin) - 15} days!`
                        : `(${15 - getDaysSinceLastCheckin(lastCheckin)} days remaining)`
                      }
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium text-yellow-300">⚠️ Never checked in!</div>
                  <div className="text-gray-300">Check in now to prevent</div>
                  <div className="text-gray-300">password sharing</div>
                </>
              )}
            </div>
            
            {/* Tooltip arrow pointing up */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
          </div>
        )}
      </div>
      
      {/* Success Notification */}
      <DisappearingNotification 
        notification={notification} 
        onHide={() => setNotification(null)} 
      />
    </>
  );
}
