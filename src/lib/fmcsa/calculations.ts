import {
  CYCLE_CONFIG,
  DRIVING_BEFORE_BREAK_MINUTES,
  MAX_DRIVING_MINUTES,
  MAX_WINDOW_MINUTES,
  MINUTES_PER_DAY,
  REQUIRED_BREAK_MINUTES,
  REQUIRED_RESET_OFF_MINUTES,
  RESTART_MINUTES,
  REST_STATUSES,
  ON_DUTY_STATUSES,
  type CycleType,
  type DutyStatus,
} from "./constants";
import type { DailyLog, DutySegment, StatusTotals } from "./types";

/** Absolute-timeline segment: minutes measured from a shared epoch. */
interface AbsSegment {
  status: DutyStatus;
  start: number;
  end: number;
}

const isRest = (s: DutyStatus) => REST_STATUSES.includes(s);
const isOnDuty = (s: DutyStatus) => ON_DUTY_STATUSES.includes(s);

/** Days since the Unix epoch for a `yyyy-mm-dd` string (UTC-safe). */
export function isoToDayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/** Sum the minutes spent in each duty status across a single day's segments. */
export function computeStatusTotals(segments: DutySegment[]): StatusTotals {
  const t: StatusTotals = { OFF: 0, SB: 0, D: 0, ON: 0, onDuty: 0, offDuty: 0 };
  for (const seg of segments) {
    const dur = Math.max(0, seg.endMin - seg.startMin);
    t[seg.status] += dur;
  }
  t.onDuty = t.D + t.ON;
  t.offDuty = t.OFF + t.SB;
  return t;
}

/**
 * Validate that a day's segments perfectly tile 0 → 1440 with no gaps or
 * overlaps. Returns the list of structural problems found.
 */
export function findTimelineProblems(
  segments: DutySegment[],
): { type: "gap" | "overlap"; startMin: number; endMin: number }[] {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin);
  const problems: { type: "gap" | "overlap"; startMin: number; endMin: number }[] = [];
  let cursor = 0;
  for (const seg of sorted) {
    if (seg.startMin > cursor) {
      problems.push({ type: "gap", startMin: cursor, endMin: seg.startMin });
    } else if (seg.startMin < cursor) {
      problems.push({ type: "overlap", startMin: seg.startMin, endMin: cursor });
    }
    cursor = Math.max(cursor, seg.endMin);
  }
  if (cursor < MINUTES_PER_DAY) {
    problems.push({ type: "gap", startMin: cursor, endMin: MINUTES_PER_DAY });
  }
  return problems;
}

/**
 * Flatten a set of daily logs into one continuous absolute timeline, filling
 * any un-logged days between them with Off-Duty so that rest/restart logic
 * remains continuous.
 */
export function flattenLogs(logs: DailyLog[]): AbsSegment[] {
  if (logs.length === 0) return [];
  const sorted = [...logs].sort(
    (a, b) => isoToDayNumber(a.header.date) - isoToDayNumber(b.header.date),
  );
  const baseDay = isoToDayNumber(sorted[0]!.header.date);
  const abs: AbsSegment[] = [];

  for (const log of sorted) {
    const dayOffset = (isoToDayNumber(log.header.date) - baseDay) * MINUTES_PER_DAY;
    const daySegs = [...log.segments].sort((a, b) => a.startMin - b.startMin);
    for (const seg of daySegs) {
      abs.push({
        status: seg.status,
        start: dayOffset + seg.startMin,
        end: dayOffset + seg.endMin,
      });
    }
  }

  // Fill inter-segment gaps (e.g. missing days) with Off-Duty.
  abs.sort((a, b) => a.start - b.start);
  const filled: AbsSegment[] = [];
  let cursor = abs[0]!.start;
  for (const seg of abs) {
    if (seg.start > cursor) {
      filled.push({ status: "OFF", start: cursor, end: seg.start });
    }
    filled.push(seg);
    cursor = Math.max(cursor, seg.end);
  }
  return filled;
}

/** Merge adjacent same-status segments into blocks (used for rest analysis). */
function mergeByStatus(segs: AbsSegment[]): AbsSegment[] {
  const out: AbsSegment[] = [];
  for (const seg of segs) {
    const last = out[out.length - 1];
    if (last && last.status === seg.status && last.end === seg.start) {
      last.end = seg.end;
    } else {
      out.push({ ...seg });
    }
  }
  return out;
}

/** Merge adjacent rest (OFF|SB) segments into continuous rest blocks. */
function restBlocks(segs: AbsSegment[]): AbsSegment[] {
  const out: AbsSegment[] = [];
  for (const seg of segs) {
    const rest = isRest(seg.status);
    const last = out[out.length - 1];
    if (rest && last && last.end === seg.start) {
      last.end = seg.end;
    } else if (rest) {
      out.push({ status: "OFF", start: seg.start, end: seg.end });
    }
  }
  return out;
}

