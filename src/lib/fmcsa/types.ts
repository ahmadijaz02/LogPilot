import type { CycleType, DutyStatus } from "./constants";

/**
 * A single contiguous duty-status segment within one calendar day.
 * `startMin` / `endMin` are minutes-since-midnight in the driver's home terminal
 * timezone. A valid day is fully tiled by segments from 0 → 1440 with no gaps
 * or overlaps.
 */
export interface DutySegment {
  id: string;
  status: DutyStatus;
  startMin: number;
  endMin: number;
  /** Optional per-segment note surfaced in the Remarks section. */
  remark?: string;
  /** Optional location (city, ST) recorded at the status change. */
  location?: string;
}

/** Free-text remark anchored to a time on the log. */
export interface LogRemark {
  id: string;
  timeMin: number;
  location: string;
  note: string;
}

/** Shipping / manifest document reference. */
export interface ShippingDoc {
  id: string;
  proNumber?: string;
  shipper?: string;
  commodity?: string;
}

/** The header block of the official Driver's Daily Log. */
export interface LogHeader {
  date: string; // ISO yyyy-mm-dd
  driverName: string;
  coDriverName?: string;
  carrierName: string;
  mainOfficeAddress?: string;
  homeTerminalAddress?: string;
  truckNumber?: string;
  trailerNumber?: string;
  shippingNumber?: string;
  commodity?: string;
  totalMiles?: number;
  timezone?: string;
}

/** A complete daily log: header + the tiled duty timeline + remarks. */
export interface DailyLog {
  id: string;
  header: LogHeader;
  segments: DutySegment[];
  remarks: LogRemark[];
  shippingDocs: ShippingDoc[];
  cycle: CycleType;
  /** Whether the driver has certified/signed this log. */
  certified: boolean;
  status: "draft" | "certified" | "archived";
  createdAt: string;
  updatedAt: string;
}

/** Minutes accumulated in each duty status for a day. */
export interface StatusTotals {
  OFF: number;
  SB: number;
  D: number;
  ON: number;
  /** D + ON */
  onDuty: number;
  /** OFF + SB */
  offDuty: number;
}

export type ViolationSeverity = "error" | "warning" | "info";

export type ViolationCode =
  | "DRIVING_11H"
  | "WINDOW_14H"
  | "BREAK_30M"
  | "CYCLE_60H"
  | "CYCLE_70H"
  | "RESET_10H"
  | "SLEEPER_BERTH"
  | "TIMELINE_GAP"
  | "TIMELINE_OVERLAP";

/** A detected HOS issue with human-readable, actionable guidance. */
export interface Violation {
  id: string;
  code: ViolationCode;
  severity: ViolationSeverity;
  title: string;
  /** Plain-language explanation of what happened. */
  explanation: string;
  /** The specific CFR citation. */
  regulation: string;
  /** Concrete remediation suggestion. */
  suggestion: string;
  /** Optional minute-offset the issue occurs at (for timeline anchoring). */
  atMin?: number;
  /** How far over the limit, in minutes (for errors). */
  overageMinutes?: number;
}

/** The full computed HOS state derived from one or more logs. */
export interface HosSnapshot {
  totals: StatusTotals;
  drivingMinutes: number;
  drivingRemaining: number;
  windowElapsed: number;
  windowRemaining: number;
  minutesUntilBreak: number;
  breakRequired: boolean;
  cycleUsedMinutes: number;
  cycleRemaining: number;
  cycleLimit: number;
  cycleType: CycleType;
  /** 0–100 compliance score derived from violations + margins. */
  complianceScore: number;
  violations: Violation[];
}
