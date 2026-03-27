"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LifeEventCategory } from "@prisma/client";
import type { LifeEventItem } from "../../../types/life-event";
import { CONTAINER_COLORS } from "../../../config/colorConfig";
import { LIFE_EVENT_CATEGORY_LABELS, LIFE_EVENT_CATEGORY_ORDER } from "../life-event-helpers";

const card = `${CONTAINER_COLORS.whiteWithPadding} text-left`;

const CATEGORY_CHART_COLORS: Record<LifeEventCategory, string> = {
  EDUCATION: "#6366f1",
  CAREER: "#0ea5e9",
  TRAVEL: "#14b8a6",
  PERSONAL: "#a855f7",
  LEGAL: "#f97316",
  OTHER: "#94a3b8",
};

function aggregateByYear(items: LifeEventItem[]): { year: string; count: number }[] {
  const map = new Map<number, number>();
  for (const item of items) {
    const y = new Date(item.eventDate).getUTCFullYear();
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year: String(year), count }));
}

function aggregateByCategory(items: LifeEventItem[]): { name: string; category: LifeEventCategory; count: number }[] {
  const map = new Map<LifeEventCategory, number>();
  for (const c of LIFE_EVENT_CATEGORY_ORDER) map.set(c, 0);
  for (const item of items) {
    map.set(item.category, (map.get(item.category) ?? 0) + 1);
  }
  return LIFE_EVENT_CATEGORY_ORDER.map((category) => ({
    category,
    name: LIFE_EVENT_CATEGORY_LABELS[category],
    count: map.get(category) ?? 0,
  })).filter((row) => row.count > 0);
}

interface LifeEventsChartsProps {
  items: LifeEventItem[];
}

export function LifeEventsCharts({ items }: LifeEventsChartsProps) {
  const byYear = aggregateByYear(items);
  const byCategory = aggregateByCategory(items);

  if (items.length === 0) {
    return (
      <div className={`${card} text-sm text-gray-500`}>
        Add life events to see timeline and category charts.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Events per year</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byYear} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6b7280" width={32} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value: number | string) => [value, "Events"]}
              />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Events" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Events by category</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={byCategory}
              margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis
                type="category"
                dataKey="name"
                width={88}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value: number | string) => [value, "Events"]}
              />
              <Bar dataKey="count" name="Events" radius={[0, 4, 4, 0]}>
                {byCategory.map((entry) => (
                  <Cell key={entry.category} fill={CATEGORY_CHART_COLORS[entry.category]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
