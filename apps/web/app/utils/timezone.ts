/**
 * Timezone utilities for handling timezone conversions and detection
 */

// List of common timezones with display names
export const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
  { value: 'America/New_York', label: 'New York (EST/EDT)', offset: '-05:00/-04:00' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)', offset: '-06:00/-05:00' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)', offset: '-07:00/-06:00' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)', offset: '-08:00/-07:00' },
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: '+00:00/+01:00' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', offset: '+01:00/+02:00' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', offset: '+01:00/+02:00' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)', offset: '+01:00/+02:00' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)', offset: '+03:00' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00' },
  { value: 'Asia/Kolkata', label: 'India (IST)', offset: '+05:30' },
  { value: 'Asia/Kathmandu', label: 'Nepal (NPT)', offset: '+05:45' },
  { value: 'Asia/Dhaka', label: 'Bangladesh (BST)', offset: '+06:00' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', offset: '+07:00' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00' },
  { value: 'Asia/Shanghai', label: 'China (CST)', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)', offset: '+10:00/+11:00' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)', offset: '+10:00/+11:00' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)', offset: '+12:00/+13:00' }
] as const;

/**
 * Detect user's current timezone using browser API
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect user timezone:', error);
    return 'UTC';
  }
}

/**
 * Get timezone display info
 */
export function getTimezoneInfo(timezone: string): { label: string; offset: string } {
  const timezoneEntry = COMMON_TIMEZONES.find(tz => tz.value === timezone);
  if (timezoneEntry) {
    return { label: timezoneEntry.label, offset: timezoneEntry.offset };
  }
  
  // Fallback for unlisted timezones
  try {
    const now = new Date();
    const offset = getTimezoneOffset(timezone, now);
    return {
      label: timezone.replace(/_/g, ' '),
      offset: formatOffset(offset)
    };
  } catch (error) {
    return { label: timezone, offset: 'Unknown' };
  }
}

/**
 * Convert a date from one timezone to another
 */
export function convertDateTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
  try {
    // Convert to UTC first, then to target timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const targetDate = new Date(utcDate.toLocaleString('en-US', { timeZone: toTimezone }));
    return targetDate;
  } catch (error) {
    console.warn('Timezone conversion failed:', error);
    return date;
  }
}

/**
 * Format a date in a specific timezone
 */
export function formatDateInTimezone(
  date: Date, 
  timezone: string, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  try {
    return date.toLocaleDateString('en-US', {
      timeZone: timezone,
      ...options
    });
  } catch (error) {
    console.warn('Date formatting failed:', error);
    return date.toLocaleDateString('en-US', options);
  }
}

/**
 * Get timezone offset in minutes for a specific date
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  try {
    // Create dates in UTC and target timezone
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    // Calculate difference in minutes
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch (error) {
    console.warn('Failed to get timezone offset:', error);
    return 0;
  }
}

/**
 * Format timezone offset as string (e.g., "+05:30", "-08:00")
 */
export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Create a date in a specific timezone
 */
export function createDateInTimezone(
  year: number,
  month: number, // 0-based (0 = January)
  day: number,
  timezone: string,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  try {
    // Create date string in ISO format
    const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
    
    // Parse in the specified timezone
    const date = new Date(dateString);
    const offset = getTimezoneOffset(timezone, date);
    
    // Adjust for timezone offset
    return new Date(date.getTime() - offset * 60 * 1000);
  } catch (error) {
    console.warn('Failed to create date in timezone:', error);
    return new Date(year, month, day, hour, minute, second);
  }
}

/**
 * Check if a timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get current time in a specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  try {
    const now = new Date();
    return convertDateTimezone(now, detectUserTimezone(), timezone);
  } catch (error) {
    console.warn('Failed to get current time in timezone:', error);
    return new Date();
  }
}

/**
 * Get today's date info in a specific timezone
 */
export function getTodayInTimezone(timezone: string): { year: number; month: number; day: number; dateString: string } {
  try {
    const now = new Date();
    const todayInTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    return {
      year: todayInTz.getFullYear(),
      month: todayInTz.getMonth(), // 0-based
      day: todayInTz.getDate(),
      dateString: `${todayInTz.getFullYear()}-${(todayInTz.getMonth() + 1).toString().padStart(2, '0')}-${todayInTz.getDate().toString().padStart(2, '0')}`
    };
  } catch (error) {
    console.warn('Failed to get today in timezone:', error);
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      dateString: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`
    };
  }
}
