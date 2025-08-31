"use client";

import React, { useEffect, useState } from 'react';

export interface NotificationData {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  icon?: React.ReactNode;
  duration?: number; // in milliseconds, default 3000
}

interface DisappearingNotificationProps {
  notification: NotificationData | null;
  onHide: () => void;
}

export function DisappearingNotification({ notification, onHide }: DisappearingNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const duration = notification?.duration || 3000;

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      // Small delay to ensure the element is rendered before animating in
      setTimeout(() => {
        setIsAnimating(true);
      }, 50);
      
      // Auto-hide after specified duration
      const timer = setTimeout(() => {
        setIsAnimating(false);
        // Wait for exit animation to complete before hiding
        setTimeout(() => {
          setIsVisible(false);
          onHide();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Reset states when notification becomes null
      setIsAnimating(false);
      setIsVisible(false);
    }
  }, [notification, onHide, duration]);

  if (!isVisible || !notification) return null;

  // Get theme colors based on notification type
  const getThemeColors = (type: string = 'success') => {
    switch (type) {
      case 'success':
        return {
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          progressBar: 'bg-green-600'
        };
      case 'error':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          progressBar: 'bg-red-600'
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          progressBar: 'bg-yellow-600'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          progressBar: 'bg-blue-600'
        };
      default:
        return {
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          progressBar: 'bg-green-600'
        };
    }
  };

  const theme = getThemeColors(notification.type);

  // Default icons for each type
  const getDefaultIcon = (type: string = 'success') => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 14c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
    }
  };

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
                onClick={() => {
                  setIsAnimating(false);
                  setTimeout(() => {
                    setIsVisible(false);
                    onHide();
                  }, 300);
                }}
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
                  width: isAnimating ? '100%' : '0%',
                  transitionDuration: `${duration}ms`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
