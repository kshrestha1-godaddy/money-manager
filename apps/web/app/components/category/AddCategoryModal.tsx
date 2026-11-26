"use client";

import { useState } from "react";
import { PasswordGatedButton } from "@repo/applock";
import { Category } from "../../types/financial";
import { EditCategoryModal } from "./EditCategoryModal";

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onDelete?: (categoryId: number, appLockPassword: string) => Promise<void>;
    onUpdate?: (
        categoryId: number,
        data: { name: string; color: string; icon?: string },
    ) => Promise<void>;
    onCategoryTabChange?: (categoryId: number, enabled: boolean) => void;
    isSavingCategoryTab?: boolean;
    type: 'EXPENSE' | 'INCOME';
    categories?: Category[];
}

export function AddCategoryModal({
    isOpen, onClose, onAdd, onDelete, onUpdate, onCategoryTabChange, isSavingCategoryTab, type, categories = [],
}: AddCategoryModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        color: '#6366f1',
        icon: ''
    });
    const [showDeleteSection, setShowDeleteSection] = useState(false);
    const [deleteError, setDeleteError] = useState<string>('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            alert('Please enter at least one category name');
            return;
        }

        // Split by comma, trim, and filter out empty names
        const names = formData.name.split(',').map(n => n.trim()).filter(Boolean);
        if (names.length === 0) {
            alert('Please enter at least one valid category name');
            return;
        }

        // Color options for random selection
        const colorOptions = [
            '#ef4444', // red
            '#f97316', // orange
            '#f59e0b', // amber
            '#eab308', // yellow
            '#84cc16', // lime
            '#22c55e', // green
            '#10b981', // emerald
            '#14b8a6', // teal
            '#06b6d4', // cyan
            '#0ea5e9', // sky
            '#3b82f6', // blue
            '#6366f1', // indigo
            '#8b5cf6', // violet
            '#a855f7', // purple
            '#d946ef', // fuchsia
            '#ec4899', // pink
            '#f43f5e', // rose
            '#6b7280'  // gray
        ];

        names.forEach((name, idx) => {
            const color = names.length === 1 ? formData.color : colorOptions[Math.floor(Math.random() * colorOptions.length)];
            const category = {
                name,
                type: type,
                color,
                icon: formData.icon || undefined
            };
            onAdd(category as any);
        });
        
        // Reset form
        setFormData({
            name: '',
            color: '#6366f1',
            icon: ''
        });
    };

    const handleEditCategory = (category: Category) => {
        setCategoryToEdit(category);
        setIsEditModalOpen(true);
    };

    const handleConfirmEdit = async (
        categoryId: number,
        data: { name: string; color: string; icon?: string },
    ) => {
        if (onUpdate) await onUpdate(categoryId, data);
        setIsEditModalOpen(false);
        setCategoryToEdit(null);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setCategoryToEdit(null);
    };

    const handleDeleteCategory = async (categoryId: number, appLockPassword: string) => {
        if (!onDelete) return;
        setDeleteError('');
        try {
            await onDelete(categoryId, appLockPassword);
        } catch (error) {
            console.error("Failed to delete category:", error);
            setDeleteError(error instanceof Error ? error.message : "Failed to delete category");
        }
    };

    if (!isOpen) return null;

    const colorOptions = [
        '#ef4444', // red
        '#f97316', // orange
        '#f59e0b', // amber
        '#eab308', // yellow
        '#84cc16', // lime
        '#22c55e', // green
        '#10b981', // emerald
        '#14b8a6', // teal
        '#06b6d4', // cyan
        '#0ea5e9', // sky
        '#3b82f6', // blue
        '#6366f1', // indigo
        '#8b5cf6', // violet
        '#a855f7', // purple
        '#d946ef', // fuchsia
        '#ec4899', // pink
        '#f43f5e', // rose
        '#6b7280'  // gray
    ];

    // Filter categories by type
    const filteredCategories = categories.filter(cat => cat.type === type);

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Manage {type === 'EXPENSE' ? 'Expense' : 'Income'} Categories
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex mb-6 border-b border-gray-200">
                        <button
                            onClick={() => setShowDeleteSection(false)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${
                                !showDeleteSection 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Add New Category
                        </button>
                        <button
                            onClick={() => setShowDeleteSection(true)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 ${
                                showDeleteSection 
                                    ? 'border-blue-500 text-blue-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Manage Existing ({filteredCategories.length})
                        </button>
                    </div>

                    {!showDeleteSection ? (
                        // Add Category Form
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Name(s) *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Food & Dining, Salary, Bonus (separate multiple with commas)"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Tip: You can add multiple categories at once by separating them with commas
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Icon (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., 🍔 or fa-utensils"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Color
                                </label>
                                <div className="grid grid-cols-6 gap-2">
                                    {colorOptions.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`w-8 h-8 rounded-full border-2 ${
                                                formData.color === color 
                                                    ? 'border-gray-800 ring-2 ring-gray-300' 
                                                    : 'border-gray-300'
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <div className="mt-2 flex items-center space-x-2">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-8 h-8 rounded border border-gray-300"
                                    />
                                    <span className="text-sm text-gray-600">Or pick a custom color</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    Add Category
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Manage Existing Categories
                        <div className="space-y-4">
                            {filteredCategories.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No {type.toLowerCase()} categories found.</p>
                                    <p className="text-sm mt-1">Switch to "Add New Category" tab to create your first category.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Existing {type === 'EXPENSE' ? 'Expense' : 'Income'} Categories
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Edit a category’s name, color, or icon. Categories that are used in transactions cannot be deleted.
                                        </p>
                                    </div>
                                    
                                    {deleteError && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                            <h4 className="text-sm font-medium text-red-800">Cannot Delete Category</h4>
                                            <div className="mt-1 text-sm text-red-700">{deleteError}</div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                        {filteredCategories.map((category) => (
                                            <div
                                                key={category.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div
                                                        className="w-4 h-4 rounded-full border border-gray-300"
                                                        style={{ backgroundColor: category.color }}
                                                    />
                                                    <div>
                                                        <span className="font-medium text-gray-900">
                                                            {category.icon && `${category.icon} `}{category.name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    {onCategoryTabChange && (
                                                        <button
                                                            type="button"
                                                            disabled={isSavingCategoryTab}
                                                            onClick={() => onCategoryTabChange(category.id, !category.showAsTransactionTab)}
                                                            aria-label={`${category.showAsTransactionTab ? 'Remove' : 'Add'} tab for ${category.name}`}
                                                            className="rounded px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                                        >
                                                            {category.showAsTransactionTab ? 'Remove tab' : 'Add tab'}
                                                        </button>
                                                    )}
                                                    {onUpdate && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditCategory(category)}
                                                            className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
                                                            title={`Edit ${category.name}`}
                                                        >
                                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {onDelete && (
                                                        <PasswordGatedButton
                                                            onConfirm={(appLockPassword) => handleDeleteCategory(category.id, appLockPassword)}
                                                            prompt={{
                                                                title: 'Delete category',
                                                                description: `This cannot be undone. Enter your lock screen password to delete the ${category.type.toLowerCase()} category "${category.name}".`,
                                                                confirmLabel: 'Delete category',
                                                            }}
                                                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                                                            title={`Delete ${category.name}`}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </PasswordGatedButton>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            
                            <div className="flex justify-end pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Category Modal */}
            <EditCategoryModal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                onSave={handleConfirmEdit}
                category={categoryToEdit}
            />
        </>
    );
} 