"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Truck, Clock, Coffee, CalendarDays } from "lucide-react";
import type { HosSnapshot } from "@/lib/fmcsa/types";
import {
  MAX_DRIVING_MINUTES,
  MAX_WINDOW_MINUTES,
  DRIVING_BEFORE_BREAK_MINUTES,
} from "@/lib/fmcsa/constants";
import { formatHours, cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

function RadialGauge({
  value,
  max,
  tone,
  size = 96,
}: {
  value: number;
  max: number;
  tone: string;
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-muted"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        stroke={tone}
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - c * pct }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

interface Clock {
  key: string;
  label: string;
  icon: LucideIcon;
  remainingMin: number;
  usedMin: number;
  maxMin: number;
}

export function HosClocks({ snapshot }: { snapshot: HosSnapshot }) {
  const clocks: Clock[] = [
    {
      key: "driving",
      label: "Drive",
      icon: Truck,
      remainingMin: snapshot.drivingRemaining,
      usedMin: snapshot.drivingMinutes,
      maxMin: MAX_DRIVING_MINUTES,
    },
    {
      key: "window",
      label: "Window",
      icon: Clock,
      remainingMin: snapshot.windowRemaining,
      usedMin: snapshot.windowElapsed,
      maxMin: MAX_WINDOW_MINUTES,
    },
    {
      key: "break",
      label: "Break",
      icon: Coffee,
      remainingMin: snapshot.minutesUntilBreak,
      usedMin: DRIVING_BEFORE_BREAK_MINUTES - snapshot.minutesUntilBreak,
      maxMin: DRIVING_BEFORE_BREAK_MINUTES,
    },
    {
      key: "cycle",
      label: "Cycle",
      icon: CalendarDays,
      remainingMin: snapshot.cycleRemaining,
      usedMin: snapshot.cycleUsedMinutes,
      maxMin: snapshot.cycleLimit,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {clocks.map((clk) => {
        const ratio = clk.usedMin / clk.maxMin;
        const tone =
          ratio >= 1
            ? "hsl(var(--destructive))"
            : ratio >= 0.85
              ? "hsl(var(--warning))"
              : "hsl(var(--primary))";
        return (
          <div
            key={clk.key}
            className="flex flex-col items-center rounded-2xl border border-border/70 bg-card p-4 shadow-soft"
          >
            <div className="relative grid place-items-center">
              <RadialGauge value={clk.usedMin} max={clk.maxMin} tone={tone} />
              <div className="absolute flex flex-col items-center">
                <clk.icon className="mb-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <span className="tabular text-sm font-bold leading-none">
                  {formatHours(clk.remainingMin / 60)}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs font-semibold">{clk.label}</p>
            <p className="tabular text-[0.68rem] text-muted-foreground">
              {formatHours(clk.usedMin / 60)} used
            </p>
          </div>
        );
      })}
    </div>
  );
}
