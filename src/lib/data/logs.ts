import { prisma } from "@/lib/prisma";
import { toDomainLog } from "./mappers";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { evaluateHos } from "@/lib/fmcsa/validation";
import type { DailyLog } from "@/lib/fmcsa/types";

const includeAll = { entries: true, remarks: true, shippingDocs: true } as const;

/** All of a driver's logs, newest first, mapped to the domain model. */
export async function getDriverLogs(driverId: string): Promise<DailyLog[]> {
  const logs = await prisma.dailyLog.findMany({
    where: { driverId },
    include: includeAll,
    orderBy: { date: "desc" },
  });
  return logs.map(toDomainLog);
}

/** A single log owned by the given driver (ownership enforced). */
export async function getDriverLog(
  driverId: string,
  logId: string,
): Promise<DailyLog | null> {
  const log = await prisma.dailyLog.findFirst({
    where: { id: logId, driverId },
    include: includeAll,
  });
  return log ? toDomainLog(log) : null;
}

/** A log for a manager — must belong to a driver within the manager's carrier. */
export async function getManagerLog(
  carrierId: string,
  logId: string,
): Promise<DailyLog | null> {
  const log = await prisma.dailyLog.findFirst({
    where: { id: logId, driver: { carrierId } },
    include: includeAll,
  });
  return log ? toDomainLog(log) : null;
}

/** A single carrier log plus the driver's full history (for HOS context). */
export async function getManagerLogContext(
  carrierId: string,
  logId: string,
): Promise<{ log: DailyLog; history: DailyLog[]; driverName: string; driverId: string } | null> {
  const log = await prisma.dailyLog.findFirst({
    where: { id: logId, driver: { carrierId } },
    include: {
      ...includeAll,
      driver: {
        include: { user: { select: { name: true } }, logs: { include: includeAll } },
      },
    },
  });
  if (!log) return null;
  return {
    log: toDomainLog(log),
    history: log.driver.logs.map(toDomainLog),
    driverName: log.driver.user.name,
    driverId: log.driverId,
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
export async function getCarrierDriverSummaries(
  carrierId: string,
): Promise<DriverSummary[]> {
  const drivers = await prisma.driver.findMany({
    where: { carrierId },
    include: {
      user: { select: { name: true, email: true } },
      logs: { include: includeAll, orderBy: { date: "desc" } },
    },
  });

  return drivers.map((d) => {
    const domainLogs = d.logs.map(toDomainLog);
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
      name: d.user.name,
      email: d.user.email,
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
  });
}

/** Full log list for a specific driver, for the manager's review view. */
export async function getCarrierDriverLogs(
  carrierId: string,
  driverId: string,
): Promise<{ driverName: string; logs: DailyLog[] } | null> {
  const driver = await prisma.driver.findFirst({
    where: { id: driverId, carrierId },
    include: {
      user: { select: { name: true } },
      logs: { include: includeAll, orderBy: { date: "desc" } },
    },
  });
  if (!driver) return null;
  return { driverName: driver.user.name, logs: driver.logs.map(toDomainLog) };
}

/** Every log across a carrier (for fleet-wide reports/analytics). */
export async function getCarrierLogs(carrierId: string): Promise<DailyLog[]> {
  const logs = await prisma.dailyLog.findMany({
    where: { driver: { carrierId } },
    include: includeAll,
    orderBy: { date: "desc" },
  });
  return logs.map(toDomainLog);
}
