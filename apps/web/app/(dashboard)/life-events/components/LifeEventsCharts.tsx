"use client";

import { useMemo } from "react";
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
import {
  LIFE_EVENT_CATEGORY_CHART_COLORS,
  LIFE_EVENT_CATEGORY_LABELS,
  LIFE_EVENT_CATEGORY_ORDER,
} from "../life-event-helpers";

const card = `${CONTAINER_COLORS.whiteWithPadding} text-left`;

const LABEL_SHADOW = "0 1px 2px rgba(0,0,0,0.45)";

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") return parseFloat(v) || 0;
  return 0;
}

/** Vertical bars (events per year): share of all events (%) inside the bar when space allows. */
function createYearBarShape(totalEvents: number) {
  return function YearBarShape(props: Record<string, unknown>) {
    const x = toNum(props.x);
    const y = toNum(props.y);
    const width = toNum(props.width);
    const height = toNum(props.height);
    const payload = props.payload as { year?: string; count?: number } | undefined;
    const count = payload?.count ?? toNum(props.value);
    const fill = (props.fill as string | undefined) ?? "#7c3aed";
    if (width <= 0 || height <= 0) return null;

    const radius = Math.min(4, width / 2, height / 2);
    const pct = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
    const labelText = `${pct}%`;

    const minH = 16;
    const minW = 26;
    const tight = width < 32;
    const fontSize = tight ? 9 : 10;

    const showLabel = height >= minH && width >= minW;

    const cx = x + width / 2;
    const cy = y + height / 2;

    const pathD = `
      M ${x},${y + radius}
      Q ${x},${y} ${x + radius},${y}
      L ${x + width - radius},${y}
      Q ${x + width},${y} ${x + width},${y + radius}
      L ${x + width},${y + height}
      L ${x},${y + height}
      Z
    `;

    return (
      <g className="pointer-events-none">
        <path d={pathD.trim()} fill={fill} />
        {showLabel ? (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize={fontSize}
            fontWeight={700}
            style={{ textShadow: LABEL_SHADOW }}
          >
            {labelText}
          </text>
        ) : null}
      </g>
    );
  };
}

/** Horizontal bars (category): right-aligned label inside bar, like expenses-by-account. */
function createCategoryBarShape(totalEvents: number) {
  return function CategoryBarShape(props: Record<string, unknown>) {
    const x = toNum(props.x);
    const y = toNum(props.y);
    const width = toNum(props.width);
    const height = toNum(props.height);
    const payload = props.payload as { count?: number; name?: string } | undefined;
    const count = payload?.count ?? toNum(props.value);
    const fill = (props.fill as string | undefined) ?? "#6366f1";
    if (width <= 0 || height <= 0) return null;

    const radius = Math.min(6, height / 2);
    const pct = totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0;
    const longLabel = `${count} event${count === 1 ? "" : "s"} (${pct}%)`;
    const midLabel = `${count} event${count === 1 ? "" : "s"}`;
    const shortLabel = String(count);

    const minInsideLong = 108;
    const minInsideMid = 64;
    const minInsideShort = 22;
    const tight = width < 170;
    const fontSize = tight ? 9 : 10;

    let label: string | null = null;
    if (width >= minInsideLong) label = longLabel;
    else if (width >= minInsideMid) label = midLabel;
    else if (width >= minInsideShort) label = shortLabel;

    const cy = y + height / 2;
    const tx = x + width - 10;

    const pathD = `
      M ${x},${y}
      h ${Math.max(width - radius, 0)}
      q ${radius},0 ${radius},${radius}
      v ${Math.max(height - 2 * radius, 0)}
      q 0,${radius} -${radius},${radius}
      h -${Math.max(width - radius, 0)}
      z
    `;

    return (
      <g className="pointer-events-none">
        <path d={pathD.trim()} fill={fill} />
        {label ? (
          <text
            x={tx}
            y={cy}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize={fontSize}
            fontWeight={700}
            style={{ textShadow: LABEL_SHADOW }}
          >
            {label}
          </text>
        ) : null}
      </g>
    );
  };
}

function aggregateByYear(items: LifeEventItem[]): { year: string; count: number }[] {
  const yearCounts = new Map<number, number>();

  function addYear(year: number, amount: number) {
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + amount);
  }

  for (const item of items) {
    if (item.eventEndDate) {
      const startYear = new Date(item.eventDate).getUTCFullYear();
      const endYear = new Date(item.eventEndDate).getUTCFullYear();
      if (startYear === endYear) {
        addYear(startYear, 2);
      } else {
        addYear(startYear, 1);
        addYear(endYear, 1);
      }
    } else {
      addYear(new Date(item.eventDate).getUTCFullYear(), 1);
    }
  }

  return [...yearCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year: String(year), count }));
}

function aggregateByCategory(items: LifeEventItem[]): { name: string; category: LifeEventCategory; count: number }[] {
  const map = new Map<LifeEventCategory, number>();
  for (const c of LIFE_EVENT_CATEGORY_ORDER) map.set(c, 0);
  for (const item of items) {
    const delta = item.eventEndDate ? 2 : 1;
    map.set(item.category, (map.get(item.category) ?? 0) + delta);
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
  const totalEvents = items.reduce((sum, item) => sum + (item.eventEndDate ? 2 : 1), 0);

  const yearBarShape = useMemo(
    () => createYearBarShape(totalEvents),
    [totalEvents]
  );
  const categoryBarShape = useMemo(
    () => createCategoryBarShape(totalEvents),
    [totalEvents]
  );

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
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Events per year</h3>
        <p className="mb-3 text-xs text-gray-500">
          Counts event points per calendar year: single-day events count once; range events count as two points
          (start + end only). % is share of all points.
        </p>
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
              <Bar
                dataKey="count"
                fill="#7c3aed"
                name="Events"
                isAnimationActive={false}
                shape={yearBarShape as never}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={card}>
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Events by category</h3>
        <p className="mb-3 text-xs text-gray-500">
          Count and % of all event points (single-day=1, range start+end=2), inside each bar (right-aligned), hidden
          if the bar is too narrow.
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={byCategory}
              margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
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
              <Bar
                dataKey="count"
                fill="#6366f1"
                name="Events"
                maxBarSize={34}
                isAnimationActive={false}
                shape={categoryBarShape as never}
              >
                {byCategory.map((entry) => (
                  <Cell key={entry.category} fill={LIFE_EVENT_CATEGORY_CHART_COLORS[entry.category]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
