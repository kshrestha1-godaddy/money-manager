"use client";

import { useEffect, useState } from "react";
import { Category } from "../../types/financial";

const COLOR_OPTIONS = [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
    "#6b7280",
];

interface EditCategoryModalProps {
    isOpen: boolean;
    maxWidthClassName: string;
    onClose: () => void;
    onSave: (
        categoryId: number,
        data: { name: string; color: string; icon?: string },
    ) => Promise<void>;
    category: Category | null;
}

export function EditCategoryModal({
    isOpen,
    maxWidthClassName,
    onClose,
    onSave,
    category,
}: EditCategoryModalProps) {
    const [name, setName] = useState("");
    const [color, setColor] = useState("#6366f1");
    const [icon, setIcon] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!category) return;
        setName(category.name);
        setColor(category.color);
        setIcon(category.icon ?? "");
        setError("");
    }, [category]);

    async function handleSave() {
        if (!category) return;
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Please enter a category name.");
            return;
        }

        setIsSaving(true);
        setError("");
        try {
            await onSave(category.id, {
                name: trimmedName,
                color,
                icon: icon.trim(),
            });
            onClose();
        } catch (caught) {
            setError(
                caught instanceof Error ? caught.message : "Failed to update category",
            );
        } finally {
            setIsSaving(false);
        }
    }

    function handleClose() {
        if (isSaving) return;
        setError("");
        onClose();
    }

    if (!isOpen || !category) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className={`mx-4 w-full ${maxWidthClassName} rounded-lg bg-white p-6`}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Edit Category</h3>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSaving}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Category Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Icon (Optional)
                        </label>
                        <input
                            type="text"
                            value={icon}
                            onChange={(event) => setIcon(event.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 🍔 or fa-utensils"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Color
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                            {COLOR_OPTIONS.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setColor(option)}
                                    className={`h-8 w-8 rounded-full border-2 ${
                                        color === option
                                            ? "border-gray-800 ring-2 ring-gray-300"
                                            : "border-gray-300"
                                    }`}
                                    style={{ backgroundColor: option }}
                                    aria-label={`Select color ${option}`}
                                />
                            ))}
                        </div>
                        <div className="mt-2 flex items-center space-x-2">
                            <input
                                type="color"
                                value={color}
                                onChange={(event) => setColor(event.target.value)}
                                className="h-8 w-8 rounded border border-gray-300"
                            />
                            <span className="text-sm text-gray-600">Or pick a custom color</span>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex space-x-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSaving}
                        className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={isSaving}
                        className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSaving ? "Saving…" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
