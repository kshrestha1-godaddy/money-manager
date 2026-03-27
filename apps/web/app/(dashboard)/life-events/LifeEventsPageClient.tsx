"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, Loader2, Pencil, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import type { LifeEventCategory } from "@prisma/client";
import type { LifeEventItem } from "../../types/life-event";
import {
  createLifeEvent,
  deleteLifeEvent,
  deleteLifeEventsWithPassword,
  getLifeEvents,
  importLifeEvents,
  type LifeEventImportRowError,
  updateLifeEvent,
} from "./actions/life-events";
import {
  formatLifeEventDate,
  getUtcMonthsForEvent,
  groupEventsByYearAndMonth,
  LIFE_EVENT_CATEGORY_CHART_COLORS,
  LIFE_EVENT_CATEGORY_LABELS,
  LIFE_EVENT_CATEGORY_ORDER,
  matchesLifeEventSearch,
} from "./life-event-helpers";
import { MultiselectFilterDropdown, MultiselectFilterRow } from "./components/MultiselectFilterDropdown";
import { LifeEventsCharts } from "./components/LifeEventsCharts";
import { DeleteSelectedLifeEventsModal } from "./components/DeleteSelectedLifeEventsModal";
import { LifeEventDetailModal } from "./components/LifeEventDetailModal";
import { LifeEventFormModal } from "./components/LifeEventFormModal";
import { LifeEventsSummarySection } from "./components/LifeEventsSummarySection";
import { LifeEventsTimelineLineChart } from "./components/LifeEventsTimelineLineChart";
import {
  BUTTON_COLORS,
  CONTAINER_COLORS,
  LOADING_COLORS,
  TEXT_COLORS,
  UI_STYLES,
} from "../../config/colorConfig";
import { DisappearingNotification, NotificationData } from "../../components/DisappearingNotification";
import { exportLifeEventsToCsvFile, parseLifeEventsCsvText } from "../../utils/lifeEventsCsv";

const pageContainer = CONTAINER_COLORS.page;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;
const pageTitle = TEXT_COLORS.title;
const primaryButton = BUTTON_COLORS.primary;
const secondaryOutlineButton = BUTTON_COLORS.secondaryBlue;
const dangerButton = BUTTON_COLORS.danger;
const MONTH_OPTIONS = [
  { value: 0, label: "January" },
  { value: 1, label: "February" },
  { value: 2, label: "March" },
  { value: 3, label: "April" },
  { value: 4, label: "May" },
  { value: 5, label: "June" },
  { value: 6, label: "July" },
  { value: 7, label: "August" },
  { value: 8, label: "September" },
  { value: 9, label: "October" },
  { value: 10, label: "November" },
  { value: 11, label: "December" },
];

/** Small legend dots for month rows (distinct hues). */
const MONTH_DOT_COLORS = [
  "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0d9488", "#0284c7",
  "#4f46e5", "#7c3aed", "#c026d3", "#db2777", "#e11d48", "#64748b",
];

const YEAR_DOT_COLOR = "#64748b";

const categoryBadgeClass: Record<LifeEventCategory, string> = {
  EDUCATION: "bg-indigo-100 text-indigo-800",
  COLLEGE: "bg-violet-100 text-violet-800",
  UNIVERSITY: "bg-purple-100 text-purple-800",
  SCHOOL: "bg-fuchsia-100 text-fuchsia-800",
  CAREER: "bg-sky-100 text-sky-800",
  TRAVEL: "bg-teal-100 text-teal-800",
  PERSONAL: "bg-rose-100 text-rose-800",
  LEGAL: "bg-orange-100 text-orange-800",
  DOCUMENTS: "bg-slate-200 text-slate-800",
  MARRIAGE: "bg-pink-100 text-pink-800",
  OTHER: "bg-slate-100 text-slate-700",
};

