"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/localStorage';

export interface WelcomeBackData {
  userName?: string;
  lastLoginTime?: string;
  daysSinceLastLogin?: number;
}

interface WelcomeBackNotificationProps {
  onHide: () => void;
}

export function WelcomeBackNotification({ onHide }: WelcomeBackNotificationProps) {
  const { data: session, status } = useSession();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [welcomeData, setWelcomeData] = useState<WelcomeBackData | null>(null);

  const duration = 5000; // 5 seconds for welcome message

  // console.log('WelcomeBack: Component rendered', { status, isVisible, welcomeData });



  const shouldShowWelcomeMessage = (): boolean => {
    const lastWelcomeShown = getLocalStorageItem('lastWelcomeShown');
    console.log('WelcomeBack: lastWelcomeShown from localStorage =', lastWelcomeShown);
    
    if (!lastWelcomeShown) {
      // First time user or no previous welcome message
      console.log('WelcomeBack: No previous welcome shown, returning true');
      return true;
    }

    try {
      const lastWelcomeTime = new Date(lastWelcomeShown);
      const now = new Date();
      const timeDifference = now.getTime() - lastWelcomeTime.getTime();
      const hoursDifference = timeDifference / (1000 * 60 * 60);
      
      console.log('WelcomeBack: Hours since last welcome =', hoursDifference);
      
      // Show welcome message if more than 24 hours have passed since last welcome
      const shouldShow = hoursDifference >= 24;
      console.log('WelcomeBack: Should show based on time =', shouldShow);
      return shouldShow;
    } catch (error) {
      // Invalid date in localStorage, show welcome message
      console.log('WelcomeBack: Error parsing date, returning true', error);
      return true;
    }
  };

  const formatLastLoginTime = (lastLoginTime: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - lastLoginTime.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays === 0) {
      return 'earlier today';
    } else if (diffInDays === 1) {
      return 'yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else {
      const months = Math.floor(diffInDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
  };

  useEffect(() => {
    console.log('WelcomeBack: useEffect triggered', { status, user: session?.user?.name });
    
    if (status === 'authenticated' && session?.user) {
      const shouldShow = shouldShowWelcomeMessage();
      console.log('WelcomeBack: shouldShow =', shouldShow);
      
      if (shouldShow) {
        const lastWelcomeShown = getLocalStorageItem('lastWelcomeShown');
        let lastLoginTime: string | undefined;
        let daysSinceLastLogin: number | undefined;

        if (lastWelcomeShown) {
          try {
            const lastWelcome = new Date(lastWelcomeShown);
            lastLoginTime = formatLastLoginTime(lastWelcome);
            daysSinceLastLogin = Math.floor((new Date().getTime() - lastWelcome.getTime()) / (1000 * 60 * 60 * 24));
          } catch (error) {
            // Invalid date, ignore
          }
        }

        setWelcomeData({
          userName: session.user.name || 'there',
          lastLoginTime,
          daysSinceLastLogin
        });

        setIsVisible(true);
        
        // Small delay to ensure the element is rendered before animating in
        setTimeout(() => {
          setIsAnimating(true);
        }, 100);
        
        // Auto-hide after specified duration
        const timer = setTimeout(() => {
          hideNotification();
          // Update localStorage when welcome message is shown and hidden
          setLocalStorageItem('lastWelcomeShown', new Date().toISOString());
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [status, session]);

  const hideNotification = () => {
    setIsAnimating(false);
    // Wait for exit animation to complete before hiding
    setTimeout(() => {
      setIsVisible(false);
      onHide();
    }, 300);
  };

  if (!isVisible || !welcomeData) return null;

  const getWelcomeMessage = () => {
    if (welcomeData.lastLoginTime) {
      return `Welcome back! We last showed you this message ${welcomeData.lastLoginTime}.`;
    }
    return "Welcome to your financial dashboard!";
  };

  const getWelcomeIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3.5M3 16.5h18" />
    </svg>
  );

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`transform transition-all duration-300 ease-in-out ${
          isAnimating 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-full opacity-0'
        }`}
      >
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg border border-blue-200 p-4 min-w-[350px] max-w-md">
          <div className="flex items-start">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                <div className="text-blue-600">
                  {getWelcomeIcon()}
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="ml-3 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Welcome back, {welcomeData.userName}! 👋
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {getWelcomeMessage()}
              </p>
              {welcomeData.daysSinceLastLogin && welcomeData.daysSinceLastLogin > 7 && (
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  We've missed you! Check out what's new in your dashboard.
                </p>
              )}
            </div>
            
            {/* Close Button */}
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={() => {
                  hideNotification();
                  // Update localStorage when manually closed
                  setLocalStorageItem('lastWelcomeShown', new Date().toISOString());
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close welcome message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-blue-100 rounded-full h-1">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1 rounded-full transition-all ease-linear"
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
