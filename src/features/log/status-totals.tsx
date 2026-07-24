"use client";

import { DUTY_META, DUTY_STATUSES } from "@/lib/fmcsa/constants";
import type { StatusTotals } from "@/lib/fmcsa/types";
import { formatHoursClock } from "@/lib/utils";

export function StatusTotalsGrid({ totals }: { totals: StatusTotals }) {
  const grand = totals.OFF + totals.SB + totals.D + totals.ON;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {DUTY_STATUSES.map((s) => {
          const m = DUTY_META[s];
          return (
            <div
              key={s}
              className="relative overflow-hidden rounded-xl border border-border/70 bg-card p-3"
            >
              <span
                className="absolute left-0 top-0 h-full w-1"
                style={{ background: `hsl(var(${m.colorVar}))` }}
              />
              <p className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">
                {m.short}
              </p>
              <p className="tabular mt-0.5 text-xl font-semibold">
                {formatHoursClock(totals[s] / 60)}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-2.5 text-sm">
        <span className="font-medium text-muted-foreground">Total accounted</span>
        <span className="tabular font-semibold">
          {formatHoursClock(grand / 60)} / 24:00
        </span>
      </div>
    </div>
  );
}
