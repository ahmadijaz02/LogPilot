import type { DailyLog } from "@/lib/fmcsa/types";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { formatHoursClock } from "@/lib/utils";

/** Trigger a client-side file download from a string blob. */
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const CSV_HEADERS = [
  "Date",
  "Driver",
  "Carrier",
  "Truck",
  "Trailer",
  "Shipping No.",
  "Commodity",
  "Total Miles",
  "Off Duty",
  "Sleeper",
  "Driving",
  "On Duty",
  "Total On Duty",
  "Certified",
];

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export a set of logs to a compliance-friendly CSV. */
export function logsToCsv(logs: DailyLog[]): string {
  const rows = logs.map((l) => {
    const t = computeStatusTotals(l.segments);
    return [
      l.header.date,
      l.header.driverName,
      l.header.carrierName,
      l.header.truckNumber,
      l.header.trailerNumber,
      l.header.shippingNumber,
      l.header.commodity,
      l.header.totalMiles,
      formatHoursClock(t.OFF / 60),
      formatHoursClock(t.SB / 60),
      formatHoursClock(t.D / 60),
      formatHoursClock(t.ON / 60),
      formatHoursClock(t.onDuty / 60),
      l.certified ? "Yes" : "No",
    ].map(csvCell).join(",");
  });
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

/** Export logs as pretty-printed JSON. */
export function logsToJson(logs: DailyLog[]): string {
  return JSON.stringify(logs, null, 2);
}
