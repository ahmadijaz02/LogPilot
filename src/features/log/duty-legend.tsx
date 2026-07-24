"use client";

import { DUTY_META, DUTY_STATUSES, type DutyStatus } from "@/lib/fmcsa/constants";
import { cn } from "@/lib/utils";

export function DutyLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {DUTY_STATUSES.map((s) => {
        const m = DUTY_META[s];
        return (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ background: `hsl(var(${m.colorVar}))` }}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {m.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function StatusSelector({
  value,
  onChange,
  className,
}: {
  value: DutyStatus | null;
  onChange: (s: DutyStatus) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {DUTY_STATUSES.map((s) => {
        const m = DUTY_META[s];
        const active = value === s;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "group relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all",
              active
                ? "border-transparent shadow-soft"
                : "border-border/80 hover:border-border hover:bg-secondary/50",
            )}
            style={
              active
                ? { background: `hsl(var(${m.colorVar}) / 0.12)`, boxShadow: `inset 0 0 0 1.5px hsl(var(${m.colorVar}) / 0.5)` }
                : undefined
            }
          >
            <span
              className="h-6 w-1.5 shrink-0 rounded-full"
              style={{ background: `hsl(var(${m.colorVar}))` }}
            />
            <span className="min-w-0">
              <span
                className="block text-sm font-semibold leading-tight"
                style={active ? { color: `hsl(var(${m.colorVar}))` } : undefined}
              >
                {m.short}
              </span>
              <span className="block truncate text-[0.68rem] text-muted-foreground">
                Line {m.line}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
