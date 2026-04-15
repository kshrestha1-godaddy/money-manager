"use client";

import { type ReactElement } from "react";
import { format } from "date-fns";
import { useMemo } from "react";
import {
  CartesianGrid,
  Customized,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BloodPressureCategory } from "@prisma/client";
import type { BloodPressureReadingDTO } from "../actions/blood-pressure";
import {
  BP_CHART_REGION_SHORT,
  BP_CHART_X_DOMAIN,
  BP_CHART_Y_DOMAIN,
  BLOOD_PRESSURE_CATEGORY_LABELS,
  BLOOD_PRESSURE_CHART_COLORS,
  classifyBloodPressure,
} from "../blood-pressure-helpers";
import { CONTAINER_COLORS } from "../../../config/colorConfig";

interface BloodPressureClassificationChartProps {
  readings: BloodPressureReadingDTO[];
  className?: string;
  plotHeightClass?: string;
}

/**
 * 1 mmHg steps so region edges line up with axis ticks (60, 80, 90, 100, 120 D and 90, 120, 140, 160 S).
 * Coarser steps (e.g. 3.5) shift boundaries between ticks — e.g. LOW corner not on 60/90.
 */
const GRID_STEP = 1;
const BORDER_STROKE = 2.5;

const X0 = BP_CHART_X_DOMAIN[0];
const X1 = BP_CHART_X_DOMAIN[1];
const Y0 = BP_CHART_Y_DOMAIN[0];
const Y1 = BP_CHART_Y_DOMAIN[1];

interface AxisMapProps {
  xAxisMap?: Record<string, { scale: (v: number) => number }>;
  yAxisMap?: Record<string, { scale: (v: number) => number }>;
}

function CategoryGridLayer(props: AxisMapProps) {
  const xKey = props.xAxisMap ? Object.keys(props.xAxisMap)[0] : undefined;
  const yKey = props.yAxisMap ? Object.keys(props.yAxisMap)[0] : undefined;
  const xAxis = xKey && props.xAxisMap ? props.xAxisMap[xKey] : undefined;
  const yAxis = yKey && props.yAxisMap ? props.yAxisMap[yKey] : undefined;
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const xs = xAxis.scale;
  const ys = yAxis.scale;
  const rects: ReactElement[] = [];
  let k = 0;

  for (let systolic = Y0; systolic < Y1; systolic += GRID_STEP) {
    const s2 = Math.min(systolic + GRID_STEP, Y1);
    for (let diastolic = X0; diastolic < X1; diastolic += GRID_STEP) {
      const d2 = Math.min(diastolic + GRID_STEP, X1);
      const cat = classifyBloodPressure((systolic + s2) / 2, (diastolic + d2) / 2);
      const fill = BLOOD_PRESSURE_CHART_COLORS[cat];
      const x1 = xs(diastolic);
      const x2 = xs(d2);
      const yTop = ys(s2);
      const yBot = ys(systolic);
      const w = x2 - x1;
      const h = yBot - yTop;
      if (w <= 0 || h <= 0) continue;
      rects.push(
        <rect key={k++} x={x1} y={yTop} width={w} height={h} fill={fill} fillOpacity={1} stroke="none" />
      );
    }
  }

  return <g pointerEvents="none">{rects}</g>;
}

