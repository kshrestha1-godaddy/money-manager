"use client";

import { useMemo } from "react";
import type { LifeEventItem } from "../../../types/life-event";
import { CONTAINER_COLORS, TEXT_COLORS } from "../../../config/colorConfig";
import { formatLifeEventDate, LIFE_EVENT_CATEGORY_LABELS, LIFE_EVENT_CATEGORY_ORDER } from "../life-event-helpers";

const cardLargeContainer = CONTAINER_COLORS.cardLarge;
const cardTitle = TEXT_COLORS.cardTitle;
const cardValue = TEXT_COLORS.cardValue;
const cardSubtitle = TEXT_COLORS.cardSubtitle;

interface LifeEventsSummarySectionProps {
  items: LifeEventItem[];
}

export function LifeEventsSummarySection({ items }: LifeEventsSummarySectionProps) {
  const summary = useMemo(() => {
    const totalEvents = items.length;
    const rangeEventsCount = items.filter((item) => item.eventEndDate != null).length;
    const singleDayEvents = totalEvents - rangeEventsCount;

    const yearsCovered = new Set<number>();
    const categoryEventCounts = new Map<string, number>();
    const categoriesPresent = new Set<string>();
    let minTime = Number.POSITIVE_INFINITY;
    let maxTime = Number.NEGATIVE_INFINITY;

    for (const item of items) {
      const start = new Date(item.eventDate);
      const end = item.eventEndDate ? new Date(item.eventEndDate) : start;
      minTime = Math.min(minTime, start.getTime());
      maxTime = Math.max(maxTime, end.getTime());
      yearsCovered.add(start.getUTCFullYear());
      yearsCovered.add(end.getUTCFullYear());
      categoriesPresent.add(item.category);
      categoryEventCounts.set(item.category, (categoryEventCounts.get(item.category) ?? 0) + 1);
    }

    const topCategoryEntry = [...categoryEventCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topCategoryLabel = topCategoryEntry
      ? LIFE_EVENT_CATEGORY_LABELS[topCategoryEntry[0] as keyof typeof LIFE_EVENT_CATEGORY_LABELS]
      : "—";
    const topCategoryEventCount = topCategoryEntry?.[1] ?? 0;

    return {
      totalEvents,
      singleDayEvents,
      rangeEventsCount,
      categoriesPresentCount: categoriesPresent.size,
      yearsCoveredCount: yearsCovered.size,
      topCategoryLabel,
      topCategoryEventCount,
      spanStart: Number.isFinite(minTime) ? new Date(minTime) : null,
      spanEnd: Number.isFinite(maxTime) ? new Date(maxTime) : null,
    };
  }, [items]);

  if (items.length === 0) return null;

  const spanLine =
    summary.spanStart && summary.spanEnd
      ? `${formatLifeEventDate(summary.spanStart)} to ${formatLifeEventDate(summary.spanEnd)}`
      : "—";

  const summaryCards: {
    title: string;
    value: string;
    subtitle: string;
    dotColor: string;
    valueExtraClass?: string;
  }[] = [
    {
      title: "Total events",
      value: String(summary.totalEvents),
      subtitle: `${summary.singleDayEvents} single-day • ${summary.rangeEventsCount} range`,
      dotColor: "bg-violet-500",
    },
    {
      title: "Categories used",
      value: String(summary.categoriesPresentCount),
      subtitle: `of ${LIFE_EVENT_CATEGORY_ORDER.length} types in this view`,
      dotColor: "bg-emerald-500",
    },
    {
      title: "Years covered",
      value: String(summary.yearsCoveredCount),
      subtitle: spanLine,
      dotColor: "bg-sky-500",
    },
    {
      title: "Top category",
      value: summary.topCategoryLabel,
      subtitle: `${summary.topCategoryEventCount} event${summary.topCategoryEventCount === 1 ? "" : "s"}`,
      dotColor: "bg-purple-500",
      valueExtraClass: "truncate max-w-full",
    },
  ];

  return (
    <section className="mb-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {summaryCards.map((card, index) => (
          <div key={card.title} className={`${cardLargeContainer} relative min-h-[9.5rem]`}>
            <div className={`absolute left-4 top-4 h-3 w-3 rounded-full ${card.dotColor}`} />
            <div className="flex h-full flex-col items-center justify-center px-2 pt-6 text-center">
              <h4 className={`${cardTitle} mb-2`}>{card.title}</h4>
              <p
                className={`${cardValue} mb-1 ${
                  index === 0 ? "text-violet-700" : "text-gray-900"
                } ${card.valueExtraClass ?? ""}`}
              >
                {card.value}
              </p>
              <p className={`${cardSubtitle} line-clamp-2`}>{card.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