export default function LifeEventsPageClient() {
  const [items, setItems] = useState<LifeEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<LifeEventCategory[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LifeEventItem | null>(null);
  const [viewingDetail, setViewingDetail] = useState<LifeEventItem | null>(null);
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [openYearState, setOpenYearState] = useState<Record<number, boolean>>({});
  const [openMonthState, setOpenMonthState] = useState<Record<string, boolean>>({});
  const [focusedEventId, setFocusedEventId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[]>([]);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (silent) setIsRefreshing(true);
    else setLoading(true);
    try {
      const data = await getLifeEvents();
      setItems(data);
    } catch (e) {
      console.error(e);
      setNotification({
        title: "Could not load",
        message: e instanceof Error ? e.message : "Failed to load life events",
        type: "error",
      });
    } finally {
      if (silent) setIsRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const item of items) {
      for (const { year } of getUtcMonthsForEvent(item)) years.add(year);
    }
    return [...years].sort((a, b) => b - a);
  }, [items]);

  const availableMonths = useMemo(() => {
    const months = new Set<number>();
    for (const item of items) {
      for (const { year, monthIndex } of getUtcMonthsForEvent(item)) {
        if (selectedYears.length === 0 || selectedYears.includes(year)) months.add(monthIndex);
      }
    }
    return MONTH_OPTIONS.filter((m) => months.has(m.value));
  }, [items, selectedYears]);

  const categoryFilterLabel = useMemo(() => {
    if (selectedCategories.length === 0) return "All categories";
    if (selectedCategories.length === 1) return LIFE_EVENT_CATEGORY_LABELS[selectedCategories[0]!];
    if (selectedCategories.length === 2) {
      return selectedCategories.map((c) => LIFE_EVENT_CATEGORY_LABELS[c]).join(", ");
    }
    return `${selectedCategories.length} categories selected`;
  }, [selectedCategories]);

  const yearFilterLabel = useMemo(() => {
    if (selectedYears.length === 0) return "All years";
    const sorted = [...selectedYears].sort((a, b) => b - a);
    if (sorted.length === 1) return String(sorted[0]);
    if (sorted.length === 2) return `${sorted[0]}, ${sorted[1]}`;
    return `${sorted.length} years selected`;
  }, [selectedYears]);

  const monthFilterLabel = useMemo(() => {
    if (selectedMonths.length === 0) return "All months";
    const labels = MONTH_OPTIONS.filter((m) => selectedMonths.includes(m.value)).map((m) => m.label);
    if (labels.length === 1) return labels[0]!;
    if (labels.length === 2) return `${labels[0]}, ${labels[1]}`;
    return `${selectedMonths.length} months selected`;
  }, [selectedMonths]);

  const hasActiveFilters = useMemo(
    () =>
      searchQuery.trim().length > 0 ||
      selectedCategories.length > 0 ||
      selectedYears.length > 0 ||
      selectedMonths.length > 0,
    [searchQuery, selectedCategories, selectedYears.length, selectedMonths.length]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!matchesLifeEventSearch(item, searchQuery)) return false;
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) return false;

      const eventMonths = getUtcMonthsForEvent(item);
      if (selectedYears.length > 0 && selectedMonths.length > 0) {
        if (
          !eventMonths.some(
            (m) => selectedYears.includes(m.year) && selectedMonths.includes(m.monthIndex)
          )
        ) {
          return false;
        }
      } else if (selectedYears.length > 0) {
        if (!eventMonths.some((m) => selectedYears.includes(m.year))) return false;
      } else if (selectedMonths.length > 0) {
        if (!eventMonths.some((m) => selectedMonths.includes(m.monthIndex))) return false;
      }
      return true;
    });
  }, [items, searchQuery, selectedCategories, selectedYears, selectedMonths]);

  const grouped = useMemo(() => groupEventsByYearAndMonth(filteredItems), [filteredItems]);

  const visibleIds = useMemo(() => filteredItems.map((i) => i.id), [filteredItems]);

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const selectAllVisible = useCallback(() => {
    setSelectedIds(new Set(visibleIds));
  }, [visibleIds]);

  useEffect(() => {
    const visible = new Set(filteredItems.map((i) => i.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visible.has(id)));
      if (next.size === prev.size && [...prev].every((id) => next.has(id))) return prev;
      return next;
    });
  }, [filteredItems]);

  const toggleRowSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /** Matches `groupEventsByYearAndMonth` (UTC date parts on stored event dates). */
  const timelineCurrentYear = new Date().getUTCFullYear();

  function isYearOpen(year: number): boolean {
    return openYearState[year] ?? year === timelineCurrentYear;
  }

  function isMonthOpen(year: number, monthIndex: number): boolean {
    return openMonthState[`${year}-${monthIndex}`] ?? true;
  }

  const handleTimelineBubbleSelect = useCallback((item: LifeEventItem) => {
    const start = new Date(item.eventDate);
    const startYear = start.getUTCFullYear();
    const startMonth = start.getUTCMonth();
    const openYears = new Set<number>([startYear]);
    const openMonthKeys = new Set<string>([`${startYear}-${startMonth}`]);

    if (item.eventEndDate) {
      const end = new Date(item.eventEndDate);
      const endYear = end.getUTCFullYear();
      const endMonth = end.getUTCMonth();
      openYears.add(endYear);
      openMonthKeys.add(`${endYear}-${endMonth}`);
    }

    const nextYears: Record<number, boolean> = {};
    const nextMonths: Record<string, boolean> = {};

    for (const g of grouped) {
      nextYears[g.year] = openYears.has(g.year);
      for (const m of g.months) {
        const k = `${g.year}-${m.monthIndex}`;
        nextMonths[k] = openMonthKeys.has(k);
      }
    }

    setOpenYearState(nextYears);
    setOpenMonthState(nextMonths);
    setFocusedEventId(item.id);
    window.setTimeout(() => {
      document
        .getElementById(`life-event-${item.id}-${startYear}-${startMonth}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }, [grouped]);

  const expandAllTimelineSections = useCallback(() => {
    const nextYears: Record<number, boolean> = {};
    const nextMonths: Record<string, boolean> = {};
    for (const g of grouped) {
      nextYears[g.year] = true;
      for (const m of g.months) {
        nextMonths[`${g.year}-${m.monthIndex}`] = true;
      }
    }
    setOpenYearState(nextYears);
    setOpenMonthState(nextMonths);
  }, [grouped]);

  const collapseAllTimelineSections = useCallback(() => {
    const nextYears: Record<number, boolean> = {};
    const nextMonths: Record<string, boolean> = {};
    for (const g of grouped) {
      nextYears[g.year] = false;
      for (const m of g.months) {
        nextMonths[`${g.year}-${m.monthIndex}`] = false;
      }
    }
    setOpenYearState(nextYears);
    setOpenMonthState(nextMonths);
  }, [grouped]);

  function toggleCategory(category: LifeEventCategory) {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }

  function toggleYear(year: number) {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort((a, b) => b - a)
    );
  }

  function toggleMonth(monthIndex: number) {
    setSelectedMonths((prev) =>
      prev.includes(monthIndex)
        ? prev.filter((m) => m !== monthIndex)
        : [...prev, monthIndex].sort((a, b) => a - b)
    );
  }

  function clearFilters() {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedYears([]);
    setSelectedMonths([]);
  }

  async function handleFormSubmit(payload: Parameters<typeof createLifeEvent>[0]) {
    const result = editing
      ? await updateLifeEvent(editing.id, payload)
      : await createLifeEvent(payload);
    if ("error" in result && result.error) throw new Error(result.error);
    setNotification({
      title: editing ? "Updated" : "Added",
      message: editing ? "Life event updated." : "Life event added.",
      type: "success",
    });
    await load({ silent: true });
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this life event?")) return;
    const result = await deleteLifeEvent(id);
    if ("error" in result && result.error) {
      setNotification({ title: "Error", message: result.error, type: "error" });
      return;
    }
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setFocusedEventId((prev) => (prev === id ? null : prev));
    setNotification({ title: "Deleted", message: "Life event deleted.", type: "success" });
    await load({ silent: true });
  }

  function openBulkDeleteModal() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkDeleteIds(ids);
    setBulkDeleteModalOpen(true);
  }

  async function handleBulkDeleteConfirm(screenLockPassword: string) {
    const result = await deleteLifeEventsWithPassword(bulkDeleteIds, screenLockPassword);
    if ("error" in result) {
      throw new Error(result.error);
    }
    const ids = bulkDeleteIds;
    setSelectedIds(new Set());
    setFocusedEventId((prev) => (prev != null && ids.includes(prev) ? null : prev));
    setNotification({
      title: "Deleted",
      message: `${result.deleted} life event(s) deleted.`,
      type: "success",
    });
    await load({ silent: true });
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: LifeEventItem) {
    setEditing(item);
    setModalOpen(true);
  }

  function openViewDetail(item: LifeEventItem) {
    setViewingDetail(item);
  }

  function handleEditFromDetail() {
    if (!viewingDetail) return;
    const item = viewingDetail;
    setViewingDetail(null);
    setEditing(item);
    setModalOpen(true);
  }

  function handleExportLifeEvents() {
    if (items.length === 0) {
      setNotification({
        title: "Nothing to export",
        message: "Add life events first.",
        type: "info",
      });
      return;
    }
    exportLifeEventsToCsvFile(items);
    setNotification({
      title: "Exported",
      message: "Life events CSV downloaded.",
      type: "success",
    });
  }

  function handleImportClick() {
    importFileInputRef.current?.click();
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = parseLifeEventsCsvText(text);
      if (!parsed.ok) {
        setNotification({
          title: "Import failed",
          message: parsed.error,
          type: "error",
        });
        return;
      }

      const result = await importLifeEvents(parsed.rows);
      if ("error" in result) {
        setNotification({
          title: "Import failed",
          message: result.error,
          type: "error",
        });
        return;
      }

      const { created, updated, skipped, errors } = result;
      const summaryParts = [`Created ${created}`, `updated ${updated}`];
      if (skipped > 0) summaryParts.push(`skipped ${skipped} empty row(s)`);
      let message = `${summaryParts.join(", ")}.`;
      if (errors.length > 0) {
        const sample = errors
          .slice(0, 3)
          .map((row: LifeEventImportRowError) => `Row ${row.rowNumber}: ${row.message}`)
          .join("; ");
        message += ` ${errors.length} row(s) failed${errors.length > 3 ? " (showing first 3)" : ""}: ${sample}${errors.length > 3 ? "…" : ""}`;
      }

      setNotification({
        title: errors.length > 0 ? "Import finished with issues" : "Import complete",
        message,
        type: errors.length > 0 ? "warning" : "success",
        duration: errors.length > 0 ? 12_000 : 5000,
      });
      await load({ silent: true });
    } catch (e: unknown) {
      console.error(e);
      setNotification({
        title: "Import failed",
        message: e instanceof Error ? e.message : "Unexpected error while importing",
        type: "error",
      });
    } finally {
      setIsImporting(false);
    }
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
      {notification ? (
        <DisappearingNotification notification={notification} onHide={() => setNotification(null)} />
      ) : null}

      <div className={UI_STYLES.header.container}>
        <div>
          <h1 className={`text-2xl font-bold ${pageTitle}`}>Life events</h1>
          <p className="mt-1 text-sm text-gray-600">
            Important dates, milestones, and references—searchable and organized on a timeline.
          </p>
        </div>
        <div className={UI_STYLES.header.buttonGroup}>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={handleImportFileChange}
          />
          <button
            type="button"
            onClick={() => void load({ silent: true })}
            disabled={isRefreshing}
            className={`${secondaryOutlineButton} inline-flex items-center gap-2 disabled:opacity-50`}
            aria-busy={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 shrink-0 ${isRefreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportLifeEvents}
            className={`${secondaryOutlineButton} inline-flex items-center gap-2`}
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden />
            Export
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={isImporting}
            className={`${secondaryOutlineButton} inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
            aria-busy={isImporting}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-4 w-4 shrink-0" aria-hidden />
            )}
            Import
          </button>
          <button type="button" onClick={openCreate} className={`inline-flex items-center gap-2 ${primaryButton}`}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Add event
          </button>
        </div>
      </div>

      <div className="mb-8 space-y-4">
        <LifeEventsCharts items={filteredItems} />
        {filteredItems.length > 0 ? (
          <LifeEventsTimelineLineChart items={filteredItems} onBubbleSelect={handleTimelineBubbleSelect} />
        ) : null}
        <LifeEventsSummarySection items={filteredItems} />
      </div>

      <div id="life-events-timeline" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
          {grouped.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={expandAllTimelineSections}
                className={`${secondaryOutlineButton} inline-flex items-center gap-1.5 text-sm`}
              >
                Expand all
              </button>
              <button
                type="button"
                onClick={collapseAllTimelineSections}
                className={`${secondaryOutlineButton} inline-flex items-center gap-1.5 text-sm`}
              >
                Collapse all
              </button>
            </div>
          ) : null}
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,2fr)_minmax(220px,1.6fr)_minmax(120px,0.8fr)_minmax(140px,0.9fr)_auto] lg:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Search timeline</label>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, description, tags..."
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <MultiselectFilterDropdown
              label="Filter by category"
              summaryText={categoryFilterLabel}
              onClearFilter={() => setSelectedCategories([])}
              onSelectAllInList={() => setSelectedCategories([...LIFE_EVENT_CATEGORY_ORDER])}
            >
              {LIFE_EVENT_CATEGORY_ORDER.map((c) => (
                <MultiselectFilterRow
                  key={c}
                  checked={selectedCategories.includes(c)}
                  onToggle={() => toggleCategory(c)}
                  dotColor={LIFE_EVENT_CATEGORY_CHART_COLORS[c]}
                  label={LIFE_EVENT_CATEGORY_LABELS[c]}
                />
              ))}
            </MultiselectFilterDropdown>
            <MultiselectFilterDropdown
              label="Year"
              summaryText={yearFilterLabel}
              onClearFilter={() => setSelectedYears([])}
              onSelectAllInList={() => setSelectedYears([...availableYears])}
            >
              {availableYears.map((y) => (
                <MultiselectFilterRow
                  key={y}
                  checked={selectedYears.includes(y)}
                  onToggle={() => toggleYear(y)}
                  dotColor={YEAR_DOT_COLOR}
                  label={String(y)}
                />
              ))}
            </MultiselectFilterDropdown>
            <MultiselectFilterDropdown
              label="Month"
              summaryText={monthFilterLabel}
              onClearFilter={() => setSelectedMonths([])}
              onSelectAllInList={() => setSelectedMonths(availableMonths.map((m) => m.value))}
            >
              {availableMonths.map((m) => (
                <MultiselectFilterRow
                  key={m.value}
                  checked={selectedMonths.includes(m.value)}
                  onToggle={() => toggleMonth(m.value)}
                  dotColor={MONTH_DOT_COLORS[m.value % MONTH_DOT_COLORS.length]!}
                  label={m.label}
                />
              ))}
            </MultiselectFilterDropdown>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className={`${secondaryOutlineButton} inline-flex h-9 items-center gap-1.5 whitespace-nowrap px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Clear filters
            </button>
          </div>
        </div>
        {items.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-2">
            {visibleIds.length > 0 ? (
              <button
                type="button"
                onClick={selectAllVisible}
                disabled={allVisibleSelected}
                className={`${secondaryOutlineButton} inline-flex items-center gap-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Select all
              </button>
            ) : null}
            {selectedIds.size > 0 ? (
              <>
                <button
                  type="button"
                  onClick={clearSelection}
                  className={`${secondaryOutlineButton} inline-flex items-center gap-1.5 text-sm`}
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  onClick={openBulkDeleteModal}
                  className={`${dangerButton} inline-flex items-center gap-1.5 text-sm`}
                >
                  <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                  Delete selected ({selectedIds.size})
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        {grouped.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-8 text-center text-sm text-gray-600">
            {items.length === 0
              ? "No life events yet. Add your first milestone to see it here."
              : "No events match your search or filters."}
          </div>
        ) : (
          grouped.map(({ year, months }) => (
            <details
              key={year}
              className="group rounded-lg border border-gray-200 bg-white shadow-sm"
              open={isYearOpen(year)}
              onToggle={(e) => {
                const next = e.currentTarget.open;
                setOpenYearState((prev) => {
                  const prevOpen = prev[year] ?? year === timelineCurrentYear;
                  if (prevOpen === next) return prev;
                  return { ...prev, [year]: next };
                });
              }}
            >
              <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-gray-900 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <span className="text-brand-600">▸</span>
                  {year}
                  <span className="text-sm font-normal text-gray-500">
                    ({months.reduce((acc, m) => acc + m.events.length, 0)} events)
                  </span>
                </span>
              </summary>
              {isYearOpen(year) ? (
              <div className="border-t border-gray-100 px-2 pb-3 pt-1">
                {months.map(({ monthLabel, monthIndex, events }) => (
                  <details
                    key={`${year}-${monthIndex}`}
                    className="mt-2 rounded-md border border-gray-100 bg-gray-50/50"
                    open={isMonthOpen(year, monthIndex)}
                    onToggle={(e) => {
                      const k = `${year}-${monthIndex}`;
                      const nextOpen = e.currentTarget.open;
                      setOpenMonthState((prev) => {
                        const prevOpen = prev[k] ?? true;
                        if (prevOpen === nextOpen) return prev;
                        return { ...prev, [k]: nextOpen };
                      });
                    }}
                  >
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-800 marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-gray-400">▸</span>
                        {monthLabel}
                        <span className="font-normal text-gray-500">({events.length})</span>
                      </span>
                    </summary>
                    <ul className="space-y-3 border-t border-gray-100 p-3">
                      {events.map((item) => (
                        <li
                          id={`life-event-${item.id}-${year}-${monthIndex}`}
                          key={`${item.id}-${year}-${monthIndex}`}
                          className={`relative scroll-mt-24 rounded-lg border bg-white p-4 pl-6 shadow-sm before:absolute before:left-2 before:top-4 before:h-[calc(100%-1rem)] before:w-0.5 before:bg-brand-200 before:content-[''] ${
                            focusedEventId === item.id
                              ? "border-brand-500 ring-2 ring-brand-400/60 ring-offset-2"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                                <label className="flex shrink-0 cursor-pointer items-center justify-center self-start sm:self-stretch">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(item.id)}
                                    onChange={() => toggleRowSelection(item.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                    aria-label={`Select “${item.title}”`}
                                  />
                                </label>
                                <div className="flex shrink-0 flex-col items-center justify-center self-stretch rounded-md border border-gray-200 bg-gray-50/70 px-3 py-2.5 text-center sm:w-56">
                                  {item.eventEndDate ? (
                                    <div className="space-y-1 text-xs text-gray-600">
                                      <p className="font-medium">
                                        Start: <span className="font-semibold text-gray-900">{formatLifeEventDate(item.eventDate)}</span>
                                      </p>
                                      <p className="font-medium">
                                        End: <span className="font-semibold text-gray-900">{formatLifeEventDate(item.eventEndDate)}</span>
                                      </p>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-semibold text-gray-900">{formatLifeEventDate(item.eventDate)}</p>
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryBadgeClass[item.category]}`}
                                    >
                                      {LIFE_EVENT_CATEGORY_LABELS[item.category]}
                                    </span>
                                    {item.location ? (
                                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                        {item.location}
                                      </span>
                                    ) : null}
                                  </div>

                                  {item.description ? (
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                                      {item.description}
                                    </p>
                                  ) : null}
                                  {item.tags.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {item.tags.map((t) => (
                                        <span
                                          key={t}
                                          className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                  {item.externalLink ? (
                                    <a
                                      href={item.externalLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
                                    >
                                      Open link
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-row items-center gap-0.5 sm:gap-1">
                              <button
                                type="button"
                                onClick={() => openViewDetail(item)}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-600"
                                aria-label="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-600"
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
              ) : null}
            </details>
          ))
        )}
      </div>

      <LifeEventDetailModal
        event={viewingDetail}
        isOpen={viewingDetail != null}
        onClose={() => setViewingDetail(null)}
        onEdit={handleEditFromDetail}
      />

      <DeleteSelectedLifeEventsModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        selectedCount={bulkDeleteIds.length}
        onConfirm={handleBulkDeleteConfirm}
      />

      <LifeEventFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        editing={editing}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
