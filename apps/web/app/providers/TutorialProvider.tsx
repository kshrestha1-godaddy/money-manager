"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector or element ID
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'navigate' | 'none';
  actionTarget?: string; // URL for navigation or element for click
  skippable?: boolean;
}

interface TutorialContextType {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  currentStepData: TutorialStep | null;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Money Manager! 🎉',
    content: 'Let\'s take a quick tour to help you get started with managing your finances effectively. This tutorial will guide you through the essential features.',
    target: '#sidebar-nav',
    position: 'right',
    action: 'none',
    skippable: true
  },
  {
    id: 'accounts-tab',
    title: 'Step 1: Create Your Accounts 🏦',
    content: 'First, you need to set up your bank accounts. Click on the "Accounts" tab to add your checking accounts, savings accounts, credit cards, and other financial accounts.',
    target: '#accounts-nav-item',
    position: 'right',
    action: 'navigate',
    actionTarget: '/accounts',
    skippable: false
  },
  {
    id: 'add-account',
    title: 'Add Your First Account 💳',
    content: 'Click the "Add Account" button to create your first account. Enter your bank name, account type, and current balance to get started.',
    target: '#add-account-btn',
    position: 'left',
    action: 'click',
    actionTarget: '#add-account-btn',
    skippable: false
  },
  {
    id: 'incomes-tab',
    title: 'Step 2: Track Your Income 💰',
    content: 'Next, let\'s add your income sources. Click on the "Incomes" tab to record your salary, freelance work, or any other money coming in.',
    target: '#incomes-nav-item',
    position: 'right',
    action: 'navigate',
    actionTarget: '/incomes',
    skippable: false
  },
  {
    id: 'expenses-tab',
    title: 'Step 3: Monitor Your Expenses 🛒',
    content: 'Now you can track where your money goes. Click on the "Expenses" tab to record your purchases, bills, and other spending.',
    target: '#expenses-nav-item',
    position: 'right',
    action: 'navigate',
    actionTarget: '/expenses',
    skippable: false
  },
  {
    id: 'dashboard-overview',
    title: 'Your Financial Dashboard 📊',
    content: 'The dashboard gives you a complete overview of your financial health. Here you can see your income vs expenses, savings rate, and financial trends.',
    target: '#dashboard-nav-item',
    position: 'right',
    action: 'navigate',
    actionTarget: '/dashboard',
    skippable: false
  },
  {
    id: 'additional-features',
    title: 'Explore More Features 🚀',
    content: 'You can also track investments, manage debts, monitor your net worth, and much more. Take your time to explore all the features available!',
    target: '#sidebar-nav',
    position: 'right',
    action: 'none',
    skippable: true
  },
  {
    id: 'tutorial-complete',
    title: 'You\'re All Set! ✅',
    content: 'Congratulations! You\'ve completed the tutorial. Start by adding your accounts, then record your income and expenses to get the most out of your money manager.',
    target: '#dashboard-content',
    position: 'top',
    action: 'none',
    skippable: true
  }
];

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps] = useState<TutorialStep[]>(TUTORIAL_STEPS);

  // Fast user data check - prioritize localStorage and avoid heavy API calls
  const checkIfUserHasData = (): boolean => {
    // Primary check: localStorage flag
    const hasAccountsFlag = localStorage.getItem('user-has-accounts');
    if (hasAccountsFlag === 'true') {
      return true;
    }

    // Secondary check: tutorial completion status
    const tutorialCompleted = localStorage.getItem('tutorial-completed');
    if (tutorialCompleted === 'true') {
      return true;
    }

    // For now, rely on localStorage flags set by other pages
    // This avoids expensive API calls during tutorial initialization
    return false;
  };

  // Fast tutorial initialization
  useEffect(() => {
    const initializeTutorial = () => {
      const tutorialCompleted = localStorage.getItem('tutorial-completed');
      const hasUserData = checkIfUserHasData();
      
      // Quick exit conditions
      if (tutorialCompleted === 'true' || hasUserData) {
        return;
      }
      
      // Show tutorial for new users - minimal delay for smooth experience
      setTimeout(() => {
        setIsActive(true);
      }, 300);
    };

    initializeTutorial();
  }, []);

  const startTutorial = () => {
    setCurrentStep(0);
    setIsActive(true);
    localStorage.removeItem('tutorial-completed');
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTutorial = () => {
    setIsActive(false);
    localStorage.setItem('tutorial-completed', 'true');
    console.log('Tutorial skipped and marked in localStorage');
  };

  const completeTutorial = () => {
    setIsActive(false);
    localStorage.setItem('tutorial-completed', 'true');
    console.log('Tutorial completed and marked in localStorage');
  };

  const resetTutorial = () => {
    setCurrentStep(0);
    setIsActive(false);
    localStorage.removeItem('tutorial-completed');
  };

  const currentStepData = steps[currentStep] || null;

  const value: TutorialContextType = {
    isActive,
    currentStep,
    steps,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
    resetTutorial,
    currentStepData
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}; 