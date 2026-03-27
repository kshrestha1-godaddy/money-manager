"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import type { LifeEventCategory } from "@prisma/client";
import type { LifeEventItem } from "../../types/life-event";
import {
  createLifeEvent,
  deleteLifeEvent,
  getLifeEvents,
  updateLifeEvent,
} from "./actions/life-events";
import {
  formatLifeEventDate,
  groupEventsByYearAndMonth,
  LIFE_EVENT_CATEGORY_LABELS,
  LIFE_EVENT_CATEGORY_ORDER,
  matchesLifeEventSearch,
} from "./life-event-helpers";
import { LifeEventsCharts } from "./components/LifeEventsCharts";
import { LifeEventFormModal } from "./components/LifeEventFormModal";
import {
  BUTTON_COLORS,
  CONTAINER_COLORS,
  LOADING_COLORS,
  TEXT_COLORS,
  UI_STYLES,
} from "../../config/colorConfig";
import { DisappearingNotification, NotificationData } from "../../components/DisappearingNotification";

const pageContainer = CONTAINER_COLORS.page;
const loadingContainer = LOADING_COLORS.container;
const loadingSpinner = LOADING_COLORS.spinner;
const loadingText = LOADING_COLORS.text;
const pageTitle = TEXT_COLORS.title;
const primaryButton = BUTTON_COLORS.primary;
const secondaryOutlineButton = BUTTON_COLORS.secondaryBlue;

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
  const [categoryFilter, setCategoryFilter] = useState<LifeEventCategory | "ALL">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LifeEventItem | null>(null);
  const [notification, setNotification] = useState<NotificationData | null>(null);

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

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!matchesLifeEventSearch(item, searchQuery)) return false;
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      return true;
    });
  }, [items, searchQuery, categoryFilter]);

  const grouped = useMemo(() => groupEventsByYearAndMonth(filteredItems), [filteredItems]);

  /** Matches `groupEventsByYearAndMonth` (UTC date parts on stored event dates). */
  const timelineCurrentYear = new Date().getUTCFullYear();

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
    setNotification({ title: "Deleted", message: "Life event deleted.", type: "success" });
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
          <button type="button" onClick={openCreate} className={`inline-flex items-center gap-2 ${primaryButton}`}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Add event
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, notes, location, tags, links, category…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as LifeEventCategory | "ALL")}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All categories</option>
            {LIFE_EVENT_CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {LIFE_EVENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-8">
        <LifeEventsCharts items={filteredItems} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
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
              open={year === timelineCurrentYear}
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
              <div className="border-t border-gray-100 px-2 pb-3 pt-1">
                {months.map(({ monthLabel, monthIndex, events }) => (
                  <details key={`${year}-${monthIndex}`} className="mt-2 rounded-md border border-gray-100 bg-gray-50/50" open>
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
                          key={item.id}
                          className="relative rounded-lg border border-gray-200 bg-white p-4 pl-6 shadow-sm before:absolute before:left-2 before:top-4 before:h-[calc(100%-1rem)] before:w-0.5 before:bg-brand-200 before:content-['']"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                {formatLifeEventDate(item.eventDate)}
                              </p>
                              <h3 className="mt-1 text-base font-semibold text-gray-900">{item.title}</h3>
                              <span
                                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${categoryBadgeClass[item.category]}`}
                              >
                                {LIFE_EVENT_CATEGORY_LABELS[item.category]}
                              </span>
                              {item.location ? (
                                <p className="mt-2 text-sm text-gray-600">
                                  <span className="font-medium text-gray-700">Location: </span>
                                  {item.location}
                                </p>
                              ) : null}
                              {item.description ? (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{item.description}</p>
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
                            <div className="flex shrink-0 gap-1 sm:flex-col">
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
            </details>
          ))
        )}
      </div>

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
