"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

let registered = false;

/** Register the Chart.js components we use, exactly once. */
export function ensureChartsRegistered() {
  if (registered) return;
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
  );
  ChartJS.defaults.font.family =
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
  ChartJS.defaults.font.size = 11;
  registered = true;
}

/** Read a CSS custom property as an `hsl(...)` string for chart theming. */
export function cssHsl(varName: string, alpha = 1) {
  if (typeof window === "undefined") return `hsl(0 0% 50% / ${alpha})`;
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  return `hsl(${val} / ${alpha})`;
}
