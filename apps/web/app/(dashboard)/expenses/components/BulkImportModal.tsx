import { useState, useEffect } from "react";
import { Button } from "@repo/ui/button";
import { Upload, AlertCircle, CheckCircle, Edit, Trash2, Save, Eye, EyeOff, RotateCcw } from "lucide-react";
import { bulkImportExpenses, parseCSVForUI, importCorrectedRow } from "../actions/expenses";
import { ImportResult, EditableError } from "../../../types/bulkImport";
import { useExpenseFormData } from "../../../hooks/useExpenseFormData";
import { mapRowToObject } from "../../../utils/csvUtils";

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// Helper function to create intelligent field mappings
function createFieldMappings(headers: string[]): Record<string, string> {
    const mappings: Record<string, string> = {};
    const normalizedHeaders = headers.map(h => h?.toLowerCase().replace(/\s+/g, '') || '');
    
    // Common field mappings
    const fieldPatterns = {
        title: ['title', 'name', 'description', 'expense', 'item'],
        amount: ['amount', 'cost', 'price', 'value', 'sum', 'total'],
        date: ['date', 'when', 'time', 'created', 'occurred'],
        category: ['category', 'type', 'kind', 'group', 'class'],
        description: ['description', 'note', 'memo', 'details', 'comment'],
        account: ['account', 'bank', 'wallet', 'source'],
        tags: ['tags', 'labels', 'keywords'],
        location: ['location', 'place', 'where'],
        notes: ['notes', 'remarks', 'additional', 'extra'],
        isrecurring: ['recurring', 'repeat', 'regular'],
        recurringfrequency: ['frequency', 'interval', 'period']
    };
    
    // Find best matches for each field
    Object.entries(fieldPatterns).forEach(([field, patterns]) => {
        for (const pattern of patterns) {
            const matchIndex = normalizedHeaders.findIndex(h => h.includes(pattern));
            if (matchIndex !== -1 && headers[matchIndex]) {
                mappings[field] = headers[matchIndex];
                break;
            }
        }
    });
    
    return mappings;
}

// Helper function to create smart mapped data
function createSmartMappedData(rowData: string[], headers: string[], mappings: Record<string, string>): Record<string, string> {
    const mapped: Record<string, string> = {};
    const normalizedHeaders = headers.map(h => h?.toLowerCase().replace(/\s+/g, '') || '');
    
    // Map using intelligent mappings first
    Object.entries(mappings).forEach(([field, headerName]) => {
        const headerIndex = headers.indexOf(headerName);
        if (headerIndex !== -1) {
            mapped[field] = rowData[headerIndex] || '';
        }
    });
    
    // Try to map any unmapped fields using direct matching
    const allFields = ['title', 'amount', 'date', 'category', 'description', 'account', 'tags', 'notes', 'location'];
    allFields.forEach(field => {
        if (mapped[field] !== undefined) return; // Already mapped
        
        // Try to find a matching header
        const aliases: Record<string, string[]> = {
            category: ['category', 'type', 'categoryname'],
            account: ['account', 'accountname', 'bank'],
            title: ['title', 'name', 'expense'],
            amount: ['amount', 'cost', 'price'],
            date: ['date', 'when'],
            description: ['description', 'note', 'memo', 'details'],
            tags: ['tags', 'labels'],
            notes: ['notes', 'remarks'],
            location: ['location', 'place']
        };
        
        const fieldAliases = aliases[field] || [field];
        for (const alias of fieldAliases) {
            const headerIndex = normalizedHeaders.findIndex(h => 
                h === alias.toLowerCase() || h.includes(alias.toLowerCase())
            );
            if (headerIndex !== -1) {
                mapped[field] = rowData[headerIndex] || '';
                break;
            }
        }
    });
    
    // Ensure all expected fields exist (even if empty)
    allFields.forEach(field => {
        if (mapped[field] === undefined) mapped[field] = '';
    });
    
    return mapped;
}

