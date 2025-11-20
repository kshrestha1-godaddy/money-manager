/**
 * Bulk Import Types
 * Centralized type definitions for bulk import functionality
 */

// Import result interface for bulk operations
export interface ImportResult {
    success: boolean;
    importedCount: number;
    errors: Array<{
        row: number;
        error: string;
        data?: any;
    }>;
    skippedCount: number;
}

// Editable error interface for UI
export interface EditableError {
    originalRowIndex: number;
    rowData: string[];
    error: string;
    isEditing: boolean;
    editedData: string[];
    mappedData?: Record<string, string>;
}

// Import expense row interface
export interface ImportExpenseRow {
    title: string;
    description?: string;
    amount: number;
    currency: string;
    date: Date;
    categoryName: string;
    categoryId: number;
    accountId?: number | null;
    tags?: string[];
    notes?: string;
    isRecurring?: boolean;
    recurringFrequency?: string | null;
    isBookmarked?: boolean;
    userId: number;
}

// CSV validation requirements
export interface CSVValidationConfig {
    requiredHeaders: string[];
    optionalHeaders: string[];
    maxFileSize?: number; // in bytes
    maxRows?: number;
}

// Bulk operation response
export interface BulkOperationResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    affectedCount?: number;
} 