"use client";

import React from "react";
import { Category } from "../../types/financial";
import { AccountInterface } from "../../types/accounts";
import { EnhancedTagsInput } from "../shared/EnhancedTagsInput";
import { DUAL_CURRENCIES, formatDualCurrency, convertDualCurrency } from "../../utils/currency";
import { 
    BaseFormData, 
    inputClasses, 
    selectClasses, 
    textareaClasses, 
    labelClasses, 
    checkboxClasses 
} from "../../utils/formUtils";

interface ExpenseFormProps {
    formData: BaseFormData;
    onFormDataChange: (data: BaseFormData) => void;
    categories: Category[];
    accounts: AccountInterface[];
    disabled?: boolean;
}

export function ExpenseForm({ 
    formData, 
    onFormDataChange, 
    categories, 
    accounts, 
    disabled = false 
}: ExpenseFormProps) {
    const handleInputChange = (field: keyof BaseFormData, value: any) => {
        onFormDataChange({
            ...formData,
            [field]: value
        });
    };

    return (
        <div className="space-y-3 sm:space-y-4">
            <div>
                <label className={labelClasses}>Title *</label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={inputClasses}
                    placeholder="e.g., Grocery Shopping"
                    required
                    disabled={disabled}
                />
            </div>

            <div>
                <label className={labelClasses}>Description</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={textareaClasses}
                    placeholder="Optional description"
                    rows={2}
                    disabled={disabled}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                    <label className={labelClasses}>Amount *</label>
                    <div className="flex space-x-2">
                        <div className="flex-1">
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => handleInputChange('amount', e.target.value)}
                                className={inputClasses}
                                placeholder="0.00"
                                required
                                disabled={disabled}
                            />
                        </div>
                        <div className="w-24">
                            <select
                                value={formData.amountCurrency}
                                onChange={(e) => handleInputChange('amountCurrency', e.target.value)}
                                className={`${selectClasses} text-center font-medium`}
                                disabled={disabled}
                            >
                                {DUAL_CURRENCIES.map(currency => (
                                    <option key={currency} value={currency}>
                                        {currency}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* Show conversion preview */}
                    {formData.amount && parseFloat(formData.amount) > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-100">
                            <div className="text-xs text-blue-700 font-medium">
                                {formData.amountCurrency === 'INR' ? (
                                    <span>≈ {formatDualCurrency(convertDualCurrency(parseFloat(formData.amount), 'INR', 'NPR'), 'NPR')}</span>
                                ) : (
                                    <span>≈ {formatDualCurrency(convertDualCurrency(parseFloat(formData.amount), 'NPR', 'INR'), 'INR')}</span>
                                )}
                                <span className="ml-1 text-blue-500">(approx.)</span>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className={labelClasses}>Date *</label>
                    <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className={inputClasses}
                        required
                        disabled={disabled}
                    />
                </div>
            </div>

            <div>
                <label className={labelClasses}>Category *</label>
                <select
                    value={formData.categoryId}
                    onChange={(e) => handleInputChange('categoryId', e.target.value)}
                    className={selectClasses}
                    required
                    disabled={disabled}
                >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className={labelClasses}>Account *</label>
                <select
                    value={formData.accountId}
                    onChange={(e) => handleInputChange('accountId', e.target.value)}
                    className={selectClasses}
                    required
                    disabled={disabled}
                >
                    <option value="">Select an account</option>
                    <option value="0">Cash</option>
                    {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                            {account.bankName} - {account.holderName} ({account.accountType})
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <EnhancedTagsInput
                    value={formData.tags}
                    onChange={(value) => handleInputChange('tags', value)}
                    transactionType="EXPENSE"
                    disabled={disabled}
                />
            </div>

            <div>
                <label className={labelClasses}>Notes</label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className={textareaClasses}
                    placeholder="Optional notes or remarks"
                    rows={2}
                    disabled={disabled}
                />
            </div>

            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                    className={checkboxClasses}
                    disabled={disabled}
                />
                <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-900">
                    This is a recurring expense
                </label>
            </div>

            {formData.isRecurring && (
                <div>
                    <label className={labelClasses}>Frequency</label>
                    <select
                        value={formData.recurringFrequency}
                        onChange={(e) => handleInputChange('recurringFrequency', e.target.value)}
                        className={selectClasses}
                        disabled={disabled}
                    >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                    </select>
                </div>
            )}
        </div>
    );
} 