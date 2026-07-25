import { db } from "@/lib/db";
import { toDomainLog } from "./mappers";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { evaluateHos } from "@/lib/fmcsa/validation";
import type { DailyLog } from "@/lib/fmcsa/types";

/** All of a driver's logs, newest first, mapped to the domain model. */
export async function getDriverLogs(driverId: string): Promise<DailyLog[]> {
  const logs = await db
    .selectFrom("DailyLog")
    .selectAll()
    .where("driverId", "=", driverId)
    .orderBy("date", "desc")
    .execute();

  // Batch load related records instead of N+1 queries
  const logIds = logs.map((l) => l.id);
  if (logIds.length === 0) return [];

  const [entries, remarks, shippingDocs] = await Promise.all([
    db.selectFrom("DutyEntry").selectAll().where("logId", "in", logIds).execute(),
    db.selectFrom("Remark").selectAll().where("logId", "in", logIds).execute(),
    db.selectFrom("ShippingDoc").selectAll().where("logId", "in", logIds).execute(),
  ]);

  // Create index maps for O(1) lookup
  const entriesMap = new Map<string, typeof entries>();
  const remarksMap = new Map<string, typeof remarks>();
  const docsMap = new Map<string, typeof shippingDocs>();

  entries.forEach((e) => {
    if (!entriesMap.has(e.logId)) entriesMap.set(e.logId, []);
    entriesMap.get(e.logId)!.push(e);
  });
  remarks.forEach((r) => {
    if (!remarksMap.has(r.logId)) remarksMap.set(r.logId, []);
    remarksMap.get(r.logId)!.push(r);
  });
  shippingDocs.forEach((d) => {
    if (!docsMap.has(d.logId)) docsMap.set(d.logId, []);
    docsMap.get(d.logId)!.push(d);
  });

  return logs.map((log) =>
    toDomainLog({
      ...log,
      entries: entriesMap.get(log.id) ?? [],
      remarks: remarksMap.get(log.id) ?? [],
      shippingDocs: docsMap.get(log.id) ?? [],
    }),
  );
}

/** A single log owned by the given driver (ownership enforced). */
export async function getDriverLog(driverId: string, logId: string): Promise<DailyLog | null> {
  const log = await db
    .selectFrom("DailyLog")
    .selectAll()
    .where("id", "=", logId)
    .where("driverId", "=", driverId)
    .executeTakeFirst();

  if (!log) return null;

  const [entries, remarks, shippingDocs] = await Promise.all([
    db.selectFrom("DutyEntry").selectAll().where("logId", "=", log.id).execute(),
    db.selectFrom("Remark").selectAll().where("logId", "=", log.id).execute(),
    db.selectFrom("ShippingDoc").selectAll().where("logId", "=", log.id).execute(),
  ]);

  return toDomainLog({ ...log, entries, remarks, shippingDocs });
}

/** A log for a manager — must belong to a driver within the manager's carrier. */
export async function getManagerLog(carrierId: string, logId: string): Promise<DailyLog | null> {
  const log = await db
    .selectFrom("DailyLog")
    .leftJoin("Driver", "DailyLog.driverId", "Driver.id")
    .selectAll("DailyLog")
    .where("DailyLog.id", "=", logId)
    .where("Driver.carrierId", "=", carrierId)
    .executeTakeFirst();

  if (!log) return null;

  const [entries, remarks, shippingDocs] = await Promise.all([
    db.selectFrom("DutyEntry").selectAll().where("logId", "=", log.id).execute(),
    db.selectFrom("Remark").selectAll().where("logId", "=", log.id).execute(),
    db.selectFrom("ShippingDoc").selectAll().where("logId", "=", log.id).execute(),
  ]);

  return toDomainLog({ ...log, entries, remarks, shippingDocs });
}

/** A single carrier log plus the driver's full history (for HOS context). */
export async function getManagerLogContext(
  carrierId: string,
  logId: string,
): Promise<{ log: DailyLog; history: DailyLog[]; driverName: string; driverId: string } | null> {
  const log = await db
    .selectFrom("DailyLog")
    .leftJoin("Driver", "DailyLog.driverId", "Driver.id")
    .selectAll("DailyLog")
    .select("Driver.id as driverId")
    .where("DailyLog.id", "=", logId)
    .where("Driver.carrierId", "=", carrierId)
    .executeTakeFirst();

  if (!log) return null;

  const driver = await db
    .selectFrom("Driver")
    .leftJoin("User", "Driver.userId", "User.id")
    .select(["Driver.id", "User.name"])
    .where("Driver.id", "=", log.driverId as string)
    .executeTakeFirst();

  const [logEntries, logRemarks, logShippingDocs] = await Promise.all([
    db.selectFrom("DutyEntry").selectAll().where("logId", "=", log.id).execute(),
    db.selectFrom("Remark").selectAll().where("logId", "=", log.id).execute(),
    db.selectFrom("ShippingDoc").selectAll().where("logId", "=", log.id).execute(),
  ]);

  const historyLogs = await db
    .selectFrom("DailyLog")
    .selectAll()
    .where("driverId", "=", log.driverId as string)
    .orderBy("date", "desc")
    .execute();

  const historyWithRelated = await Promise.all(
    historyLogs.map(async (hl) => {
      const entries = await db.selectFrom("DutyEntry").selectAll().where("logId", "=", hl.id).execute();
      const remarks = await db.selectFrom("Remark").selectAll().where("logId", "=", hl.id).execute();
      const shippingDocs = await db.selectFrom("ShippingDoc").selectAll().where("logId", "=", hl.id).execute();
      return { ...hl, entries, remarks, shippingDocs };
    }),
  );

  return {
    log: toDomainLog({ ...log, entries: logEntries, remarks: logRemarks, shippingDocs: logShippingDocs }),
    history: historyWithRelated.map(toDomainLog),
    driverName: driver?.name ?? "",
    driverId: log.driverId as string,
  };
}

