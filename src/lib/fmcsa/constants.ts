/**
 * FMCSA Hours of Service (HOS) — regulatory constants for property-carrying
 * commercial motor vehicle (CMV) drivers.
 *
 * Reference: 49 CFR Part 395. All limits expressed in minutes for precise,
 * integer-safe arithmetic across the engine.
 */

export const MINUTES_PER_DAY = 1440;
export const MINUTES_PER_HOUR = 60;

/** 11-Hour Driving Limit — 49 CFR 395.3(a)(3)(i). */
export const MAX_DRIVING_MINUTES = 11 * 60; // 660

/** 14-Hour Driving Window — 49 CFR 395.3(a)(2). */
export const MAX_WINDOW_MINUTES = 14 * 60; // 840

/** Minimum off-duty required to reset the 11/14-hour clocks — 49 CFR 395.3(a)(1). */
export const REQUIRED_RESET_OFF_MINUTES = 10 * 60; // 600

/** 30-Minute Break — required after 8 cumulative driving hours — 49 CFR 395.3(a)(3)(ii). */
export const DRIVING_BEFORE_BREAK_MINUTES = 8 * 60; // 480
export const REQUIRED_BREAK_MINUTES = 30;

/** 60-Hour / 7-Day and 70-Hour / 8-Day limits — 49 CFR 395.3(b). */
export const CYCLE_60_HOUR_MINUTES = 60 * 60; // 3600
export const CYCLE_70_HOUR_MINUTES = 70 * 60; // 4200
export const CYCLE_7_DAY = 7;
export const CYCLE_8_DAY = 8;

/** 34-Hour Restart — 49 CFR 395.3(c). */
export const RESTART_MINUTES = 34 * 60; // 2040

/** Sleeper-berth pairing: qualifying long / short rest segments — 49 CFR 395.1(g). */
export const SLEEPER_LONG_MINUTES = 7 * 60; // 420  (7-hour SB portion)
export const SLEEPER_SHORT_MINUTES = 2 * 60; // 120  (2-hour off/SB portion)
export const SLEEPER_PAIR_TOTAL_MINUTES = 10 * 60; // 600

export type CycleType = "70/8" | "60/7";

export const CYCLE_CONFIG: Record<
  CycleType,
  { limitMinutes: number; days: number; label: string }
> = {
  "70/8": { limitMinutes: CYCLE_70_HOUR_MINUTES, days: CYCLE_8_DAY, label: "70 hr / 8 day" },
  "60/7": { limitMinutes: CYCLE_60_HOUR_MINUTES, days: CYCLE_7_DAY, label: "60 hr / 7 day" },
};

/** The four — and only four — duty statuses recognized on the daily log. */
export const DUTY_STATUSES = ["OFF", "SB", "D", "ON"] as const;
export type DutyStatus = (typeof DUTY_STATUSES)[number];

export interface DutyStatusMeta {
  key: DutyStatus;
  /** Full FMCSA label. */
  label: string;
  /** Short label used on dense UI. */
  short: string;
  /** Grid line label used on the official log (line 1–4). */
  line: number;
  /** CSS variable token name (see globals.css / tailwind). */
  colorVar: string;
  /** Tailwind text/bg utility fragments. */
  tw: { text: string; bg: string; border: string; ring: string; soft: string };
  description: string;
}

export const DUTY_META: Record<DutyStatus, DutyStatusMeta> = {
  OFF: {
    key: "OFF",
    label: "Off Duty",
    short: "Off",
    line: 1,
    colorVar: "--duty-off",
    tw: {
      text: "text-duty-off",
      bg: "bg-duty-off",
      border: "border-duty-off",
      ring: "ring-duty-off",
      soft: "bg-duty-off/10",
    },
    description: "Relieved of all duty and responsibility.",
  },
  SB: {
    key: "SB",
    label: "Sleeper Berth",
    short: "Sleeper",
    line: 2,
    colorVar: "--duty-sleeper",
    tw: {
      text: "text-duty-sleeper",
      bg: "bg-duty-sleeper",
      border: "border-duty-sleeper",
      ring: "ring-duty-sleeper",
      soft: "bg-duty-sleeper/10",
    },
    description: "Resting in the vehicle's sleeper berth compartment.",
  },
  D: {
    key: "D",
    label: "Driving",
    short: "Driving",
    line: 3,
    colorVar: "--duty-driving",
    tw: {
      text: "text-duty-driving",
      bg: "bg-duty-driving",
      border: "border-duty-driving",
      ring: "ring-duty-driving",
      soft: "bg-duty-driving/10",
    },
    description: "Operating the commercial motor vehicle.",
  },
  ON: {
    key: "ON",
    label: "On Duty (Not Driving)",
    short: "On Duty",
    line: 4,
    colorVar: "--duty-onduty",
    tw: {
      text: "text-duty-onduty",
      bg: "bg-duty-onduty",
      border: "border-duty-onduty",
      ring: "ring-duty-onduty",
      soft: "bg-duty-onduty/10",
    },
    description: "On duty performing work other than driving (fueling, inspection, loading).",
  },
};

/** Statuses that count as "on duty" for cycle accumulation. */
export const ON_DUTY_STATUSES: DutyStatus[] = ["D", "ON"];
/** Statuses that count toward off-duty rest (10-hour reset, 34-hour restart). */
export const REST_STATUSES: DutyStatus[] = ["OFF", "SB"];
