"use client";

import { useEffect, useState } from "react";
import type { Note } from "@prisma/client";
import { deleteNote, toggleNoteArchive, toggleNotePin } from "../../notes/actions/notes";
import { NoteForm } from "../../notes/components/NoteForm";

export interface MobileNoteDetailSheetProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (note: Note) => void;
  onDeleted: (noteId: number) => void;
}

function formatDateTime(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MobileNoteDetailSheet({
  note,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}: MobileNoteDetailSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setIsEditing(false);
  }, [isOpen, note?.id]);

  if (!isOpen || !note) return null;

  async function handlePin() {
    setBusy(true);
    try {
      const result = await toggleNotePin(note.id);
      if (result.success && result.note) onUpdated(result.note as Note);
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    setBusy(true);
    try {
      const result = await toggleNoteArchive(note.id);
      if (result.success && result.note) {
        onUpdated(result.note as Note);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setBusy(true);
    try {
      const result = await deleteNote(note.id);
      if (result.success) {
        onDeleted(note.id);
        onClose();
      }
    } finally {
      setBusy(false);
    }
  }

  if (isEditing) {
    return (
      <div
        className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-note-edit-title"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
            aria-label="Back"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 id="mobile-note-edit-title" className="min-w-0 flex-1 text-base font-semibold text-gray-900">
            Edit note
          </h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <NoteForm
            note={note}
            onSubmit={(updated) => {
              onUpdated(updated);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-0 min-w-0 flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-note-detail-title"
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        style={{ borderLeftWidth: 4, borderLeftColor: note.color || "#fbbf24" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
          aria-label="Close"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 pr-2">
          <h1 id="mobile-note-detail-title" className="text-base font-semibold leading-tight text-gray-900 line-clamp-3">
            {note.isPinned ? "📌 " : null}
            {note.title}
          </h1>
          {note.isArchived ? (
            <p className="text-xs text-amber-700">Archived</p>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void handlePin()}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {note.isPinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            onClick={() => void handleArchive()}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            {note.isArchived ? "Unarchive" : "Archive"}
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={busy}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
          >
            Delete
          </button>
        </div>

        {note.content ? (
          <section className="mt-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Content</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-900">{note.content}</p>
          </section>
        ) : null}

        {note.imageUrl ? (
          <div className="mt-4">
            <img
              src={note.imageUrl}
              alt=""
              className="max-h-64 w-full rounded-lg border border-gray-200 object-contain bg-gray-50"
            />
          </div>
        ) : null}

        {note.reminderDate ? (
          <section className="mt-4 rounded-lg bg-orange-50 p-3">
            <p className="text-xs font-medium text-orange-800">Reminder</p>
            <p className="text-sm text-gray-900">{formatDateTime(note.reminderDate)}</p>
          </section>
        ) : null}

        {note.tags.length > 0 ? (
          <section className="mt-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Tags</h2>
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-6 border-t border-gray-100 pt-3 text-xs text-gray-500">
          <p>Created {formatDateTime(note.createdAt)}</p>
          {note.updatedAt && note.updatedAt !== note.createdAt ? (
            <p className="mt-1">Updated {formatDateTime(note.updatedAt)}</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
