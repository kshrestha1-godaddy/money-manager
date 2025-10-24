/**
 * Passive Event Listeners Utility
 * Helps fix non-passive event listener warnings for better page performance
 */

import React from 'react';

/**
 * Monkey patch EventTarget.addEventListener to make wheel and mousewheel events passive by default
 * This helps prevent scroll-blocking warnings from third-party libraries like Google Charts
 */
export function enablePassiveEventListeners(): void {
  if (typeof window === 'undefined') return;

  // Store original addEventListener
  const originalAddEventListener = EventTarget.prototype.addEventListener;

  // Override addEventListener to make wheel events passive by default
  EventTarget.prototype.addEventListener = function(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    // List of events that should be passive by default
    const passiveEvents = ['wheel', 'mousewheel', 'touchstart', 'touchmove'];
    
    if (passiveEvents.includes(type)) {
      if (typeof options === 'boolean') {
        // Convert boolean to options object with passive: true
        options = { capture: options, passive: true };
      } else if (typeof options === 'object' && options !== null) {
        // Add passive: true to existing options
        options = { ...options, passive: true };
      } else {
        // Default to passive: true
        options = { passive: true };
      }
    }

    // Call original addEventListener with modified options
    return originalAddEventListener.call(this, type, listener, options);
  };
}

/**
 * Add passive event listeners to a specific element
 * Useful for chart containers or other interactive elements
 */
export function addPassiveEventListenersToElement(element: HTMLElement): () => void {
  const passiveWheelHandler = (e: Event) => {
    // Allow default scrolling behavior
    return true;
  };

  const passiveTouchHandler = (e: Event) => {
    // Allow default touch behavior
    return true;
  };

  // Add passive listeners
  element.addEventListener('wheel', passiveWheelHandler, { passive: true });
  element.addEventListener('mousewheel' as any, passiveWheelHandler, { passive: true } as any);
  element.addEventListener('touchstart', passiveTouchHandler, { passive: true });
  element.addEventListener('touchmove', passiveTouchHandler, { passive: true });

  // Return cleanup function
  return () => {
    element.removeEventListener('wheel', passiveWheelHandler);
    element.removeEventListener('mousewheel' as any, passiveWheelHandler);
    element.removeEventListener('touchstart', passiveTouchHandler);
    element.removeEventListener('touchmove', passiveTouchHandler);
  };
}

/**
 * Hook to automatically add passive event listeners to a ref element
 */
export function usePassiveEventListeners(ref: React.RefObject<HTMLElement>): void {
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const cleanup = addPassiveEventListenersToElement(element);
    return cleanup;
  }, [ref]);
}
