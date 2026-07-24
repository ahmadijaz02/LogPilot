import {
  DRIVING_BEFORE_BREAK_MINUTES,
  MAX_DRIVING_MINUTES,
  MAX_WINDOW_MINUTES,
  type CycleType,
} from "./constants";
import {
  computeCoreSnapshot,
  computeStatusTotals,
  findTimelineProblems,
} from "./calculations";
import { formatHours, minutesToLabel } from "@/lib/utils";
import type { DailyLog, HosSnapshot, Violation } from "./types";

let counter = 0;
const vid = () => `v_${Date.now().toString(36)}_${(counter++).toString(36)}`;

/**
 * Run the full FMCSA rule set against a driver's logs and produce a rich,
 * explainable snapshot: totals, remaining clocks, a compliance score, and a
 * ranked list of violations with citations and remediation.
 */
export function evaluateHos(
  currentLog: DailyLog,
  history: DailyLog[] = [],
  cycle: CycleType = currentLog.cycle,
): HosSnapshot {
  const logs = [...history.filter((l) => l.id !== currentLog.id), currentLog];
  const core = computeCoreSnapshot({ logs, cycle });
  const totals = computeStatusTotals(currentLog.segments);
  const violations: Violation[] = [];

  // ── 11-Hour Driving Limit ────────────────────────────────────────────────
  if (core.drivingMinutes > MAX_DRIVING_MINUTES) {
    const over = core.drivingMinutes - MAX_DRIVING_MINUTES;
    violations.push({
      id: vid(),
      code: "DRIVING_11H",
      severity: "error",
      title: "11-Hour Driving Limit Exceeded",
      explanation: `You have logged ${formatHours(core.drivingMinutes / 60)} of driving in the current duty period — ${formatHours(over / 60)} beyond the 11-hour maximum permitted after 10 consecutive hours off duty.`,
      regulation: "49 CFR § 395.3(a)(3)(i)",
      suggestion: `Reduce driving in this period by at least ${formatHours(over / 60)}, or take a qualifying 10-hour off-duty reset before driving again.`,
      overageMinutes: over,
    });
  } else if (core.drivingRemaining <= 60 && core.drivingRemaining > 0) {
    violations.push({
      id: vid(),
      code: "DRIVING_11H",
      severity: "warning",
      title: "Approaching 11-Hour Driving Limit",
      explanation: `Only ${formatHours(core.drivingRemaining / 60)} of driving time remain before you reach the 11-hour limit.`,
      regulation: "49 CFR § 395.3(a)(3)(i)",
      suggestion: "Plan your next stop now so you are parked before the clock expires.",
    });
  }

  // ── 14-Hour Driving Window ───────────────────────────────────────────────
  if (core.windowStartAbs != null && core.windowElapsed > MAX_WINDOW_MINUTES) {
    const over = core.windowElapsed - MAX_WINDOW_MINUTES;
    violations.push({
      id: vid(),
      code: "WINDOW_14H",
      severity: "error",
      title: "14-Hour Driving Window Exceeded",
      explanation: `${formatHours(core.windowElapsed / 60)} have elapsed since you came on duty. Driving is not permitted after the 14th consecutive hour — you are ${formatHours(over / 60)} past the window.`,
      regulation: "49 CFR § 395.3(a)(2)",
      suggestion: "The 14-hour window cannot be extended by off-duty breaks. A 10-hour reset is required before driving resumes.",
      overageMinutes: over,
    });
  } else if (
    core.windowStartAbs != null &&
    core.windowRemaining <= 60 &&
    core.windowRemaining > 0
  ) {
    violations.push({
      id: vid(),
      code: "WINDOW_14H",
      severity: "warning",
      title: "Approaching 14-Hour Window",
      explanation: `Your 14-hour driving window closes in ${formatHours(core.windowRemaining / 60)}. After that, no driving is permitted until a 10-hour reset.`,
      regulation: "49 CFR § 395.3(a)(2)",
      suggestion: "Complete any remaining driving before the window closes.",
    });
  }

  // ── 30-Minute Break ──────────────────────────────────────────────────────
  if (core.breakRequired) {
    violations.push({
      id: vid(),
      code: "BREAK_30M",
      severity: "error",
      title: "30-Minute Break Required",
      explanation: `You have accumulated ${formatHours(core.drivingSinceBreak / 60)} of driving without a 30-minute break. A break is required after 8 cumulative hours of driving.`,
      regulation: "49 CFR § 395.3(a)(3)(ii)",
      suggestion: "Take at least 30 consecutive minutes in Off Duty, Sleeper Berth, or On-Duty-Not-Driving before driving again.",
    });
  } else if (core.minutesUntilBreak <= 45 && core.minutesUntilBreak > 0) {
    violations.push({
      id: vid(),
      code: "BREAK_30M",
      severity: "warning",
      title: "30-Minute Break Approaching",
      explanation: `You may drive ${formatHours(core.minutesUntilBreak / 60)} more before a 30-minute break becomes mandatory.`,
      regulation: "49 CFR § 395.3(a)(3)(ii)",
      suggestion: "Schedule a 30-minute break into your route to stay ahead of the requirement.",
    });
  }

  // ── 60/70-Hour Cycle ─────────────────────────────────────────────────────
  const cycleCode = cycle === "70/8" ? "CYCLE_70H" : "CYCLE_60H";
  if (core.cycleUsedMinutes > core.cycleLimit) {
    const over = core.cycleUsedMinutes - core.cycleLimit;
    violations.push({
      id: vid(),
      code: cycleCode,
      severity: "error",
      title: `${cycle === "70/8" ? "70-Hour / 8-Day" : "60-Hour / 7-Day"} Limit Exceeded`,
      explanation: `You have accumulated ${formatHours(core.cycleUsedMinutes / 60)} of on-duty time in your rolling cycle — ${formatHours(over / 60)} over the limit.`,
      regulation: "49 CFR § 395.3(b)",
      suggestion: "A 34-hour restart resets your cycle to zero. Otherwise, on-duty hours become available as older days roll off the 7/8-day window.",
      overageMinutes: over,
    });
  } else if (core.cycleRemaining <= 300 && core.cycleRemaining > 0) {
    violations.push({
      id: vid(),
      code: cycleCode,
      severity: "warning",
      title: "Approaching Cycle Limit",
      explanation: `Only ${formatHours(core.cycleRemaining / 60)} of on-duty time remain in your ${cycle === "70/8" ? "70-hour" : "60-hour"} cycle.`,
      regulation: "49 CFR § 395.3(b)",
      suggestion: "Consider scheduling a 34-hour restart to recover your full cycle.",
    });
  }

  // ── Structural: gaps & overlaps on the daily timeline ────────────────────
  for (const p of findTimelineProblems(currentLog.segments)) {
    violations.push({
      id: vid(),
      code: p.type === "gap" ? "TIMELINE_GAP" : "TIMELINE_OVERLAP",
      severity: p.type === "gap" ? "warning" : "error",
      title: p.type === "gap" ? "Unaccounted Time on Log" : "Overlapping Duty Status",
      explanation:
        p.type === "gap"
          ? `The period from ${minutesToLabel(p.startMin)} to ${minutesToLabel(p.endMin)} has no duty status. Every minute of the 24-hour day must be accounted for.`
          : `Two duty statuses overlap between ${minutesToLabel(p.startMin)} and ${minutesToLabel(p.endMin)}. Only one status may be active at a time.`,
      regulation: "49 CFR § 395.8(a)",
      suggestion:
        p.type === "gap"
          ? "Assign a duty status to the highlighted period so the graph tiles the full day."
          : "Adjust the overlapping blocks so their times do not intersect.",
      atMin: p.startMin,
    });
  }

  // ── Compliance score ─────────────────────────────────────────────────────
  const complianceScore = scoreCompliance(core, violations);

  return {
    totals,
    drivingMinutes: core.drivingMinutes,
    drivingRemaining: core.drivingRemaining,
    windowElapsed: core.windowElapsed,
    windowRemaining: core.windowRemaining,
    minutesUntilBreak: core.minutesUntilBreak,
    breakRequired: core.breakRequired,
    cycleUsedMinutes: core.cycleUsedMinutes,
    cycleRemaining: core.cycleRemaining,
    cycleLimit: core.cycleLimit,
    cycleType: core.cycleType,
    complianceScore,
    violations: violations.sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity),
    ),
  };
}

const severityRank = (s: Violation["severity"]) =>
  s === "error" ? 3 : s === "warning" ? 2 : 1;

/**
 * Derive a 0–100 compliance score. Hard violations are heavily penalized;
 * shrinking safety margins nudge the score down gently.
 */
function scoreCompliance(
  core: ReturnType<typeof computeCoreSnapshot>,
  violations: Violation[],
): number {
  let score = 100;
  for (const v of violations) {
    if (v.severity === "error") score -= 25;
    else if (v.severity === "warning") score -= 6;
  }
  // Margin pressure — reward keeping healthy buffers.
  const drivingPct = core.drivingMinutes / MAX_DRIVING_MINUTES;
  const breakPct = core.drivingSinceBreak / DRIVING_BEFORE_BREAK_MINUTES;
  const cyclePct = core.cycleUsedMinutes / core.cycleLimit;
  const pressure = Math.max(drivingPct, breakPct, cyclePct);
  if (pressure > 0.9) score -= 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}
