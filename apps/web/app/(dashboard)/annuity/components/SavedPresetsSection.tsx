"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { BUTTON_COLORS } from "../../../config/colorConfig";
import type { CalculatorInputs } from "../types";
import { normalizeAnnuityInputs } from "../types";
import {
  createAnnuityCalculatorPreset,
  deleteAnnuityCalculatorPreset,
  listAnnuityCalculatorPresets,
  updateAnnuityCalculatorPreset,
  type AnnuityCalculatorPresetDTO,
} from "../actions/annuity-calculator-presets";

const primaryButton = BUTTON_COLORS.primary;
const secondaryBlueButton = BUTTON_COLORS.secondaryBlue;
const dangerStyle =
  "inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100";

interface SavedPresetsSectionProps {
  currentInputs: CalculatorInputs;
  onLoadPreset: (preset: AnnuityCalculatorPresetDTO) => void;
  onPresetDeleted?: (id: number) => void;
}

export function SavedPresetsSection({ currentInputs, onLoadPreset, onPresetDeleted }: SavedPresetsSectionProps) {
  const [presets, setPresets] = useState<AnnuityCalculatorPresetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPresets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAnnuityCalculatorPresets();
      setPresets(list);
    } catch (errorUnknown) {
      console.error(errorUnknown);
      setError("Could not load saved scenarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPresets();
  }, [loadPresets]);

  function openCreateModal() {
    setError(null);
    setModalMode("create");
    setEditingId(null);
    setTitle("");
    setDescription("");
    setNotes("");
    setModalOpen(true);
  }

  function openEditModal(preset: AnnuityCalculatorPresetDTO) {
    setError(null);
    setModalMode("edit");
    setEditingId(preset.id);
    setTitle(preset.title);
    setDescription(preset.description ?? "");
    setNotes(preset.notes ?? "");
    setModalOpen(true);
  }

  async function handleSubmitModal() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (modalMode === "create") {
        await createAnnuityCalculatorPreset({
          title: trimmedTitle,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
          inputs: currentInputs,
        });
      } else if (editingId != null) {
        await updateAnnuityCalculatorPreset(editingId, {
          title: trimmedTitle,
          description: description.trim() || null,
          notes: notes.trim() || null,
          inputs: currentInputs,
        });
      }
      setModalOpen(false);
      await loadPresets();
    } catch (errorUnknown) {
      console.error(errorUnknown);
      setError(errorUnknown instanceof Error ? errorUnknown.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this saved scenario?")) return;
    try {
      await deleteAnnuityCalculatorPreset(id);
      onPresetDeleted?.(id);
      await loadPresets();
    } catch (errorUnknown) {
      console.error(errorUnknown);
      setError("Could not delete.");
    }
  }

  return (
    <section className="bg-white rounded-lg shadow overflow-hidden min-w-0 h-full flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Saved scenarios</h2>
          <p className="mt-1 text-sm text-gray-600">
            Save calculator inputs with a title and notes, then load them anytime.
          </p>
        </div>
        <button type="button" onClick={openCreateModal} className={primaryButton}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Save current as new
          </span>
        </button>
      </div>

      {error ? (
        <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>
      ) : null}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">Loading saved scenarios…</div>
        ) : presets.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No saved scenarios yet. Configure the calculator above, then click &quot;Save current as new&quot;.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Notes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 whitespace-nowrap">
                  Updated
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {presets.map((preset) => {
                const normalized = normalizeAnnuityInputs(preset.inputs);
                const totalMonths = Math.max(1, normalized.years) * 12;
                const doneCount = preset.completedMonths.length;
                return (
                <tr key={preset.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                    <span className="line-clamp-2 break-words">{preset.title}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[240px]">
                    <span className="line-clamp-2 break-words">{preset.description || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[240px]">
                    <span className="line-clamp-2 break-words">{preset.notes || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 tabular-nums text-xs whitespace-nowrap" title="Months marked complete vs schedule length">
                    {doneCount} / {totalMonths}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(preset.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onLoadPreset(preset)}
                        className={secondaryBlueButton}
                        title="Load these inputs into the calculator and enable month progress checkboxes"
                      >
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Upload className="h-3.5 w-3.5" aria-hidden />
                          Load
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(preset)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
                        title="Edit title, description, notes; saves current calculator values"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit
                      </button>
                      <button type="button" onClick={() => void handleDelete(preset.id)} className={dangerStyle}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-modal-title"
          >
            <h3 id="preset-modal-title" className="text-lg font-semibold text-gray-900">
              {modalMode === "create" ? "Save scenario" : "Edit scenario"}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {modalMode === "edit"
                ? "Updates title, description, and notes. Stored calculator values are replaced with your current form above."
                : "Saves a snapshot of the calculator inputs you have set now."}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. Retirement 15y @ 10%"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Short summary (optional)"
                  maxLength={2000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Reminders, assumptions, links… (optional)"
                  maxLength={5000}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitModal()}
                disabled={saving}
                className={primaryButton}
              >
                {saving ? "Saving…" : modalMode === "create" ? "Save" : "Update"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
