import { useState, useEffect } from "react";
import { Button } from "@repo/ui/button";
import { Upload, AlertCircle, CheckCircle, Edit, Trash2, Save } from "lucide-react";
import { bulkImportExpenses, parseCSVForUI, importCorrectedRow } from "../../actions/expenses";
import { ImportResult, EditableError } from "../../types/bulkImport";
import { useExpenseFormData } from "../../hooks/useExpenseFormData";

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
            if (rows && rows.length > 0) {
                setCsvHeaders(rows[0] || []);
            }
            
            // Import without requiring default account - let CSV account names be matched automatically
            const importResult = await bulkImportExpenses(fileText);
            setResult(importResult);
            
            // If there are errors, prepare them for editing
            if (importResult.errors.length > 0) {
                const allRows = await parseCSVForUI(fileText);
                if (Array.isArray(allRows) && allRows.length > 1) {
                    const dataRows = allRows.slice(1);
                    
                    const editableErrorList: EditableError[] = importResult.errors
                        .slice(0, 10) // Limit to first 10 errors for better UX
                        .map(error => {
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

        try {
            // Import corrected row without requiring default account
            const result = await importCorrectedRow(error.editedData, csvHeaders);
            
            if (result.success) {
                // Remove the error from the list
                setEditableErrors(prev => prev.filter((_, i) => i !== index));
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

    const handleFieldChange = (errorIndex: number, fieldIndex: number, value: string) => {
        setEditableErrors(prev => prev.map((error, i) => 
            i === errorIndex 
                ? { ...error, editedData: error.editedData.map((field, j) => j === fieldIndex ? value : field) }
                : error
        ));
    };

    const resetModal = () => {
        setFile(null);
        setResult(null);
        setImporting(false);
        setCsvHeaders([]);
        setEditableErrors([]);
        setCsvText("");
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
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {csvHeaders.map((header, headerIndex) => {
                                                            const value = error.editedData[headerIndex] || '';
                                                            const isCategory = header.toLowerCase().includes('category');
                                                            const isAccount = header.toLowerCase().includes('account');
                                                            
                                                            return (
                                                                <div key={headerIndex}>
                                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                        {header}
                                                                    </label>
                                                                    {isCategory ? (
                                                                        <select
                                                                            value={value}
                                                                            onChange={(e) => handleFieldChange(index, headerIndex, e.target.value)}
                                                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                        >
                                                                            <option value="">Select category</option>
                                                                            {categories.map(cat => (
                                                                                <option key={cat.id} value={cat.name}>
                                                                                    {cat.name}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    ) : isAccount ? (
                                                                        <select
                                                                            value={value}
                                                                            onChange={(e) => handleFieldChange(index, headerIndex, e.target.value)}
                                                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                                                            type={header.toLowerCase().includes('amount') ? 'number' : 
                                                                                  header.toLowerCase().includes('date') ? 'date' : 'text'}
                                                                            value={value}
                                                                            onChange={(e) => handleFieldChange(index, headerIndex, e.target.value)}
                                                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                            step={header.toLowerCase().includes('amount') ? '0.01' : undefined}
                                                                        />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                                                        {csvHeaders.map((header, headerIndex) => (
                                                            <div key={headerIndex}>
                                                                <span className="font-medium text-gray-600">{header}:</span>
                                                                <span className="ml-1 text-gray-800">
                                                                    {error.rowData[headerIndex] || '(empty)'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Show remaining non-editable errors if any */}
                            {result.errors.length > editableErrors.length && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-700 mb-2">
                                        Additional Errors ({result.errors.length - editableErrors.length} more):
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        Only the first 10 errors are shown for editing. Please fix these errors and re-import the file.
                                    </p>
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
                                className={`px-4 py-2 rounded-md ${
                                    importing 
                                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
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