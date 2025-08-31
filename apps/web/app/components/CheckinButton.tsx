"use client";

import { useState } from "react";
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
      <button
        onClick={handleCheckin}
        disabled={isLoading}
        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md text-xs font-medium border border-blue-100 shadow-sm flex items-center gap-1.5 transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
        title="Record your activity to prevent automatic password sharing"
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
      
      {/* Success Notification */}
      <DisappearingNotification 
        notification={notification} 
        onHide={() => setNotification(null)} 
      />
    </>
  );
}
