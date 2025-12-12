"use client";

import { useState } from "react";
import { Note } from "@prisma/client";
import { formatCurrency } from "../../../utils/currency";
import { toggleNotePin, toggleNoteArchive, deleteNote } from "../actions/notes";
import { NoteForm } from "./NoteForm";

interface NoteCardProps {
  note: Note;
  onUpdated: (updatedNote: Note) => void;
  onDeleted: (deletedNoteId: number) => void;
  onView: (note: Note) => void;
}

export function NoteCard({ note, onUpdated, onDeleted, onView }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePin = async () => {
    setIsLoading(true);
    try {
      const result = await toggleNotePin(note.id);
      if (result.success && result.note) {
        onUpdated(result.note);
      }
    } catch (error) {
      console.error("Error toggling pin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      const result = await toggleNoteArchive(note.id);
      if (result.success && result.note) {
        onUpdated(result.note);
      }
    } catch (error) {
      console.error("Error toggling archive:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await deleteNote(note.id);
      if (result.success) {
        onDeleted(note.id);
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = () => {
    onView(note);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setShowActions(false);
  };

  const handleEditComplete = (updatedNote: Note) => {
    setIsEditing(false);
    onUpdated(updatedNote);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isEditing) {
    return (
      <div className="w-full">
        <NoteForm
          note={note}
          onSubmit={handleEditComplete}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className="relative group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer overflow-hidden"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={handleView}
    >
      {/* Header with Pin and Actions */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex-1">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2 mb-1">
            {note.title}
          </h3>
        </div>
        
        {/* Header Action Buttons */}
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
            disabled={isLoading}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            title="Edit note"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePin();
            }}
            disabled={isLoading}
            className={`p-1.5 rounded-md transition-colors ${
              note.isPinned
                ? "text-yellow-600 hover:bg-yellow-50"
                : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            }`}
            title={note.isPinned ? "Unpin note" : "Pin note"}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleArchive();
            }}
            disabled={isLoading}
            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            title={note.isArchived ? "Unarchive note" : "Archive note"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {note.content && (
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap mb-3">
            {note.content}
          </p>
        )}

        {/* Properties Section */}
        {note.reminderDate && (
          <div className="mb-3">
            <div className="flex items-center text-sm">
              <div className="flex items-center justify-center w-6 h-6 bg-orange-100 rounded-full mr-2 flex-shrink-0">
                <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Reminder</span>
                <span className="font-medium text-gray-900">{formatDateTime(note.reminderDate)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">  
            <div className="flex flex-wrap gap-1">
              {note.tags.slice(0, 4).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"
                >
                  {tag}
                </span>
              ))}
              {note.tags.length > 4 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200">
                  +{note.tags.length - 4}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Created {formatDate(note.createdAt)}</span>
          {note.updatedAt !== note.createdAt && (
            <span>Updated {formatDate(note.updatedAt)}</span>
          )}
        </div>
      </div>

      {/* Delete button - shown on hover */}
      {showActions && (
        <div 
          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
            title="Delete note"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#705ba0]"></div>
        </div>
      )}
    </div>
  );
}
