"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { AccountInterface } from "../../types/accounts";

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (account: Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
}

// Move InputField component outside to prevent recreation on every render
const InputField = ({ 
    label, 
    value, 
    onChange, 
    type = "text", 
    required = false, 
    error, 
    placeholder,
    rows
}: {
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    type?: string;
    required?: boolean;
    error?: string;
    placeholder?: string;
    rows?: number;
}) => {
    const baseClassName = `w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
        error ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
    }`;

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {rows ? (
                <textarea
                    value={String(value)}
                    onChange={onChange}
                    rows={rows}
                    className={baseClassName}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    type={type}
                    value={String(value)}
                    onChange={onChange}
                    className={baseClassName}
                    placeholder={placeholder}
                />
            )}
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};

export function AddAccountModal({ isOpen, onClose, onAdd }: AddAccountModalProps) {
    const [formData, setFormData] = useState({
        holderName: "",
        accountNumber: "",
        branchCode: "",
        bankName: "",
        branchName: "",
        bankAddress: "",
        accountType: "",
        mobileNumbers: [""],
        branchContacts: [""],
        swift: "",
        bankEmail: "",
        accountOpeningDate: new Date().toISOString().split('T')[0],
        securityQuestion: [""],
        balance: 0,
        // Mobile App Details
        appUsername: "",
        appPassword: "",
        appPin: "",
        // Notes and Nicknames
        notes: "",
        nickname: "",
    });

    const [errors, setErrors] = useState<{[key: string]: string}>({});

    const validateForm = () => {
        const newErrors: {[key: string]: string} = {};

        if (!formData.holderName.trim()) {
            newErrors.holderName = "Account holder name is required";
        }
        if (!formData.accountNumber.trim()) {
            newErrors.accountNumber = "Account number is required";
        }
        if (!formData.branchCode.trim()) {
            newErrors.branchCode = "IFSC/Branch code is required";
        }
        if (!formData.bankName.trim()) {
            newErrors.bankName = "Bank name is required";
        }
        if (!formData.branchName.trim()) {
            newErrors.branchName = "Branch name is required";
        }
        if (!formData.bankAddress.trim()) {
            newErrors.bankAddress = "Bank address is required";
        }
        if (!formData.accountType.trim()) {
            newErrors.accountType = "Account type is required";
        }
        if (!formData.accountOpeningDate) {
            newErrors.accountOpeningDate = "Account opening date is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        // Filter out empty strings from arrays
        const processedData = {
            ...formData,
            mobileNumbers: formData.mobileNumbers.filter(num => num.trim() !== ""),
            branchContacts: formData.branchContacts.filter(contact => contact.trim() !== ""),
            securityQuestion: formData.securityQuestion.filter(q => q.trim() !== ""),
            //@ts-ignore
            accountOpeningDate: new Date(formData.accountOpeningDate || new Date().toISOString().split('T')[0]),
        };

        onAdd(processedData);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            holderName: "",
            accountNumber: "",
            branchCode: "",
            bankName: "",
            branchName: "",
            bankAddress: "",
            accountType: "",
            mobileNumbers: [""],
            branchContacts: [""],
            swift: "",
            bankEmail: "",
            accountOpeningDate: new Date().toISOString().split('T')[0],
            securityQuestion: [""],
            balance: 0,
            // Mobile App Details
            appUsername: "",
            appPassword: "",
            appPin: "",
            // Notes and Nicknames
            notes: "",
            nickname: "",
        });
        setErrors({});
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const addArrayField = (field: 'mobileNumbers' | 'branchContacts' | 'securityQuestion') => {
        setFormData(prev => ({
            ...prev,
            [field]: [...prev[field], ""]
        }));
    };

    const removeArrayField = (field: 'mobileNumbers' | 'branchContacts' | 'securityQuestion', index: number) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].filter((_, i) => i !== index)
        }));
    };

    const updateArrayField = (field: 'mobileNumbers' | 'branchContacts' | 'securityQuestion', index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].map((item, i) => i === index ? value : item)
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900">Add New Account</h2>
                            <p className="text-gray-600 mt-1">Enter your bank account details</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-8 py-6">
                    {/* Basic Account Information */}
                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <InputField
                                label="Account Holder Name"
                                value={formData.holderName}
                                onChange={(e) => setFormData(prev => ({ ...prev, holderName: e.target.value }))}
                                required={true}
                                error={errors.holderName}
                                placeholder="Enter full name as on bank records"
                            />

                            <InputField
                                label="Account Number"
                                value={formData.accountNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                required={true}
                                error={errors.accountNumber}
                                placeholder="Enter account number"
                            />

                            <InputField
                                label="IFSC/Branch Code"
                                value={formData.branchCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, branchCode: e.target.value }))}
                                required={true}
                                error={errors.branchCode}
                                placeholder="Enter IFSC code"
                            />

                            <InputField
                                label="Bank Name"
                                value={formData.bankName}
                                onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                required={true}
                                error={errors.bankName}
                                placeholder="Enter bank name"
                            />

                            <InputField
                                label="Branch Name"
                                value={formData.branchName}
                                onChange={(e) => setFormData(prev => ({ ...prev, branchName: e.target.value }))}
                                required={true}
                                error={errors.branchName}
                                placeholder="Enter branch name"
                            />

                            <InputField
                                label="Account Type"
                                value={formData.accountType}
                                onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                                required={true}
                                error={errors.accountType}
                                placeholder="e.g., Savings Account, Current Account"
                            />

                            <InputField
                                label="SWIFT Code"
                                value={formData.swift}
                                onChange={(e) => setFormData(prev => ({ ...prev, swift: e.target.value }))}
                                placeholder="Enter SWIFT code (optional)"
                            />

                            <InputField
                                label="Account Opening Date"
                                type="date"
                                value={formData.accountOpeningDate || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, accountOpeningDate: e.target.value }))}
                                required={true}
                                error={errors.accountOpeningDate}
                            />

                            <InputField
                                label="Initial Balance"
                                type="number"
                                value={formData.balance}
                                onChange={(e) => setFormData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                                placeholder="0.00"
                            />

                            <InputField
                                label="Bank Email"
                                type="email"
                                value={formData.bankEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, bankEmail: e.target.value }))}
                                placeholder="Enter bank email (optional)"
                            />
                        </div>

                        <div className="mt-6">
                            <InputField
                                label="Bank Address"
                                value={formData.bankAddress}
                                onChange={(e) => setFormData(prev => ({ ...prev, bankAddress: e.target.value }))}
                                required={true}
                                error={errors.bankAddress}
                                placeholder="Enter complete bank address"
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Contact Information</h3>
                        
                        {/* Mobile Numbers */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    Mobile Numbers
                                </label>
                                <button
                                    type="button"
                                    onClick={() => addArrayField('mobileNumbers')}
                                    className="px-4 py-2 border border-dashed border-gray-400 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all text-sm"
                                >
                                    Add Mobile Number
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formData.mobileNumbers.map((mobile, index) => (
                                    <div key={`mobile-${index}-${mobile}`} className="flex gap-3">
                                        <input
                                            type="tel"
                                            value={mobile}
                                            onChange={(e) => updateArrayField('mobileNumbers', index, e.target.value)}
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all"
                                            placeholder="Enter mobile number"
                                        />
                                        {formData.mobileNumbers.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeArrayField('mobileNumbers', index)}
                                                className="px-4 py-3 border border-gray-300 bg-white text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 rounded-lg transition-all"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Branch Contacts */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    Branch Contact Numbers
                                </label>
                                <button
                                    type="button"
                                    onClick={() => addArrayField('branchContacts')}
                                    className="px-4 py-2 border border-dashed border-gray-400 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all text-sm"
                                >
                                    Add Branch Contact
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formData.branchContacts.map((contact, index) => (
                                    <div key={`contact-${index}-${contact}`} className="flex gap-3">
                                        <input
                                            type="tel"
                                            value={contact}
                                            onChange={(e) => updateArrayField('branchContacts', index, e.target.value)}
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all"
                                            placeholder="Enter branch contact number"
                                        />
                                        {formData.branchContacts.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeArrayField('branchContacts', index)}
                                                className="px-4 py-3 border border-gray-300 bg-white text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 rounded-lg transition-all"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Security Information */}
                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Security Information</h3>
                        
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    Security Questions
                                </label>
                                <button
                                    type="button"
                                    onClick={() => addArrayField('securityQuestion')}
                                    className="px-4 py-2 border border-dashed border-gray-400 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-all text-sm"
                                >
                                    Add Security Question
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formData.securityQuestion.map((question, index) => (
                                    <div key={`question-${index}-${question}`} className="flex gap-3">
                                        <input
                                            type="text"
                                            value={question}
                                            onChange={(e) => updateArrayField('securityQuestion', index, e.target.value)}
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all"
                                            placeholder="Enter security question"
                                        />
                                        {formData.securityQuestion.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeArrayField('securityQuestion', index)}
                                                className="px-4 py-3 border border-gray-300 bg-white text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 rounded-lg transition-all"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Mobile App Details */}
                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Mobile Banking Details</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <InputField
                                label="App Username"
                                value={formData.appUsername}
                                onChange={(e) => setFormData(prev => ({ ...prev, appUsername: e.target.value }))}
                                placeholder="Mobile banking username"
                            />

                            <InputField
                                label="App Password"
                                type="password"
                                value={formData.appPassword}
                                onChange={(e) => setFormData(prev => ({ ...prev, appPassword: e.target.value }))}
                                placeholder="Mobile banking password"
                            />

                            <InputField
                                label="App PIN"
                                type="password"
                                value={formData.appPin}
                                onChange={(e) => setFormData(prev => ({ ...prev, appPin: e.target.value }))}
                                placeholder="Mobile banking PIN"
                            />
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Additional Information</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <InputField
                                label="Account Nickname"
                                value={formData.nickname}
                                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                                placeholder="e.g., Primary Savings, Salary Account"
                            />
                        </div>
                        
                        <div className="mt-6">
                            <InputField
                                label="Notes"
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Any additional notes about this account..."
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-6 py-3 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-sm"
                        >
                            Add Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 