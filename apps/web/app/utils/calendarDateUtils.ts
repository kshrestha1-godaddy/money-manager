/**
 * Calendar Date Utilities
 * Minimal, independent functions for calendar operations with consistent local date handling
 */

/**
 * Format date as YYYY-MM-DD string in local timezone (not UTC)
 * This avoids timezone-related off-by-one day errors
 */
export function formatLocalDateKey(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Create a date from YYYY-MM-DD string in local timezone
 */
export function parseLocalDateKey(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }
  
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  
  const [, year, month, day] = match;
  if (!year || !month || !day) {
    return null;
  }
  
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  // Validate the date was created correctly (handles invalid dates like Feb 30)
  if (date.getFullYear() !== parseInt(year) || 
      date.getMonth() !== parseInt(month) - 1 || 
      date.getDate() !== parseInt(day)) {
    return null;
  }
  
  return date;
}

/**
 * Get the number of days in a given month
 */
export function getDaysInMonth(year: number, monthIndex: number): number {
  // monthIndex: 0-11 (JavaScript month convention)
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Validate if a date exists (handles Feb 29, etc.)
 */
export function isValidDate(year: number, monthIndex: number, day: number): boolean {
  const date = new Date(year, monthIndex, day);
  return date.getFullYear() === year && 
         date.getMonth() === monthIndex && 
         date.getDate() === day;
}

/**
 * Generate calendar matrix ensuring all days of the month are included
 * Returns a grid starting from Monday with proper handling of all month lengths
 */
export function generateCalendarMatrix(year: number, monthIndex: number): {
  weeks: Date[][];
  firstDay: Date;
  lastDay: Date;
  daysInMonth: number;
  allDaysIncluded: Date[];
} {
  // Validate inputs
  if (year < 1000 || year > 9999 || monthIndex < 0 || monthIndex > 11) {
    throw new Error(`Invalid date parameters: year=${year}, month=${monthIndex}`);
  }
  
  // Get first and last day of the month
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const lastDay = new Date(year, monthIndex, daysInMonth);
  
  // Calculate grid boundaries (Monday-first grid)
  const startGrid = new Date(firstDay);
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  startGrid.setDate(firstDay.getDate() - firstDayOfWeek);
  
  const endGrid = new Date(lastDay);
  const lastDayOfWeek = (lastDay.getDay() + 6) % 7;
  const daysToAdd = lastDayOfWeek === 6 ? 0 : 6 - lastDayOfWeek;
  endGrid.setDate(lastDay.getDate() + daysToAdd);
  
  // Generate all days in the grid
  const allDays: Date[] = [];
  const current = new Date(startGrid);
  
  while (current <= endGrid) {
    allDays.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  // Split into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  
  // Validate all days of the month are included
  const monthDays = allDays.filter(day => day.getMonth() === monthIndex);
  if (monthDays.length !== daysInMonth) {
    throw new Error(`Calendar generation error: Expected ${daysInMonth} days, got ${monthDays.length}`);
  }
  
  // Double-check: verify all dates from 1 to daysInMonth are present
  for (let day = 1; day <= daysInMonth; day++) {
    const found = monthDays.some(d => d.getDate() === day);
    if (!found) {
      throw new Error(`Missing day ${day} in month ${monthIndex + 1}/${year}`);
    }
  }
  
  return {
    weeks,
    firstDay,
    lastDay,
    daysInMonth,
    allDaysIncluded: monthDays
  };
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  if (!date1 || !date2) return false;
  
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Get today's date with time set to midnight
 */
export function getTodayAtMidnight(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

/**
 * Navigate to previous month
 */
export function getPreviousMonth(year: number, monthIndex: number): { year: number; monthIndex: number } {
  if (monthIndex === 0) {
    return { year: year - 1, monthIndex: 11 };
  }
  return { year, monthIndex: monthIndex - 1 };
}

/**
 * Navigate to next month
 */
export function getNextMonth(year: number, monthIndex: number): { year: number; monthIndex: number } {
  if (monthIndex === 11) {
    return { year: year + 1, monthIndex: 0 };
  }
  return { year, monthIndex: monthIndex + 1 };
}

/**
 * Test function to validate calendar for specific edge cases
 */
export function validateCalendarForMonth(year: number, monthIndex: number): {
  isValid: boolean;
  errors: string[];
  stats: {
    daysInMonth: number;
    firstDayOfWeek: string;
    lastDayOfWeek: string;
    weeksRequired: number;
  };
} {
  const errors: string[] = [];
  
  try {
    const matrix = generateCalendarMatrix(year, monthIndex);
    const daysInMonth = getDaysInMonth(year, monthIndex);
    
    // Validate all days are present
    const monthDates = matrix.allDaysIncluded;
    if (monthDates.length !== daysInMonth) {
      errors.push(`Expected ${daysInMonth} days, found ${monthDates.length}`);
    }
    
    // Validate no duplicates
    const uniqueDays = new Set(monthDates.map(d => d.getDate()));
    if (uniqueDays.size !== daysInMonth) {
      errors.push(`Duplicate days detected`);
    }
    
    // Validate sequential days
    const sortedDays = monthDates.map(d => d.getDate()).sort((a, b) => a - b);
    for (let i = 0; i < sortedDays.length; i++) {
      if (sortedDays[i] !== i + 1) {
        errors.push(`Missing or incorrect day: expected ${i + 1}, found ${sortedDays[i]}`);
        break;
      }
    }
    
    const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const firstDayIndex = matrix.firstDay.getDay() === 0 ? 6 : matrix.firstDay.getDay() - 1;
    const lastDayIndex = matrix.lastDay.getDay() === 0 ? 6 : matrix.lastDay.getDay() - 1;
    const firstDayOfWeek = weekdayNames[firstDayIndex] || 'Unknown';
    const lastDayOfWeek = weekdayNames[lastDayIndex] || 'Unknown';
    
    return {
      isValid: errors.length === 0,
      errors,
      stats: {
        daysInMonth,
        firstDayOfWeek,
        lastDayOfWeek,
        weeksRequired: matrix.weeks.length
      }
    };
  } catch (error) {
    errors.push(`Calendar generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      isValid: false,
      errors,
      stats: {
        daysInMonth: 0,
        firstDayOfWeek: 'Unknown',
        lastDayOfWeek: 'Unknown',
        weeksRequired: 0
      }
    };
  }
}
