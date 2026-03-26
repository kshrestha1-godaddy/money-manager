"use client";

import { useCallback, useEffect, useState } from "react";
import { Bookmark, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { BUTTON_COLORS, INPUT_COLORS } from "../../../config/colorConfig";
import { CalculatorInputsFields } from "./CalculatorInputsFields";
import type { CalculatorInputs } from "../types";
import { DEFAULT_ANNUITY_INPUTS, normalizeAnnuityInputs } from "../types";
import {
  createAnnuityCalculatorPreset,
  deleteAnnuityCalculatorPreset,
  listAnnuityCalculatorPresets,
  updateAnnuityCalculatorPreset,
  type AnnuityCalculatorPresetDTO,
} from "../actions/annuity-calculator-presets";
import { getPresetInputsDetailRows } from "../saved-preset-inputs-summary";

const primaryButton = BUTTON_COLORS.primary;
const secondaryBlueButton = BUTTON_COLORS.secondaryBlue;
const modalInputClassName = INPUT_COLORS.standard;
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
  const [modalInputs, setModalInputs] = useState<CalculatorInputs>(DEFAULT_ANNUITY_INPUTS);
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
    setModalInputs(normalizeAnnuityInputs(currentInputs));
    setModalOpen(true);
  }

  function openEditModal(preset: AnnuityCalculatorPresetDTO) {
    setError(null);
    setModalMode("edit");
    setEditingId(preset.id);
    setTitle(preset.title);
    setDescription(preset.description ?? "");
    setNotes(preset.notes ?? "");
    setModalInputs(normalizeAnnuityInputs(preset.inputs));
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
    const inputsToSave = normalizeAnnuityInputs(modalInputs);
    try {
      if (modalMode === "create") {
        await createAnnuityCalculatorPreset({
          title: trimmedTitle,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
          inputs: inputsToSave,
        });
      } else if (editingId != null) {
        await updateAnnuityCalculatorPreset(editingId, {
          title: trimmedTitle,
          description: description.trim() || null,
          notes: notes.trim() || null,
          inputs: inputsToSave,
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
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white shadow-sm lg:h-full">
      <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
            <Bookmark className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Saved scenarios</h2>
              {!loading && presets.length > 0 ? (
                <span className="inline-flex items-center rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-700 tabular-nums">
                  {presets.length}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
              Load a snapshot into the calculator or track monthly progress.
            </p>
          </div>
        </div>
        <button type="button" onClick={openCreateModal} className={primaryButton}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Save current as new
          </span>
        </button>
      </div>

      {error ? (
        <div className="shrink-0 px-3 py-2 text-sm text-red-800 bg-red-50 border-b border-red-100 sm:px-4">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500">Loading saved scenarios…</div>
        ) : presets.length === 0 ? (
          <div className="mx-3 my-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center sm:mx-4">
            <p className="text-sm text-slate-600">
              No scenarios yet. Set up the calculator on the left, then save it here.
            </p>
          </div>
        ) : (
          <ul className="list-none space-y-3 px-3 py-3 sm:space-y-3 sm:px-4 sm:py-3">
            {presets.map((preset) => {
              const normalized = normalizeAnnuityInputs(preset.inputs);
              const totalMonths = Math.max(1, normalized.years) * 12;
              const doneCount = preset.completedMonths.length;
              const inputRows = getPresetInputsDetailRows(preset.inputs);
              const progressPct = totalMonths > 0 ? Math.round((doneCount / totalMonths) * 100) : 0;
              const updatedAt = new Date(preset.updatedAt as Date | string);
              const hasDesc = Boolean(preset.description?.trim());
              const hasNotes = Boolean(preset.notes?.trim());
              return (
                <li key={preset.id}>
                  <article className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04] transition hover:ring-slate-900/[0.08]">
                    <div className="border-l-[3px] border-indigo-500">
                      <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold leading-snug text-slate-900 break-words">
                            {preset.title}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 sm:text-xs">
                            <time dateTime={updatedAt.toISOString()}>
                              {updatedAt.toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </time>
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-600/12"
                              title="Months completed vs schedule length"
                            >
                              <span className="tabular-nums">
                                {doneCount}/{totalMonths} mo
                              </span>
                              <span className="text-emerald-600/70">·</span>
                              <span className="tabular-nums">{progressPct}%</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onLoadPreset(preset)}
                            className={secondaryBlueButton}
                            title="Load into calculator"
                          >
                            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs">
                              <Upload className="h-3.5 w-3.5" aria-hidden />
                              Load
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(preset)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-800 shadow-sm hover:bg-slate-50 sm:text-xs"
                            title="Edit scenario"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(preset.id)}
                            className={dangerStyle}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2 lg:gap-4">
                        <div className="min-w-0">
                          <div className="overflow-hidden rounded-md border border-slate-200">
                            <table className="w-full text-[11px] sm:text-xs">
                              <tbody>
                                {inputRows.map((row, index) => (
                                  <tr
                                    key={row.label}
                                    className={index % 2 === 0 ? "bg-white" : "bg-slate-50/80"}
                                  >
                                    <th
                                      scope="row"
                                      className="w-[40%] max-w-[10rem] px-2 py-1 text-left font-normal text-slate-600 align-top"
                                    >
                                      {row.label}
                                    </th>
                                    <td className="px-2 py-1 text-right font-medium text-slate-900 tabular-nums break-words sm:text-left">
                                      {row.value}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {(hasDesc || hasNotes) && (
                          <div className="min-w-0 space-y-2 text-xs text-slate-700">
                            {hasDesc ? (
                              <p className="line-clamp-3 leading-relaxed">{preset.description!.trim()}</p>
                            ) : null}
                            {hasNotes ? (
                              <p className="line-clamp-3 whitespace-pre-wrap leading-relaxed text-slate-600">
                                {preset.notes!.trim()}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preset-modal-title"
          >
            <h3 id="preset-modal-title" className="text-lg font-semibold text-gray-900">
              {modalMode === "create" ? "Save scenario" : "Edit scenario"}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {modalMode === "edit"
                ? "Update metadata and the calculator numbers stored for this scenario. The main calculator on the page is unchanged unless you load this scenario after saving."
                : "When you open this dialog, values start from your current main calculator. Adjust anything below before saving."}
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
            <div className="mt-6 border-t border-gray-200 pt-5">
              <h4 className="text-sm font-semibold text-gray-900">Calculator inputs</h4>
              <p className="mt-1 text-xs text-gray-500">
                These values are saved with the scenario and used when you click Load.
              </p>
              <div className="mt-3">
                <CalculatorInputsFields
                  inputs={modalInputs}
                  onInputsChange={setModalInputs}
                  inputClassName={modalInputClassName}
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
