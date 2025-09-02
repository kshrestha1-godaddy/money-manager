/**
 * LocalStorage utility functions for client-side storage management
 */

/**
 * Get a value from localStorage
 * @param key - The key to retrieve
 * @returns The stored value or null if not found or error occurs
 */
export function getLocalStorageItem(key: string): string | null {
  if (typeof window === 'undefined') {
    console.log('localStorage: window is undefined');
    return null;
  }
  
  try {
    const value = localStorage.getItem(key);
    console.log(`localStorage: getItem("${key}") =`, value);
    return value;
  } catch (error) {
    console.warn(`Failed to get localStorage item "${key}":`, error);
    return null;
  }
}

/**
 * Set a value in localStorage
 * @param key - The key to store under
 * @param value - The value to store
 * @returns True if successful, false otherwise
 */
export function setLocalStorageItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') {
    console.log('localStorage: window is undefined (setItem)');
    return false;
  }
  
  try {
    localStorage.setItem(key, value);
    console.log(`localStorage: setItem("${key}", "${value}") - success`);
    return true;
  } catch (error) {
    console.warn(`Failed to set localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Remove a value from localStorage
 * @param key - The key to remove
 * @returns True if successful, false otherwise
 */
export function removeLocalStorageItem(key: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Check if localStorage is available
 * @returns True if localStorage is available, false otherwise
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get a JSON object from localStorage
 * @param key - The key to retrieve
 * @returns The parsed object or null if not found or invalid JSON
 */
export function getLocalStorageJSON<T>(key: string): T | null {
  const item = getLocalStorageItem(key);
  if (!item) return null;
  
  try {
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Failed to parse JSON from localStorage item "${key}":`, error);
    return null;
  }
}

/**
 * Set a JSON object in localStorage
 * @param key - The key to store under
 * @param value - The object to store
 * @returns True if successful, false otherwise
 */
export function setLocalStorageJSON<T>(key: string, value: T): boolean {
  try {
    const jsonString = JSON.stringify(value);
    return setLocalStorageItem(key, jsonString);
  } catch (error) {
    console.warn(`Failed to stringify and set localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Clear all localStorage items
 * @returns True if successful, false otherwise
 */
export function clearLocalStorage(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
    return false;
  }
}
