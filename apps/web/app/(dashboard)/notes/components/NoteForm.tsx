"use client";

import { useState, useEffect } from "react";
import { Note } from "@prisma/client";
import { createNote, updateNote, CreateNoteData, UpdateNoteData } from "../actions/notes";

interface NoteFormProps {
  note?: Note;
  onSubmit: () => void;
  onCancel: () => void;
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

export function NoteForm({ note, onSubmit, onCancel }: NoteFormProps) {
  const [formData, setFormData] = useState({
    title: note?.title || "",
    content: note?.content || "",
    color: note?.color || "#fbbf24",
    tags: note?.tags.join(", ") || "",
    reminderDate: note?.reminderDate ? new Date(note.reminderDate).toISOString().slice(0, 16) : "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(note?.reminderDate)
  );

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

      let result;
      if (note) {
        result = await updateNote({ ...noteData, id: note.id } as UpdateNoteData);
      } else {
        result = await createNote(noteData);
      }

      if (result.success) {
        onSubmit();
      } else {
        alert(result.error || "Failed to save note");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#705ba0] focus:border-[#705ba0]"
            placeholder="Enter note title..."
            required
            autoFocus
          />
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content
          </label>
          <textarea
            id="content"
            value={formData.content}
            onChange={(e) => handleInputChange("content", e.target.value)}
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#705ba0] focus:border-[#705ba0]"
            placeholder="Write your note content here..."
          />
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {NOTE_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleInputChange("color", color.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === color.value
                    ? "border-gray-800 scale-110"
                    : "border-gray-300 hover:border-gray-400"
                } ${color.bg}`}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <input
            type="text"
            id="tags"
            value={formData.tags}
            onChange={(e) => handleInputChange("tags", e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#705ba0] focus:border-[#705ba0]"
            placeholder="Enter tags separated by commas (e.g., important, finance, reminder)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Separate multiple tags with commas
          </p>
        </div>

        {/* Advanced Options Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-[#705ba0] hover:text-[#5d4a87] transition-colors"
          >
            <svg 
              className={`w-4 h-4 mr-1 transition-transform ${showAdvanced ? "rotate-90" : ""}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Options
          </button>
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-md">
            {/* Reminder Date */}
            <div>
              <label htmlFor="reminderDate" className="block text-sm font-medium text-gray-700 mb-1">
                Reminder
              </label>
              <input
                type="datetime-local"
                id="reminderDate"
                value={formData.reminderDate}
                onChange={(e) => handleInputChange("reminderDate", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#705ba0] focus:border-[#705ba0]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set a reminder for this note
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#705ba0] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-[#705ba0] border border-transparent rounded-md hover:bg-[#5d4a87] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#705ba0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Saving..." : note ? "Update Note" : "Create Note"}
          </button>
        </div>
      </form>
    </div>
  );
}
