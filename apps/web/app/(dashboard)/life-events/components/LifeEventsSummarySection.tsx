"use client";

import { useMemo } from "react";
import type { LifeEventItem } from "../../../types/life-event";
import { CONTAINER_COLORS } from "../../../config/colorConfig";
import { formatLifeEventDate, LIFE_EVENT_CATEGORY_LABELS } from "../life-event-helpers";

const card = `${CONTAINER_COLORS.whiteWithPadding} text-left`;

interface LifeEventsSummarySectionProps {
  items: LifeEventItem[];
}

export function LifeEventsSummarySection({ items }: LifeEventsSummarySectionProps) {
  const summary = useMemo(() => {
    const totalEvents = items.length;
    const rangeEventsCount = items.filter((item) => item.eventEndDate != null).length;
    const singleDayEvents = totalEvents - rangeEventsCount;
    const eventPoints = singleDayEvents + rangeEventsCount * 2;

    const yearsCovered = new Set<number>();
    const categoryPointCounts = new Map<string, number>();
    let minTime = Number.POSITIVE_INFINITY;
    let maxTime = Number.NEGATIVE_INFINITY;

    for (const item of items) {
      const start = new Date(item.eventDate);
      const end = item.eventEndDate ? new Date(item.eventEndDate) : start;
      minTime = Math.min(minTime, start.getTime());
      maxTime = Math.max(maxTime, end.getTime());
      yearsCovered.add(start.getUTCFullYear());
      yearsCovered.add(end.getUTCFullYear());
      const categoryDelta = item.eventEndDate ? 2 : 1;
      categoryPointCounts.set(item.category, (categoryPointCounts.get(item.category) ?? 0) + categoryDelta);
    }

    const topCategoryEntry = [...categoryPointCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topCategoryLabel = topCategoryEntry
      ? LIFE_EVENT_CATEGORY_LABELS[topCategoryEntry[0] as keyof typeof LIFE_EVENT_CATEGORY_LABELS]
      : "N/A";
    const topCategoryPoints = topCategoryEntry?.[1] ?? 0;

    return {
      totalEvents,
      singleDayEvents,
      rangeEventsCount,
      eventPoints,
      yearsCoveredCount: yearsCovered.size,
      topCategoryLabel,
      topCategoryPoints,
      spanStart: Number.isFinite(minTime) ? new Date(minTime) : null,
      spanEnd: Number.isFinite(maxTime) ? new Date(maxTime) : null,
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <section className={card}>
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Summary</h3>
      <p className="mb-3 text-xs text-gray-500">
        Snapshot across current filters. Single-day events count as 1 point, range events as 2 points (start + end).
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-violet-100 bg-violet-50/40 px-2.5 py-2">
          <div className="text-[11px] text-gray-500">Total events</div>
          <div className="text-sm font-semibold text-gray-900">{summary.totalEvents}</div>
        </div>
        <div className="rounded-md border border-violet-100 bg-violet-50/40 px-2.5 py-2">
          <div className="text-[11px] text-gray-500">Single-day</div>
          <div className="text-sm font-semibold text-gray-900">{summary.singleDayEvents}</div>
        </div>
        <div className="rounded-md border border-violet-100 bg-violet-50/40 px-2.5 py-2">
          <div className="text-[11px] text-gray-500">Range events</div>
          <div className="text-sm font-semibold text-gray-900">{summary.rangeEventsCount}</div>
        </div>
        <div className="rounded-md border border-violet-100 bg-violet-50/40 px-2.5 py-2">
          <div className="text-[11px] text-gray-500">Event points</div>
          <div className="text-sm font-semibold text-gray-900">{summary.eventPoints}</div>
        </div>
        <div className="rounded-md border border-violet-100 bg-violet-50/40 px-2.5 py-2">
          <div className="text-[11px] text-gray-500">Years covered</div>
          <div className="text-sm font-semibold text-gray-900">{summary.yearsCoveredCount}</div>
        </div>
        <div className="rounded-md border border-violet-100 bg-violet-50/40 px-2.5 py-2">
          <div className="text-[11px] text-gray-500">Top category</div>
          <div className="truncate text-sm font-semibold text-gray-900">
            {summary.topCategoryLabel} ({summary.topCategoryPoints})
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-gray-600">
        Span:{" "}
        {summary.spanStart && summary.spanEnd
          ? `${formatLifeEventDate(summary.spanStart)} to ${formatLifeEventDate(summary.spanEnd)}`
          : "N/A"}
      </p>
    </section>
  );
}