/** Thick white lines along cell edges where classification changes (nested L-shaped zones). */
function RegionBorderLayer(props: AxisMapProps) {
  const xKey = props.xAxisMap ? Object.keys(props.xAxisMap)[0] : undefined;
  const yKey = props.yAxisMap ? Object.keys(props.yAxisMap)[0] : undefined;
  const xAxis = xKey && props.xAxisMap ? props.xAxisMap[xKey] : undefined;
  const yAxis = yKey && props.yAxisMap ? props.yAxisMap[yKey] : undefined;
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const xs = xAxis.scale;
  const ys = yAxis.scale;
  const lines: ReactElement[] = [];
  let lineKey = 0;

  const catAt = (sMid: number, dMid: number) => classifyBloodPressure(sMid, dMid);

  for (let systolic = Y0; systolic < Y1; systolic += GRID_STEP) {
    const s2 = Math.min(systolic + GRID_STEP, Y1);
    const sMid = (systolic + s2) / 2;
    for (let diastolic = X0; diastolic < X1; diastolic += GRID_STEP) {
      const d2 = Math.min(diastolic + GRID_STEP, X1);
      const c = catAt(sMid, (diastolic + d2) / 2);
      const yTop = ys(s2);
      const yBot = ys(systolic);
      const xLeft = xs(diastolic);
      const xRight = xs(d2);

      if (d2 < X1) {
        const dNext2 = Math.min(d2 + GRID_STEP, X1);
        const cR = catAt(sMid, (d2 + dNext2) / 2);
        if (c !== cR) {
          const xv = xs(d2);
          lines.push(
            <line
              key={`v-${lineKey++}`}
              x1={xv}
              y1={yTop}
              x2={xv}
              y2={yBot}
              stroke="#ffffff"
              strokeWidth={BORDER_STROKE}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          );
        }
      }

      if (s2 < Y1) {
        const sNext2 = Math.min(s2 + GRID_STEP, Y1);
        const cT = catAt((s2 + sNext2) / 2, (diastolic + d2) / 2);
        if (c !== cT) {
          const yh = ys(s2);
          lines.push(
            <line
              key={`h-${lineKey++}`}
              x1={xLeft}
              y1={yh}
              x2={xRight}
              y2={yh}
              stroke="#ffffff"
              strokeWidth={BORDER_STROKE}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          );
        }
      }
    }
  }

  return <g pointerEvents="none">{lines}</g>;
}

/** Centers inside each band, away from 60/80/90/100/120 and 90/120/140/160 boundary lines. */
const LABEL_POINTS: { diastolic: number; systolic: number; category: BloodPressureCategory }[] = [
  { diastolic: 50, systolic: 80, category: "LOW" },
  { diastolic: 74, systolic: 104, category: "NORMAL" },
  { diastolic: 86, systolic: 132, category: "PRE_HYPERTENSION" },
  { diastolic: 94, systolic: 150, category: "HIGH_STAGE_1" },
  { diastolic: 114, systolic: 182, category: "HIGH_STAGE_2" },
];

