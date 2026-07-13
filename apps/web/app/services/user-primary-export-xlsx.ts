import ExcelJS from "exceljs";
import {
  isPrimaryExportTableId,
  isSupplementalExportTableId,
  sortExportTableIds,
  type ExportTableId,
} from "../actions/export-table-catalog.shared";
import {
  buildPrimaryExportCsvAttachments,
  type CsvAttachment,
} from "./user-primary-export-csv";
import { buildSupplementalExportCsvForUser } from "./supplemental-export-csv-for-user";
import { csvToRows, sheetNameFromExportFilename } from "../utils/csv/csvParseRows";
import { dedupeSheetNames, sanitizeExcelSheetName } from "../utils/excel/sheetNameUtils";

export interface UserExportXlsxResult {
  buffer: Buffer;
  filename: string;
  sheetCount: number;
}

export interface BuildUserExportXlsxOptions {
  tables: ExportTableId[];
}

function addRowsToWorksheet(worksheet: ExcelJS.Worksheet, rows: string[][]): void {
  for (const row of rows) {
    worksheet.addRow(row);
  }
}

async function buildSupplementalAttachments(
  userId: number,
  dateStr: string,
  pieces: ExportTableId[]
): Promise<CsvAttachment[]> {
  const attachments: CsvAttachment[] = [];

  for (const piece of pieces) {
    if (!isSupplementalExportTableId(piece)) continue;
    const result = await buildSupplementalExportCsvForUser(piece, userId, dateStr);
    if (!("csv" in result)) {
      console.warn(`Excel export supplemental skip ${piece} user ${userId}:`, result.error);
      continue;
    }
    attachments.push({
      filename: result.filename,
      content: result.csv.startsWith("\uFEFF") ? result.csv : "\uFEFF" + result.csv,
    });
  }

  return attachments;
}

async function buildSelectedExportAttachments(
  userId: number,
  dateStr: string,
  tables: ExportTableId[]
): Promise<CsvAttachment[]> {
  const ordered = sortExportTableIds(tables);
  const primaryIds = ordered.filter(isPrimaryExportTableId);
  const supplementalIds = ordered.filter(isSupplementalExportTableId);

  const primaryAttachments =
    primaryIds.length > 0
      ? await buildPrimaryExportCsvAttachments(userId, dateStr, {
          includeEmpty: true,
          includeDisplayCurrency: true,
          selectedSheets: primaryIds,
        })
      : [];

  const supplementalAttachments =
    supplementalIds.length > 0
      ? await buildSupplementalAttachments(userId, dateStr, supplementalIds)
      : [];

  const attachmentBySheet = new Map<string, CsvAttachment>();
  for (const attachment of [...primaryAttachments, ...supplementalAttachments]) {
    attachmentBySheet.set(sheetNameFromExportFilename(attachment.filename), attachment);
  }

  return ordered
    .map((id) => attachmentBySheet.get(id))
    .filter((attachment): attachment is CsvAttachment => attachment != null);
}

function buildWorkbookFromAttachments(attachments: CsvAttachment[]): ExcelJS.Workbook {
  const rawSheetNames = attachments.map((attachment) =>
    sheetNameFromExportFilename(attachment.filename)
  );
  const sheetNames = dedupeSheetNames(rawSheetNames);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MoneyManager";
  workbook.created = new Date();

  attachments.forEach((attachment, index) => {
    const sheetName = sheetNames[index] ?? sanitizeExcelSheetName(`sheet_${index + 1}`);
    const rows = csvToRows(attachment.content);
    const worksheet = workbook.addWorksheet(sheetName);
    addRowsToWorksheet(worksheet, rows);
  });

  return workbook;
}

/**
 * Build a single .xlsx workbook with one sheet per selected export table.
 */
export async function buildUserExportXlsxBuffer(
  userId: number,
  dateStr: string,
  options: BuildUserExportXlsxOptions
): Promise<UserExportXlsxResult> {
  const attachments = await buildSelectedExportAttachments(
    userId,
    dateStr,
    options.tables
  );

  const workbook = buildWorkbookFromAttachments(attachments);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    filename: `moneymanager_export_${dateStr}.xlsx`,
    sheetCount: attachments.length,
  };
}

/** @deprecated Use buildUserExportXlsxBuffer with primary table ids */
export async function buildPrimaryExportXlsxBuffer(
  userId: number,
  dateStr: string
): Promise<UserExportXlsxResult> {
  const { PRIMARY_EXPORT_TABLE_IDS } = await import("../actions/export-table-catalog.shared");
  return buildUserExportXlsxBuffer(userId, dateStr, {
    tables: [...PRIMARY_EXPORT_TABLE_IDS],
  });
}
