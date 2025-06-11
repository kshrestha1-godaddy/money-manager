"use client";

import { useState, useRef } from "react";
import { Button } from "@repo/ui/button";
import { parseAccountsCSV, readFileAsText, ParsedAccountData, ImportResult } from "../../utils/csvImport";

interface ImportAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (accounts: ParsedAccountData[]) => void;
}

export function ImportAccountModal({ isOpen, onClose, onImport }: ImportAccountModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [step, setStep] = useState<'select' | 'preview' | 'complete'>('select');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                alert('Please select a CSV file');
                return;
            }
            setSelectedFile(file);
            setImportResult(null);
        }
    };

    const handlePreview = async () => {
        if (!selectedFile) return;

        setIsLoading(true);
        try {
            const csvContent = await readFileAsText(selectedFile);
            const result = parseAccountsCSV(csvContent);
            setImportResult(result);
            setStep('preview');
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Failed to read the CSV file. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = () => {
        if (importResult && importResult.data.length > 0) {
            onImport(importResult.data);
            setStep('complete');
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setImportResult(null);
        setStep('select');
        onClose();
    };

    const handleReset = () => {
        setSelectedFile(null);
        setImportResult(null);
        setStep('select');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Import Accounts from CSV
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {step === 'select' && (
                        <div className="space-y-6">
                            <div>
                                <p className="text-gray-600 mb-4">
                                    Select a CSV file to import bank accounts. Only the core account information is required - contact and security details are optional.
                                </p>
                                
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                    <div className="text-gray-400 text-4xl mb-4">📄</div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="csv-file-input"
                                    />
                                    <label
                                        htmlFor="csv-file-input"
                                        className="cursor-pointer inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Choose CSV File
                                    </label>
                                    {selectedFile && (
                                        <div className="mt-4">
                                            <p className="text-sm text-gray-600">
                                                Selected: <span className="font-medium">{selectedFile.name}</span>
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Size: {(selectedFile.size / 1024).toFixed(2)} KB
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Required Fields */}
                                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h3 className="font-medium text-red-900 mb-2">✅ Required Headers (Must be present):</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm text-red-700">
                                        <div>• Holder Name</div>
                                        <div>• Account Number</div>
                                        <div>• Branch Code</div>
                                        <div>• Bank Name</div>
                                        <div>• Branch Name</div>
                                        <div>• Bank Address</div>
                                        <div>• Account Type</div>
                                        <div>• SWIFT Code</div>
                                        <div>• Account Opening Date</div>
                                    </div>
                                </div>

                                {/* Optional Fields */}
                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="font-medium text-blue-900 mb-2">⚙️ Optional Headers (Can be empty or missing):</h3>
                                    <div className="text-sm text-blue-700 space-y-1">
                                        <div><strong>Contact Information:</strong> Mobile Numbers, Branch Contacts, Bank Email</div>
                                        <div><strong>Security Information:</strong> Security Questions</div>
                                        <div><strong>Mobile Banking:</strong> App Username</div>
                                        <div><strong>Additional Info:</strong> Balance, Notes, Nickname</div>
                                        <div><strong>System Fields:</strong> ID, Created At, Updated At</div>
                                    </div>
                                </div>

                                {/* Format Requirements */}
                                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="font-medium text-green-900 mb-2">📋 Format Requirements:</h3>
                                    <ul className="text-sm text-green-700 space-y-1">
                                        <li>• Date format: YYYY-MM-DD (e.g., 2024-01-15)</li>
                                        <li>• Multiple values separated by semicolons (e.g., "123456789;987654321")</li>
                                        <li>• Account numbers must be unique</li>
                                        <li>• Balance should be a number (if provided)</li>
                                        <li>• Empty cells are allowed for optional fields</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && importResult && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-2">Import Summary</h3>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Total Rows:</span>
                                        <span className="ml-2 font-medium">{importResult.totalRows}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Valid Rows:</span>
                                        <span className="ml-2 font-medium text-green-600">{importResult.validRows}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Errors:</span>
                                        <span className="ml-2 font-medium text-red-600">{importResult.errors.length}</span>
                                    </div>
                                </div>
                            </div>

                            {importResult.errors.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h3 className="font-medium text-red-900 mb-2">Errors Found:</h3>
                                    <div className="max-h-32 overflow-y-auto">
                                        {importResult.errors.map((error, index) => (
                                            <p key={index} className="text-sm text-red-700">{error}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {importResult.validRows > 0 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="font-medium text-green-900 mb-2">
                                        Preview of Valid Accounts ({importResult.validRows} accounts):
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
                                                {importResult.data.slice(0, 5).map((account, index) => (
                                                    <tr key={index} className="border-t border-green-200">
                                                        <td className="px-3 py-2 text-green-700">{account.holderName}</td>
                                                        <td className="px-3 py-2 text-green-700">{account.bankName}</td>
                                                        <td className="px-3 py-2 text-green-700">{account.accountNumber}</td>
                                                        <td className="px-3 py-2 text-green-700">{account.balance || 'N/A'}</td>
                                                    </tr>
                                                ))}
                                                {importResult.data.length > 5 && (
                                                    <tr className="border-t border-green-200">
                                                        <td colSpan={4} className="px-3 py-2 text-center text-green-600">
                                                            ... and {importResult.data.length - 5} more accounts
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="text-center space-y-4">
                            <div className="text-green-500 text-6xl">✅</div>
                            <h3 className="text-xl font-medium text-gray-900">Import Completed Successfully!</h3>
                            <p className="text-gray-600">
                                {importResult?.validRows} accounts have been imported successfully.
                            </p>
                            <p className="text-sm text-gray-500">
                                Accounts with missing optional information (contacts, security details, etc.) were still imported successfully.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center p-6 border-t bg-gray-50">
                    {step === 'select' && (
                        <>
                            <div></div>
                            <div className="flex space-x-3">
                                <Button onClick={handleClose}>Cancel</Button>
                                {!selectedFile || isLoading ? (
                                    <button
                                        className="px-5 py-2.5 text-sm font-medium text-gray-400 bg-gray-200 rounded-lg cursor-not-allowed"
                                        disabled
                                    >
                                        {isLoading ? 'Processing...' : 'Preview Import'}
                                    </button>
                                ) : (
                                    <Button onClick={handlePreview}>
                                        Preview Import
                                    </Button>
                                )}
                            </div>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <Button onClick={handleReset}>Start Over</Button>
                            <div className="flex space-x-3">
                                <Button onClick={handleClose}>Cancel</Button>
                                {!importResult?.success || importResult.validRows === 0 ? (
                                    <button
                                        className="px-5 py-2.5 text-sm font-medium text-gray-400 bg-gray-200 rounded-lg cursor-not-allowed"
                                        disabled
                                    >
                                        Import {importResult?.validRows || 0} Accounts
                                    </button>
                                ) : (
                                    <Button onClick={handleImport}>
                                        Import {importResult?.validRows || 0} Accounts
                                    </Button>
                                )}
                            </div>
                        </>
                    )}

                    {step === 'complete' && (
                        <>
                            <div></div>
                            <Button onClick={handleClose}>Close</Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
} 