function RegionLabelsLayer(props: AxisMapProps) {
  const xKey = props.xAxisMap ? Object.keys(props.xAxisMap)[0] : undefined;
  const yKey = props.yAxisMap ? Object.keys(props.yAxisMap)[0] : undefined;
  const xAxis = xKey && props.xAxisMap ? props.xAxisMap[xKey] : undefined;
  const yAxis = yKey && props.yAxisMap ? props.yAxisMap[yKey] : undefined;
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const xs = xAxis.scale;
  const ys = yAxis.scale;

  return (
    <g pointerEvents="none" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {LABEL_POINTS.map(({ diastolic, systolic, category }) => {
        const cx = xs(diastolic);
        const cy = ys(systolic);
        const dark = category === "HIGH_STAGE_2";
        const label = BP_CHART_REGION_SHORT[category];
        return (
          <text
            key={category}
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={dark ? "#ffffff" : "#0f172a"}
            fontSize={category === "PRE_HYPERTENSION" ? 9 : 10}
            fontWeight={700}
            style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}

function axisTickDiastolic(v: number) {
  if (v >= 124) return "120+";
  return String(Math.round(v));
}

function axisTickSystolic(v: number) {
  if (v >= 198) return "190+";
  return String(Math.round(v));
}

const X_TICKS = [40, 50, 60, 70, 80, 90, 100, 110, 120, 125];
const Y_TICKS = [70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];

interface ScatterShapeProps {
  cx?: number;
  cy?: number;
  payload?: { systolic: number; diastolic: number };
}

function ReadingDot(props: ScatterShapeProps) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  const cat = classifyBloodPressure(payload.systolic, payload.diastolic);
  const fill = BLOOD_PRESSURE_CHART_COLORS[cat];
  return (
    <circle
      cx={cx}
      cy={cy}
      r={7.5}
      fill={fill}
      stroke="#ffffff"
      strokeWidth={2.5}
      style={{
        filter: "drop-shadow(0 1px 3px rgb(0 0 0 / 0.4))",
        pointerEvents: "auto",
      }}
    />
  );
}

const DEFAULT_PLOT_HEIGHT = "h-[min(520px,70vh)]";

const AXIS_LABEL_STYLE = { fill: "#475569", fontSize: 11, fontWeight: 600 as const, letterSpacing: "0.06em" };

export function BloodPressureClassificationChart({
  readings,
  className = "",
  plotHeightClass = DEFAULT_PLOT_HEIGHT,
}: BloodPressureClassificationChartProps) {
  const points = useMemo(
    () =>
      readings.map((r) => ({
        id: r.id,
        diastolic: r.diastolic,
        systolic: r.systolic,
        measuredAt: r.measuredAt,
      })),
    [readings]
  );

  /** Poster domains only — keeps ticks, colored grid, and white borders aligned. Readings outside may sit on the plot edge. */
  const xDomain = BP_CHART_X_DOMAIN;
  const yDomain = BP_CHART_Y_DOMAIN;

  const chartMargin = { top: 10, right: 14, bottom: 54, left: 56 };

  return (
    <div className={`${CONTAINER_COLORS.whiteWithPadding} mb-8 ${className}`.trim()}>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Blood pressure map</h3>
      <p className="text-sm text-gray-600 mb-4">
        Each point is one reading (diastolic horizontal, systolic vertical). White lines mark category boundaries.
      </p>
      <div className={`${plotHeightClass} w-full min-w-0`}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={chartMargin}>
            <Customized component={CategoryGridLayer} />
            <Customized component={RegionBorderLayer} />
            <Customized component={RegionLabelsLayer} />
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.22} vertical horizontal />
            <XAxis
              type="number"
              dataKey="diastolic"
              domain={xDomain}
              ticks={X_TICKS}
              interval={0}
              tickFormatter={axisTickDiastolic}
              tickLine={{ stroke: "#0f172a", strokeWidth: 1 }}
              axisLine={{ stroke: "#0f172a", strokeWidth: 1 }}
              tick={{ fontSize: 11, fill: "#1e293b", fontWeight: 500 }}
              tickMargin={10}
              label={{
                value: "Diastolic blood pressure (mmHg)",
                position: "bottom",
                offset: 40,
                style: { ...AXIS_LABEL_STYLE, textAnchor: "middle" },
              }}
              stroke="#334155"
              padding={{ left: 0, right: 0 }}
              allowDataOverflow
            />
            <YAxis
              type="number"
              dataKey="systolic"
              domain={yDomain}
              ticks={Y_TICKS}
              interval={0}
              tickFormatter={axisTickSystolic}
              tickLine={{ stroke: "#0f172a", strokeWidth: 1 }}
              axisLine={{ stroke: "#0f172a", strokeWidth: 1 }}
              tick={{ fontSize: 11, fill: "#1e293b", fontWeight: 500 }}
              tickMargin={8}
              width={46}
              label={{
                value: "Systolic blood pressure (mmHg)",
                angle: -90,
                position: "insideLeft",
                offset: 4,
                style: { ...AXIS_LABEL_STYLE, textAnchor: "middle" },
              }}
              stroke="#334155"
              allowDataOverflow
            />
            <Tooltip
              cursor={{ strokeDasharray: "4 4", stroke: "#64748b", strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as {
                  systolic: number;
                  diastolic: number;
                  measuredAt: string;
                };
                const cat = classifyBloodPressure(p.systolic, p.diastolic);
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                    <div className="font-medium text-gray-900">
                      {format(new Date(p.measuredAt), "MMM d, yyyy · HH:mm")}
                    </div>
                    <div className="mt-1 text-gray-800">
                      {p.systolic}/{p.diastolic} mmHg
                    </div>
                    <div className="mt-0.5 text-gray-600">{BLOOD_PRESSURE_CATEGORY_LABELS[cat]}</div>
                  </div>
                );
              }}
            />
            <Scatter
              name="Readings"
              data={points}
              isAnimationActive={false}
              shape={(shapeProps: ScatterShapeProps) => <ReadingDot {...shapeProps} />}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
