"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import prisma from "@repo/db/client";
import { getUserIdFromSession } from "../../../utils/auth";
import { Decimal } from "@prisma/client/runtime/library";
import { ImportResult } from "../../../types/bulkImport";

export interface CreateNoteData {
  title: string;
  content?: string;
  color?: string;
  tags?: string[];
  reminderDate?: Date;
  relatedExpenseId?: number;
  relatedIncomeId?: number;
  relatedInvestmentId?: number;
  relatedDebtId?: number;
  relatedLoanId?: number;
  relatedAccountId?: number;
}

export interface UpdateNoteData extends CreateNoteData {
  id: number;
  isPinned?: boolean;
  isArchived?: boolean;
}

export async function createNote(data: CreateNoteData) {
  try {
    console.log("Creating note with data:", data);
    
    const session = await getServerSession(authOptions);
    if (!session) {
      console.error("No session found");
      return { success: false, error: "Unauthorized" };
    }

    console.log("Session found:", session.user?.id);
    const userId = getUserIdFromSession(session.user.id);
    console.log("User ID:", userId);

    const note = await prisma.note.create({
      data: {
        title: data.title,
        content: data.content,
        color: data.color || "#fbbf24",
        tags: data.tags || [],
        reminderDate: data.reminderDate,
        relatedExpenseId: data.relatedExpenseId,
        relatedIncomeId: data.relatedIncomeId,
        relatedInvestmentId: data.relatedInvestmentId,
        relatedDebtId: data.relatedDebtId,
        relatedLoanId: data.relatedLoanId,
        relatedAccountId: data.relatedAccountId,
        userId: userId,
      },
    });

    console.log("Note created successfully:", note.id);

    revalidatePath("/(dashboard)/notes", "page");
    // Also revalidate calendar if note has a reminder date
    if (data.reminderDate) {
      revalidatePath("/(dashboard)/calendar", "page");
    }
    return { 
      success: true, 
      note
    };
  } catch (error) {
    console.error("Error creating note:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create note" };
  }
}

export async function updateNote(data: UpdateNoteData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    const note = await prisma.note.update({
      where: {
        id: data.id,
        userId: userId, // Ensure user can only update their own notes
      },
      data: {
        title: data.title,
        content: data.content,
        color: data.color,
        tags: data.tags,
        reminderDate: data.reminderDate,
        isPinned: data.isPinned,
        isArchived: data.isArchived,
        relatedExpenseId: data.relatedExpenseId,
        relatedIncomeId: data.relatedIncomeId,
        relatedInvestmentId: data.relatedInvestmentId,
        relatedDebtId: data.relatedDebtId,
        relatedLoanId: data.relatedLoanId,
        relatedAccountId: data.relatedAccountId,
      },
    });

    revalidatePath("/(dashboard)/notes", "page");
    // Also revalidate calendar if note has a reminder date
    if (data.reminderDate) {
      revalidatePath("/(dashboard)/calendar", "page");
    }
    return { 
      success: true, 
      note
    };
  } catch (error) {
    console.error("Error updating note:", error);
    return { success: false, error: "Failed to update note" };
  }
}

export async function deleteNote(noteId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    await prisma.note.delete({
      where: {
        id: noteId,
        userId: userId, // Ensure user can only delete their own notes
      },
    });

    revalidatePath("/(dashboard)/notes", "page");
    // Also revalidate calendar in case the deleted note had a reminder
    revalidatePath("/(dashboard)/calendar", "page");
    return { success: true };
  } catch (error) {
    console.error("Error deleting note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

export async function getNotes() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    const notes = await prisma.note.findMany({
      where: {
        userId: userId,
        isArchived: false, // Only get non-archived notes by default
      },
      orderBy: [
        { isPinned: "desc" }, // Pinned notes first
        { createdAt: "desc" }, // Then by creation date
      ],
    });

    return notes;
  } catch (error) {
    console.error("Error fetching notes:", error);
    throw error;
  }
}

export async function getArchivedNotes() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    const notes = await prisma.note.findMany({
      where: {
        userId: userId,
        isArchived: true,
      },
      orderBy: [
        { updatedAt: "desc" },
      ],
    });

    return notes;
  } catch (error) {
    console.error("Error fetching archived notes:", error);
    throw error;
  }
}

export async function toggleNotePin(noteId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    const note = await prisma.note.findUnique({
      where: { id: noteId, userId: userId },
    });

    if (!note) {
      throw new Error("Note not found");
    }

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: { isPinned: !note.isPinned },
    });

    revalidatePath("/(dashboard)/notes", "page");
    return { 
      success: true, 
      note: {
        ...updatedNote,
        amount: updatedNote.amount ? Number(updatedNote.amount) : null,
      }
    };
  } catch (error) {
    console.error("Error toggling note pin:", error);
    return { success: false, error: "Failed to toggle note pin" };
  }
}

