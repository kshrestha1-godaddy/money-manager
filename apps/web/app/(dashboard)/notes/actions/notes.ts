"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import prisma from "@repo/db/client";
import { getUserIdFromSession } from "../../../utils/auth";
import { Decimal } from "@prisma/client/runtime/library";

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