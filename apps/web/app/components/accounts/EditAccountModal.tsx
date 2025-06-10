"use client";

import { useState, useEffect } from "react";
import { AccountInterface } from "../../types/accounts";

interface EditAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: (id: number, account: Partial<Omit<AccountInterface, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => void;
    account: AccountInterface | null;
}

export function EditAccountModal({ isOpen, onClose, onEdit, account }: EditAccountModalProps) {
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

    useEffect(() => {
        if (account) {
            setFormData({
                holderName: account.holderName,
                accountNumber: account.accountNumber,
                branchCode: account.branchCode,
                bankName: account.bankName,
                branchName: account.branchName,
                bankAddress: account.bankAddress,
                accountType: account.accountType,
                mobileNumbers: account.mobileNumbers.length > 0 ? account.mobileNumbers : [""],
                branchContacts: account.branchContacts.length > 0 ? account.branchContacts : [""],
                swift: account.swift,
                bankEmail: account.bankEmail,
                accountOpeningDate: account.accountOpeningDate ? new Date(account.accountOpeningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                securityQuestion: account.securityQuestion.length > 0 ? account.securityQuestion : [""],
                balance: account.balance || 0,
                // Mobile App Details
                appUsername: account.appUsername || "",
                appPassword: account.appPassword || "",
                appPin: account.appPin || "",
                // Notes and Nicknames
                notes: account.notes || "",
                nickname: account.nickname || "",
            });
        }
    }, [account]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!account) return;

        // Filter out empty strings from arrays
        const processedData = {
            ...formData,
            mobileNumbers: formData.mobileNumbers.filter(num => num.trim() !== ""),
            branchContacts: formData.branchContacts.filter(contact => contact.trim() !== ""),
            securityQuestion: formData.securityQuestion.filter(q => q.trim() !== ""),
            accountOpeningDate: new Date(formData.accountOpeningDate || new Date()),
        };

        onEdit(account.id, processedData);
        handleClose();
    };

    const handleClose = () => {
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

    if (!isOpen || !account) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Edit Account</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Account Holder Name *
                            </label>
                            <input
                                type="text"
                                value={formData.holderName}
                                onChange={(e) => setFormData(prev => ({ ...prev, holderName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Account Number *
                            </label>
                            <input
                                type="text"
                                value={formData.accountNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                IFSC/Branch Code *
                            </label>
                            <input
                                type="text"
                                value={formData.branchCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, branchCode: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bank Name *
                            </label>
                            <input
                                type="text"
                                value={formData.bankName}
                                onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Branch Name *
                            </label>
                            <input
                                type="text"
                                value={formData.branchName}
                                onChange={(e) => setFormData(prev => ({ ...prev, branchName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Account Type *
                            </label>
                            <input
                                type="text"
                                value={formData.accountType}
                                onChange={(e) => setFormData(prev => ({ ...prev, accountType: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Savings Account, Checking Account"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SWIFT Code
                            </label>
                            <input
                                type="text"
                                value={formData.swift}
                                onChange={(e) => setFormData(prev => ({ ...prev, swift: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Account Opening Date *
                            </label>
                            <input
                                type="date"
                                value={formData.accountOpeningDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, accountOpeningDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Balance
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.balance}
                                onChange={(e) => setFormData(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bank Email
                            </label>
                            <input
                                type="email"
                                value={formData.bankEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, bankEmail: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bank Address *
                        </label>
                        <textarea
                            value={formData.bankAddress}
                            onChange={(e) => setFormData(prev => ({ ...prev, bankAddress: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            required
                        />
                    </div>

                    {/* Mobile Numbers */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mobile Numbers
                        </label>
                        {formData.mobileNumbers.map((mobile, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="tel"
                                    value={mobile}
                                    onChange={(e) => updateArrayField('mobileNumbers', index, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Mobile number"
                                />
                                {formData.mobileNumbers.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeArrayField('mobileNumbers', index)}
                                        className="px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => addArrayField('mobileNumbers')}
                            className="mt-1 px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Add Mobile Number
                        </button>
                    </div>

                    {/* Branch Contacts */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Branch Contacts
                        </label>
                        {formData.branchContacts.map((contact, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="tel"
                                    value={contact}
                                    onChange={(e) => updateArrayField('branchContacts', index, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Branch contact number"
                                />
                                {formData.branchContacts.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeArrayField('branchContacts', index)}
                                        className="px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => addArrayField('branchContacts')}
                            className="mt-1 px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Add Branch Contact
                        </button>
                    </div>

                    {/* Security Questions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Security Questions
                        </label>
                        {formData.securityQuestion.map((question, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => updateArrayField('securityQuestion', index, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Security question"
                                />
                                {formData.securityQuestion.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeArrayField('securityQuestion', index)}
                                        className="px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => addArrayField('securityQuestion')}
                            className="mt-1 px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Add Security Question
                        </button>
                    </div>

                    {/* Mobile App Details Section */}
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">📱 Mobile App Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    App Username
                                </label>
                                <input
                                    type="text"
                                    value={formData.appUsername}
                                    onChange={(e) => setFormData(prev => ({ ...prev, appUsername: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Mobile banking username"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    App Password
                                </label>
                                <input
                                    type="password"
                                    value={formData.appPassword}
                                    onChange={(e) => setFormData(prev => ({ ...prev, appPassword: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Mobile banking password"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    App PIN
                                </label>
                                <input
                                    type="password"
                                    value={formData.appPin}
                                    onChange={(e) => setFormData(prev => ({ ...prev, appPin: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Mobile banking PIN"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes and Nickname Section */}
                    <div className="border-t pt-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">📝 Additional Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nickname
                                </label>
                                <input
                                    type="text"
                                    value={formData.nickname}
                                    onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Primary Savings, Salary Account"
                                />
                            </div>
                        </div>
                        
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Any additional notes about this account..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Update Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 