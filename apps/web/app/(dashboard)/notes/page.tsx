import { Suspense } from "react";
import { NotesPageClient } from "./NotesPageClient";
import { getNotes, getArchivedNotes } from "./actions/notes";
import { Note } from "@prisma/client";
import { LOADING_COLORS } from "../../config/colorConfig";

const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;

export default async function NotesPage() {
  let notes: Note[] = [];
  let archivedNotes: Note[] = [];
  
  try {
    [notes, archivedNotes] = await Promise.all([
      getNotes(),
      getArchivedNotes(),
    ]);
  } catch (error) {
    console.error("Error loading notes:", error);
    // Continue with empty arrays if there's an error
  }

  return (
    <div className="w-full px-6 py-6">
      <Suspense fallback={
        <div className={loadingContainer}>
          <div className={loadingSpinner}></div>
          <p className={loadingText}>Loading notes...</p>
        </div>
      }>
        <NotesPageClient 
          initialNotes={notes} 
          initialArchivedNotes={archivedNotes} 
        />
      </Suspense>
    </div>
  );
}
