"use client";

import React from 'react';
import { useTutorial } from '../providers/TutorialProvider';
import { HelpCircle } from 'lucide-react';

export function TutorialButton() {
  const { startTutorial } = useTutorial();

  const handleStartTutorial = (event: React.MouseEvent) => {
    // If Shift+Click, clear localStorage to simulate new user (for testing)
    if (event.shiftKey) {
      localStorage.removeItem('tutorial-completed');
      localStorage.removeItem('user-has-accounts');
      console.log('Tutorial localStorage cleared for testing');
    }
    startTutorial();
  };

  return (
    <button
      onClick={handleStartTutorial}
      className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors z-40 group"
      title="Start Tutorial"
    >
      <HelpCircle className="w-6 h-6" />
      <span className="sr-only">Start Tutorial</span>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        Start Tutorial (Shift+Click to reset)
        <div className="absolute top-full right-3 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </button>
  );
} 