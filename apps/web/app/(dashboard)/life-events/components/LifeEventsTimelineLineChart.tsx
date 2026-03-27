"use client";

import { format } from "date-fns";
import { useCallback, useMemo } from "react";
import {
  CartesianGrid,
  Customized,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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

const BUBBLE_RADIUS = 13;
const Y_STEP = 0.045;
const ESTIMATED_CHART_WIDTH_PX = 720;
const ESTIMATED_TICK_LABEL_WIDTH_PX = 56;
/** Top margin when there are no range bars (year labels only need the default plot padding). */
const CHART_MARGIN_TOP_NO_GANTT = 32;
/**
 * Vertical space reserved for year ReferenceLine labels (they sit just above the plot top).
 * Gantt bars start below this band so they never cover year numbers.
 */
const YEAR_LABEL_BAND_PX = 48;
/** Extra inset so range bars stay clearly inside the chart area. */
const GANTT_TOP_INSET_PX = 10;
/** Gap between the bottom of the Gantt stack and the scatter plot area. */
const GANTT_TO_PLOT_GAP_PX = 12;
/** Year text row above the Gantt band. */
const YEAR_LABEL_TEXT_Y = 14;
const GANTT_BAR_H = 10;
const GANTT_ROW = 14;
const GANTT_PAD = 4;
/** Phantom scatter point when only range events exist (keeps axes/scales valid). */
const PHANTOM_POINT_ID = -1;

function formatTickDateUtc(ts: number): string {
  const d = new Date(ts);
  return format(
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())),
    "d MMM yy"
  );
}

function getTimelineTimeBounds(items: LifeEventItem[]): { minX: number; maxX: number } {
  let minT = Infinity;
  let maxT = -Infinity;
  for (const i of items) {
    const s = new Date(i.eventDate).getTime();
    const e = i.eventEndDate ? new Date(i.eventEndDate).getTime() : s;
    minT = Math.min(minT, s);
    maxT = Math.max(maxT, e);
  }
  if (!Number.isFinite(minT)) {
    const n = Date.now();
    return { minX: n, maxX: n };
  }
  return { minX: minT, maxX: maxT };
}

function assignRangeLanes(events: LifeEventItem[]): Map<number, number> {
  const sorted = [...events].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
  const laneEnds: number[] = [];
  const map = new Map<number, number>();
  for (const ev of sorted) {
    const s = new Date(ev.eventDate).getTime();
    const e = new Date(ev.eventEndDate!).getTime();
    let lane = 0;
    while (lane < laneEnds.length && s < laneEnds[lane]!) {
      lane++;
    }
    if (lane === laneEnds.length) laneEnds.push(e);
    else laneEnds[lane] = e;
    map.set(ev.id, lane);
  }
  return map;
}

interface TimelinePoint {
  x: number;
  y: number;
  layer: number;
  item: LifeEventItem;
  letter: string;
}

function buildTimelinePoints(pointItems: LifeEventItem[]): TimelinePoint[] {
  if (pointItems.length === 0) return [];
  const sorted = [...pointItems].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
  const minX = new Date(sorted[0]!.eventDate).getTime();
  const maxX = new Date(sorted[sorted.length - 1]!.eventDate).getTime();
  const pad = Math.max(86400000 * 30, (maxX - minX) * 0.05);
  const domainWidth = maxX - minX + 2 * pad;
  const gapMs = Math.max(
    domainWidth * ((2 * BUBBLE_RADIUS) / ESTIMATED_CHART_WIDTH_PX),
    6 * 3600 * 1000
  );

  const layerBuckets = new Map<number, number[]>();
  const points: TimelinePoint[] = [];

  for (const item of sorted) {
    const d = new Date(item.eventDate);
    const x = d.getTime();
    let layer = 0;
    for (;;) {
      const bucket = layerBuckets.get(layer) ?? [];
      let conflict = false;
      for (const prevX of bucket) {
        if (Math.abs(x - prevX) < gapMs) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        layerBuckets.set(layer, [...bucket, x]);
        const y = layer * Y_STEP;
        points.push({
          x,
          y,
          layer,
          item,
          letter: lifeEventCategoryLetter(item.category),
        });
        break;
      }
      layer++;
    }
  }

  return points;
}

