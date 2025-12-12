"use client";

import { useState, useEffect } from "react";
import { Note } from "@prisma/client";
import { NoteForm } from "./components/NoteForm";
import { NotesHeader } from "./components/NotesHeader";
import { NotesGrid } from "./components/NotesGrid";
import { ViewNoteModal } from "./components/ViewNoteModal";
import { AddNoteModal } from "./components/AddNoteModal";
import { UI_STYLES, TEXT_COLORS, CONTAINER_COLORS, LOADING_COLORS, BUTTON_COLORS } from "../../config/colorConfig";
import { exportNotesToCSV } from "../../utils/csvExportNotes";
import { UnifiedBulkImportModal } from "../../components/shared/UnifiedBulkImportModal";
import { notesImportConfig } from "../../config/bulkImportConfig";
import { deleteAllNotes, getNotes, getArchivedNotes } from "./actions/notes";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;
const secondaryGreenButton = BUTTON_COLORS.secondaryGreen;
const secondaryBlueButton = BUTTON_COLORS.secondaryBlue;
const dangerButton = BUTTON_COLORS.danger;

export function NotesPageClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [archivedNotes, setArchivedNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Load initial data
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const [notesData, archivedNotesData] = await Promise.all([
        getNotes(),
        getArchivedNotes(),
      ]);
      setNotes(notesData);
      setArchivedNotes(archivedNotesData);
    } catch (error) {
      console.error("Error loading notes:", error);
      // Continue with empty arrays if there's an error
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    loadNotes();
  };

  const handleNoteUpdated = (updatedNote: Note) => {
    // Handle archive/unarchive by moving notes between arrays
    if (updatedNote.isArchived) {
      // Note was archived - remove from notes, add to archived
      setNotes(prevNotes => prevNotes.filter(note => note.id !== updatedNote.id));
      setArchivedNotes(prevNotes => {
        const existingIndex = prevNotes.findIndex(note => note.id === updatedNote.id);
        if (existingIndex >= 0) {
          // Update existing archived note
          return prevNotes.map(note => note.id === updatedNote.id ? updatedNote : note);
        } else {
          // Add newly archived note to the beginning
          return [updatedNote, ...prevNotes];
        }
      });
    } else {
      // Note was unarchived - remove from archived, add to notes
      setArchivedNotes(prevNotes => prevNotes.filter(note => note.id !== updatedNote.id));
      setNotes(prevNotes => {
        const existingIndex = prevNotes.findIndex(note => note.id === updatedNote.id);
        if (existingIndex >= 0) {
          // Update existing note
          return prevNotes.map(note => note.id === updatedNote.id ? updatedNote : note);
        } else {
          // Add newly unarchived note in the correct position
          if (updatedNote.isPinned) {
            return [updatedNote, ...prevNotes];
          } else {
            // Insert in chronological order (after pinned notes)
            const pinnedNotes = prevNotes.filter(note => note.isPinned);
            const unpinnedNotes = prevNotes.filter(note => !note.isPinned);
            return [...pinnedNotes, updatedNote, ...unpinnedNotes];
          }
        }
      });
    }
  };

  const handleNoteDeleted = (deletedNoteId: number) => {
    // Optimistically remove the note from local state
    setNotes(prevNotes => prevNotes.filter(note => note.id !== deletedNoteId));
    setArchivedNotes(prevNotes => prevNotes.filter(note => note.id !== deletedNoteId));
  };

  const handleNoteCreated = (newNote: Note) => {
    // Optimistically add the new note to local state
    if (newNote.isArchived) {
      setArchivedNotes(prevNotes => [newNote, ...prevNotes]);
    } else {
      // Add to the beginning if pinned, otherwise add in chronological order
      setNotes(prevNotes => {
        if (newNote.isPinned) {
          return [newNote, ...prevNotes];
        } else {
          // Insert in chronological order (newest first, but after pinned notes)
          const pinnedNotes = prevNotes.filter(note => note.isPinned);
          const unpinnedNotes = prevNotes.filter(note => !note.isPinned);
          return [...pinnedNotes, newNote, ...unpinnedNotes];
        }
      });
    }
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

  const handleEditComplete = (updatedNote: Note) => {
    setEditingNote(null);
    handleNoteUpdated(updatedNote);
  };

  const handleExportToCSV = () => {
    // Export all notes (both active and archived)
    const allNotes = [...notes, ...archivedNotes];
    exportNotesToCSV(allNotes);
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    // Refresh data for import since we don't know what was imported
    loadNotes();
  };

  const handleDeleteAllNotes = async () => {
    setLoading(true);
    try {
      const result = await deleteAllNotes();
      if (result.success) {
        setShowDeleteAllModal(false);
        // Optimistically clear all notes
        setNotes([]);
        setArchivedNotes([]);
        // Show success message if needed
        console.log(`Successfully deleted ${result.deletedCount} notes`);
      } else {
        alert("Failed to delete all notes. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting all notes:", error);
      alert("Failed to delete all notes. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <div className={UI_STYLES.header.buttonGroup}>
          <button 
            onClick={() => setShowImportModal(true)} 
            className={secondaryBlueButton}
          >
            Import CSV
          </button>
          <button 
            onClick={handleExportToCSV} 
            disabled={notes.length === 0 && archivedNotes.length === 0} 
            className={`${secondaryGreenButton} disabled:opacity-50`}
          >
            Export CSV
          </button>
          <button 
            onClick={() => setShowDeleteAllModal(true)} 
            disabled={notes.length === 0 && archivedNotes.length === 0} 
            className={`${dangerButton} disabled:opacity-50`}
          >
            Delete All Notes
          </button>
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
              onSuccess={handleNoteCreated}
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

      {/* Import Modal */}
      <UnifiedBulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        config={notesImportConfig}
      />

      {/* Delete All Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleDeleteAllNotes}
        title="Delete All Notes"
        message={`Are you sure you want to delete all ${notes.length + archivedNotes.length} notes? This action cannot be undone.`}
        confirmText="Delete All Notes"
        isLoading={loading}
      />
    </div>
  );
}
