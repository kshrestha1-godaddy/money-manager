"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Category } from "../types/financial";

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
    type: 'EXPENSE' | 'INCOME';
}

export function AddCategoryModal({ isOpen, onClose, onAdd, type }: AddCategoryModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        color: '#6366f1',
        icon: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            alert('Please enter a category name');
            return;
        }

        const category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> = {
            name: formData.name.trim(),
            type: type,
            color: formData.color,
            icon: formData.icon || undefined
        };

        onAdd(category);
        
        // Reset form
        setFormData({
            name: '',
            color: '#6366f1',
            icon: ''
        });
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Add New {type === 'EXPENSE' ? 'Expense' : 'Income'} Category
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Food & Dining"
                            required
                        />
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
            </div>
        </div>
    );
} 