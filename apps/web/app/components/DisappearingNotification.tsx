"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface NotificationData {
  title: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  icon?: React.ReactNode;
  duration?: number; // in milliseconds, default 3000
}

interface DisappearingNotificationProps {
  notification: NotificationData | null;
  onHide: () => void;
}

interface NotificationTheme {
  iconBg: string;
  iconColor: string;
  progressBar: string;
}

type NotificationKind = NonNullable<NotificationData["type"]>;

const ENTRANCE_DELAY_MS = 50;
const EXIT_ANIMATION_MS = 300;
const DEFAULT_DURATION_MS = 3000;

const NOTIFICATION_THEMES: Record<NotificationKind, NotificationTheme> = {
  success: {
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    progressBar: "bg-green-600",
  },
  error: {
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    progressBar: "bg-red-600",
  },
  warning: {
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    progressBar: "bg-yellow-600",
  },
  info: {
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    progressBar: "bg-blue-600",
  },
};

function getThemeColors(type: NotificationKind = "success"): NotificationTheme {
  return NOTIFICATION_THEMES[type] ?? NOTIFICATION_THEMES.success;
}

function getDefaultIcon(type: string = "success") {
  switch (type) {
    case "success":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case "error":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case "warning":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 14c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      );
    case "info":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
  }
}

export function DisappearingNotification({ notification, onHide }: DisappearingNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const onHideRef = useRef(onHide);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const duration = notification?.duration ?? DEFAULT_DURATION_MS;
  const theme = useMemo(() => getThemeColors(notification?.type ?? "success"), [notification?.type]);

  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  const clearTimers = useCallback(() => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    enterTimerRef.current = null;
    dismissTimerRef.current = null;
    hideTimerRef.current = null;
  }, []);

  const startDismissFlow = useCallback(() => {
    clearTimers();
    setIsAnimating(false);
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      onHideRef.current();
    }, EXIT_ANIMATION_MS);
  }, [clearTimers]);

  useEffect(() => {
    if (notification) {
      clearTimers();
      setIsVisible(true);

      // Wait one tick so CSS transitions can animate from initial state.
      enterTimerRef.current = setTimeout(() => {
        setIsAnimating(true);
      }, ENTRANCE_DELAY_MS);

      dismissTimerRef.current = setTimeout(() => {
        startDismissFlow();
      }, duration);

      return clearTimers;
    } else {
      clearTimers();
      setIsAnimating(false);
      setIsVisible(false);
    }
  }, [notification, duration, startDismissFlow, clearTimers]);

  if (!isVisible || !notification) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`transform transition-all duration-300 ease-in-out ${
          isAnimating 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-full opacity-0'
        }`}
      >
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[300px] max-w-sm">
          <div className="flex items-center">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 ${theme.iconBg} rounded-full flex items-center justify-center`}>
                <div className={theme.iconColor}>
                  {notification.icon || getDefaultIcon(notification.type)}
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {notification.title}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {notification.message}
              </p>
            </div>
            
            {/* Close Button */}
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={startDismissFlow}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`${theme.progressBar} h-1 rounded-full transition-all ease-linear`}
                style={{
                  width: isAnimating ? "100%" : "0%",
                  transitionDuration: `${duration}ms`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
