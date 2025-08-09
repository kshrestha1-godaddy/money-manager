"use client";

import { useState } from "react";
import { Upload, AlertCircle, CheckCircle, Edit, Trash2, Save } from "lucide-react";
import { ImportResult, EditableError } from "../../types/bulkImport";
import { downloadCategoryImportTemplate } from "../../utils/csvImportCategories";

// Configuration interface for different transaction types
export interface BulkImportConfig {
    type: 'INCOME' | 'EXPENSE';
    title: string;
    description: string;
    requiredFields: string[];
    optionalFields: string[];
    supportsCategoriesImport: boolean;
    bulkImportFunction: (file: File, categoryFile?: File, defaultAccountId?: string) => Promise<any>;
    parseCSVFunction: (csvText: string) => Promise<string[][]>;
    importCorrectedRowFunction: (rowData: string[], headers: string[]) => Promise<any>;
    formDataHook: () => {
        accounts: any[];
        categories: any[];
        loading: boolean;
        error: any;
    };
}

interface UnifiedBulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    config: BulkImportConfig;
}

export function UnifiedBulkImportModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    config 
}: UnifiedBulkImportModalProps) {
    // File upload states
    const [mainFile, setMainFile] = useState<File | null>(null);
    const [categoryFile, setCategoryFile] = useState<File | null>(null);
    
    // Import process states
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [categoryResult, setCategoryResult] = useState<{
        success: number;
        errors: Array<{ row: number; error: string }>;
        importedCount: number;
    } | null>(null);
    
    // UI states
    const [dragActive, setDragActive] = useState(false);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [editableErrors, setEditableErrors] = useState<EditableError[]>([]);
    const [csvText, setCsvText] = useState<string>("");
    
    // Get form data using the provided hook
    const { accounts, categories, loading: dataLoading, error: dataError } = config.formDataHook();

    // File handling functions
    const handleMainFileSelect = (selectedFile: File) => {
        if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
            setMainFile(selectedFile);
            setResult(null);
            setEditableErrors([]);
        } else {
            alert('Please select a CSV file');
        }
    };

    const handleCategoryFileSelect = (selectedFile: File) => {
        if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
            setCategoryFile(selectedFile);
            setCategoryResult(null);
        } else {
            alert('Please select a CSV file');
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
    };

    const handleMainFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleMainFileSelect(droppedFile);
        }
    };

    const handleCategoryDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleCategoryFileSelect(droppedFile);
        }
    };

    // Import processing
    const handleImport = async () => {
        if (!mainFile) return;

        setImporting(true);
        try {
            const fileText = await mainFile.text();
            setCsvText(fileText);
            
            // Parse CSV to get headers for error editing
            const rows = await config.parseCSVFunction(fileText);
            if (rows && rows.length > 0) {
                setCsvHeaders(rows[0] || []);
            }
            
            // Use combined import if categories file is provided, otherwise just import main data
            let importResult;
            if (config.supportsCategoriesImport && categoryFile) {
                const combinedResult = await config.bulkImportFunction(mainFile, categoryFile, "");
                
                // Handle different response structures
                if (combinedResult.incomeImport) {
                    importResult = combinedResult.incomeImport;
                    setCategoryResult(combinedResult.categoryImport);
                } else if (combinedResult.expenseImport) {
                    importResult = combinedResult.expenseImport;
                    setCategoryResult(combinedResult.categoryImport);
                } else {
                    importResult = combinedResult;
                }
            } else {
                importResult = await config.bulkImportFunction(mainFile, undefined, "");
            }
            
            // Transform the result to match ImportResult interface
            const transformedResult: ImportResult = {
                success: (importResult.success || importResult.importedCount) > 0,
                importedCount: importResult.success || importResult.importedCount || 0,
                errors: importResult.errors || [],
                skippedCount: 0
            };
            
            setResult(transformedResult);
            
            // If there are errors, prepare them for editing
            if (transformedResult.errors.length > 0) {
                const allRows = await config.parseCSVFunction(fileText);
                if (Array.isArray(allRows) && allRows.length > 1) {
                    const dataRows = allRows.slice(1);
                    
                    const editableErrorList: EditableError[] = transformedResult.errors
                        .map((error: { row: number; error: string }) => {
                        const originalRowIndex = error.row - 2; // Adjust for header and 0-based indexing
                        const rowData = dataRows[originalRowIndex] || [];
                        return {
                            originalRowIndex: error.row,
                            rowData: [...rowData],
                            editedData: [...rowData],
                            error: error.error,
                            isEditing: false
                        };
                    });
                    setEditableErrors(editableErrorList);
                }
            }
            
            if (transformedResult.success) {
                onSuccess();
            }
        } catch (error: unknown) {
            console.error(`Error importing ${config.type.toLowerCase()}s:`, error);
            alert(`Failed to import ${config.type.toLowerCase()}s. Please try again.`);
        } finally {
            setImporting(false);
        }
    };

    // Error editing functions
    const handleEditError = (index: number, isEditing: boolean) => {
        setEditableErrors(prev => 
            prev.map((error, i) => 
                i === index ? { ...error, isEditing } : error
            )
        );
    };

    const handleSaveError = async (errorIndex: number) => {
        const errorItem = editableErrors[errorIndex];
        if (!errorItem) return;

        try {
            await config.importCorrectedRowFunction(errorItem.editedData, csvHeaders);
            
            // Remove this error from the list
            setEditableErrors(prev => prev.filter((_, i) => i !== errorIndex));
            
            // Update the result count
            setResult(prev => prev ? {
                ...prev,
                importedCount: prev.importedCount + 1,
                errors: prev.errors.filter((_, i) => i !== errorIndex)
            } : null);
            
            onSuccess(); // Refresh the parent data
        } catch (error) {
            console.error('Error saving corrected row:', error);
            alert('Failed to save corrected row. Please try again.');
        }
    };

    const handleRemoveError = (errorIndex: number) => {
        setEditableErrors(prev => prev.filter((_, i) => i !== errorIndex));
    };

    const handleCellEdit = (errorIndex: number, cellIndex: number, value: string) => {
        setEditableErrors(prev =>
            prev.map((error, i) =>
                i === errorIndex 
                    ? { ...error, editedData: error.editedData.map((cell, j) => j === cellIndex ? value : cell) }
                    : error
            )
        );
    };

    // Reset modal state
    const resetModal = () => {
        setMainFile(null);
        setCategoryFile(null);
        setResult(null);
        setCategoryResult(null);
        setEditableErrors([]);
        setCsvHeaders([]);
        setCsvText("");
    };

    if (!isOpen) return null;

    const typeLabel = config.type.toLowerCase();
    const typeTitle = config.type.charAt(0) + config.type.slice(1).toLowerCase();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {config.title}
                        </h2>
                        <button
                            onClick={() => {
                                resetModal();
                                onClose();
                            }}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        {config.description}
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    {!result && (
                        <>
                            {/* File Upload Areas */}
                            <div className={`grid grid-cols-1 ${config.supportsCategoriesImport ? 'md:grid-cols-2' : ''} gap-4`}>
                                {/* Main File Upload */}
                                <div className={config.supportsCategoriesImport ? '' : 'max-w-md mx-auto'}>
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                                        {typeTitle} CSV File (Required)
                                    </h3>
                                    <FileUploadArea
                                        file={mainFile}
                                        onFileSelect={handleMainFileSelect}
                                        onDrop={handleMainFileDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        dragActive={dragActive}
                                        placeholder={`Drop ${typeLabel}s CSV here`}
                                        inputId={`${typeLabel}-file-upload`}
                                        buttonColor="bg-blue-600 hover:bg-blue-700"
                                    />
                                </div>

                                {/* Category File Upload */}
                                {config.supportsCategoriesImport && (
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-3">
                                            Categories CSV File (Optional)
                                        </h3>
                                        <FileUploadArea
                                            file={categoryFile}
                                            onFileSelect={handleCategoryFileSelect}
                                            onDrop={handleCategoryDrop}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            dragActive={dragActive}
                                            placeholder="Drop categories CSV here"
                                            inputId="category-file-upload"
                                            buttonColor="bg-green-600 hover:bg-green-700"
                                            showTemplate={true}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Format Information */}
                            <FormatInfo config={config} />

                            {/* Import Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleImport}
                                    disabled={!mainFile || importing || dataLoading}
                                    className={`px-5 py-2.5 rounded-lg text-sm font-medium ${
                                        !mainFile || importing || dataLoading
                                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                            : 'bg-gray-800 text-white hover:bg-gray-900'
                                    }`}
                                >
                                    {importing 
                                        ? (categoryFile ? `Importing Categories & ${typeTitle}s...` : `Importing ${typeTitle}s...`) 
                                        : (categoryFile ? `Import Categories & ${typeTitle}s` : `Import ${typeTitle}s`)
                                    }
                                </button>
                            </div>
                        </>
                    )}

                    {/* Results Display */}
                    {result && (
                        <ResultsDisplay
                            result={result}
                            categoryResult={categoryResult}
                            editableErrors={editableErrors}
                            csvHeaders={csvHeaders}
                            typeLabel={typeLabel}
                            onEditError={handleEditError}
                            onSaveError={handleSaveError}
                            onRemoveError={handleRemoveError}
                            onCellEdit={handleCellEdit}
                            onClose={() => {
                                resetModal();
                                onClose();
                            }}
                            onDone={() => {
                                onSuccess();
                                resetModal();
                                onClose();
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Sub-components for better modularity

interface FileUploadAreaProps {
    file: File | null;
    onFileSelect: (file: File) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    dragActive: boolean;
    placeholder: string;
    inputId: string;
    buttonColor: string;
    showTemplate?: boolean;
}

function FileUploadArea({
    file,
    onFileSelect,
    onDrop,
    onDragOver,
    onDragLeave,
    dragActive,
    placeholder,
    inputId,
    buttonColor,
    showTemplate = false
}: FileUploadAreaProps) {
    return (
        <div
            className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
                dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="mt-2">
                    <p className="block text-sm font-medium text-gray-900">
                        {file ? file.name : placeholder}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        or click to browse
                    </p>
                    <div className="mt-2 space-x-2">
                        <button
                            onClick={() => document.getElementById(inputId)?.click()}
                            className={`inline-flex items-center px-3 py-1.5 ${buttonColor} text-white rounded-md text-sm`}
                            type="button"
                        >
                            Browse Files
                        </button>
                        {showTemplate && (
                            <button
                                onClick={downloadCategoryImportTemplate}
                                className="inline-flex items-center px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                                type="button"
                            >
                                Download Template
                            </button>
                        )}
                    </div>
                    <input
                        id={inputId}
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={(e) => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) onFileSelect(selectedFile);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

interface FormatInfoProps {
    config: BulkImportConfig;
}

function FormatInfo({ config }: FormatInfoProps) {
    const typeLabel = config.type.toLowerCase();
    
    return (
        <div className={`grid grid-cols-1 ${config.supportsCategoriesImport ? 'md:grid-cols-2' : ''} gap-4`}>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{config.type} CSV Format:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                    <p>• <strong>Required:</strong> {config.requiredFields.join(', ')}</p>
                    <p>• <strong>Optional:</strong> {config.optionalFields.join(', ')}</p>
                    <p>• <strong>Date format:</strong> YYYY-MM-DD</p>
                    <p>• <strong>Category:</strong> Must match existing category names</p>
                    <p>• <strong>Account:</strong> Use "Holder Name - Bank Name"</p>
                    <p>• <strong>Tags:</strong> Comma-separated values</p>
                    <p>• <strong>Recurring:</strong> true/false</p>
                </div>
            </div>
            
            {config.supportsCategoriesImport && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Category CSV Format:</h4>
                    <div className="text-sm text-green-800 space-y-1">
                        <p>• <strong>Required:</strong> Name, Type</p>
                        <p>• <strong>Optional:</strong> Color, Icon</p>
                        <p>• <strong>Type:</strong> INCOME or EXPENSE</p>
                        <p>• <strong>Color:</strong> Hex code (#RGB or #RRGGBB) or CSS color name</p>
                        <p>• <strong>Icon:</strong> Icon name (optional)</p>
                        <p className="italic">Categories are imported first and updated if they exist</p>
                    </div>
                </div>
            )}
        </div>
    );
}

interface ResultsDisplayProps {
    result: ImportResult;
    categoryResult: { success: number; errors: Array<{ row: number; error: string }>; importedCount: number } | null;
    editableErrors: EditableError[];
    csvHeaders: string[];
    typeLabel: string;
    onEditError: (index: number, isEditing: boolean) => void;
    onSaveError: (index: number) => void;
    onRemoveError: (index: number) => void;
    onCellEdit: (errorIndex: number, cellIndex: number, value: string) => void;
    onClose: () => void;
    onDone: () => void;
}

function ResultsDisplay({
    result,
    categoryResult,
    editableErrors,
    csvHeaders,
    typeLabel,
    onEditError,
    onSaveError,
    onRemoveError,
    onCellEdit,
    onClose,
    onDone
}: ResultsDisplayProps) {
    const typeTitle = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
    
    return (
        <div className="space-y-4">
            {/* Category Import Results */}
            {categoryResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">Category Import Results:</h4>
                    <div className="flex items-center space-x-4">
                        {categoryResult.importedCount > 0 && (
                            <div className="flex items-center text-green-600">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <span>{categoryResult.importedCount} categories imported/updated successfully</span>
                            </div>
                        )}
                        {categoryResult.errors.length > 0 && (
                            <div className="flex items-center text-red-600">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <span>{categoryResult.errors.length} category errors found</span>
                            </div>
                        )}
                    </div>
                    {categoryResult.errors.length > 0 && (
                        <div className="mt-3 space-y-1">
                            {categoryResult.errors.map((error, index) => (
                                <p key={index} className="text-sm text-red-700">
                                    Row {error.row}: {error.error}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Main Import Results */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{typeTitle} Import Results:</h4>
                <div className="flex items-center space-x-4">
                    {result.importedCount > 0 && (
                        <div className="flex items-center text-green-600">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            <span>{result.importedCount} {typeLabel}s imported successfully</span>
                        </div>
                    )}
                    {result.errors.length > 0 && (
                        <div className="flex items-center text-red-600">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            <span>{result.errors.length} {typeLabel} errors found</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Editable Errors */}
            {editableErrors.length > 0 && (
                <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">
                        Correct and Import Failed Rows:
                    </h4>
                    {editableErrors.map((errorItem, errorIndex) => (
                        <div key={errorIndex} className="border border-red-200 rounded-lg p-4 bg-red-50">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-sm font-medium text-red-800">
                                        Row {errorItem.originalRowIndex}: {errorItem.error}
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    {errorItem.isEditing ? (
                                        <button
                                            onClick={() => onSaveError(errorIndex)}
                                            className="text-green-600 hover:text-green-800"
                                            title="Save changes"
                                        >
                                            <Save className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onEditError(errorIndex, true)}
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Edit row"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onRemoveError(errorIndex)}
                                        className="text-red-600 hover:text-red-800"
                                        title="Remove row"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {csvHeaders.map((header, cellIndex) => (
                                    <div key={cellIndex}>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            {header}
                                        </label>
                                        <input
                                            type="text"
                                            value={errorItem.editedData[cellIndex] || ''}
                                            onChange={(e) => onCellEdit(errorIndex, cellIndex, e.target.value)}
                                            disabled={!errorItem.isEditing}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-md transition-colors"
                >
                    Close
                </button>
                {result.importedCount > 0 && (
                    <button
                        onClick={onDone}
                        className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors"
                    >
                        Done
                    </button>
                )}
            </div>
        </div>
    );
}
