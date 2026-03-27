"use client";

import { format } from "date-fns";
import { useCallback, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LifeEventItem } from "../../../types/life-event";
import { CONTAINER_COLORS } from "../../../config/colorConfig";
import {
  formatLifeEventDate,
  LIFE_EVENT_CATEGORY_CHART_COLORS,
  lifeEventCategoryLetter,
} from "../life-event-helpers";

const card = `${CONTAINER_COLORS.whiteWithPadding} text-left`;

function formatTickDateUtc(ts: number): string {
  const d = new Date(ts);
  return format(
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())),
    "d MMM yy"
  );
}

interface TimelinePoint {
  x: number;
  y: number;
  item: LifeEventItem;
  letter: string;
}

function buildTimelinePoints(items: LifeEventItem[]): TimelinePoint[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
  const perDayOrder = new Map<string, number>();
  return sorted.map((item) => {
    const d = new Date(item.eventDate);
    const dayKey = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    const order = perDayOrder.get(dayKey) ?? 0;
    perDayOrder.set(dayKey, order + 1);
    const y = ((order % 5) - 2) * 0.045;
    return {
      x: d.getTime(),
      y,
      item,
      letter: lifeEventCategoryLetter(item.category),
    };
  });
}

interface LifeEventsTimelineLineChartProps {
  items: LifeEventItem[];
  onBubbleSelect: (item: LifeEventItem) => void;
}

export function LifeEventsTimelineLineChart({ items, onBubbleSelect }: LifeEventsTimelineLineChartProps) {
  const data = useMemo(() => buildTimelinePoints(items), [items]);

  const CustomDot = useMemo(() => {
    function Dot(props: { cx?: number; cy?: number; payload?: TimelinePoint }) {
      const { cx, cy, payload } = props;
      if (cx == null || cy == null || !payload?.item) {
        return null;
      }
      const p = payload;
      const fill = LIFE_EVENT_CATEGORY_CHART_COLORS[p.item.category];
      return (
        <g
          role="button"
          tabIndex={0}
          aria-label={`${p.item.title}, ${formatLifeEventDate(p.item.eventDate)}. Open in timeline.`}
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            onBubbleSelect(p.item);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onBubbleSelect(p.item);
            }
          }}
        >
          <circle cx={cx} cy={cy} r={13} fill={fill} stroke="#fff" strokeWidth={2} />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#fff"
            fontSize={10}
            fontWeight={700}
            style={{ pointerEvents: "none" }}
          >
            {p.letter}
          </text>
        </g>
      );
    }
    return Dot;
  }, [onBubbleSelect]);

  if (items.length === 0) {
    return null;
  }

  const minX = data[0]!.x;
  const maxX = data[data.length - 1]!.x;
  const pad = Math.max(86400000 * 30, (maxX - minX) * 0.05);

  const tickXs = useMemo(() => [...new Set(data.map((d) => d.x))].sort((a, b) => a - b), [data]);

  /** Jan 1 00:00 UTC for each calendar year in the data span (year-start markers). */
  const yearBoundaryXs = useMemo(() => {
    const low = new Date(minX).getUTCFullYear();
    const high = new Date(maxX).getUTCFullYear();
    const out: number[] = [];
    for (let y = low; y <= high; y++) {
      out.push(Date.UTC(y, 0, 1));
    }
    return out;
  }, [minX, maxX]);

  /** Event dates only on the bottom axis; years appear on year ReferenceLine labels at the top. */
  const renderEventAxisTick = useCallback((props: { x?: number; y?: number; payload?: { value?: number } | number }) => {
    const x = props.x ?? 0;
    const y = props.y ?? 0;
    const raw = props.payload;
    const n = typeof raw === "number" ? raw : Number(raw?.value);
    if (!Number.isFinite(n)) return null;
    return (
      <text x={x} y={y} dy={10} textAnchor="middle" fill="#4b5563" fontSize={10}>
        {formatTickDateUtc(n)}
      </text>
    );
  }, []);

  return (
    <div className={card}>
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Events over time</h3>
      <p className="mb-3 text-xs text-gray-500">
        One line in chronological order. Letters match category (e.g. E = Education). Click a bubble to open that
        event in the timeline below.
      </p>
      <div className="h-[17rem] w-full min-h-[16rem]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 28, right: 12, left: 8, bottom: 42 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            {tickXs.map((xVal) => (
              <ReferenceLine
                key={`event-${xVal}`}
                x={xVal}
                stroke="#d8b4fe"
                strokeWidth={1}
                strokeDasharray="4 4"
                strokeOpacity={0.85}
              />
            ))}
            <XAxis
              type="number"
              dataKey="x"
              domain={[minX - pad, maxX + pad]}
              ticks={tickXs}
              tick={renderEventAxisTick}
              angle={0}
              interval={0}
              height={38}
              stroke="#6b7280"
            />
            <YAxis dataKey="y" domain={[-0.12, 0.12]} hide />
            <Tooltip
              cursor={{ stroke: "#c4b5fd", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as TimelinePoint;
                return (
                  <div className="max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                    <div className="font-semibold text-gray-900">{p.item.title}</div>
                    <div className="mt-0.5 text-gray-600">{formatLifeEventDate(p.item.eventDate)}</div>
                    <div className="mt-1 text-gray-500">Click to open in timeline</div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={false}
              isAnimationActive={false}
            />
            {yearBoundaryXs.map((xVal) => (
              <ReferenceLine
                key={`year-end-${xVal}`}
                x={xVal}
                stroke="#64748b"
                strokeWidth={1.5}
                strokeOpacity={0.95}
                isFront
                label={{
                  value: String(new Date(xVal).getUTCFullYear()),
                  position: "top",
                  fill: "#475569",
                  fontSize: 11,
                  fontWeight: 600,
                  offset: 6,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
