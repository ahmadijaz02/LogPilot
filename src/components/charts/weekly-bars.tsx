"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { DUTY_META } from "@/lib/fmcsa/constants";
import type { StatusTotals } from "@/lib/fmcsa/types";
import { formatHours } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export interface WeeklyDatum {
  date: string;
  totals: StatusTotals;
  miles: number;
}

/** Stacked duty-hour bars for a week — elegant, dependency-free SVG. */
export function WeeklyBars({ data }: { data: WeeklyDatum[] }) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const max = 24;
  const order = ["OFF", "SB", "D", "ON"] as const;

  return (
    <div>
      <div className="flex items-end gap-2 sm:gap-3">
        {data.map((d, i) => {
          const stack = order.map((s) => ({ s, mins: d.totals[s] }));
          const active = hovered === i;
          return (
            <div
              key={d.date}
              className="group flex flex-1 flex-col items-center gap-2"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="relative flex h-40 w-full max-w-[46px] flex-col-reverse overflow-hidden rounded-lg bg-muted/50">
                {stack.map(({ s, mins }, si) => (
                  <motion.div
                    key={s}
                    initial={{ height: 0 }}
                    animate={{ height: `${(mins / 60 / max) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.04 + si * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    style={{ background: `hsl(var(${DUTY_META[s].colorVar}))` }}
                    className="w-full"
                  />
                ))}
                {active && (
                  <div className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[0.68rem] shadow-elevated">
                    <p className="font-semibold">{format(parseISO(d.date), "EEE, MMM d")}</p>
                    <p className="tabular text-muted-foreground">
                      Drive {formatHours(d.totals.D / 60)} · Duty {formatHours(d.totals.onDuty / 60)}
                    </p>
                  </div>
                )}
              </div>
              <span className="text-[0.68rem] font-medium text-muted-foreground">
                {format(parseISO(d.date), "EEE")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
