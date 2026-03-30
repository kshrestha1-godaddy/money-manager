"use client";

import { useEffect, useState } from "react";
import type { Note } from "@prisma/client";
import { createNote, type CreateNoteData } from "../../notes/actions/notes";
import { NoteImageUpload } from "../../notes/components/NoteImageUpload";
import { buttonClasses } from "../../../utils/formUtils";

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

export interface MobileAddNoteSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (note: Note) => void;
}

export function MobileAddNoteSheet({ isOpen, onClose, onSuccess }: MobileAddNoteSheetProps) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    color: "#fbbf24",
    tags: "",
    imageUrl: "",
    reminderDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setFormData({
      title: "",
      content: "",
      color: "#fbbf24",
      tags: "",
      imageUrl: "",
      reminderDate: "",
    });
  }, [isOpen]);

  if (!isOpen) return null;

  function handleInputChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
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
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        imageUrl: formData.imageUrl || undefined,
        reminderDate: formData.reminderDate ? new Date(formData.reminderDate) : undefined,
      };
      const result = await createNote(noteData);
      if (result.success && result.note) {
        onSuccess(result.note);
        onClose();
      } else {
        alert(result.error || "Failed to create note");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-add-note-title"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => !isSubmitting && onClose()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 id="mobile-add-note-title" className="min-w-0 flex-1 text-base font-semibold text-gray-900">
          New note
        </h1>
      </header>

      <form onSubmit={handleSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-4 pt-2 space-y-4">
          <div>
            <label htmlFor="mobile-note-title" className="mb-1 block text-sm font-medium text-gray-700">
              Title *
            </label>
            <input
              id="mobile-note-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Note title"
              required
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="mobile-note-content" className="mb-1 block text-sm font-medium text-gray-700">
              Content
            </label>
            <textarea
              id="mobile-note-content"
              value={formData.content}
              onChange={(e) => handleInputChange("content", e.target.value)}
              rows={6}
              className="block w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Write your note…"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Attach image (optional)</span>
            <NoteImageUpload
              value={formData.imageUrl}
              onChange={(value) => handleInputChange("imageUrl", value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">Color</span>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${c.bg} ${
                    formData.color === c.value
                      ? "border-brand-600 ring-2 ring-brand-500/40"
                      : "border-gray-300"
                  }`}
                  onClick={() => handleInputChange("color", c.value)}
                  aria-label={`Color ${c.name}`}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="mobile-note-tags" className="mb-1 block text-sm font-medium text-gray-700">
              Tags
            </label>
            <input
              id="mobile-note-tags"
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange("tags", e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="important, idea (comma-separated)"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="mobile-note-reminder" className="mb-1 block text-sm font-medium text-gray-700">
              Reminder (optional)
            </label>
            <input
              id="mobile-note-reminder"
              type="datetime-local"
              value={formData.reminderDate}
              onChange={(e) => handleInputChange("reminderDate", e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              className={buttonClasses.secondary}
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className={buttonClasses.primary}>
              {isSubmitting ? "Saving…" : "Create note"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
