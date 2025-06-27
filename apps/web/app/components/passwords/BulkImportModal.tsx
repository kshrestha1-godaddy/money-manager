"use client";

import React, { useState } from "react";
import { Upload, AlertCircle, CheckCircle, Bug } from "lucide-react";
import { ImportResult, EditableError } from "../../types/bulkImport";
import { bulkImportPasswords, readFileAsText, parsePasswordsCSV } from "../../utils/csvImportPasswords";

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
    const [secretKey, setSecretKey] = useState<string>("");
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [showDebug, setShowDebug] = useState(false);

    const resetModal = () => {
        setFile(null);
        setResult(null);
        setImporting(false);
        setDragActive(false);
        setSecretKey("");
        setShowSecretKey(false);
        setDebugInfo(null);
        setShowDebug(false);
        onClose();
    };

    const handleFileSelect = (selectedFile: File) => {
        if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile);
            setResult(null);
            setDebugInfo(null);
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

    const handleDebug = async () => {
        if (!file) return;
        
        try {
            const fileContent = await readFileAsText(file);
            const parseResult = parsePasswordsCSV(fileContent);
            
            // Create a sanitized version of the data for display
            const sanitizedData = parseResult.data?.map(item => ({
                ...item,
                password: item.password ? '[REDACTED]' : undefined,
                transactionPin: item.transactionPin ? '[REDACTED]' : undefined,
            }));
            
            setDebugInfo({
                headers: fileContent.split('\n')[0],
                parseResult: {
                    ...parseResult,
                    data: sanitizedData
                }
            });
            
            setShowDebug(true);
        } catch (error) {
            console.error('Error debugging CSV:', error);
            setDebugInfo({
                error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
            setShowDebug(true);
        }
    };

    const handleImport = async () => {
        if (!file || !secretKey) {
            alert('Please select a file and enter your secret key');
            return;
        }

        setImporting(true);
        try {
            // First parse the file to get debug info
            const fileContent = await readFileAsText(file);
            const parseResult = parsePasswordsCSV(fileContent);
            
            // Create a sanitized version of the data for display
            const sanitizedData = parseResult.data?.map(item => ({
                ...item,
                password: item.password ? '[REDACTED]' : undefined,
                transactionPin: item.transactionPin ? '[REDACTED]' : undefined,
            }));
            
            setDebugInfo({
                headers: fileContent.split('\n')[0],
                parseResult: {
                    ...parseResult,
                    data: sanitizedData
                }
            });
            
            // Now do the actual import
            const importResult = await bulkImportPasswords(file, secretKey);
            setResult(importResult);
            
            if (importResult.success && importResult.importedCount > 0) {
                onSuccess();
                setTimeout(() => {
                    resetModal();
                }, 3000);
            }
        } catch (error) {
            console.error('Error importing passwords:', error);
            setResult({
                success: false,
                importedCount: 0,
                errors: [{ row: 0, error: `Error importing passwords: ${error instanceof Error ? error.message : 'Unknown error'}` }],
                skippedCount: 0
            });
        } finally {
            setImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">Import Passwords from CSV</h2>
                        <button
                            onClick={resetModal}
                            className="text-gray-400 hover:text-gray-500"
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-6">
                        {!result ? (
                            <>
                                {/* File Upload Area */}
                                <div 
                                    className={`border-2 border-dashed rounded-lg p-6 text-center ${
                                        dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <div className="flex flex-col items-center justify-center">
                                        <Upload className="h-12 w-12 text-gray-400 mb-3" />
                                        <p className="text-lg font-medium text-gray-900">
                                            Drop your CSV file here
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            or click to browse
                                        </p>
                                        <button
                                            onClick={() => document.getElementById('file-upload')?.click()}
                                            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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

                                {/* CSV Format Info */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                                    <div className="text-sm text-blue-800 space-y-1">
                                        <p>• <strong>Required columns:</strong> Website Name, Username, and either Password or Password Hash</p>
                                        <p>• <strong>Optional columns:</strong> Description, Transaction PIN, Transaction PIN Hash, Validity, Notes, Category, Tags</p>
                                        <p>• <strong>Date format:</strong> YYYY-MM-DD</p>
                                        <p>• <strong>Tags:</strong> Semicolon-separated values (e.g., "tag1;tag2;tag3")</p>
                                        <p>• <strong>Note:</strong> You can use a previously exported CSV file directly</p>
                                    </div>
                                </div>

                                {/* Secret Key Input */}
                                <div className="mt-4">
                                    <label htmlFor="secret-key" className="block text-sm font-medium text-gray-700 mb-1">
                                        Secret Key (for password encryption)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showSecretKey ? "text" : "password"}
                                            id="secret-key"
                                            value={secretKey}
                                            onChange={(e) => setSecretKey(e.target.value)}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter your secret key"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                            onClick={() => setShowSecretKey(!showSecretKey)}
                                        >
                                            {showSecretKey ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        This key will be used to encrypt your passwords. Keep it safe and remember it for future use.
                                    </p>
                                </div>

                                {/* Selected File Info */}
                                {file && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900">Selected File:</h4>
                                        <p className="text-sm text-gray-600">{file.name} ({Math.round(file.size / 1024)} KB)</p>
                                        
                                        {/* Debug Button */}
                                        <div className="mt-2">
                                            <button
                                                onClick={handleDebug}
                                                className="inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                                            >
                                                <Bug className="h-3 w-3 mr-1" />
                                                Debug CSV
                                            </button>
                                        </div>
                                        
                                        {/* Debug Info */}
                                        {showDebug && debugInfo && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-40">
                                                <div className="font-bold">Headers:</div>
                                                <div className="text-gray-700 mb-2">{debugInfo.headers}</div>
                                                
                                                {debugInfo.parseResult && (
                                                    <>
                                                        <div className="font-bold">Parse Result:</div>
                                                        <div className="text-gray-700">
                                                            Success: {debugInfo.parseResult.success ? 'Yes' : 'No'}<br />
                                                            Records: {debugInfo.parseResult.data?.length || 0}<br />
                                                            Errors: {debugInfo.parseResult.errors.length}<br />
                                                            {debugInfo.parseResult.errors.length > 0 && (
                                                                <div className="text-red-600 mt-1">
                                                                    {debugInfo.parseResult.errors.map((err: any, i: number) => (
                                                                        <div key={i}>{err.error}</div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                                
                                                {debugInfo.error && (
                                                    <div className="text-red-600">{debugInfo.error}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Import Button */}
                                <div className="flex justify-end mt-6">
                                    <button
                                        onClick={resetModal}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleImport}
                                        disabled={!file || importing || !secretKey}
                                        className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                                            !file || importing || !secretKey
                                                ? 'bg-blue-400 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                        {importing ? 'Importing...' : 'Import Passwords'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                {/* Result Summary */}
                                <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                    <div className="flex items-start">
                                        {result.success ? (
                                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                        ) : (
                                            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                                        )}
                                        <div>
                                            <h3 className={`text-lg font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                                {result.success ? 'Import Successful' : 'Import Failed'}
                                            </h3>
                                            <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                                {result.success 
                                                    ? `Successfully imported ${result.importedCount} password${result.importedCount !== 1 ? 's' : ''}.` 
                                                    : 'Failed to import passwords. Please check the errors below.'}
                                            </p>
                                            {result.skippedCount > 0 && (
                                                <p className="text-sm text-amber-700 mt-1">
                                                    Skipped {result.skippedCount} row{result.skippedCount !== 1 ? 's' : ''} due to errors.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Error List */}
                                {result.errors.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                                        <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                                            <ul className="divide-y divide-red-200">
                                                {result.errors.map((error, index) => (
                                                    <li key={index} className="p-3 text-sm text-red-800">
                                                        <span className="font-medium">{error.row > 0 ? `Row ${error.row}: ` : ''}</span>
                                                        {error.error}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-end mt-6">
                                    <button
                                        onClick={resetModal}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 mr-2"
                                    >
                                        Close
                                    </button>
                                    {!result.success && (
                                        <button
                                            onClick={() => {
                                                setResult(null);
                                                setImporting(false);
                                            }}
                                            className="px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700"
                                        >
                                            Try Again
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 