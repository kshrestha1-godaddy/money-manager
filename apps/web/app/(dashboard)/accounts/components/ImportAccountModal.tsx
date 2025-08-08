"use client";

import { useState } from "react";
import { Upload, AlertCircle, CheckCircle, X } from "lucide-react";
import { parseAccountsCSV, readFileAsText, ParsedAccountData, ImportResult } from "../../../utils/csvImport";

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

    const resetModal = () => {
        setFile(null);
        setResult(null);
        setImporting(false);
        setDragActive(false);
        onClose();
    };

    const handleFileSelect = (selectedFile: File) => {
        if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile);
            setResult(null);
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
            const csvContent = await readFileAsText(file);
            const importResult = parseAccountsCSV(csvContent);
            setResult(importResult);
            
            // Only call onImport if we have valid data - this will trigger the actual save
            if (importResult.success && importResult.data.length > 0) {
                onImport(importResult.data);
                // Don't reset modal immediately - let the user see the result
                // Modal will be closed by the hook after successful save
            }
        } catch (error) {
            setResult({
                success: false,
                data: [],
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                totalRows: 0,
                validRows: 0
            });
        } finally {
            setImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Import Accounts</h2>
                    <button 
                        onClick={resetModal}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-6">
                    {/* CSV Format Info */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                        <p className="text-sm text-blue-700 mb-2">
                            Your CSV should include these columns: <strong>Holder Name, Account Number, Branch Code, Bank Name, Branch Name, Bank Address, Account Type, SWIFT Code, Account Opening Date</strong>
                        </p>
                        <p className="text-sm text-blue-700 mb-2">
                            Optional columns: Mobile Numbers, Branch Contacts, Bank Email, Security Questions, Balance, App Username, Notes, Nickname
                        </p>
                        <div className="text-xs text-blue-600 space-y-1">
                            <p>• Date format: YYYY-MM-DD (e.g., 2024-01-15)</p>
                            <p>• Multiple values separated by semicolons (e.g., "123456789;987654321")</p>
                            <p>• Account numbers must be unique</p>
                            <p>• Balance should be a number (if provided)</p>
                            <p>• Empty cells are allowed for optional fields</p>
                        </div>
                    </div>

                    {/* File Upload Area */}
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
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    <span className="mt-2 block text-sm font-medium text-gray-900">
                                        {file ? file.name : 'Choose CSV file or drag and drop'}
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

                    {/* Import Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleImport}
                            disabled={!file || importing || serverImporting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {importing ? 'Parsing CSV...' : serverImporting ? 'Saving Accounts...' : 'Import Accounts'}
                        </button>
                    </div>

                    {/* Import Results */}
                    {result && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                                {result.validRows > 0 && (
                                    <div className="flex items-center text-green-600">
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        <span>{result.validRows} accounts imported successfully</span>
                                    </div>
                                )}
                                {result.errors.length > 0 && (
                                    <div className="flex items-center text-red-600">
                                        <AlertCircle className="h-5 w-5 mr-2" />
                                        <span>{result.errors.length} errors found</span>
                                    </div>
                                )}
                            </div>

                            {/* Preview of Valid Accounts */}
                            {result.validRows > 0 && result.data.length > 0 && (
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

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setResult(null);
                                        onClose();
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-md transition-colors"
                                >
                                    Close
                                </button>
                                {result.validRows > 0 && (
                                    <button
                                        onClick={() => {
                                            onImport(result.data);
                                            setFile(null);
                                            setResult(null);
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