"use client";

import { useState } from "react";
import { createNote, CreateNoteData } from "../actions/notes";

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NOTE_COLORS = [
  { name: "Yellow", value: "#fbbf24", bg: "bg-yellow-400" },
  { name: "Blue", value: "#3b82f6", bg: "bg-blue-500" },
  { name: "Green", value: "#10b981", bg: "bg-emerald-500" },
  { name: "Pink", value: "#ec4899", bg: "bg-pink-500" },
  { name: "Purple", value: "#8b5cf6", bg: "bg-violet-500" },
  { name: "Orange", value: "#f97316", bg: "bg-orange-500" },
  { name: "Red", value: "#ef4444", bg: "bg-red-500" },
  { name: "Gray", value: "#6b7280", bg: "bg-gray-500" },
];

export function AddNoteModal({ isOpen, onClose, onSuccess }: AddNoteModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    color: "#fbbf24",
    tags: "",
    reminderDate: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Please enter a title for your note.");
      return;
    }

    setIsSubmitting(true);

    try {
      const noteData: CreateNoteData = {
        title: formData.title.trim(),
        content: formData.content.trim() || undefined,
        color: formData.color,
        tags: formData.tags
          .split(",")
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0),
        reminderDate: formData.reminderDate ? new Date(formData.reminderDate) : undefined,
      };

      const result = await createNote(noteData);

      if (result.success) {
        // Reset form
        setFormData({
          title: "",
          content: "",
          color: "#fbbf24",
          tags: "",
          reminderDate: "",
        });
        onSuccess();
        onClose();
      } else {
        alert(result.error || "Failed to create note");
      }
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Failed to create note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Reset form on close
      setFormData({
        title: "",
        content: "",
        color: "#fbbf24",
        tags: "",
        reminderDate: "",
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Create New Note
            </h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#705ba0] focus:border-[#705ba0] text-base"
                placeholder="Enter note title..."
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                rows={6}
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#705ba0] focus:border-[#705ba0] text-base resize-vertical"
                placeholder="Write your note content here..."
                disabled={isSubmitting}
              />
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Color
              </label>
              <div className="flex flex-wrap gap-3">
                {NOTE_COLORS.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    className={`w-10 h-10 rounded-full border-3 ${colorOption.bg} transition-all hover:scale-110 ${
                      formData.color === colorOption.value 
                        ? "border-[#705ba0] ring-2 ring-[#705ba0] ring-opacity-50" 
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                    onClick={() => handleInputChange("color", colorOption.value)}
                    aria-label={`Select ${colorOption.name} color`}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                value={formData.tags}
                onChange={(e) => handleInputChange("tags", e.target.value)}
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#705ba0] focus:border-[#705ba0] text-base"
                placeholder="e.g., important, finance, idea (comma-separated)"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-sm text-gray-500">
                Separate multiple tags with commas
              </p>
            </div>

            {/* Reminder Date */}
            <div>
              <label htmlFor="reminderDate" className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Date & Time (Optional)
              </label>
              <input
                type="datetime-local"
                id="reminderDate"
                value={formData.reminderDate}
                onChange={(e) => handleInputChange("reminderDate", e.target.value)}
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#705ba0] focus:border-[#705ba0] text-base"
                disabled={isSubmitting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#705ba0] transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#705ba0] hover:bg-[#5d4a87] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#705ba0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </div>
                ) : (
                  "Create Note"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
