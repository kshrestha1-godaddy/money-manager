"use client";

import { useState } from "react";
import { Upload, AlertCircle, CheckCircle, X, Download } from "lucide-react";
import { processAccountImport, ParsedAccountData, createAccountImportTemplate } from "../../../utils/csv";

interface ImportResult {
    success: boolean;
    data: ParsedAccountData[];
    errors: string[];
    warnings: string[];
    totalRows: number;
    validRows: number;
}

interface ImportAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (accounts: ParsedAccountData[]) => void;
    isImporting?: boolean;
}

export function ImportAccountModal({ isOpen, onClose, onImport, isImporting: serverImporting = false }: ImportAccountModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [showSuccessResult, setShowSuccessResult] = useState(false);

    const resetModal = () => {
        setFile(null);
        setResult(null);
        setImporting(false);
        setDragActive(false);
        setShowSuccessResult(false);
        onClose();
    };

    const handleFileSelect = (selectedFile: File) => {
        if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile);
            setResult(null);
            setShowSuccessResult(false);
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
            const importResult = await processAccountImport(file);
            setResult(importResult);
            
            // Only call onImport if we have valid data - this will trigger the actual save
            if (importResult.success && importResult.validatedData && importResult.validatedData.length > 0) {
                // Don't close modal automatically - let user see warnings first
                setShowSuccessResult(true);
                onImport(importResult.validatedData);
            }
        } catch (error) {
            setResult({
                success: false,
                data: [],
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                warnings: [],
                totalRows: 0,
                validRows: 0
            });
            setShowSuccessResult(false);
        } finally {
            setImporting(false);
        }
    };
    
    const handleCompleteImport = () => {
        // This will be called when user clicks "Done" after seeing warnings
        resetModal();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Bulk Import Accounts</h2>
                    <button 
                        onClick={resetModal}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">
                    Import accounts from CSV files. Account names from the CSV will be automatically matched with your existing accounts.
                </p>
                
                <div className="grid grid-cols-1 gap-6">
                    {/* Account CSV Upload Section */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Account CSV File (Required)</h3>
                        
                        {/* Upload Area */}
                        <div
                            className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
                                dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="text-center">
                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="mt-4">
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <span className="mt-2 block text-sm font-medium text-gray-900">
                                            {file ? file.name : 'Drop accounts CSV here'}
                                        </span>
                                        <span className="text-xs text-gray-500 block mt-1">
                                            or click to browse
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
                                
                                <div className="mt-6 flex justify-center space-x-4">
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById('file-upload') as HTMLInputElement;
                                            input?.click();
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Browse Files
                                    </button>
                                    <button
                                        onClick={() => createAccountImportTemplate()}
                                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
                                    >
                                        <Download size={16} />
                                        <span>Download Template</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Format Information */}
                        <div className="mt-4 bg-blue-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">ACCOUNT CSV Format:</h4>
                            <div className="text-sm text-blue-800 space-y-1">
                                <div><strong>Required:</strong> Holder Name, Account Number, Bank Name, Branch Name</div>
                                <div><strong>Optional:</strong> Branch Code, Bank Address, Account Type, Mobile Numbers, Branch Contacts, SWIFT Code, Bank Email, Account Opening Date, Security Questions, Balance, App Username, Notes, Nickname</div>
                                <div><strong>Date format:</strong> YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY</div>
                                <div><strong>Multiple values:</strong> Separate with semicolons (e.g., "555-1234; 555-5678")</div>
                                <div><strong>Account numbers:</strong> Must be unique</div>
                                <div><strong>Balance:</strong> Numbers with or without currency symbols</div>
                                <div><strong>Notes:</strong> Can contain line breaks (will be preserved)</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Import Results */}
                {result && (
                    <div className="mt-6 space-y-4">
                        <div className={`flex items-center justify-center space-x-6 py-4 rounded-lg ${
                            showSuccessResult && result.success 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-gray-50'
                        }`}>
                            {result.validRows > 0 && (
                                <div className="flex items-center text-green-600">
                                    <CheckCircle className="h-5 w-5 mr-2" />
                                    <span className="font-medium">
                                        {showSuccessResult 
                                            ? `${result.validRows} accounts imported successfully!` 
                                            : `${result.validRows} accounts ready to import`
                                        }
                                    </span>
                                </div>
                            )}
                            {result.errors.length > 0 && (
                                <div className="flex items-center text-red-600">
                                    <AlertCircle className="h-5 w-5 mr-2" />
                                    <span className="font-medium">{result.errors.length} errors found</span>
                                </div>
                            )}
                            {result.warnings && result.warnings.length > 0 && (
                                <div className="flex items-center text-yellow-600">
                                    <AlertCircle className="h-5 w-5 mr-2" />
                                    <span className="font-medium">{result.warnings.length} warnings</span>
                                </div>
                            )}
                        </div>
                        
                        {showSuccessResult && result.warnings && result.warnings.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-start">
                                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800">
                                            Import completed with {result.warnings.length} warning{result.warnings.length !== 1 ? 's' : ''}
                                        </h3>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <p className="mb-2">Your accounts were imported successfully, but please review these warnings:</p>
                                            <ul className="list-disc pl-5 space-y-1 max-h-32 overflow-y-auto">
                                                {result.warnings.slice(0, 10).map((warning, index) => (
                                                    <li key={index}>
                                                        {warning}
                                                    </li>
                                                ))}
                                                {result.warnings.length > 10 && (
                                                    <li className="text-yellow-600 font-medium">
                                                        ... and {result.warnings.length - 10} more warnings
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                            {/* Preview of Valid Accounts - only show before import */}
                            {!showSuccessResult && result.validRows > 0 && result.data.length > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="font-medium text-green-900 mb-2">
                                        Preview of Valid Accounts ({result.validRows} accounts):
                                    </h3>
                                    <div className="max-h-64 overflow-y-auto overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-green-100">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-green-800">Holder Name</th>
                                                    <th className="px-3 py-2 text-left text-green-800">Bank Name</th>
                                                    <th className="px-3 py-2 text-left text-green-800">Account Number</th>
                                                    <th className="px-3 py-2 text-left text-green-800">Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.data.slice(0, 5).map((account, index) => (
                                                    <tr key={index} className="border-t border-green-200">
                                                        <td className="px-3 py-2 text-green-700">{account.holderName}</td>
                                                        <td className="px-3 py-2 text-green-700">{account.bankName}</td>
                                                        <td className="px-3 py-2 text-green-700">{account.accountNumber}</td>
                                                        <td className="px-3 py-2 text-green-700">{account.balance || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                                {result.data.length > 5 && (
                                                    <tr className="border-t border-green-200">
                                                        <td colSpan={4} className="px-3 py-2 text-center text-green-600">
                                                            ... and {result.data.length - 5} more accounts
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Warning Details - only show before import */}
                            {!showSuccessResult && result.warnings && result.warnings.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex">
                                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-yellow-800">
                                                {result.warnings.length} warning{result.warnings.length !== 1 ? 's' : ''}
                                            </h3>
                                            <div className="mt-2 text-sm text-yellow-700">
                                                <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                                                    {result.warnings.slice(0, 10).map((warning, index) => (
                                                        <li key={index}>
                                                            {warning}
                                                        </li>
                                                    ))}
                                                    {result.warnings.length > 10 && (
                                                        <li className="text-yellow-600 font-medium">
                                                            ... and {result.warnings.length - 10} more warnings
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Details */}
                            {result.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex">
                                        <AlertCircle className="h-5 w-5 text-red-400" />
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800">
                                                {result.errors.length} error{result.errors.length !== 1 ? 's' : ''} occurred during processing
                                            </h3>
                                            <div className="mt-2 text-sm text-red-700">
                                                <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                                                    {result.errors.slice(0, 10).map((error, index) => (
                                                        <li key={index}>
                                                            {error}
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

                    </div>
                )}

                {/* Import Button */}
                <div className="mt-8 flex justify-end space-x-3">
                    {showSuccessResult && result?.success ? (
                        <>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setResult(null);
                                    setShowSuccessResult(false);
                                }}
                                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                            >
                                Import More
                            </button>
                            <button
                                onClick={handleCompleteImport}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                            >
                                Done
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleImport}
                            disabled={!file || importing || serverImporting}
                            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {importing ? 'Processing...' : serverImporting ? 'Importing Accounts...' : 'Import Accounts'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
} 