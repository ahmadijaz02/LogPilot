import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number between a min and max. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

let _idc = 0;
/** Generate a short, collision-resistant client id. */
export function genId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${(_idc++).toString(36)}${Math.random()
    .toString(36)
    .slice(2, 5)}`;
}

/** Format a fractional-hours value (e.g. 8.5) as "8h 30m". */
export function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format fractional hours as a "HH:MM" clock-style duration. */
export function formatHoursClock(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Convert minutes-since-midnight to a "h:mm a" label (e.g. 810 -> "1:30 PM"). */
export function minutesToLabel(minutes: number): string {
  const clamped = clamp(minutes, 0, 1440);
  const h24 = Math.floor(clamped / 60) % 24;
  const m = Math.round(clamped % 60);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Compact "1:30p" / "12a" style label used on dense timeline axes. */
export function minutesToShortLabel(minutes: number): string {
  const clamped = clamp(minutes, 0, 1440);
  const h24 = Math.floor(clamped / 60) % 24;
  const period = h24 >= 12 ? "p" : "a";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}${period}`;
}

/** Snap minutes to the nearest interval (default 15 min). */
export function snapMinutes(minutes: number, interval = 15): number {
  return Math.round(minutes / interval) * interval;
}

/** Deterministic initials from a name. */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

/** Pluralize a noun. */
export function plural(count: number, noun: string, suffix = "s") {
  return `${count} ${noun}${count === 1 ? "" : suffix}`;
}
