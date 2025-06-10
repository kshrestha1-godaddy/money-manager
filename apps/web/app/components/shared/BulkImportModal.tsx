"use client";

import { useState, useEffect } from "react";
import { Upload, AlertCircle, CheckCircle, Edit, Trash2, Save } from "lucide-react";
import { AccountInterface } from "../../types/accounts";
import { ImportResult, EditableError } from "../../types/bulkImport";
import { Category } from "../../types/financial";
import { TransactionType } from "../../utils/formUtils";
import { useFinancialFormData } from "../../hooks/useFinancialFormData";

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transactionType: TransactionType;
    bulkImportAction: (file: File, defaultAccountId: string, transactionType: TransactionType) => Promise<ImportResult>;
    parseCSVAction: (csvText: string) => Promise<string[][]>;
    importCorrectedRowAction?: (rowData: string[], headers: string[], transactionType: TransactionType) => Promise<any>;
}

export function BulkImportModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    transactionType,
    bulkImportAction,
    parseCSVAction,
    importCorrectedRowAction 
}: BulkImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [defaultAccountId, setDefaultAccountId] = useState<string>("");
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [editableErrors, setEditableErrors] = useState<EditableError[]>([]);
    const [csvText, setCsvText] = useState<string>("");

    const { accounts, categories, loading, error } = useFinancialFormData(transactionType);

    const transactionLabel = transactionType === 'EXPENSE' ? 'expenses' : 'incomes';
    const TransactionLabel = transactionType === 'EXPENSE' ? 'Expenses' : 'Incomes';

    const handleFileSelect = (selectedFile: File) => {
        if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile);
            setResult(null);
            setEditableErrors([]);
        } else {
            alert('Please select a CSV file');
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file || !defaultAccountId) return;

        setImporting(true);
        try {
            const importResult = await bulkImportAction(file, defaultAccountId, transactionType);
            setResult(importResult);

            // If there are errors, prepare them for editing
            if (importResult.errors.length > 0) {
                const fileText = await file.text();
                setCsvText(fileText);
                const allRows = await parseCSVAction(fileText);
                
                if (Array.isArray(allRows) && allRows.length > 1) {
                    const headers = allRows[0];
                    if (headers) {
                        setCsvHeaders(headers);
                        const dataRows = allRows.slice(1);
                        
                        const editableErrorList: EditableError[] = importResult.errors.map(errorItem => {
                            const originalRowIndex = errorItem.row - 2;
                            const rowData = dataRows[originalRowIndex] || [];
                            return {
                                originalRowIndex: errorItem.row,
                                rowData: [...rowData],
                                editedData: [...rowData],
                                error: errorItem.error,
                                isEditing: false
                            };
                        });
                        setEditableErrors(editableErrorList);
                    }
                }
            }

            const successCount = typeof importResult.success === 'number' ? importResult.success : (importResult.success ? 1 : 0);
            if (successCount > 0 && importResult.errors.length === 0) {
                onSuccess();
                setFile(null);
                setResult(null);
                setDefaultAccountId("");
            }
        } catch (error) {
            console.error(`Error importing ${transactionLabel}:`, error);
            alert(`Failed to import ${transactionLabel}. Please try again.`);
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
        if (!importCorrectedRowAction) return;
        
        const error = editableErrors[index];
        if (!error) return;
        
        try {
            await importCorrectedRowAction(error.editedData, csvHeaders, transactionType);
            
            // Remove this error from the list
            setEditableErrors(prev => prev.filter((_, i) => i !== index));
            
            // Update result
            if (result) {
                const currentSuccess = typeof result.success === 'number' ? result.success : (result.success ? 1 : 0);
                setResult({
                    ...result,
                    success: (currentSuccess + 1) as any,
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

    const handleClose = () => {
        setFile(null);
        setResult(null);
        setDefaultAccountId("");
        setEditableErrors([]);
        setCsvHeaders([]);
        setCsvText("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Bulk Import {TransactionLabel}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        Import multiple {transactionLabel} from a CSV file
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    {!result && (
                        <>
                            {/* Default Account Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Default Account (for rows without account specified) *
                                </label>
                                <select
                                    value={defaultAccountId}
                                    onChange={(e) => setDefaultAccountId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={loading}
                                >
                                    <option value="">Select default account</option>
                                    {accounts.map(account => (
                                        <option key={account.id} value={account.id}>
                                            {account.bankName} - {account.holderName} ({account.accountType})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* File Upload */}
                            <div
                                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                                    dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <div className="text-center">
                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="mt-4">
                                        <label htmlFor="file-upload" className="cursor-pointer">
                                            <span className="mt-2 block text-sm font-medium text-gray-900">
                                                {file ? file.name : `Choose CSV file or drag and drop`}
                                            </span>
                                            <span className="text-xs text-gray-500 block mt-1">
                                                CSV files only
                                            </span>
                                        </label>
                                        <input
                                            id="file-upload"
                                            name="file-upload"
                                            type="file"
                                            accept=".csv"
                                            className="sr-only"
                                            onChange={(e) => {
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
                                    <p>• <strong>Account:</strong> Must match existing account names (or leave empty to use default)</p>
                                    <p>• <strong>Tags:</strong> Comma-separated values</p>
                                </div>
                            </div>

                            {/* Import Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleImport}
                                    disabled={!file || !defaultAccountId || importing}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {importing ? `Importing ${TransactionLabel}...` : `Import ${TransactionLabel}`}
                                </button>
                            </div>
                        </>
                    )}

                    {/* Import Results */}
                    {result && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                {((typeof result.success === 'number' && result.success > 0) || (typeof result.success === 'boolean' && result.success)) && (
                                    <div className="flex items-center text-green-600">
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        <span>{typeof result.success === 'number' ? result.success : 'Some'} {transactionLabel} imported successfully</span>
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
                                                            onChange={(e) => handleCellEdit(errorIndex, cellIndex, e.target.value)}
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
                                    onClick={handleClose}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-md transition-colors"
                                >
                                    Close
                                </button>
                                {((typeof result.success === 'number' && result.success > 0) || (typeof result.success === 'boolean' && result.success)) || editableErrors.length === 0 ? (
                                    <button
                                        onClick={() => {
                                            onSuccess();
                                            handleClose();
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors"
                                    >
                                        Done
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 