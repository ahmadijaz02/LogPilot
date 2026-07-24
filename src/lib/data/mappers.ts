import type { CycleType } from "@/lib/fmcsa/constants";
import type { DailyLog } from "@/lib/fmcsa/types";
import type {
  DailyLogTable,
  DutyEntryTable,
  RemarkTable,
  ShippingDocTable,
} from "@/lib/db";

/** A DailyLog with all relations needed to build a domain log. */
export type LogWithRelations = DailyLogTable & {
  entries: DutyEntryTable[];
  remarks: RemarkTable[];
  shippingDocs: ShippingDocTable[];
};

/** Map a persisted log into the domain `DailyLog` used by the engine. */
export function toDomainLog(log: LogWithRelations): DailyLog {
  return {
    id: log.id,
    header: {
      date: log.date,
      driverName: log.driverName,
      coDriverName: log.coDriverName ?? undefined,
      carrierName: log.carrierName,
      mainOfficeAddress: log.mainOffice ?? undefined,
      homeTerminalAddress: log.homeTerminal ?? undefined,
      truckNumber: log.truckNumber ?? undefined,
      trailerNumber: log.trailerNumber ?? undefined,
      shippingNumber: log.shippingNumber ?? undefined,
      commodity: log.commodity ?? undefined,
      totalMiles: log.totalMiles,
    },
    segments: [...log.entries]
      .sort((a, b) => a.startMin - b.startMin)
      .map((e) => ({
        id: e.id,
        status: e.status,
        startMin: e.startMin,
        endMin: e.endMin,
        location: e.location ?? undefined,
        remark: e.remark ?? undefined,
      })),
    remarks: log.remarks.map((r) => ({
      id: r.id,
      timeMin: r.timeMin,
      location: r.location,
      note: r.note ?? "",
    })),
    shippingDocs: log.shippingDocs.map((s) => ({
      id: s.id,
      proNumber: s.proNumber ?? undefined,
      shipper: s.shipper ?? undefined,
      commodity: s.commodity ?? undefined,
    })),
    cycle: (log.cycle as CycleType) ?? "70/8",
    certified: log.certified,
    status: log.status === "CERTIFIED" ? "certified" : "draft",
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt.toISOString(),
  };
}
