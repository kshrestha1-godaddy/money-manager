import { Note } from "@prisma/client";

/**
 * Format date for CSV export
 */
function formatDateForCSV(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Format datetime for CSV export
 */
function formatDateTimeForCSV(date: Date | null): string {
  if (!date) return '';
  return date.toISOString(); // Full ISO string
}

/**
 * Convert notes data to CSV format
 */
export function convertNotesToCSV(notes: Note[]): string {
  // Define CSV headers
  const headers = [
    'ID',
    'Title',
    'Content',
    'Color',
    'Is Pinned',
    'Is Archived',
    'Tags',
    'Reminder Date',
    'Created At',
    'Updated At'
  ];

  // Convert data to CSV rows
  const rows = notes.map(note => [
    note.id.toString(),
    note.title,
    note.content || '',
    note.color,
    note.isPinned ? 'Yes' : 'No',
    note.isArchived ? 'Yes' : 'No',
    note.tags.join('; '), // Join tags with semicolon
    note.reminderDate ? formatDateTimeForCSV(note.reminderDate) : '',
    formatDateTimeForCSV(note.createdAt),
    formatDateTimeForCSV(note.updatedAt)
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Download notes data as CSV file
 */
export function exportNotesToCSV(notes: Note[], filename?: string): void {
  try {
    if (notes.length === 0) {
      alert('No notes to export.');
      return;
    }

    const csvContent = convertNotesToCSV(notes);
    const csvFilename = filename || `notes_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', csvFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for browsers that don't support download attribute
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error exporting notes to CSV:', error);
    if (error instanceof Error) {
      alert(`Export failed: ${error.message}`);
    } else {
      alert('Failed to export notes. Please try again.');
    }
  }
}

/**
 * Get export statistics for notes
 */
export function getNotesExportStatistics(notes: Note[]) {
  const totalNotes = notes.length;
  const pinnedNotes = notes.filter(note => note.isPinned).length;
  const archivedNotes = notes.filter(note => note.isArchived).length;
  const notesWithReminders = notes.filter(note => note.reminderDate).length;
  const notesWithTags = notes.filter(note => note.tags.length > 0).length;

  return {
    totalNotes,
    pinnedNotes,
    archivedNotes,
    activeNotes: totalNotes - archivedNotes,
    notesWithReminders,
    notesWithTags,
    exportDate: new Date()
  };
}
