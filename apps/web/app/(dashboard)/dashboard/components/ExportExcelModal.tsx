"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  EXPORT_TABLE_CATALOG,
  PRIMARY_EXPORT_TABLE_IDS,
  ALL_EXPORT_TABLE_IDS,
  type ExportTableId,
} from "../../../actions/export-table-catalog";
import { downloadBlobFile } from "../../../utils/downloadBlobFile";
import { sanitizeExportDateStrForFilename } from "../../../utils/exportFilename";

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportExcelModal({ isOpen, onClose }: ExportExcelModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<ExportTableId>>(
    () => new Set(PRIMARY_EXPORT_TABLE_IDS)
  );
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(PRIMARY_EXPORT_TABLE_IDS));
    }
  }, [isOpen]);

  const primaryTables = useMemo(
    () => EXPORT_TABLE_CATALOG.filter((entry) => entry.group === "primary"),
    []
  );
  const supplementalTables = useMemo(
    () => EXPORT_TABLE_CATALOG.filter((entry) => entry.group === "supplemental"),
    []
  );

  const selectedCount = selectedIds.size;

  function toggleTable(id: ExportTableId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectPrimaryOnly() {
    setSelectedIds(new Set(PRIMARY_EXPORT_TABLE_IDS));
  }

  function selectAll() {
    setSelectedIds(new Set(ALL_EXPORT_TABLE_IDS));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  async function handleExport() {
    if (selectedCount === 0 || isExporting) return;

    try {
      setIsExporting(true);
      const response = await fetch("/api/export/xlsx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: [...selectedIds] }),
      });

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const dateStr = sanitizeExportDateStrForFilename(
        new Date().toISOString().slice(0, 10)
      );
      downloadBlobFile(blob, `moneymanager_export_${dateStr}.xlsx`);
      onClose();
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert(
        "Failed to export Excel file. Please check the console for details and try again."
      );
    } finally {
      setIsExporting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Export to Excel</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Select tables to include ({selectedCount} selected)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectPrimaryOnly}
            disabled={isExporting}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-brand-600 text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            Primary only
          </button>
          <button
            type="button"
            onClick={selectAll}
            disabled={isExporting}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={isExporting}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Clear all
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Primary
            </h3>
            <ul className="space-y-2">
              {primaryTables.map((entry) => (
                <li key={entry.id}>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleTable(entry.id)}
                      disabled={isExporting}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    {entry.label}
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              Additional tables
            </h3>
            <ul className="space-y-2">
              {supplementalTables.map((entry) => (
                <li key={entry.id}>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleTable(entry.id)}
                      disabled={isExporting}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    {entry.label}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || selectedCount === 0}
            className="inline-flex items-center px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Exporting...
              </>
            ) : (
              `Export (${selectedCount})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
