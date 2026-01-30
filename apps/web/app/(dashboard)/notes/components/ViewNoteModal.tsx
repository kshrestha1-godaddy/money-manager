"use client";

import { Note } from "@prisma/client";
import { formatCurrency } from "../../../utils/currency";

interface ViewNoteModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export function ViewNoteModal({ note, isOpen, onClose, onEdit }: ViewNoteModalProps) {
  if (!isOpen || !note) return null;

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-2xl p-6 my- overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                {note.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Note Content */}
            {note.content && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Content</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </div>
              </div>
            )}

            {/* Attached Image */}
            {note.imageUrl && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Attached Image</h3>
                <div className="relative rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                  <img
                    src={note.imageUrl}
                    alt="Note attachment"
                    className="w-full h-auto max-h-96 object-contain bg-gray-50"
                    onError={(e) => {
                      // Hide image if it fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {/* Optional: Add a button to view in full size */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer"
                       onClick={() => note.imageUrl && window.open(note.imageUrl, '_blank')}>
                    <div className="bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-gray-700">
                      View Full Size
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Properties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reminder */}
              {note.reminderDate && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Reminder</h3>
                  <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mr-3">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDateTime(note.reminderDate)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Color */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Color</h3>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-gray-300 mr-3"
                    style={{ backgroundColor: note.color }}
                  />
                  <p className="text-sm text-gray-900">{note.color}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {note.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {note.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 text-gray-900">{formatDateTime(note.createdAt)}</span>
                </div>
                {note.updatedAt !== note.createdAt && (
                  <div>
                    <span className="text-gray-500">Updated:</span>
                    <span className="ml-2 text-gray-900">{formatDateTime(note.updatedAt)}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 text-gray-900">
                    {note.isArchived ? "Archived" : "Active"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#705ba0] transition-colors"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-[#705ba0] border border-transparent rounded-md hover:bg-[#5d4a87] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#705ba0] transition-colors"
            >
              Edit Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
