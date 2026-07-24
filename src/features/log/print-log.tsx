"use client";

import type { DailyLog } from "@/lib/fmcsa/types";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { formatHoursClock, minutesToLabel } from "@/lib/utils";
import { FmcsaGraph } from "./fmcsa-graph";
import { format, parseISO } from "date-fns";

function Cell({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="border border-black/70 px-2 py-1">
      <div className="text-[7px] font-semibold uppercase tracking-wide text-black/60">
        {label}
      </div>
      <div className="text-[11px] font-medium text-black">{value || "—"}</div>
    </div>
  );
}

/**
 * Pixel-conscious replica of the official FMCSA Driver's Daily Log, rendered in
 * black on white for print / PDF. Wrapped by callers in a print container.
 */
export function PrintLog({ log }: { log: DailyLog }) {
  const t = computeStatusTotals(log.segments);
  const h = log.header;
  const dateLabel = (() => {
    try {
      return format(parseISO(h.date), "MMMM d, yyyy");
    } catch {
      return h.date;
    }
  })();

  return (
    <div className="mx-auto w-full max-w-[1000px] bg-white p-6 text-black">
      {/* Title */}
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-tight">
            Driver&apos;s Daily Log
          </h1>
          <p className="text-[9px] uppercase tracking-wide text-black/60">
            (One calendar day — 24 hours) · U.S. DOT / FMCSA · 49 CFR 395.8
          </p>
        </div>
        <div className="text-right text-[10px]">
          <div className="font-semibold">{dateLabel}</div>
          <div className="text-black/60">Original — File at home terminal</div>
        </div>
      </div>

      {/* Date grid */}
      <div className="mb-2 grid grid-cols-3 gap-0 text-black">
        <Cell label="Month / Day / Year" value={dateLabel} />
        <Cell label="Total Miles Driving Today" value={h.totalMiles ?? 0} />
        <Cell label="Vehicle / Trailer Numbers" value={`${h.truckNumber ?? ""} / ${h.trailerNumber ?? ""}`} />
      </div>

      <div className="mb-2 grid grid-cols-2 gap-0">
        <Cell label="Name of Carrier" value={h.carrierName} />
        <Cell label="Driver" value={h.driverName} />
        <Cell label="Main Office Address" value={h.mainOfficeAddress} />
        <Cell label="Home Terminal Address" value={h.homeTerminalAddress} />
      </div>

      <div className="mb-3 grid grid-cols-4 gap-0">
        <Cell label="Co-Driver" value={h.coDriverName || "None"} />
        <Cell label="Shipping Doc / Pro No." value={h.shippingNumber} />
        <Cell label="Commodity" value={h.commodity} />
        <Cell label="Cycle" value={log.cycle} />
      </div>

      {/* The official graph */}
      <div className="mb-3 rounded-none border border-black/70 p-2">
        <FmcsaGraph segments={log.segments} colored={false} />
      </div>

      {/* Recap + remarks */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wide">
            Recap — Hours
          </div>
          <table className="w-full border-collapse text-[10px]">
            <tbody>
              {[
                ["Off Duty", t.OFF],
                ["Sleeper Berth", t.SB],
                ["Driving", t.D],
                ["On Duty (Not Driving)", t.ON],
                ["Total On Duty", t.onDuty],
              ].map(([label, mins]) => (
                <tr key={label as string} className="border border-black/50">
                  <td className="px-2 py-0.5">{label}</td>
                  <td className="px-2 py-0.5 text-right font-semibold tabular">
                    {formatHoursClock((mins as number) / 60)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="col-span-2">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wide">
            Remarks
          </div>
          <div className="min-h-[90px] border border-black/50 p-2 text-[10px]">
            {log.remarks.length === 0 && <span className="text-black/50">—</span>}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {[...log.remarks]
                .sort((a, b) => a.timeMin - b.timeMin)
                .map((r) => (
                  <span key={r.id} className="tabular">
                    <strong>{minutesToLabel(r.timeMin)}</strong> — {r.location}
                    {r.note ? ` (${r.note})` : ""}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Certification */}
      <div className="mt-4 flex items-end justify-between border-t border-black/50 pt-3">
        <div className="text-[9px] text-black/70">
          I certify that these entries are true and correct.
        </div>
        <div className="w-64 border-b border-black pb-1 text-[11px] font-[cursive]">
          {log.certified ? h.driverName : " "}
        </div>
      </div>
    </div>
  );
}