export async function toggleNoteArchive(noteId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    const note = await prisma.note.findUnique({
      where: { id: noteId, userId: userId },
    });

    if (!note) {
      throw new Error("Note not found");
    }

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: { isArchived: !note.isArchived },
    });

    revalidatePath("/(dashboard)/notes", "page");
    return { 
      success: true, 
      note: {
        ...updatedNote,
        amount: updatedNote.amount ? Number(updatedNote.amount) : null,
      }
    };
  } catch (error) {
    console.error("Error toggling note archive:", error);
    return { success: false, error: "Failed to toggle note archive" };
  }
}

// Bulk Import Functions

/**
 * Parse CSV text into a 2D array - handles multi-line fields properly
 */
export async function parseCSVForUI(csvText: string): Promise<string[][]> {
  try {
    const result: string[][] = [];
    let i = 0;
    const text = csvText.trim();
    
    while (i < text.length) {
      const row: string[] = [];
      
      // Parse each field in the row
      while (i < text.length) {
        let field = '';
        let inQuotes = false;
        
        // Skip any leading whitespace
        while (i < text.length && text[i] === ' ') {
          i++;
        }
        
        // Check if field starts with quote
        if (i < text.length && text[i] === '"') {
          inQuotes = true;
          i++; // Skip opening quote
          
          // Parse quoted field (can contain newlines, commas, etc.)
          while (i < text.length) {
            if (text[i] === '"') {
              if (i + 1 < text.length && text[i + 1] === '"') {
                // Escaped quote - add single quote to field
                field += '"';
                i += 2;
              } else {
                // End of quoted field
                inQuotes = false;
                i++; // Skip closing quote
                break;
              }
            } else {
              field += text[i];
              i++;
            }
          }
        } else {
          // Parse unquoted field (until comma or newline)
          while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
            field += text[i];
            i++;
          }
        }
        
        // Add field to row (trim only if it wasn't quoted)
        row.push(inQuotes ? field : field.trim());
        
        // Skip any trailing whitespace
        while (i < text.length && text[i] === ' ') {
          i++;
        }
        
        // Check what comes next
        if (i < text.length) {
          if (text[i] === ',') {
            i++; // Skip comma, continue with next field
          } else if (text[i] === '\r') {
            i++; // Skip carriage return
            if (i < text.length && text[i] === '\n') {
              i++; // Skip line feed
            }
            break; // End of row
          } else if (text[i] === '\n') {
            i++; // Skip line feed
            break; // End of row
          } else {
            // Unexpected character, but continue
            i++;
          }
        }
      }
      
      // Only add rows that have at least one non-empty field
      if (row.length > 0 && row.some(field => field.length > 0)) {
        result.push(row);
      }
    }
    
    console.log('Parsed CSV rows:', result.length);
    console.log('First few rows:', result.slice(0, 3));
    
    return result;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse CSV file');
  }
}

/**
 * Process a single note row from CSV
 */
async function processNoteRow(
  rowData: string[],
  headers: string[],
  userId: number
): Promise<boolean> {
  try {
    // Skip rows that don't have enough data
    if (!rowData || rowData.length === 0) {
      throw new Error('Empty row data');
    }

    // Create a map of header to value
    const rowMap: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header && header.trim()) {
        rowMap[header.toLowerCase().trim()] = rowData[index]?.trim() || '';
      }
    });

    // Required field: title - with better validation
    const title = rowMap['title'] || rowMap['note title'] || rowMap['name'];
    if (!title || title.trim().length === 0) {
      throw new Error('Title is required and cannot be empty');
    }

    // Additional validation: title should be meaningful (not just random characters)
    if (title.length < 2) {
      throw new Error('Title must be at least 2 characters long');
    }

    // Skip rows where the title appears to be header data or invalid
    const invalidTitles = ['title', 'note title', 'name', 'id', 'content', 'description'];
    if (invalidTitles.includes(title.toLowerCase())) {
      throw new Error('Invalid title - appears to be header data');
    }

    // Optional fields - preserve original content without trimming to maintain formatting
    const content = rowMap['content'] || rowMap['description'] || rowMap['note content'] || '';
    const color = rowMap['color'] || '#fbbf24'; // Default yellow
    
    // Validate color format if provided
    const colorValue = rowMap['color'];
    let validColor = '#fbbf24'; // Default
    if (colorValue && colorValue.match(/^#[0-9A-Fa-f]{6}$/)) {
      validColor = colorValue;
    }

    const isPinned = ['true', 'yes', '1'].includes((rowMap['is pinned'] || rowMap['pinned'] || '').toLowerCase());
    const isArchived = ['true', 'yes', '1'].includes((rowMap['is archived'] || rowMap['archived'] || '').toLowerCase());
    
    // Parse tags (semicolon or comma separated)
    const tagsString = rowMap['tags'] || '';
    const tags = tagsString ? tagsString.split(/[;,]/).map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    
    // Parse reminder date
    let reminderDate: Date | null = null;
    const reminderDateString = rowMap['reminder date'] || rowMap['reminder'] || '';
    if (reminderDateString) {
      const parsedDate = new Date(reminderDateString);
      if (!isNaN(parsedDate.getTime())) {
        reminderDate = parsedDate;
      }
    }

    // Create the note
    await prisma.note.create({
      data: {
        title: title.trim(),
        content: content || null, // Don't trim content to preserve formatting and line breaks
        color: validColor,
        isPinned,
        isArchived,
        tags,
        reminderDate,
        userId,
      },
    });

    return true;
  } catch (error) {
    console.error('Error processing note row:', error);
    throw error;
  }
}

