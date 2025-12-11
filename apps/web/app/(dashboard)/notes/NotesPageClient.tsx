"use client";

import { useState } from "react";
import { Note } from "@prisma/client";
import { NoteForm } from "./components/NoteForm";
import { NotesHeader } from "./components/NotesHeader";
import { NotesGrid } from "./components/NotesGrid";
import { ViewNoteModal } from "./components/ViewNoteModal";
import { AddNoteModal } from "./components/AddNoteModal";
import { UI_STYLES, TEXT_COLORS, CONTAINER_COLORS, LOADING_COLORS } from "../../config/colorConfig";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export function NotesPageClient({ 
  initialNotes, 
  initialArchivedNotes 
}: {
  initialNotes: Note[];
  initialArchivedNotes: Note[];
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>(initialArchivedNotes);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const refreshData = async () => {
    try {
      // Use router refresh instead of window.location.reload for better UX
      window.location.reload();
    } catch (error) {
      console.error("Error refreshing data:", error);
      // Fallback to window reload if needed
      window.location.reload();
    }
  };

  const handleNoteUpdated = () => {
    refreshData();
  };

  const handleNoteDeleted = () => {
    refreshData();
  };

  const handleNoteView = (note: Note) => {
    setViewingNote(note);
  };

  const handleCloseView = () => {
    setViewingNote(null);
  };

  const handleEditFromView = () => {
    if (viewingNote) {
      setEditingNote(viewingNote);
      setViewingNote(null);
    }
  };

  const handleCloseEdit = () => {
    setEditingNote(null);
  };

  const handleEditComplete = () => {
    setEditingNote(null);
    refreshData();
  };

  // Filter notes based on search query, tags, and color
  const filteredNotes = (showArchived ? archivedNotes : notes).filter((note) => {
    const matchesSearch = 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => note.tags.includes(tag));

    const matchesColor = !selectedColor || note.color === selectedColor;

    return matchesSearch && matchesTags && matchesColor;
  });

  // Get all unique tags from all notes
  const allTags = Array.from(
    new Set([...notes, ...archivedNotes].flatMap(note => note.tags))
  ).sort();

  // Get all unique colors from all notes
  const allColors = Array.from(
    new Set([...notes, ...archivedNotes].map(note => note.color))
  ).sort();

  if (loading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner}></div>
        <p className={loadingText}>Loading notes...</p>
      </div>
    );
  }

  return (
    <div className={CONTAINER_COLORS.page}>
      {/* Page Header */}
      <div className={UI_STYLES.header.container}>
        <div>
          <h1 className={TEXT_COLORS.title}>Thoughts</h1>
          <p className={TEXT_COLORS.subtitle}>Organize your financial thoughts and important reminders</p>
        </div>
      </div>


      <NotesHeader
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        onCreateNote={() => setShowAddModal(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        allTags={allTags}
        allColors={allColors}
        notesCount={notes.length}
        archivedCount={archivedNotes.length}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={refreshData}
      />

      <NotesGrid
        notes={filteredNotes}
        onNoteUpdated={handleNoteUpdated}
        onNoteDeleted={handleNoteDeleted}
        onNoteView={handleNoteView}
        showArchived={showArchived}
      />

      {/* View Note Modal */}
      <ViewNoteModal
        note={viewingNote}
        isOpen={!!viewingNote}
        onClose={handleCloseView}
        onEdit={handleEditFromView}
      />

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleCloseEdit} />
            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <NoteForm
                note={editingNote}
                onSubmit={handleEditComplete}
                onCancel={handleCloseEdit}
              />
            </div>
          </div>
        </div>
      )}

      {filteredNotes.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {showArchived ? "No archived notes" : "No notes yet"}
          </h3>
          <p className="text-gray-500 mb-4">
            {showArchived 
              ? "Your archived notes will appear here." 
              : "Create your first note to get started with organizing your financial thoughts."
            }
          </p>
          {!showArchived && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#705ba0] hover:bg-[#5d4a87] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#705ba0]"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create your first note
            </button>
          )}
        </div>
      )}
    </div>
  );
}
