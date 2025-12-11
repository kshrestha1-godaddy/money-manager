"use client";

import { Note } from "@prisma/client";
import { NoteCard } from "./NoteCard";

interface NotesGridProps {
  notes: Note[];
  onNoteUpdated: (updatedNote: Note) => void;
  onNoteDeleted: (deletedNoteId: number) => void;
  onNoteView: (note: Note) => void;
  showArchived: boolean;
}

export function NotesGrid({ notes, onNoteUpdated, onNoteDeleted, onNoteView, showArchived }: NotesGridProps) {
  // Separate pinned and unpinned notes for better organization
  const pinnedNotes = notes.filter(note => note.isPinned);
  const unpinnedNotes = notes.filter(note => !note.isPinned);

  return (
    <div className="space-y-6">
      {/* Pinned Notes Section */}
      {!showArchived && pinnedNotes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Pinned Notes
          </h2>
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 3xl:columns-7 gap-4 mb-8">
            {pinnedNotes.map((note) => (
              <div key={note.id} className="break-inside-avoid mb-4">
                <NoteCard
                  note={note}
                  onUpdated={onNoteUpdated}
                  onDeleted={onNoteDeleted}
                  onView={onNoteView}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Notes Section */}
      {unpinnedNotes.length > 0 && (
        <div>
          {!showArchived && pinnedNotes.length > 0 && (
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Other Notes
            </h2>
          )}
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 3xl:columns-7 gap-4">
            {unpinnedNotes.map((note) => (
              <div key={note.id} className="break-inside-avoid mb-4">
                <NoteCard
                  note={note}
                  onUpdated={onNoteUpdated}
                  onDeleted={onNoteDeleted}
                  onView={onNoteView}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
