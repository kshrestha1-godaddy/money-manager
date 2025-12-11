/**
 * CSV Import Template for Notes
 * Provides template download functionality for notes import
 */

/**
 * Download a CSV template for notes import
 */
export function downloadNotesImportTemplate(): void {
  const headers = [
    'Title',
    'Content',
    'Color',
    'Tags',
    'Reminder Date',
    'Is Pinned',
    'Is Archived'
  ];

  const sampleData = [
    [
      'Meeting Notes',
      'Important client meeting on project requirements and timeline',
      '#fbbf24',
      'work; important; client',
      '2024-01-15T10:00:00.000Z',
      'No',
      'No'
    ],
    [
      'Investment Research',
      'Research on tech stocks for Q1 portfolio review',
      '#3b82f6',
      'finance; investment; research',
      '2024-01-20T14:30:00.000Z',
      'Yes',
      'No'
    ],
    [
      'Budget Planning',
      'Monthly budget review and expense categorization',
      '#10b981',
      'budget; planning; monthly',
      '',
      'No',
      'No'
    ]
  ];

  // Create CSV content
  const csvContent = [headers, ...sampleData]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'notes_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Get field descriptions for notes import
 */
export function getNotesImportFieldDescriptions(): Record<string, string> {
  return {
    'Title': 'Required. The title/name of the note',
    'Content': 'Optional. The main content/description of the note',
    'Color': 'Optional. Hex color code (e.g., #fbbf24). Defaults to yellow if not provided',
    'Tags': 'Optional. Comma or semicolon separated tags (e.g., "work; important; finance")',
    'Reminder Date': 'Optional. ISO date format (e.g., 2024-01-15T10:00:00.000Z) for calendar reminders',
    'Is Pinned': 'Optional. "Yes", "True", or "1" to pin the note. Defaults to "No"',
    'Is Archived': 'Optional. "Yes", "True", or "1" to archive the note. Defaults to "No"'
  };
}

/**
 * Validate notes CSV headers
 */
export function validateNotesCSVHeaders(headers: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Check for required fields
  const requiredFields = ['title'];
  const missingRequired = requiredFields.filter(field => 
    !normalizedHeaders.some(header => 
      header === field || 
      header === 'note title' || 
      header === 'name'
    )
  );
  
  if (missingRequired.length > 0) {
    errors.push(`Missing required fields: ${missingRequired.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
