"use client";

import { useMemo } from "react";
import { useLogStore } from "@/stores/log-store";
import { evaluateHos } from "@/lib/fmcsa/validation";
import { computeStatusTotals, currentStatus } from "@/lib/fmcsa/calculations";
import type { DailyLog, HosSnapshot } from "@/lib/fmcsa/types";
import type { DutyStatus } from "@/lib/fmcsa/constants";

/** Live HOS evaluation for a specific log against the driver's full history. */
export function useHosForLog(log: DailyLog | undefined): HosSnapshot | null {
  const logs = useLogStore((s) => s.logs);
  return useMemo(() => {
    if (!log) return null;
    return evaluateHos(log, logs, log.cycle);
  }, [log, logs]);
}

/** Live HOS evaluation for the currently-active log. */
export function useActiveHos(): {
  log: DailyLog | undefined;
  snapshot: HosSnapshot | null;
  status: DutyStatus;
} {
  const logs = useLogStore((s) => s.logs);
  const activeLogId = useLogStore((s) => s.activeLogId);
  const log = useMemo(
    () => logs.find((l) => l.id === activeLogId),
    [logs, activeLogId],
  );
  const snapshot = useMemo(
    () => (log ? evaluateHos(log, logs, log.cycle) : null),
    [log, logs],
  );
  return { log, snapshot, status: log ? currentStatus(log) : "OFF" };
}

/** Per-day status totals for a set of logs (weekly/analytics views). */
export function useWeeklyTotals(logs: DailyLog[]) {
  return useMemo(
    () =>
      logs.map((l) => ({
        date: l.header.date,
        totals: computeStatusTotals(l.segments),
        miles: l.header.totalMiles ?? 0,
      })),
    [logs],
  );
}
