"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTutorial } from '../providers/TutorialProvider';
import { useRouter } from 'next/navigation';
import { X, ArrowRight, SkipForward } from 'lucide-react';

interface TutorialOverlayProps {}

interface ElementPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialOverlay({}: TutorialOverlayProps) {
  const {
    isActive,
    currentStepData,
    nextStep,
    prevStep,
    skipTutorial,
    currentStep,
    steps
  } = useTutorial();
  
  // console.log('TutorialOverlay render:', { isActive, currentStepData });
  
  const router = useRouter();
  const [targetPosition, setTargetPosition] = useState<ElementPosition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Optimized target finding with minimal retries and delays
  useEffect(() => {
    if (!isActive || !currentStepData) return;

    let retryCount = 0;
    const maxRetries = 15; // Reduced from 50
    let intervalId: NodeJS.Timeout;

    const updateTargetPosition = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      setTargetPosition({
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height
      });
      calculateTooltipPosition(rect, currentStepData.position);
    };

    const findTargetElement = () => {
      const targetElement = document.querySelector(currentStepData.target);
      
      if (targetElement) {
        updateTargetPosition(targetElement);
        
        // Start efficient monitoring with less frequent updates
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => {
          const currentElement = document.querySelector(currentStepData.target);
          if (currentElement) {
            updateTargetPosition(currentElement);
          }
        }, 1000); // Reduced frequency to 1 second
        
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(findTargetElement, 50); // Faster retries
        } else {
          // Fallback: center position
          setTargetPosition(null);
          setTooltipPosition({ 
            top: window.innerHeight / 2 - 100, 
            left: window.innerWidth / 2 - 175 
          });
        }
      }
    };

    // Immediate attempt, then minimal delay
    findTargetElement();

    // Lightweight scroll handler with throttling
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const targetElement = document.querySelector(currentStepData.target);
        if (targetElement) {
          updateTargetPosition(targetElement);
        }
      }, 100); // Throttled to 100ms
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Cleanup
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isActive, currentStepData]);

  const calculateTooltipPosition = (targetRect: DOMRect, position: string) => {
    const tooltipWidth = 350;
    const tooltipHeight = 200;
    const spacing = 20;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'bottom':
        top = targetRect.bottom + spacing;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - spacing;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + spacing;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - spacing;
        break;
      default:
        top = targetRect.bottom + spacing;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    }

    // Ensure tooltip stays within viewport
    const maxLeft = window.innerWidth - tooltipWidth - 20;
    const maxTop = window.innerHeight - tooltipHeight - 20;
    
    left = Math.max(20, Math.min(left, maxLeft));
    top = Math.max(20, Math.min(top, maxTop));

    setTooltipPosition({ top, left });
  };

  const handleNext = useCallback(() => {
    if (currentStepData?.action === 'navigate' && currentStepData.actionTarget) {
      router.push(currentStepData.actionTarget);
      // Reduced delay for smoother experience
      setTimeout(() => {
        nextStep();
      }, 400);
    } else if (currentStepData?.action === 'click' && currentStepData.actionTarget) {
      const targetElement = document.querySelector(currentStepData.actionTarget);
      if (targetElement) {
        (targetElement as HTMLElement).click();
      }
      nextStep();
    } else {
      nextStep();
    }
  }, [currentStepData, router, nextStep]);

  const handlePrev = useCallback(() => {
    prevStep();
  }, [prevStep]);

  // Memoize button text calculation
  const buttonText = useMemo(() => {
    if (!currentStepData) return 'Next';
    if (currentStep === steps.length - 1) return 'Finish';
    if (currentStepData.action === 'navigate') {
      const page = currentStepData.actionTarget?.replace('/', '') || '';
      return 'Go to ' + page.charAt(0).toUpperCase() + page.slice(1);
    }
    if (currentStepData.action === 'click') return 'Click it';
    return 'Next';
  }, [currentStepData, currentStep, steps.length]);

  if (!isActive || !currentStepData) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] pointer-events-auto"
      style={{ isolation: 'isolate', position: 'fixed' }}
    >
      {/* Blurred overlay with spotlight cutout */}
      {targetPosition ? (
        <>
          {/* Top overlay */}
          <div className="absolute bg-black/40 backdrop-blur-sm" style={{
            top: 0,
            left: 0,
            right: 0,
            height: targetPosition.top - 5
          }} />
          
          {/* Bottom overlay */}
          <div className="absolute bg-black/40 backdrop-blur-sm" style={{
            top: targetPosition.top + targetPosition.height + 5,
            left: 0,
            right: 0,
            bottom: 0
          }} />
          
          {/* Left overlay */}
          <div className="absolute bg-black/40 backdrop-blur-sm" style={{
            top: targetPosition.top - 5,
            left: 0,
            width: targetPosition.left - 5,
            height: targetPosition.height + 10
          }} />
          
          {/* Right overlay */}
          <div className="absolute bg-black/40 backdrop-blur-sm" style={{
            top: targetPosition.top - 5,
            left: targetPosition.left + targetPosition.width + 5,
            right: 0,
            height: targetPosition.height + 10
          }} />
          
          {/* Spotlight border around target */}
          <div
            className="absolute border-4 border-blue-500 rounded-lg shadow-lg pointer-events-none"
            style={{
              top: targetPosition.top - 5,
              left: targetPosition.left - 5,
              width: targetPosition.width + 10,
              height: targetPosition.height + 10
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      )}

      {/* Tutorial content box */}
      <div
        className="absolute bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full border border-gray-200"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          zIndex: 10000
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-500">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={skipTutorial}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Skip tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {currentStepData.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {currentStepData.content}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end">
          <div className="flex items-center space-x-3">
            {currentStep === 0 && (
              <button
                onClick={skipTutorial}
                className="flex items-center space-x-2 px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                <span>Skip Tutorial</span>
              </button>
            )}
            
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>{buttonText}</span>
              {currentStep !== steps.length - 1 && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
} 