"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { BloodPressureReadingDTO } from "./actions/blood-pressure";
import {
  createBloodPressureReading,
  deleteBloodPressureReading,
  getBloodPressureReadings,
  updateBloodPressureReading,
} from "./actions/blood-pressure";
import {
  BLOOD_PRESSURE_CATEGORY_BADGE_CLASS,
  BLOOD_PRESSURE_CATEGORY_LABELS,
} from "./blood-pressure-helpers";
import { BloodPressureClassificationChart } from "./components/BloodPressureClassificationChart";
import { BloodPressureReadingModal } from "./components/BloodPressureReadingModal";
import {
  BUTTON_COLORS,
  CONTAINER_COLORS,
  LOADING_COLORS,
  TEXT_COLORS,
} from "../../config/colorConfig";
import { DisappearingNotification, NotificationData } from "../../components/DisappearingNotification";

const pageContainer = CONTAINER_COLORS.page;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;
const pageTitle = TEXT_COLORS.title;
const primaryButton = BUTTON_COLORS.primary;

/** Same order as server: measuredAt desc, then id desc. */
function sortReadingsDesc(items: BloodPressureReadingDTO[]): BloodPressureReadingDTO[] {
  return [...items].sort((a, b) => {
    const t = new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime();
    if (t !== 0) return t;
    return b.id - a.id;
  });
}

export default function HabitsTrackerPageClient() {
  const [readings, setReadings] = useState<BloodPressureReadingDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BloodPressureReadingDTO | null>(null);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBloodPressureReadings();
      setReadings(data);
    } catch (e) {
      console.error(e);
      setNotification({
        title: "Could not load",
        message: e instanceof Error ? e.message : "Failed to load readings",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(payload: {
    measuredAt: string;
    systolic: number;
    diastolic: number;
    notes: string;
  }) {
    if (editing) {
      const res = await updateBloodPressureReading(editing.id, payload);
      if ("error" in res) throw new Error(res.error);
      setReadings((prev) => sortReadingsDesc(prev.map((r) => (r.id === res.reading.id ? res.reading : r))));
    } else {
      const res = await createBloodPressureReading(payload);
      if ("error" in res) throw new Error(res.error);
      setReadings((prev) => sortReadingsDesc([res.reading, ...prev]));
    }
    setNotification({
      title: editing ? "Updated" : "Saved",
      message: editing ? "Blood pressure reading updated." : "Blood pressure reading saved.",
      type: "success",
    });
  }

  async function handleDelete(id: number) {
    if (!globalThis.confirm("Delete this reading?")) return;
    setDeletingId(id);
    try {
      const res = await deleteBloodPressureReading(id);
      if ("error" in res && res.error) {
        setNotification({ title: "Error", message: res.error, type: "error" });
        return;
      }
      setNotification({ title: "Deleted", message: "Reading removed.", type: "success" });
      setReadings((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: BloodPressureReadingDTO) {
    setEditing(row);
    setModalOpen(true);
  }

  if (loading) {
    return (
      <div className={loadingContainer}>
        <div className={loadingSpinner} />
        <p className={loadingText}>Loading…</p>
      </div>
    );
  }

  return (
    <div className={pageContainer}>
      {notification && (
        <DisappearingNotification notification={notification} onHide={() => setNotification(null)} />
      )}

      <div className="mb-8">
        <h1 className={pageTitle}>Habits Tracker</h1>
        <p className="text-gray-600 mt-1 max-w-2xl">
          Log wellness habits over time. Blood pressure entries include the time of measurement, systolic and diastolic
          values (mmHg), and an automatic category for your charts.
        </p>
      </div>

      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Blood pressure</h2>
          <button type="button" onClick={openAdd} className={`${primaryButton} inline-flex items-center gap-2`}>
            <Plus className="w-4 h-4" />
            Log reading
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8 mb-6">
          <div className="min-w-0">
            <BloodPressureClassificationChart
              readings={readings}
              className="mb-0"
              plotHeightClass="h-[min(440px,58vh)]"
            />
          </div>
          <div className="min-w-0">
            <div className="flex min-h-[min(280px,40vh)] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/60 p-6 lg:min-h-[min(440px,58vh)]">
              <p className="text-center text-sm text-gray-500">Second chart</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="min-w-0">
            <div className={`${CONTAINER_COLORS.whiteWithPadding} overflow-x-auto`}>
              {readings.length === 0 ? (
                <p className="text-gray-600 text-sm py-8 text-center">No readings yet. Log your first blood pressure entry.</p>
              ) : (
                <table className="w-full min-w-0 text-sm text-left">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="py-3 pr-3 font-medium">When</th>
                      <th className="py-3 pr-3 font-medium">Reading</th>
                      <th className="py-3 pr-3 font-medium">Category</th>
                      <th className="py-3 pr-3 font-medium">Notes</th>
                      <th className="py-3 font-medium text-right w-24 shrink-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readings.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                        <td className="py-3 pr-3 whitespace-nowrap text-gray-900">
                          {format(new Date(r.measuredAt), "MMM d, yyyy · HH:mm")}
                        </td>
                        <td className="py-3 pr-3 font-medium text-gray-900">
                          {r.systolic}/{r.diastolic}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BLOOD_PRESSURE_CATEGORY_BADGE_CLASS[r.category]}`}
                          >
                            {BLOOD_PRESSURE_CATEGORY_LABELS[r.category]}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-gray-600 max-w-[8rem] truncate sm:max-w-[10rem]" title={r.notes ?? undefined}>
                          {r.notes || "—"}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 mr-1"
                            aria-label="Edit reading"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(r.id)}
                            disabled={deletingId === r.id}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
                            aria-label="Delete reading"
                          >
                            {deletingId === r.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div className="hidden min-w-0 lg:block" aria-hidden />
        </div>
      </section>

      <BloodPressureReadingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
