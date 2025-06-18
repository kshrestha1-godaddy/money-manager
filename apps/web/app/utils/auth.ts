import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";

/**
 * Helper function to get user ID from session
 * Uses last 5 digits for long IDs to ensure they fit in INT4 (max 2,147,483,647)
 * This prevents database integer overflow errors
 */
export function getUserIdFromSession(sessionUserId: string): number {
    // If it's a long number (OAuth provider), take last 5 digits to fit in INT4
    if (sessionUserId.length > 5) {
        return parseInt(sessionUserId.slice(-5));
    }
    // Otherwise parse normally
    return parseInt(sessionUserId);
}

/**
 * Validates if a number is finite and not NaN
 */
export function validateNumber(value: any, fieldName: string): number {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (!isFinite(num) || isNaN(num)) {
        throw new Error(`Invalid ${fieldName}: ${value}`);
    }
    return num;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Converts Decimal to number with validation
 */
export function decimalToNumber(decimal: any, fieldName: string): number {
    if (decimal === null || decimal === undefined) {
        return 0;
    }
    const value = parseFloat(decimal.toString());
    return validateNumber(value, fieldName);
}

/**
 * Get authenticated user session with consistent error handling
 */
export async function getAuthenticatedSession() {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error("Unauthorized");
    }
    return session;
}

/**
 * Standard error response format
 */
export function createErrorResponse(message: string) {
    return { error: message };
}

/**
 * Check if environment variable exists
 */
export function requireEnvVar(varName: string): string {
    const value = process.env[varName];
    if (!value) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
    return value;
} 