export interface DriverSummary {
  driverId: string;
  name: string;
  email: string;
  truckNumber: string | null;
  homeTerminal: string | null;
  cycle: string;
  logCount: number;
  certifiedCount: number;
  lastLogDate: string | null;
  weekDrivingMinutes: number;
  weekOnDutyMinutes: number;
  weekMiles: number;
  violations: number;
  complianceScore: number;
}

/** Per-driver compliance summaries for a carrier's fleet dashboard. */
export async function getCarrierDriverSummaries(carrierId: string): Promise<DriverSummary[]> {
  const drivers = await db
    .selectFrom("Driver")
    .leftJoin("User", "Driver.userId", "User.id")
    .selectAll("Driver")
    .select(["User.name", "User.email"])
    .where("Driver.carrierId", "=", carrierId)
    .execute();

  return Promise.all(
    drivers.map(async (d) => {
      const logs = await db
        .selectFrom("DailyLog")
        .selectAll()
        .where("driverId", "=", d.id)
        .orderBy("date", "desc")
        .execute();

      const logsWithRelated = await Promise.all(
        logs.map(async (log) => {
          const entries = await db.selectFrom("DutyEntry").selectAll().where("logId", "=", log.id).execute();
          const remarks = await db.selectFrom("Remark").selectAll().where("logId", "=", log.id).execute();
          const shippingDocs = await db.selectFrom("ShippingDoc").selectAll().where("logId", "=", log.id).execute();
          return { ...log, entries, remarks, shippingDocs };
        }),
      );

      const domainLogs = logsWithRelated.map(toDomainLog);
      const recent = domainLogs.slice(0, 7);
      let weekDriving = 0;
      let weekOnDuty = 0;
      let weekMiles = 0;
      let violations = 0;
      let scoreSum = 0;

      for (const log of recent) {
        const totals = computeStatusTotals(log.segments);
        const snap = evaluateHos(log, domainLogs, log.cycle);
        weekDriving += totals.D;
        weekOnDuty += totals.onDuty;
        weekMiles += log.header.totalMiles ?? 0;
        violations += snap.violations.filter((v) => v.severity === "error").length;
        scoreSum += snap.complianceScore;
      }

      return {
        driverId: d.id,
        name: d.name ?? "",
        email: d.email ?? "",
        truckNumber: d.truckNumber,
        homeTerminal: d.homeTerminal,
        cycle: d.cycle,
        logCount: domainLogs.length,
        certifiedCount: domainLogs.filter((l) => l.certified).length,
        lastLogDate: domainLogs[0]?.header.date ?? null,
        weekDrivingMinutes: weekDriving,
        weekOnDutyMinutes: weekOnDuty,
        weekMiles,
        violations,
        complianceScore: recent.length ? Math.round(scoreSum / recent.length) : 100,
      };
    }),
  );
}

/** Full log list for a specific driver, for the manager's review view. */
export async function getCarrierDriverLogs(
  carrierId: string,
  driverId: string,
): Promise<{ driverName: string; logs: DailyLog[] } | null> {
  const driver = await db
    .selectFrom("Driver")
    .leftJoin("User", "Driver.userId", "User.id")
    .select(["Driver.id", "User.name"])
    .where("Driver.id", "=", driverId)
    .where("Driver.carrierId", "=", carrierId)
    .executeTakeFirst();

  if (!driver) return null;

  const logs = await db
    .selectFrom("DailyLog")
    .selectAll()
    .where("driverId", "=", driverId)
    .orderBy("date", "desc")
    .execute();

  const logsWithRelated = await Promise.all(
    logs.map(async (log) => {
      const entries = await db.selectFrom("DutyEntry").selectAll().where("logId", "=", log.id).execute();
      const remarks = await db.selectFrom("Remark").selectAll().where("logId", "=", log.id).execute();
      const shippingDocs = await db.selectFrom("ShippingDoc").selectAll().where("logId", "=", log.id).execute();
      return { ...log, entries, remarks, shippingDocs };
    }),
  );

  return { driverName: driver.name ?? "", logs: logsWithRelated.map(toDomainLog) };
}

/** Every log across a carrier (for fleet-wide reports/analytics). */
export async function getCarrierLogs(carrierId: string): Promise<DailyLog[]> {
  const logs = await db
    .selectFrom("DailyLog")
    .leftJoin("Driver", "DailyLog.driverId", "Driver.id")
    .selectAll("DailyLog")
    .where("Driver.carrierId", "=", carrierId)
    .orderBy("DailyLog.date", "desc")
    .execute();

  const logsWithRelated = await Promise.all(
    logs.map(async (log) => {
      const entries = await db.selectFrom("DutyEntry").selectAll().where("logId", "=", log.id).execute();
      const remarks = await db.selectFrom("Remark").selectAll().where("logId", "=", log.id).execute();
      const shippingDocs = await db.selectFrom("ShippingDoc").selectAll().where("logId", "=", log.id).execute();
      return { ...log, entries, remarks, shippingDocs };
    }),
  );

  return logsWithRelated.map(toDomainLog);
}
