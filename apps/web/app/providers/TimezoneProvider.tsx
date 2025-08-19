"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { getUserTimezone, updateUserTimezone, setTimezoneFromBrowser } from "../actions/timezone";
import { detectUserTimezone, isValidTimezone } from "../utils/timezone";

interface TimezoneContextType {
  timezone: string;
  updateTimezone: (newTimezone: string) => Promise<void>;
  isLoading: boolean;
  autoDetectAndSet: () => Promise<void>;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error("useTimezone must be used within a TimezoneProvider");
  }
  return context;
}

interface TimezoneProviderProps {
  children: ReactNode;
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  const { data: session, status } = useSession();
  const [timezone, setTimezone] = useState("UTC");
  const [isLoading, setIsLoading] = useState(true);

  // Load user's timezone preference on mount or when session changes
  useEffect(() => {
    if (status === "authenticated") {
      getUserTimezone()
        .then((userTimezone) => {
          setTimezone(userTimezone);
          
          // Auto-detect and set timezone if user has default UTC
          if (userTimezone === "UTC") {
            autoDetectTimezone();
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      // For unauthenticated users, detect browser timezone
      const detected = detectUserTimezone();
      setTimezone(detected);
      setIsLoading(false);
    }
  }, [status]);

  const autoDetectTimezone = async () => {
    try {
      const detected = detectUserTimezone();
      if (detected && detected !== "UTC" && isValidTimezone(detected)) {
        const result = await setTimezoneFromBrowser(detected);
        if (result.success && result.timezone) {
          setTimezone(result.timezone);
        }
      }
    } catch (error) {
      console.warn("Failed to auto-detect timezone:", error);
    }
  };

  const updateTimezone = async (newTimezone: string) => {
    try {
      await updateUserTimezone(newTimezone);
      setTimezone(newTimezone);
    } catch (error) {
      console.error("Error updating timezone:", error);
      throw error;
    }
  };

  const autoDetectAndSet = async () => {
    try {
      const detected = detectUserTimezone();
      if (detected && isValidTimezone(detected)) {
        await updateTimezone(detected);
      } else {
        throw new Error("Could not detect a valid timezone");
      }
    } catch (error) {
      console.error("Error auto-detecting timezone:", error);
      throw error;
    }
  };

  return (
    <TimezoneContext.Provider value={{ 
      timezone, 
      updateTimezone, 
      isLoading, 
      autoDetectAndSet 
    }}>
      {children}
    </TimezoneContext.Provider>
  );
}