// Helper function to validate field values
function validateField(fieldName: string, value: string, categories: any[], accounts: any[]): string {
    if (!value || !value.trim()) {
        if (['title', 'amount', 'date', 'category'].includes(fieldName)) {
            return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        }
        return '';
    }
    
    switch (fieldName) {
        case 'amount':
            const amount = parseFloat(value);
            if (isNaN(amount) || amount < 0) {
                return 'Amount must be a valid positive number';
            }
            break;
        case 'date':
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return 'Date must be in valid format (YYYY-MM-DD or MM/DD/YYYY)';
            }
            break;
        case 'category':
            if (!categories.find(c => c.name.toLowerCase() === value.toLowerCase())) {
                return 'Category not found - please select from dropdown';
            }
            break;
        case 'account':
            if (value && !accounts.find(a => 
                a.bankName.toLowerCase() === value.toLowerCase() ||
                a.holderName.toLowerCase() === value.toLowerCase()
            )) {
                return 'Account not found - please select from dropdown or leave empty';
            }
            break;
    }
    
    return '';
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [editableErrors, setEditableErrors] = useState<EditableError[]>([]);
    const [csvText, setCsvText] = useState<string>("");
    const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
    const [showAllFields, setShowAllFields] = useState<Record<number, boolean>>({});
    const [validationErrors, setValidationErrors] = useState<Record<number, Record<string, string>>>({});
    
    const { accounts, categories, loading: dataLoading, error: dataError } = useExpenseFormData();

    const handleFileSelect = (selectedFile: File) => {
        if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile);
            setResult(null);
            setEditableErrors([]);
        } else {
            alert('Please select a CSV file');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileSelect(droppedFile);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        try {
            const fileText = await file.text();
            setCsvText(fileText);
            
            // Parse CSV to get headers for error editing
            const rows = await parseCSVForUI(fileText);
            console.log('Parsed CSV rows:', {
                totalRows: rows.length,
                headers: rows[0],
                firstFewRows: rows.slice(0, 3)
            });
            
            if (rows && rows.length > 0) {
                setCsvHeaders(rows[0] || []);
            }
            
            // Import without requiring default account - let CSV account names be matched automatically
            const importResult = await bulkImportExpenses(fileText);
            setResult(importResult);
            
            // If there are errors, prepare them for editing with improved mapping
            if (importResult.errors.length > 0) {
                const allRows = await parseCSVForUI(fileText);
                if (Array.isArray(allRows) && allRows.length > 1) {
                    const headers = allRows[0] || [];
                    const dataRows = allRows.slice(1);
                    
                    // Create intelligent field mappings
                    const mappings = createFieldMappings(headers);
                    setFieldMappings(mappings);
                    
                    const editableErrorList: EditableError[] = importResult.errors
                        .map(error => {
                        const originalRowIndex = error.row - 2; // Adjust for header and 0-based indexing
                        const rowData = dataRows[originalRowIndex] || [];
                        
                        // Create smart mapped data object
                        const mappedData = createSmartMappedData(rowData, headers, mappings);
                        
                        // Create editable error with smart mapping
                        
                        return {
                            originalRowIndex: error.row,
                            rowData: [...rowData],
                            editedData: [...rowData],
                            mappedData: mappedData,
                            error: error.error,
                            isEditing: false
                        };
                    });
                    setEditableErrors(editableErrorList);
                }
            }
            
            if (importResult.success) {
                onSuccess();
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('Failed to import expenses: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setImporting(false);
        }
    };

    const handleEditError = (index: number) => {
        setEditableErrors(prev => prev.map((error, i) => 
            i === index ? { ...error, isEditing: true } : error
        ));
    };

    const handleCancelEdit = (index: number) => {
        setEditableErrors(prev => prev.map((error, i) => 
            i === index ? { ...error, isEditing: false, editedData: [...error.rowData] } : error
        ));
    };

    const handleSaveEdit = async (index: number) => {
        const error = editableErrors[index];
        if (!error) return;

        // Validate required fields before saving
        const requiredFields = ['title', 'amount', 'date', 'category'];
        const currentValidationErrors: Record<string, string> = {};
        
        requiredFields.forEach(fieldName => {
            const value = error.mappedData?.[fieldName] || '';
            const errorMsg = validateField(fieldName, value, categories, accounts);
            if (errorMsg) {
                currentValidationErrors[fieldName] = errorMsg;
            }
        });
        
        // Update validation errors state
        setValidationErrors(prev => ({
            ...prev,
            [index]: currentValidationErrors
        }));
        
        // Don't save if there are validation errors
        if (Object.keys(currentValidationErrors).length > 0) {
            alert('Please fix all validation errors before saving.');
            return;
        }

        try {
            // Import corrected row without requiring default account
            const result = await importCorrectedRow(error.editedData, csvHeaders);
            
            if (result.success) {
                // Remove the error from the list
                setEditableErrors(prev => prev.filter((_, i) => i !== index));
                
                // Clear validation errors for this row
                setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[index];
                    return newErrors;
                });
                
                onSuccess(); // Refresh the expenses list
                
                // Update the result to reflect the successful import
                setResult(prev => prev ? {
                    ...prev,
                    importedCount: prev.importedCount + 1,
                    errors: prev.errors.filter(e => e.row !== error.originalRowIndex)
                } : null);
            } else {
                alert(`Failed to import row: ${result.error}`);
            }
        } catch (error) {
            console.error('Error importing corrected row:', error);
            alert('Failed to import corrected row');
        }
    };

    const handleRemoveError = (index: number) => {
        setEditableErrors(prev => prev.filter((_, i) => i !== index));
    };

    const handleFieldChange = (errorIndex: number, fieldName: string, value: string) => {
        setEditableErrors(prev => prev.map((error, i) => {
            if (i !== errorIndex) return error;
            
            const updatedMappedData = {
                ...error.mappedData,
                [fieldName]: value
            };
            
            // Update the original editedData array based on headers mapping
            const updatedEditedData = [...error.editedData];
            
            // Find the header index for this field - try multiple approaches
            let headerIndex = -1;
            
            // First, try using field mappings
            if (fieldMappings[fieldName]) {
                headerIndex = csvHeaders.findIndex(h => h === fieldMappings[fieldName]);
            }
            
            // If not found, try direct field name matching (normalized)
            if (headerIndex === -1) {
                const normalizedFieldName = fieldName.toLowerCase();
                headerIndex = csvHeaders.findIndex(h => 
                    h?.toLowerCase().replace(/\s+/g, '') === normalizedFieldName ||
                    h?.toLowerCase().includes(normalizedFieldName)
                );
            }
            
            // If still not found, try common aliases
            if (headerIndex === -1) {
                const aliases: Record<string, string[]> = {
                    category: ['category', 'type', 'categoryname'],
                    account: ['account', 'accountname', 'bank'],
                    title: ['title', 'name', 'description'],
                    amount: ['amount', 'cost', 'price'],
                    date: ['date', 'when'],
                    description: ['description', 'note', 'memo'],
                    tags: ['tags', 'labels'],
                    notes: ['notes', 'remarks']
                };
                
                const fieldAliases = aliases[fieldName] || [fieldName];
                for (const alias of fieldAliases) {
                    headerIndex = csvHeaders.findIndex(h => 
                        h?.toLowerCase().replace(/\s+/g, '') === alias.toLowerCase()
                    );
                    if (headerIndex !== -1) break;
                }
            }
            
            // Update the CSV data if we found the column
            if (headerIndex !== -1) {
                updatedEditedData[headerIndex] = value;
            } else {
                console.warn(`Could not find header for field: ${fieldName}`, {
                    fieldMappings,
                    csvHeaders,
                    fieldName
                });
            }
            
            return {
                ...error,
                mappedData: updatedMappedData,
                editedData: updatedEditedData
            };
        }));
        
        // Real-time validation
        const errorMsg = validateField(fieldName, value, categories, accounts);
        setValidationErrors(prev => ({
            ...prev,
            [errorIndex]: {
                ...prev[errorIndex],
                [fieldName]: errorMsg
            }
        }));
    };
    
    const toggleShowAllFields = (errorIndex: number) => {
        setShowAllFields(prev => ({
            ...prev,
            [errorIndex]: !prev[errorIndex]
        }));
    };
    
    const resetFieldToOriginal = (errorIndex: number, fieldName: string) => {
        const error = editableErrors[errorIndex];
        if (!error) return;
        
        // Find the original value using the same logic as handleFieldChange
        let headerIndex = -1;
        
        // First, try using field mappings
        if (fieldMappings[fieldName]) {
            headerIndex = csvHeaders.findIndex(h => h === fieldMappings[fieldName]);
        }
        
        // If not found, try direct field name matching (normalized)
        if (headerIndex === -1) {
            const normalizedFieldName = fieldName.toLowerCase();
            headerIndex = csvHeaders.findIndex(h => 
                h?.toLowerCase().replace(/\s+/g, '') === normalizedFieldName ||
                h?.toLowerCase().includes(normalizedFieldName)
            );
        }
        
        // If still not found, try common aliases
        if (headerIndex === -1) {
            const aliases: Record<string, string[]> = {
                category: ['category', 'type', 'categoryname'],
                account: ['account', 'accountname', 'bank'],
                title: ['title', 'name', 'description'],
                amount: ['amount', 'cost', 'price'],
                date: ['date', 'when'],
                description: ['description', 'note', 'memo'],
                tags: ['tags', 'labels'],
                notes: ['notes', 'remarks']
            };
            
            const fieldAliases = aliases[fieldName] || [fieldName];
            for (const alias of fieldAliases) {
                headerIndex = csvHeaders.findIndex(h => 
                    h?.toLowerCase().replace(/\s+/g, '') === alias.toLowerCase()
                );
                if (headerIndex !== -1) break;
            }
        }
        
        const originalValue = headerIndex !== -1 ? error.rowData[headerIndex] || '' : '';
        handleFieldChange(errorIndex, fieldName, originalValue);
    };
    
    const getFieldDisplayName = (fieldName: string): string => {
        const displayNames: Record<string, string> = {
            title: 'Title',
            amount: 'Amount',
            date: 'Date',
            category: 'Category',
            description: 'Description',
            account: 'Account',
            tags: 'Tags',
            location: 'Location',
            notes: 'Notes',
            isrecurring: 'Is Recurring',
            recurringfrequency: 'Recurring Frequency'
        };
        return displayNames[fieldName] || fieldName;
    };

    const resetModal = () => {
        setFile(null);
        setResult(null);
        setImporting(false);
        setCsvHeaders([]);
        setEditableErrors([]);
        setCsvText("");
        setFieldMappings({});
        setShowAllFields({});
        setValidationErrors({});
        onClose();
    };

    // Show loading state or error if data is not ready
    if (dataError) {
        console.error("Error loading expense form data:", dataError);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Bulk Import Expenses</h2>
                    <button 
                        onClick={resetModal}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ×
                    </button>
                </div>
                
                <div className="space-y-6">
                    {/* CSV Format Info */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                        <p className="text-sm text-blue-700 mb-2">
                            Your CSV should include these columns: <strong>Title, Amount, Date, Category</strong>
                        </p>
                        <p className="text-sm text-blue-700 mb-2">
                            Optional columns: Description, Account, Tags, Notes, IsRecurring, RecurringFrequency
                        </p>
                        <div className="text-xs text-blue-600 space-y-1">
                            <p>• Date format: YYYY-MM-DD or MM/DD/YYYY</p>
                            <p>• Account names from CSV will be automatically matched with existing accounts</p>
                            <p>• If no account is specified or found, expenses will be imported without account association</p>
                        </div>
                    </div>

                    {/* File Upload Area */}
                    {!result && (
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                dragActive 
                                    ? 'border-blue-400 bg-blue-50' 
                                    : 'border-gray-300 hover:border-gray-400'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <div className="space-y-2">
                                <p className="text-lg font-medium">
                                    {file ? file.name : 'Drop your CSV file here'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    or click to browse
                                </p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => {
                                        const selectedFile = e.target.files?.[0];
                                        if (selectedFile) handleFileSelect(selectedFile);
                                    }}
                                    className="hidden"
                                    id="csv-upload"
                                />
                                <label 
                                    htmlFor="csv-upload"
                                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                                >
                                    Browse Files
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Import Result */}
                    {result && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-lg flex items-center gap-3 ${
                                result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                            }`}>
                                {result.success ? (
                                    <CheckCircle className="h-5 w-5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {result.success ? 'Import Completed!' : 'Import Failed'}
                                    </p>
                                    <p className="text-sm">
                                        {result.importedCount} expenses imported
                                        {result.skippedCount > 0 && `, ${result.skippedCount} rows skipped`}
                                        {result.errors.length > 0 && `, ${result.errors.length} errors`}
                                    </p>
                                </div>
                            </div>

                            {/* Editable Error Details */}
                            {editableErrors.length > 0 && (
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-red-900 mb-4">Errors:</h4>
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {editableErrors.map((error, index) => (
                                            <div key={index} className="bg-white p-4 rounded-lg border border-red-200">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-red-800">
                                                            Row {error.originalRowIndex}: {error.error}
                                                        </p>
                                                    </div>
                                                                                                                        <div className="flex gap-2">
                                                        {!error.isEditing ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEditError(index)}
                                                                    className="p-1 text-blue-600 hover:text-blue-800"
                                                                    title="Edit this row"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveError(index)}
                                                                    className="p-1 text-red-600 hover:text-red-800"
                                                                    title="Remove this error"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>

                                                                <button
                                                                    onClick={() => handleSaveEdit(index)}
                                                                    className="p-1 text-green-600 hover:text-green-800"
                                                                    title="Save and import"
                                                                >
                                                                    <Save className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCancelEdit(index)}
                                                                    className="p-1 text-gray-600 hover:text-gray-800"
                                                                    title="Cancel edit"
                                                                >
                                                                    ×
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {error.isEditing ? (
                                                    <div className="space-y-4">
                                                        {/* Required Fields Section */}
                                                        <div className="bg-blue-50 p-3 rounded-lg">
                                                            <h5 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                                                                <AlertCircle className="h-4 w-4" />
                                                                Required Fields
                                                            </h5>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {['title', 'amount', 'date', 'category'].map(fieldName => {
                                                                    const value = error.mappedData?.[fieldName] || '';
                                                                    const validationError = validationErrors[index]?.[fieldName];
                                                                    const isRequired = true;
                                                                    
                                                                    return (
                                                                        <div key={fieldName} className="space-y-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <label className="block text-xs font-medium text-gray-700">
                                                                                    {getFieldDisplayName(fieldName)}
                                                                                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                                                                                </label>
                                                                                <button
                                                                                    onClick={() => resetFieldToOriginal(index, fieldName)}
                                                                                    className="p-1 text-gray-400 hover:text-gray-600"
                                                                                    title="Reset to original value"
                                                                                >
                                                                                    <RotateCcw className="h-3 w-3" />
                                                                                </button>
                                                                            </div>
                                                                            
                                                                            {fieldName === 'category' ? (
                                                                                <select
                                                                                    value={value}
                                                                                    onChange={(e) => handleFieldChange(index, fieldName, e.target.value)}
                                                                                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
                                                                                        validationError 
                                                                                            ? 'border-red-300 focus:ring-red-500' 
                                                                                            : 'border-gray-300 focus:ring-blue-500'
                                                                                    }`}
                                                                                >
                                                                                    <option value="">Select category</option>
                                                                                    {categories.map(cat => (
                                                                                        <option key={cat.id} value={cat.name}>
                                                                                            {cat.name}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : (
                                                                                <input
                                                                                    type={fieldName === 'amount' ? 'number' : fieldName === 'date' ? 'date' : 'text'}
                                                                                    value={value}
                                                                                    onChange={(e) => handleFieldChange(index, fieldName, e.target.value)}
                                                                                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
                                                                                        validationError 
                                                                                            ? 'border-red-300 focus:ring-red-500' 
                                                                                            : 'border-gray-300 focus:ring-blue-500'
                                                                                    }`}
                                                                                    step={fieldName === 'amount' ? '0.01' : undefined}
                                                                                    placeholder={`Enter ${getFieldDisplayName(fieldName).toLowerCase()}`}
                                                                                />
                                                                            )}
                                                                            
                                                                            {validationError && (
                                                                                <p className="text-xs text-red-600 mt-1">{validationError}</p>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Optional Fields Section */}
                                                        <div className="bg-gray-50 p-3 rounded-lg">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h5 className="text-sm font-medium text-gray-700">Optional Fields</h5>
                                                                <button
                                                                    onClick={() => toggleShowAllFields(index)}
                                                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                                                                >
                                                                    {showAllFields[index] ? (
                                                                        <>
                                                                            <EyeOff className="h-3 w-3" />
                                                                            Hide
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Eye className="h-3 w-3" />
                                                                            Show All
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                            
                                                            {showAllFields[index] && (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                    {['description', 'account', 'tags', 'location', 'notes'].map(fieldName => {
                                                                        const value = error.mappedData?.[fieldName] || '';
                                                                        const validationError = validationErrors[index]?.[fieldName];
                                                                        
                                                                        return (
                                                                            <div key={fieldName} className="space-y-1">
                                                                                <div className="flex items-center justify-between">
                                                                                    <label className="block text-xs font-medium text-gray-600">
                                                                                        {getFieldDisplayName(fieldName)}
                                                                                    </label>
                                                                                    <button
                                                                                        onClick={() => resetFieldToOriginal(index, fieldName)}
                                                                                        className="p-1 text-gray-400 hover:text-gray-600"
                                                                                        title="Reset to original value"
                                                                                    >
                                                                                        <RotateCcw className="h-3 w-3" />
                                                                                    </button>
                                                                                </div>
                                                                                
                                                                                {fieldName === 'account' ? (
                                                                                    <select
                                                                                        value={value}
                                                                                        onChange={(e) => handleFieldChange(index, fieldName, e.target.value)}
                                                                                        className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
                                                                                            validationError 
                                                                                                ? 'border-red-300 focus:ring-red-500' 
                                                                                                : 'border-gray-300 focus:ring-blue-500'
                                                                                        }`}
                                                                                    >
                                                                                        <option value="">No account</option>
                                                                                        {accounts.map(acc => (
                                                                                            <option key={acc.id} value={acc.bankName}>
                                                                                                {acc.accountNumber} - {acc.bankName}
                                                                                            </option>
                                                                                        ))}
                                                                                    </select>
                                                                                ) : (
                                                                                    <input
                                                                                        type="text"
                                                                                        value={value}
                                                                                        onChange={(e) => handleFieldChange(index, fieldName, e.target.value)}
                                                                                        className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 ${
                                                                                            validationError 
                                                                                                ? 'border-red-300 focus:ring-red-500' 
                                                                                                : 'border-gray-300 focus:ring-blue-500'
                                                                                        }`}
                                                                                        placeholder={`Enter ${getFieldDisplayName(fieldName).toLowerCase()}`}
                                                                                    />
                                                                                )}
                                                                                
                                                                                {validationError && (
                                                                                    <p className="text-xs text-red-600 mt-1">{validationError}</p>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {/* Show smart mapped data preview */}
                                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                                                            {Object.entries(error.mappedData || {}).map(([fieldName, value]) => (
                                                                <div key={fieldName} className="flex flex-col">
                                                                    <span className="font-medium text-gray-600 capitalize">
                                                                        {getFieldDisplayName(fieldName)}:
                                                                    </span>
                                                                    <span className={`ml-1 ${
                                                                        ['title', 'amount', 'date', 'category'].includes(fieldName) && !value
                                                                            ? 'text-red-600 font-medium' 
                                                                            : 'text-gray-800'
                                                                    }`}>
                                                                        {value || '(empty)'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        
                                                        {/* Show original raw data if different */}
                                                        <details className="text-xs">
                                                            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                                                Show original CSV data
                                                            </summary>
                                                            <div className="mt-2 p-2 bg-gray-100 rounded grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                                {csvHeaders.map((header, headerIndex) => (
                                                                    <div key={headerIndex}>
                                                                        <span className="font-medium text-gray-600">{header}:</span>
                                                                        <span className="ml-1 text-gray-800">
                                                                            {error.rowData[headerIndex] || '(empty)'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                        <Button onClick={resetModal}>
                            {result ? 'Close' : 'Cancel'}
                        </Button>
                        {!result && file && (
                            <button 
                                onClick={handleImport} 
                                disabled={importing}
                                className={`px-5 py-2.5 rounded-lg text-sm font-medium ${
                                    importing 
                                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                        : 'bg-gray-800 text-white hover:bg-gray-900'
                                }`}
                            >
                                {importing ? 'Importing...' : 'Import Expenses'}
                            </button>
                        )}
                        {result && (result.success || editableErrors.length === 0) && (
                            <Button
                                onClick={() => {
                                    setResult(null);
                                    setFile(null);
                                    setEditableErrors([]);
                                    setCsvHeaders([]);
                                }}
                            >
                                Import Another File
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 