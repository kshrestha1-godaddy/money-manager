"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { recordUserCheckin } from "../actions/checkins";
import { shouldWarnUserAboutInactivity } from "../actions/password-sharing";

interface InactivityWarning {
  shouldWarn: boolean;
  daysSinceLastCheckin: number;
  daysUntilPasswordShare: number;
}

export function InactivityWarning() {
  const { data: session, status } = useSession();
  const [warning, setWarning] = useState<InactivityWarning | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Only check if user should be warned about inactivity (no automatic check-in)
      checkInactivityWarning();
    }
  }, [status, session]);

  const recordCheckin = async () => {
    try {
      await recordUserCheckin();
    } catch (error) {
      console.error("Failed to record checkin:", error);
    }
  };

  const checkInactivityWarning = async () => {
    try {
      const warningData = await shouldWarnUserAboutInactivity();
      setWarning(warningData);
      setShowWarning(warningData.shouldWarn);
    } catch (error) {
      console.error("Failed to check inactivity warning:", error);
    }
  };

  if (!showWarning || !warning) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex">
        <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Inactivity Warning</h3>
          <p className="text-sm text-yellow-700 mt-1">
            {warning.daysSinceLastCheckin === 999 
              ? "You haven't checked in yet! Your passwords will be shared with emergency contacts in 15 days if you remain inactive."
              : `You've been inactive for ${warning.daysSinceLastCheckin} days. Your passwords will be shared with emergency contacts in ${warning.daysUntilPasswordShare} days if you remain inactive.`
            }
          </p>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => {
                recordCheckin();
                setShowWarning(false);
              }}
              className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-300"
            >
              Check In Now
            </button>
            <button
              onClick={() => setShowWarning(false)}
              className="text-xs text-yellow-600 hover:text-yellow-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