/**
 * Bulk import notes from CSV file
 */
export async function bulkImportNotes(file: File): Promise<ImportResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);
    const text = await file.text();
    
    console.log("CSV file size:", text.length, "characters");
    
    const rows = await parseCSVForUI(text);
    console.log("Parsed rows:", rows.length);

    if (rows.length <= 1) {
      throw new Error("CSV file must contain header row and at least one data row");
    }

    const headers = rows[0];
    if (!headers || headers.length === 0) {
      throw new Error("CSV file must have a valid header row");
    }
    
    console.log("Headers found:", headers);
    
    // Validate that we have at least a title column
    const hasValidTitleHeader = headers.some(header => {
      const normalizedHeader = header.toLowerCase().trim();
      return normalizedHeader === 'title' || normalizedHeader === 'note title' || normalizedHeader === 'name';
    });
    
    if (!hasValidTitleHeader) {
      throw new Error("CSV must contain a 'Title', 'Note Title', or 'Name' column");
    }
    
    const dataRows = rows.slice(1);
    let successCount = 0;
    const errors: { row: number; error: string }[] = [];

    console.log("Processing", dataRows.length, "data rows");

    // Process rows individually
    for (let i = 0; i < dataRows.length; i++) {
      const rowData = dataRows[i];
      const rowNumber = i + 2; // +2 because we skip header and arrays are 0-indexed
      
      // Skip completely empty rows
      if (!rowData || rowData.every(cell => !cell || cell.trim() === '')) {
        console.log(`Skipping empty row ${rowNumber}`);
        continue;
      }

      try {
        console.log(`Processing row ${rowNumber}:`, rowData);
        const success = await processNoteRow(rowData, headers, userId);
        if (success) {
          successCount++;
          console.log(`Successfully imported row ${rowNumber}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Error in row ${rowNumber}:`, errorMessage);
        errors.push({
          row: rowNumber,
          error: errorMessage
        });
      }
    }

    console.log(`Import completed: ${successCount} successful, ${errors.length} errors`);

    revalidatePath("/(dashboard)/notes", "page");
    revalidatePath("/(dashboard)/calendar", "page");

    return {
      success: successCount > 0,
      importedCount: successCount,
      errors: errors.map(error => ({
        row: error.row,
        error: error.error
      })),
      skippedCount: errors.length
    };
  } catch (error) {
    console.error("Error in bulk import notes:", error);
    return {
      success: false,
      importedCount: 0,
      errors: [{ row: 1, error: error instanceof Error ? error.message : 'Unknown error occurred' }],
      skippedCount: 0
    };
  }
}

/**
 * Import a single corrected row (for error correction)
 */
export async function importCorrectedRow(rowData: string[], headers: string[]): Promise<any> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);
    const success = await processNoteRow(rowData, headers, userId);
    
    if (success) {
      revalidatePath("/(dashboard)/notes", "page");
      revalidatePath("/(dashboard)/calendar", "page");
    }
    
    return { success };
  } catch (error) {
    console.error("Error importing corrected row:", error);
    throw error;
  }
}

/**
 * Bulk delete notes
 */
export async function bulkDeleteNotes(noteIds: number[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Verify all notes belong to the user
    const existingNotes = await prisma.note.findMany({
      where: {
        id: { in: noteIds },
        userId: userId,
      },
    });

    if (existingNotes.length !== noteIds.length) {
      throw new Error("Some notes not found or unauthorized");
    }

    // Delete the notes
    await prisma.note.deleteMany({
      where: { 
        id: { in: noteIds },
        userId: userId
      }
    });

    revalidatePath("/(dashboard)/notes", "page");
    revalidatePath("/(dashboard)/calendar", "page");
    
    return { 
      success: true, 
      deletedCount: existingNotes.length 
    };
  } catch (error) {
    console.error("Error in bulk delete notes:", error);
    throw new Error("Failed to delete notes");
  }
}

/**
 * Delete all notes for a user
 */
export async function deleteAllNotes() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      throw new Error("Unauthorized");
    }

    const userId = getUserIdFromSession(session.user.id);

    // Get count of notes to be deleted
    const noteCount = await prisma.note.count({
      where: { userId: userId }
    });

    if (noteCount === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Delete all notes for the user
    await prisma.note.deleteMany({
      where: { userId: userId }
    });

    revalidatePath("/(dashboard)/notes", "page");
    revalidatePath("/(dashboard)/calendar", "page");
    
    return { 
      success: true, 
      deletedCount: noteCount 
    };
  } catch (error) {
    console.error("Error deleting all notes:", error);
    throw new Error("Failed to delete all notes");
  }
}