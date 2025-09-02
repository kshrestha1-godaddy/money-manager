"use client";

import React, { ReactNode } from 'react';
import { WelcomeBackNotification } from '../components/WelcomeBackNotification';

interface WelcomeBackProviderProps {
  children: ReactNode;
}

export function WelcomeBackProvider({ children }: WelcomeBackProviderProps) {
  const handleHide = () => {
    // Nothing needed here, component manages its own state
  };

  return (
    <>
      {children}
      <WelcomeBackNotification onHide={handleHide} />
    </>
  );
}
