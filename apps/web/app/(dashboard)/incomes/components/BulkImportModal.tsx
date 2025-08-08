"use client";

import { useState } from "react";
import { Upload, AlertCircle, CheckCircle, Edit, Trash2, Save } from "lucide-react";
import { ImportResult, EditableError } from "../../../types/bulkImport";
import { useFinancialFormData } from "../../../hooks/useFinancialFormData";
import { bulkImportIncomes, importCorrectedRow, parseCSVForUI } from "../actions/incomes";

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [editableErrors, setEditableErrors] = useState<EditableError[]>([]);
    const [csvText, setCsvText] = useState<string>("");
    
    const { accounts, categories, loading: dataLoading, error: dataError } = useFinancialFormData("INCOME");

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
            if (rows && rows.length > 0) {
                setCsvHeaders(rows[0] || []);
            }
            
            // Import without requiring default account - let CSV account names be matched automatically
            const importResult = await bulkImportIncomes(file, "");
            
            // Transform the result to match ImportResult interface
            const transformedResult: ImportResult = {
                success: importResult.success > 0,
                importedCount: importResult.success,
                errors: importResult.errors,
                skippedCount: 0
            };
            
            setResult(transformedResult);
            
            // If there are errors, prepare them for editing
            if (transformedResult.errors.length > 0) {
                const allRows = await parseCSVForUI(fileText);
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
            console.error("Error importing incomes:", error);
            alert("Failed to import incomes. Please try again.");
        } finally {
            setImporting(false);
        }
    };

    const handleEditError = (index: number, isEditing: boolean) => {
        setEditableErrors(prev => 
            prev.map((error, i) => 
                i === index ? { ...error, isEditing } : error
            )
        );
    };

    const handleSaveError = async (index: number) => {
        const error = editableErrors[index];
        if (!error) return;
        
        try {
            await importCorrectedRow(error.editedData, csvHeaders);
            
            // Remove this error from the list
            setEditableErrors(prev => prev.filter((_, i) => i !== index));
            
            // Update result
            if (result) {
                setResult({
                    ...result,
                    importedCount: result.importedCount + 1,
                    errors: result.errors.filter(e => e.row !== error.originalRowIndex)
                });
            }
            
            // If no more errors, trigger success
            if (editableErrors.length === 1) {
                onSuccess();
            }
        } catch (err) {
            console.error('Error saving corrected row:', err);
            alert('Failed to save the corrected row. Please try again.');
        }
    };

    const handleRemoveError = (index: number) => {
        const error = editableErrors[index];
        setEditableErrors(prev => prev.filter((_, i) => i !== index));
        
        if (result && error) {
            setResult({
                ...result,
                errors: result.errors.filter(e => e.row !== error.originalRowIndex)
            });
        }
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Bulk Import Incomes
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        Import multiple incomes from a CSV file. Account names from the CSV will be automatically matched with your existing accounts.
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    {!result && (
                        <>
                            {/* File Upload */}
                            <div
                                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="text-center">
                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="mt-4">
                                        <p className="mt-2 block text-sm font-medium text-gray-900">
                                            {file ? file.name : 'Drop your CSV file here'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            or click to browse
                                        </p>
                                        <button
                                            onClick={() => document.getElementById('file-upload')?.click()}
                                            className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                            type="button"
                                        >
                                            Browse Files
                                        </button>
                                        <input
                                            id="file-upload"
                                            name="file-upload"
                                            type="file"
                                            accept=".csv"
                                            className="sr-only"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const selectedFile = e.target.files?.[0];
                                                if (selectedFile) handleFileSelect(selectedFile);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* CSV Format Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                                <div className="text-sm text-blue-800 space-y-1">
                                    <p>• <strong>Required columns:</strong> title, amount, date, category</p>
                                    <p>• <strong>Optional columns:</strong> description, account, tags, notes, recurring</p>
                                    <p>• <strong>Date format:</strong> YYYY-MM-DD</p>
                                    <p>• <strong>Category:</strong> Must match existing category names</p>
                                    <p>• <strong>Account:</strong> Use format "Holder Name - Bank Name" for automatic matching</p>
                                    <p>• <strong>Tags:</strong> Comma-separated values</p>
                                    <p>• <strong>Recurring:</strong> true/false</p>
                                </div>
                            </div>

                            {/* Import Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleImport}
                                    disabled={!file || importing || dataLoading}
                                    className={`px-5 py-2.5 rounded-lg text-sm font-medium ${
                                        !file || importing || dataLoading
                                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                            : 'bg-gray-800 text-white hover:bg-gray-900'
                                    }`}
                                >
                                    {importing ? 'Importing Incomes...' : 'Import Incomes'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* Import Results */}
                    {result && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                {result.importedCount > 0 && (
                                    <div className="flex items-center text-green-600">
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        <span>{result.importedCount} incomes imported successfully</span>
                                    </div>
                                )}
                                {result.errors.length > 0 && (
                                    <div className="flex items-center text-red-600">
                                        <AlertCircle className="h-5 w-5 mr-2" />
                                        <span>{result.errors.length} errors found</span>
                                    </div>
                                )}
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
                                                            onClick={() => handleSaveError(errorIndex)}
                                                            className="text-green-600 hover:text-green-800"
                                                            title="Save changes"
                                                        >
                                                            <Save className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEditError(errorIndex, true)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="Edit row"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveError(errorIndex)}
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
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCellEdit(errorIndex, cellIndex, e.target.value)}
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
                                    onClick={() => {
                                        setFile(null);
                                        setResult(null);
                                        setEditableErrors([]);
                                        setCsvHeaders([]);
                                        setCsvText("");
                                        onClose();
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-md transition-colors"
                                >
                                    Close
                                </button>
                                {result.importedCount > 0 && (
                                    <button
                                        onClick={() => {
                                            onSuccess();
                                            setFile(null);
                                            setResult(null);
                                            setEditableErrors([]);
                                            setCsvHeaders([]);
                                            setCsvText("");
                                            onClose();
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors"
                                    >
                                        Done
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 