function phantomTimelinePoint(bounds: { minX: number; maxX: number }): TimelinePoint {
  const mid = (bounds.minX + bounds.maxX) / 2;
  const phantomItem = {
    id: PHANTOM_POINT_ID,
    eventDate: new Date(mid),
    eventEndDate: null,
    title: "",
    description: null,
    location: null,
    category: "OTHER" as const,
    tags: [],
    externalLink: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return {
    x: mid,
    y: 0,
    layer: 0,
    item: phantomItem,
    letter: "",
  };
}

interface LifeEventsTimelineLineChartProps {
  items: LifeEventItem[];
  onBubbleSelect: (item: LifeEventItem) => void;
}

export function LifeEventsTimelineLineChart({ items, onBubbleSelect }: LifeEventsTimelineLineChartProps) {
  const pointItems = useMemo(
    () => items.filter((i) => !i.eventEndDate),
    [items]
  );
  const rangeEvents = useMemo(() => items.filter((i) => i.eventEndDate), [items]);

  const timeBounds = useMemo(() => getTimelineTimeBounds(items), [items]);

  const rangeLaneMap = useMemo(() => assignRangeLanes(rangeEvents), [rangeEvents]);

  const maxRangeLane = useMemo(
    () => Math.max(0, ...Array.from(rangeLaneMap.values()), -1),
    [rangeLaneMap]
  );

  const ganttHeight =
    rangeEvents.length === 0 ? 0 : (maxRangeLane + 1) * GANTT_ROW + GANTT_PAD;

  const data = useMemo((): TimelinePoint[] => {
    const built = buildTimelinePoints(pointItems);
    if (built.length > 0) return built;
    if (items.length === 0) return [];
    return [phantomTimelinePoint(getTimelineTimeBounds(items))];
  }, [pointItems, items]);

  const tickXs = useMemo(() => {
    const xs = new Set<number>();
    for (const d of data) {
      if (d.item.id !== PHANTOM_POINT_ID) xs.add(d.x);
    }
    for (const r of rangeEvents) {
      xs.add(new Date(r.eventDate).getTime());
      xs.add(new Date(r.eventEndDate!).getTime());
    }
    return [...xs].sort((a, b) => a - b);
  }, [data, rangeEvents]);

  const maxLayer = useMemo(() => Math.max(0, ...data.map((d) => d.layer)), [data]);

  const xPad = useMemo(
    () => Math.max(86400000 * 30, (timeBounds.maxX - timeBounds.minX) * 0.05),
    [timeBounds]
  );

  const tickLaneMap = useMemo(() => {
    const out = new Map<number, number>();
    if (tickXs.length === 0) return out;

    const domainWidth = timeBounds.maxX - timeBounds.minX + 2 * xPad;
    const minGapMs = Math.max(
      domainWidth * (ESTIMATED_TICK_LABEL_WIDTH_PX / ESTIMATED_CHART_WIDTH_PX),
      86400000 * 7
    );
    const laneEnds: number[] = [];

    for (const x of tickXs) {
      let lane = 0;
      while (lane < laneEnds.length && x - laneEnds[lane]! < minGapMs) lane++;
      if (lane === laneEnds.length) laneEnds.push(x);
      else laneEnds[lane] = x;
      out.set(x, lane);
    }

    return out;
  }, [tickXs, timeBounds, xPad]);

  const maxTickLane = useMemo(
    () => Math.max(0, ...Array.from(tickLaneMap.values()), 0),
    [tickLaneMap]
  );

  const bottomExtra = Math.max(maxLayer, maxTickLane) * 14;
  const chartMargin = useMemo(
    () => ({
      top:
        rangeEvents.length === 0
          ? CHART_MARGIN_TOP_NO_GANTT
          : YEAR_LABEL_BAND_PX + GANTT_TOP_INSET_PX + ganttHeight + GANTT_TO_PLOT_GAP_PX,
      right: 12,
      left: 8,
      // Keep bottom margin stable; dynamic stacking is already handled by XAxis height.
      bottom: 32,
    }),
    [ganttHeight, rangeEvents.length]
  );

  const yDomain = useMemo((): [number, number] => {
    const top = Math.max(0.14, maxLayer * Y_STEP + 0.14);
    return [-0.1, top];
  }, [maxLayer]);

  const CustomDot = useMemo(() => {
    function Dot(props: { cx?: number; cy?: number; payload?: TimelinePoint }) {
      const { cx, cy, payload } = props;
      if (cx == null || cy == null || !payload?.item) {
        return null;
      }
      if (payload.item.id === PHANTOM_POINT_ID) return null;
      const p = payload;
      const fill = LIFE_EVENT_CATEGORY_CHART_COLORS[p.item.category];
      return (
        <g
          role="button"
          tabIndex={0}
          aria-label={
            p.item.eventEndDate
              ? `${p.item.title}. Commence ${formatLifeEventDate(p.item.eventDate)}. End ${formatLifeEventDate(p.item.eventEndDate)}. Open in timeline.`
              : `${p.item.title}, ${formatLifeEventDate(p.item.eventDate)}. Open in timeline.`
          }
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
          <circle cx={cx} cy={cy} r={BUBBLE_RADIUS} fill={fill} stroke="#fff" strokeWidth={2} />
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

  const yearBoundaryXs = useMemo(() => {
    const { minX, maxX } = timeBounds;
    const low = new Date(minX).getUTCFullYear();
    const high = new Date(maxX).getUTCFullYear();
    const out: number[] = [];
    for (let y = low; y <= high; y++) {
      out.push(Date.UTC(y, 0, 1));
    }
    return out;
  }, [timeBounds]);

  const pointLayerByX = useMemo(() => {
    const map = new Map<number, number>();
    for (const d of data) {
      if (d.item.id === PHANTOM_POINT_ID) continue;
      const prev = map.get(d.x) ?? 0;
      map.set(d.x, Math.max(prev, d.layer));
    }
    return map;
  }, [data]);

  const renderEventAxisTick = useCallback(
    (props: { x?: number; y?: number; payload?: { value?: number } | number }) => {
      const x = props.x ?? 0;
      const y = props.y ?? 0;
      const raw = props.payload;
      const n = typeof raw === "number" ? raw : Number(raw?.value);
      if (!Number.isFinite(n)) return null;
      const pointLayer = pointLayerByX.get(n) ?? 0;
      const tickLane = tickLaneMap.get(n) ?? 0;
      const dy = 10 + Math.max(pointLayer, tickLane) * 14;
      return (
        <text x={x} y={y} dy={dy} textAnchor="middle" fill="#4b5563" fontSize={10}>
          {formatTickDateUtc(n)}
        </text>
      );
    },
    [pointLayerByX, tickLaneMap]
  );

  const ganttLayer = useMemo(() => {
    function RangeGanttLayer(chartProps: Record<string, unknown>) {
      const xAxisMap = chartProps.xAxisMap as Record<string, { scale?: (v: number) => number }> | undefined;
      const offset = chartProps.offset as
        | { left?: number; top?: number; width?: number; height?: number }
        | undefined;
      const xAxis = xAxisMap && Object.values(xAxisMap)[0];
      const scale = xAxis?.scale;
      if (!scale || offset?.left == null) return null;
      const left = offset.left;

      return (
        <g>
          {rangeEvents.map((ev) => {
            const lane = rangeLaneMap.get(ev.id) ?? 0;
            const s = new Date(ev.eventDate).getTime();
            const e = new Date(ev.eventEndDate!).getTime();
            const x0 = left + scale(s);
            const x1 = left + scale(e);
            const w = Math.max(Math.abs(x1 - x0), 3);
            const barX = Math.min(x0, x1);
            const barY = YEAR_LABEL_BAND_PX + GANTT_TOP_INSET_PX + 2 + lane * GANTT_ROW;
            const fill = LIFE_EVENT_CATEGORY_CHART_COLORS[ev.category];
            return (
              <g key={ev.id}>
                <rect
                  x={barX}
                  y={barY}
                  width={w}
                  height={GANTT_BAR_H}
                  rx={4}
                  fill={fill}
                  fillOpacity={0.88}
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={(evt) => {
                    evt.stopPropagation();
                    onBubbleSelect(ev);
                  }}
                  onKeyDown={(evt) => {
                    if (evt.key === "Enter" || evt.key === " ") {
                      evt.preventDefault();
                      onBubbleSelect(ev);
                    }
                  }}
                />
                <title>
                  {ev.eventEndDate
                    ? `${ev.title} (Commence ${formatLifeEventDate(ev.eventDate)} — End ${formatLifeEventDate(ev.eventEndDate)})`
                    : `${ev.title} (${formatLifeEventDate(ev.eventDate)})`}
                </title>
              </g>
            );
          })}
        </g>
      );
    }
    return RangeGanttLayer;
  }, [rangeEvents, rangeLaneMap, onBubbleSelect]);

  const verticalReferenceLayer = useMemo(() => {
    function VerticalReferenceLayer(chartProps: Record<string, unknown>) {
      const xAxisMap = chartProps.xAxisMap as Record<string, { scale?: (v: number) => number }> | undefined;
      const offset = chartProps.offset as
        | { left?: number; top?: number; width?: number; height?: number }
        | undefined;
      const xAxis = xAxisMap && Object.values(xAxisMap)[0];
      const scale = xAxis?.scale;
      if (!scale || offset?.left == null || offset.top == null || offset.height == null) return null;

      const left = offset.left;
      const topY = YEAR_LABEL_TEXT_Y + 6;
      const bottomY = offset.top + offset.height;

      return (
        <g>
          {tickXs.map((xVal) => {
            const x = left + scale(xVal);
            return (
              <line
                key={`extended-event-${xVal}`}
                x1={x}
                y1={topY}
                x2={x}
                y2={bottomY}
                stroke="#d8b4fe"
                strokeWidth={1}
                strokeDasharray="4 4"
                strokeOpacity={0.85}
              />
            );
          })}
          {yearBoundaryXs.map((xVal) => {
            const x = left + scale(xVal);
            return (
              <g key={`extended-year-${xVal}`}>
                <line
                  x1={x}
                  y1={topY}
                  x2={x}
                  y2={bottomY}
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeOpacity={0.95}
                />
                <text
                  x={x}
                  y={YEAR_LABEL_TEXT_Y}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize={11}
                  fontWeight={600}
                >
                  {String(new Date(xVal).getUTCFullYear())}
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    return VerticalReferenceLayer;
  }, [tickXs, yearBoundaryXs]);

  if (items.length === 0) {
    return null;
  }

  const { minX, maxX } = timeBounds;

  return (
    <div className={card}>
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Events over time</h3>
      <p className="mb-3 text-xs text-gray-500">
        Single-day events appear as bubbles on the line; date ranges appear as Gantt-style bars above. Overlapping
        bubbles stack upward; axis labels shift down to match.
      </p>
      <div className="h-[24rem] w-full min-h-[22rem]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <Customized component={verticalReferenceLayer} />
            <ReferenceLine y={0} stroke="#a78bfa" strokeWidth={2} />
            <Customized component={ganttLayer} />
            <XAxis
              type="number"
              dataKey="x"
              domain={[minX - xPad, maxX + xPad]}
              ticks={tickXs}
              tick={renderEventAxisTick}
              angle={0}
              interval={0}
              height={38 + bottomExtra}
              stroke="#6b7280"
            />
            <YAxis type="number" dataKey="y" domain={yDomain} hide />
            <Tooltip
              cursor={{ stroke: "#c4b5fd", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as TimelinePoint;
                if (p.item.id === PHANTOM_POINT_ID) return null;
                return (
                  <div className="max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                    <div className="font-semibold text-gray-900">{p.item.title}</div>
                    {p.item.eventEndDate ? (
                      <div className="mt-0.5 space-y-0.5 text-gray-600">
                        <div>Commence: {formatLifeEventDate(p.item.eventDate)}</div>
                        <div>End: {formatLifeEventDate(p.item.eventEndDate)}</div>
                      </div>
                    ) : (
                      <div className="mt-0.5 text-gray-600">{formatLifeEventDate(p.item.eventDate)}</div>
                    )}
                    <div className="mt-1 text-gray-500">Click to open in timeline</div>
                  </div>
                );
              }}
            />
            <Scatter data={data} fill="transparent" shape={<CustomDot />} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
