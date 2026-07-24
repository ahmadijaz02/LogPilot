"use client";

import { motion } from "framer-motion";
import { DUTY_META, type DutyStatus } from "@/lib/fmcsa/constants";
import type { HosSnapshot } from "@/lib/fmcsa/types";
import { formatHours, cn } from "@/lib/utils";

export function CurrentStatusBanner({
  status,
  snapshot,
}: {
  status: DutyStatus;
  snapshot: HosSnapshot;
}) {
  const m = DUTY_META[status];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/70 p-5"
      style={{
        background: `linear-gradient(120deg, hsl(var(${m.colorVar}) / 0.12), transparent 60%)`,
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <span
              className="grid h-12 w-12 place-items-center rounded-xl text-white shadow-soft"
              style={{ background: `hsl(var(${m.colorVar}))` }}
            >
              <span className="text-lg font-bold">{m.line}</span>
            </span>
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: `hsl(var(${m.colorVar}))` }} />
              <span className="relative inline-flex h-3 w-3 rounded-full ring-2 ring-background" style={{ background: `hsl(var(${m.colorVar}))` }} />
            </span>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current Duty Status
            </p>
            <p className="text-xl font-semibold tracking-tight">{m.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Metric label="Drive left" value={formatHours(snapshot.drivingRemaining / 60)} tone={snapshot.drivingRemaining < 60} />
          <div className="h-9 w-px bg-border" />
          <Metric label="Window left" value={formatHours(snapshot.windowRemaining / 60)} tone={snapshot.windowRemaining < 60} />
          <div className="hidden h-9 w-px bg-border sm:block" />
          <Metric label="Cycle left" value={formatHours(snapshot.cycleRemaining / 60)} tone={snapshot.cycleRemaining < 300} className="hidden sm:block" />
        </div>
      </div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("tabular text-lg font-semibold", tone && "text-destructive")}>
        {value}
      </p>
    </div>
  );
}
