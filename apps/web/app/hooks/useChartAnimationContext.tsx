"use client";

import React, { createContext, useContext, useState, useRef, ReactNode, useCallback } from "react";

interface ChartAnimationContextType {
  isChartAnimated: (chartId: string) => boolean;
  markChartAnimated: (chartId: string) => void;
  resetAllAnimations: () => void;
  shouldAnimate: (chartId: string) => boolean;
}

const ChartAnimationContext = createContext<ChartAnimationContextType | undefined>(undefined);

interface ChartAnimationProviderProps {
  children: ReactNode;
}

export function ChartAnimationProvider({ children }: ChartAnimationProviderProps) {
  // Track which charts have been animated using a Set for better performance
  const animatedChartsRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState({});
  
  // Force re-render when needed (rarely used)
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // Check if a chart has already been animated
  const isChartAnimated = useCallback((chartId: string): boolean => {
    return animatedChartsRef.current.has(chartId);
  }, []);

  // Mark a chart as animated
  const markChartAnimated = useCallback((chartId: string): void => {
    if (!animatedChartsRef.current.has(chartId)) {
      animatedChartsRef.current.add(chartId);
      // No need to trigger update as this is just tracking state
    }
  }, []);

  // Reset all animation states (useful for data refresh scenarios)
  const resetAllAnimations = useCallback((): void => {
    animatedChartsRef.current.clear();
    triggerUpdate();
  }, [triggerUpdate]);

  // Determine if a chart should animate (only on first render)
  const shouldAnimate = useCallback((chartId: string): boolean => {
    const hasAnimated = animatedChartsRef.current.has(chartId);
    
    // If not animated yet, mark it as animated and return true
    if (!hasAnimated) {
      animatedChartsRef.current.add(chartId);
      return true;
    }
    
    // Already animated, don't animate again
    return false;
  }, []);

  const contextValue: ChartAnimationContextType = {
    isChartAnimated,
    markChartAnimated,
    resetAllAnimations,
    shouldAnimate
  };

  return (
    <ChartAnimationContext.Provider value={contextValue}>
      {children}
    </ChartAnimationContext.Provider>
  );
}

export function useChartAnimation(): ChartAnimationContextType {
  const context = useContext(ChartAnimationContext);
  if (!context) {
    throw new Error('useChartAnimation must be used within a ChartAnimationProvider');
  }
  return context;
}

// Custom hook for individual chart components
export function useChartAnimationState(chartId: string) {
  const { shouldAnimate, isChartAnimated } = useChartAnimation();
  
  // Determine animation properties
  const animationProps = {
    animationBegin: shouldAnimate(chartId) ? 0 : undefined,
    animationDuration: shouldAnimate(chartId) ? 750 : 0,
    isAnimationActive: shouldAnimate(chartId)
  };

  return {
    ...animationProps,
    hasAnimated: isChartAnimated(chartId)
  };
}