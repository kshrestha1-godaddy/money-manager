"use server";

import prisma from "@repo/db/client";
import { getAuthenticatedSession, getUserIdFromSession } from "../../../utils/auth";
import { formatDate } from "../../../utils/date";
import { formatDateInTimezone } from "../../../utils/timezone";

export interface CalendarNoteEvent {
  id: string;
  date: string; // Human-readable format like "January 15, 2024"
  title: string;
  type: "NOTE_REMINDER";
  content?: string;
  tags: string[];
  noteId: number;
  reminderDate: Date;
}

export async function getNotesWithRemindersForCalendar(): Promise<CalendarNoteEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.user?.id) {
      return [];
    }

    const userId = getUserIdFromSession(session.user.id);

    // Get all notes with reminder dates that are not archived
    const notes = await prisma.note.findMany({
      where: {
        userId,
        isArchived: false,
        reminderDate: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        reminderDate: true,
      },
      orderBy: {
        reminderDate: 'asc',
      },
    });

    // Transform notes into calendar events
    const calendarEvents: CalendarNoteEvent[] = notes
      .filter(note => note.reminderDate) // TypeScript safety
      .map(note => ({
        id: `note-${note.id}`,
        date: formatDate(note.reminderDate!),
        title: note.title,
        type: "NOTE_REMINDER" as const,
        content: note.content || undefined,
        tags: note.tags,
        noteId: note.id,
        reminderDate: note.reminderDate!,
      }));

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching notes with reminders for calendar:", error);
    return [];
  }
}

export async function getNotesWithRemindersForCalendarInTimezone(
  timezone: string
): Promise<CalendarNoteEvent[]> {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.user?.id) {
      return [];
    }

    const userId = getUserIdFromSession(session.user.id);

    // Get all notes with reminder dates that are not archived
    const notes = await prisma.note.findMany({
      where: {
        userId,
        isArchived: false,
        reminderDate: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        reminderDate: true,
      },
      orderBy: {
        reminderDate: 'asc',
      },
    });

    // Transform notes into calendar events with timezone formatting
    const calendarEvents: CalendarNoteEvent[] = notes
      .filter(note => note.reminderDate) // TypeScript safety
      .map(note => {
        return {
          id: `note-${note.id}`,
          date: formatDateInTimezone(note.reminderDate!, timezone),
          title: note.title,
          type: "NOTE_REMINDER" as const,
          content: note.content || undefined,
          tags: note.tags,
          noteId: note.id,
          reminderDate: note.reminderDate!,
        };
      });

    return calendarEvents;
  } catch (error) {
    console.error("Error fetching notes with reminders for calendar in timezone:", error);
    return [];
  }
}
