import { CYCLE_CONFIG, type CycleType } from "@/lib/fmcsa/constants";

/** Cycle choices in the order they are offered in manager forms. */
export const CYCLE_OPTIONS: Array<{ value: CycleType; label: string }> = (
  Object.keys(CYCLE_CONFIG) as CycleType[]
).map((c) => ({ value: c, label: CYCLE_CONFIG[c].label }));

/** IANA zones a US carrier realistically dispatches from. */
export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern — America/New_York" },
  { value: "America/Chicago", label: "Central — America/Chicago" },
  { value: "America/Denver", label: "Mountain — America/Denver" },
  { value: "America/Phoenix", label: "Mountain (no DST) — America/Phoenix" },
  { value: "America/Los_Angeles", label: "Pacific — America/Los_Angeles" },
  { value: "America/Anchorage", label: "Alaska — America/Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii — Pacific/Honolulu" },
];