/** Sum on-duty (D + ON) minutes within [from, to]. */
function onDutyBetween(segs: AbsSegment[], from: number, to: number): number {
  let total = 0;
  for (const seg of segs) {
    if (!isOnDuty(seg.status)) continue;
    const s = Math.max(seg.start, from);
    const e = Math.min(seg.end, to);
    if (e > s) total += e - s;
  }
  return total;
}

export interface SnapshotInput {
  logs: DailyLog[];
  cycle?: CycleType;
  /** Absolute "as-of" minute; defaults to end of the latest log. */
  asOfAbs?: number;
}

export interface CoreSnapshot {
  drivingMinutes: number;
  drivingRemaining: number;
  windowElapsed: number;
  windowRemaining: number;
  drivingSinceBreak: number;
  minutesUntilBreak: number;
  breakRequired: boolean;
  cycleUsedMinutes: number;
  cycleRemaining: number;
  cycleLimit: number;
  cycleType: CycleType;
  periodStartAbs: number;
  windowStartAbs: number | null;
  asOfAbs: number;
  hadRestart: boolean;
}

/**
 * The core HOS simulation. Reconstructs the driver's current duty period from
 * the most recent qualifying 10-hour reset and derives every rolling limit.
 */
export function computeCoreSnapshot({
  logs,
  cycle = "70/8",
  asOfAbs,
}: SnapshotInput): CoreSnapshot {
  const cfg = CYCLE_CONFIG[cycle];
  const flat = mergeByStatus(flattenLogs(logs));
  const asOf =
    asOfAbs ?? (flat.length ? flat[flat.length - 1]!.end : 0);

  // 1. Determine the current duty period from the last 10-hour reset.
  const blocks = restBlocks(flat);
  let periodStartAbs = flat.length ? flat[0]!.start : 0;
  let lastRestartEndAbs: number | null = null;
  for (const b of blocks) {
    const dur = Math.min(b.end, asOf) - b.start;
    if (b.start >= asOf) break;
    if (dur >= REQUIRED_RESET_OFF_MINUTES) periodStartAbs = Math.min(b.end, asOf);
    if (dur >= RESTART_MINUTES) lastRestartEndAbs = Math.min(b.end, asOf);
  }

  // 2. Window start = first on-duty moment at/after the reset.
  let windowStartAbs: number | null = null;
  for (const seg of flat) {
    if (seg.end <= periodStartAbs) continue;
    if (seg.start >= asOf) break;
    if (isOnDuty(seg.status)) {
      windowStartAbs = Math.max(seg.start, periodStartAbs);
      break;
    }
  }

  // 3. Driving + break accounting within the current period.
  let drivingMinutes = 0;
  let drivingSinceBreak = 0;
  let restRun = 0; // continuous non-driving minutes toward a 30-min break
  for (const seg of flat) {
    const s = Math.max(seg.start, periodStartAbs);
    const e = Math.min(seg.end, asOf);
    if (e <= s) continue;
    const dur = e - s;
    if (seg.status === "D") {
      drivingMinutes += dur;
      drivingSinceBreak += dur;
      restRun = 0;
    } else {
      restRun += dur;
      if (restRun >= REQUIRED_BREAK_MINUTES) drivingSinceBreak = 0;
    }
  }

  const windowElapsed =
    windowStartAbs != null ? Math.max(0, asOf - windowStartAbs) : 0;

  // 4. Cycle accounting — rolling N-day window, reset by a 34-hour restart.
  const rollingWindowStart = asOf - cfg.days * MINUTES_PER_DAY;
  const cycleFrom = Math.max(rollingWindowStart, lastRestartEndAbs ?? -Infinity);
  const cycleUsedMinutes = onDutyBetween(flat, cycleFrom, asOf);

  return {
    drivingMinutes,
    drivingRemaining: Math.max(0, MAX_DRIVING_MINUTES - drivingMinutes),
    windowElapsed,
    windowRemaining: Math.max(0, MAX_WINDOW_MINUTES - windowElapsed),
    drivingSinceBreak,
    minutesUntilBreak: Math.max(0, DRIVING_BEFORE_BREAK_MINUTES - drivingSinceBreak),
    breakRequired: drivingSinceBreak >= DRIVING_BEFORE_BREAK_MINUTES,
    cycleUsedMinutes,
    cycleRemaining: Math.max(0, cfg.limitMinutes - cycleUsedMinutes),
    cycleLimit: cfg.limitMinutes,
    cycleType: cycle,
    periodStartAbs,
    windowStartAbs,
    asOfAbs: asOf,
    hadRestart: lastRestartEndAbs != null,
  };
}

/** The most recent duty status active at `asOfAbs` (defaults to end of day). */
export function currentStatus(log: DailyLog): DutyStatus {
  const sorted = [...log.segments].sort((a, b) => a.startMin - b.startMin);
  return sorted[sorted.length - 1]?.status ?? "OFF";
}
