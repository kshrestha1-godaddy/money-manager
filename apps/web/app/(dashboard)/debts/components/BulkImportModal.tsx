"use client";

import { useState } from "react";
import { Upload, AlertCircle, CheckCircle, X } from "lucide-react";
import { bulkImportDebts, bulkImportRepayments } from "../actions/debts";
import { ImportResult } from "../../../types/bulkImport";

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [repaymentsFile, setRepaymentsFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [repaymentsResult, setRepaymentsResult] = useState<ImportResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [importStep, setImportStep] = useState<'debts' | 'repayments'>('debts');
    const [debtIdMapping, setDebtIdMapping] = useState<Record<number, number>>({});

    const resetModal = () => {
        setFile(null);
        setRepaymentsFile(null);
        setResult(null);
        setRepaymentsResult(null);
        setImporting(false);
        setDragActive(false);
        setImportStep('debts');
        setDebtIdMapping({});
        onClose();
    };

    const handleFileSelect = (selectedFile: File) => {
        if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
            if (importStep === 'debts') {
                setFile(selectedFile);
                setResult(null);
            } else {
                setRepaymentsFile(selectedFile);
                setRepaymentsResult(null);
            }
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

    const handleImportDebts = async () => {
        if (!file) return;

        setImporting(true);
        try {
            const fileText = await file.text();
            const importResult = await bulkImportDebts(fileText);
            setResult(importResult);
            
            // Store debt ID mapping for repayment import
            if (importResult.success && (importResult as any).debtIdMapping) {
                setDebtIdMapping((importResult as any).debtIdMapping);
            }
            
            if (importResult.success) {
                if (importResult.errors.length === 0) {
                    // If there are no errors, proceed to repayments step
                    setImportStep('repayments');
                }
                // Otherwise, stay on debts step to show errors
            }
        } catch (error) {
            setResult({
                success: false,
                importedCount: 0,
                errors: [{ row: 0, error: error instanceof Error ? error.message : 'Unknown error' }],
                skippedCount: 0
            });
        } finally {
            setImporting(false);
        }
    };

    const handleImportRepayments = async () => {
        if (!repaymentsFile) {
            // If no repayments file is selected, just finish the import process
            onSuccess();
            resetModal();
            return;
        }

        setImporting(true);
        try {
            const fileText = await repaymentsFile.text();
            const importResult = await bulkImportRepayments(fileText, debtIdMapping);
            setRepaymentsResult(importResult);
            
            if (importResult.success && importResult.errors.length === 0) {
                onSuccess();
                resetModal();
            }
        } catch (error) {
            setRepaymentsResult({
                success: false,
                importedCount: 0,
                errors: [{ row: 0, error: error instanceof Error ? error.message : 'Unknown error' }],
                skippedCount: 0
            });
        } finally {
            setImporting(false);
        }
    };

    const handleSkipRepayments = () => {
        onSuccess();
        resetModal();
    };

    const handleBackToDebts = () => {
        setImportStep('debts');
        setRepaymentsFile(null);
        setRepaymentsResult(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">
                        {importStep === 'debts' ? 'Bulk Import Debts' : 'Import Repayments (Optional)'}
                    </h2>
                    <button 
                        onClick={resetModal}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-6">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center mb-4">
                        <div className={`flex items-center ${importStep === 'debts' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${importStep === 'debts' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                1
                            </div>
                            <span>Import Debts</span>
                        </div>
                        <div className="w-16 h-0.5 mx-2 bg-gray-200"></div>
                        <div className={`flex items-center ${importStep === 'repayments' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${importStep === 'repayments' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                2
                            </div>
                            <span>Import Repayments</span>
                        </div>
                    </div>

                    {importStep === 'debts' ? (
                        <>
                            {/* CSV Format Info for Debts */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                                <p className="text-sm text-blue-700 mb-2">
                                    Your CSV should include these columns: <strong>Borrower Name, Amount, Interest Rate (%), Lent Date</strong>
                                </p>
                                <p className="text-sm text-blue-700 mb-2">
                                    Optional columns: Borrower Contact, Borrower Email, Due Date, Status, Purpose, Notes, Account, Bank Name
                                </p>
                                <div className="text-xs text-blue-600 space-y-1">
                                    <p>• Date format: YYYY-MM-DD, MM/DD/YYYY, or DD-MM-YYYY</p>
                                    <p>• Status options: ACTIVE, PARTIALLY_PAID, FULLY_PAID, OVERDUE, DEFAULTED</p>
                                    <p>• Account names from CSV will be automatically matched with existing accounts</p>
                                    <p>• If account is specified, sufficient balance is required for the debt amount</p>
                                </div>
                            </div>

                            {/* File Upload Area for Debts */}
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
                                            onChange={(e) => {
                                                const selectedFile = e.target.files?.[0];
                                                if (selectedFile) handleFileSelect(selectedFile);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Import Button for Debts */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleImportDebts}
                                    disabled={!file || importing}
                                    className={`px-5 py-2.5 rounded-lg text-sm font-medium ${
                                        !file || importing
                                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                            : 'bg-gray-800 text-white hover:bg-gray-900'
                                    }`}
                                >
                                    {importing ? 'Importing...' : 'Import Debts'}
                                </button>
                            </div>

                            {/* Results for Debts */}
                            {result && (
                                <div className="space-y-4">
                                    {/* Success Summary */}
                                    {result.importedCount > 0 && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center">
                                                <CheckCircle className="h-5 w-5 text-green-400" />
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-green-800">
                                                        Successfully imported {result.importedCount} debt{result.importedCount !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Errors */}
                                    {result.errors.length > 0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex">
                                                <AlertCircle className="h-5 w-5 text-red-400" />
                                                <div className="ml-3">
                                                    <h3 className="text-sm font-medium text-red-800">
                                                        {result.errors.length} error{result.errors.length !== 1 ? 's' : ''} occurred during import
                                                    </h3>
                                                    <div className="mt-2 text-sm text-red-700">
                                                        <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                                                            {result.errors.slice(0, 10).map((error, index) => (
                                                                <li key={index}>
                                                                    {error.row > 0 && `Row ${error.row}: `}{error.error}
                                                                </li>
                                                            ))}
                                                            {result.errors.length > 10 && (
                                                                <li className="text-red-500 font-medium">
                                                                    ... and {result.errors.length - 10} more errors
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex justify-end space-x-3">
                                        {result.success ? (
                                            <>
                                                <button
                                                    onClick={() => setImportStep('repayments')}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                >
                                                    Continue to Repayments
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setResult(null)}
                                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                                >
                                                    Try Again
                                                </button>
                                                <button 
                                                    onClick={resetModal}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                >
                                                    Close
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* CSV Format Info for Repayments */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-medium text-blue-900 mb-2">Repayments CSV Format:</h4>
                                <p className="text-sm text-blue-700 mb-2">
                                    Your CSV should include these columns: <strong>Debt ID, Amount, Repayment Date</strong>
                                </p>
                                <p className="text-sm text-blue-700 mb-2">
                                    Optional columns: Notes, Account ID
                                </p>
                                <div className="text-xs text-blue-600 space-y-1">
                                    <p>• Date format: YYYY-MM-DD, MM/DD/YYYY, or DD-MM-YYYY</p>
                                    <p>• Debt ID must match the IDs from the exported debts CSV</p>
                                    <p>• If you just imported debts, the IDs will be mapped automatically</p>
                                    <p>• This step is optional - you can skip if you don't have repayments to import</p>
                                </div>
                            </div>

                            {/* File Upload Area for Repayments */}
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
                                            {repaymentsFile ? repaymentsFile.name : 'Drop your CSV file here'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            or click to browse
                                        </p>
                                        <button
                                            onClick={() => document.getElementById('repayments-upload')?.click()}
                                            className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                            type="button"
                                        >
                                            Browse Files
                                        </button>
                                        <input
                                            id="repayments-upload"
                                            name="repayments-upload"
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

                            {/* Import Button for Repayments */}
                            <div className="flex justify-between">
                                <button
                                    onClick={handleBackToDebts}
                                    className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                    Back
                                </button>
                                <div className="space-x-3">
                                    <button
                                        onClick={handleSkipRepayments}
                                        className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        Skip Repayments
                                    </button>
                                    <button
                                        onClick={handleImportRepayments}
                                        disabled={!repaymentsFile || importing}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-medium ${
                                            !repaymentsFile || importing
                                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                                : 'bg-gray-800 text-white hover:bg-gray-900'
                                        }`}
                                    >
                                        {importing ? 'Importing...' : 'Import Repayments'}
                                    </button>
                                </div>
                            </div>

                            {/* Results for Repayments */}
                            {repaymentsResult && (
                                <div className="space-y-4">
                                    {/* Success Summary */}
                                    {repaymentsResult.importedCount > 0 && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center">
                                                <CheckCircle className="h-5 w-5 text-green-400" />
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-green-800">
                                                        Successfully imported {repaymentsResult.importedCount} repayment{repaymentsResult.importedCount !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Errors */}
                                    {repaymentsResult.errors.length > 0 && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex">
                                                <AlertCircle className="h-5 w-5 text-red-400" />
                                                <div className="ml-3">
                                                    <h3 className="text-sm font-medium text-red-800">
                                                        {repaymentsResult.errors.length} error{repaymentsResult.errors.length !== 1 ? 's' : ''} occurred during import
                                                    </h3>
                                                    <div className="mt-2 text-sm text-red-700">
                                                        <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                                                            {repaymentsResult.errors.slice(0, 10).map((error, index) => (
                                                                <li key={index}>
                                                                    {error.row > 0 && `Row ${error.row}: `}{error.error}
                                                                </li>
                                                            ))}
                                                            {repaymentsResult.errors.length > 10 && (
                                                                <li className="text-red-500 font-medium">
                                                                    ... and {repaymentsResult.errors.length - 10} more errors
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex justify-end space-x-3">
                                        {repaymentsResult.success && repaymentsResult.errors.length === 0 ? (
                                            <button 
                                                onClick={resetModal}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                            >
                                                Close
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setRepaymentsResult(null)}
                                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                                                >
                                                    Try Again
                                                </button>
                                                <button 
                                                    onClick={resetModal}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                >
                                                    Close
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 