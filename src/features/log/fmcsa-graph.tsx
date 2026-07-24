"use client";

import * as React from "react";
import { DUTY_META, DUTY_STATUSES, type DutyStatus } from "@/lib/fmcsa/constants";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import type { DutySegment } from "@/lib/fmcsa/types";
import { formatHoursClock, cn } from "@/lib/utils";

const LEFT = 132;
const HOUR_W = 30;
const GRID_W = 24 * HOUR_W;
const ROW_H = 36;
const TOP = 24;
const RIGHT = 62;
const HEIGHT = TOP + 4 * ROW_H;
const WIDTH = LEFT + GRID_W + RIGHT;

const ROW_LABELS: Record<DutyStatus, string> = {
  OFF: "1. Off Duty",
  SB: "2. Sleeper Berth",
  D: "3. Driving",
  ON: "4. On Duty (Not Driving)",
};

function xForMin(min: number) {
  return LEFT + (min / 1440) * GRID_W;
}
function yForRow(status: DutyStatus) {
  return TOP + DUTY_STATUSES.indexOf(status) * ROW_H + ROW_H / 2;
}

/**
 * The official FMCSA Record of Duty Status graph grid. Renders the driver's
 * duty line as a continuous stepped trace across the 24-hour grid, exactly as
 * on the paper form — print and PDF ready.
 */
export function FmcsaGraph({
  segments,
  colored = true,
  className,
}: {
  segments: DutySegment[];
  colored?: boolean;
  className?: string;
}) {
  const sorted = React.useMemo(
    () => [...segments].sort((a, b) => a.startMin - b.startMin),
    [segments],
  );
  const totals = computeStatusTotals(sorted);

  // Build the continuous stepped duty line.
  const linePoints: string[] = [];
  sorted.forEach((seg, i) => {
    const y = yForRow(seg.status);
    const x1 = xForMin(seg.startMin);
    const x2 = xForMin(seg.endMin);
    if (i === 0) linePoints.push(`${x1},${y}`);
    else linePoints.push(`${x1},${y}`); // vertical connector handled by prev point
    linePoints.push(`${x2},${y}`);
  });

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full min-w-[640px] text-foreground print:text-black"
        role="img"
        aria-label="FMCSA Record of Duty Status graph"
      >
        {/* Hour numbers */}
        {Array.from({ length: 25 }).map((_, h) => {
          const label = h === 0 || h === 24 ? "M" : h === 12 ? "N" : String(h % 12 || 12);
          return (
            <text
              key={h}
              x={xForMin(h * 60)}
              y={14}
              textAnchor="middle"
              className="fill-muted-foreground print:fill-black"
              style={{ fontSize: 8.5, fontWeight: 600 }}
            >
              {label}
            </text>
          );
        })}
        <text
          x={LEFT + GRID_W / 2}
          y={14}
          textAnchor="middle"
          className="fill-transparent"
          style={{ fontSize: 8 }}
        />
        <text x={LEFT + GRID_W + RIGHT / 2} y={14} textAnchor="middle" className="fill-muted-foreground print:fill-black" style={{ fontSize: 7.5, fontWeight: 700 }}>
          TOTAL
        </text>

        {/* Grid frame */}
        <rect
          x={LEFT}
          y={TOP}
          width={GRID_W}
          height={4 * ROW_H}
          className="fill-none stroke-border print:stroke-black"
          strokeWidth={1.2}
        />

        {/* Rows */}
        {DUTY_STATUSES.map((status, r) => {
          const y0 = TOP + r * ROW_H;
          return (
            <g key={status}>
              {/* Row separator */}
              <line
                x1={0}
                x2={LEFT + GRID_W + RIGHT}
                y1={y0}
                y2={y0}
                className="stroke-border print:stroke-black"
                strokeWidth={r === 0 ? 0 : 0.8}
              />
              {/* Row label */}
              <text
                x={LEFT - 8}
                y={y0 + ROW_H / 2 + 3}
                textAnchor="end"
                className="fill-foreground print:fill-black"
                style={{ fontSize: 8.5, fontWeight: 600 }}
              >
                {ROW_LABELS[status]}
              </text>
              {/* Total for the row */}
              <text
                x={LEFT + GRID_W + RIGHT / 2}
                y={y0 + ROW_H / 2 + 3}
                textAnchor="middle"
                className="fill-foreground print:fill-black tabular"
                style={{ fontSize: 9, fontWeight: 700 }}
              >
                {formatHoursClock(totals[status] / 60)}
              </text>
            </g>
          );
        })}
        {/* bottom border */}
        <line x1={LEFT} x2={LEFT + GRID_W} y1={TOP + 4 * ROW_H} y2={TOP + 4 * ROW_H} className="stroke-border print:stroke-black" strokeWidth={1.2} />

        {/* Minute tick marks — 15-min minor, hour major */}
        {Array.from({ length: 24 }).map((_, h) => {
          const hx = xForMin(h * 60);
          return (
            <g key={h}>
              {/* Major hour line */}
              <line
                x1={hx}
                x2={hx}
                y1={TOP}
                y2={TOP + 4 * ROW_H}
                className="stroke-border/70 print:stroke-black"
                strokeWidth={0.7}
              />
              {/* 15/30/45 minute ticks inside each row */}
              {DUTY_STATUSES.map((status, r) => {
                const y0 = TOP + r * ROW_H;
                return [15, 30, 45].map((m) => {
                  const tx = xForMin(h * 60 + m);
                  const tall = m === 30;
                  const len = tall ? 8 : 5;
                  return (
                    <line
                      key={`${h}-${m}`}
                      x1={tx}
                      x2={tx}
                      y1={y0}
                      y2={y0 + len}
                      className="stroke-border/50 print:stroke-black/60"
                      strokeWidth={0.5}
                    />
                  );
                });
              })}
            </g>
          );
        })}

        {/* Colored segment underlays (screen only, premium touch) */}
        {colored &&
          sorted.map((seg) => (
            <line
              key={`u-${seg.id}`}
              x1={xForMin(seg.startMin)}
              x2={xForMin(seg.endMin)}
              y1={yForRow(seg.status)}
              y2={yForRow(seg.status)}
              stroke={`hsl(var(${DUTY_META[seg.status].colorVar}))`}
              strokeWidth={6}
              strokeOpacity={0.16}
              className="print:hidden"
              strokeLinecap="round"
            />
          ))}

        {/* The continuous duty line */}
        <polyline
          points={linePoints.join(" ")}
          className="fill-none stroke-foreground print:stroke-black"
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Change-point dots */}
        {sorted.slice(1).map((seg) => (
          <circle
            key={`d-${seg.id}`}
            cx={xForMin(seg.startMin)}
            cy={yForRow(seg.status)}
            r={2}
            className="fill-foreground print:fill-black"
          />
        ))}
      </svg>
    </div>
  );
}
