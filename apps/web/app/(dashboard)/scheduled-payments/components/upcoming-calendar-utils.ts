export { dateKeyInTimeZone } from "../scheduled-payment-helpers";

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getWeekdayLabels(): string[] {
  return WEEKDAYS;
}
