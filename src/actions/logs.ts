"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { DUTY_STATUSES } from "@/lib/fmcsa/constants";

/** Resolve the current user and assert they are a driver; returns driverId. */
async function requireDriverId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user || user.role !== "DRIVER" || !user.driverId) {
    throw new Error("Unauthorized");
  }
  return user.driverId;
}

/** Assert the given log belongs to the driver. */
async function assertOwnership(driverId: string, logId: string) {
  const log = await db
    .selectFrom("DailyLog")
    .selectAll()
    .where("id", "=", logId)
    .where("driverId", "=", driverId)
    .executeTakeFirst();
  if (!log) throw new Error("Log not found");
  return log;
}

const segmentSchema = z.object({
  status: z.enum(DUTY_STATUSES),
  startMin: z.number().int().min(0).max(1440),
  endMin: z.number().int().min(0).max(1440),
  location: z.string().optional(),
  remark: z.string().optional(),
});

/** Create a new daily log for the current driver (defaults auto-filled). */
export async function createLogAction(date?: string): Promise<string> {
  const driverId = await requireDriverId();
  const driver = await db
    .selectFrom("Driver")
    .leftJoin("User", "Driver.userId", "User.id")
    .leftJoin("Carrier", "Driver.carrierId", "Carrier.id")
    .selectAll("Driver")
    .select(["User.name", "Carrier.name as carrierName"])
    .where("Driver.id", "=", driverId)
    .executeTakeFirstOrThrow();

  const day = date ?? new Date().toISOString().slice(0, 10);
  const existing = await db
    .selectFrom("DailyLog")
    .select("id")
    .where("driverId", "=", driverId)
    .where("date", "=", day)
    .executeTakeFirst();

  if (existing) return existing.id;

  const logId = uuidv4();
  const entryId = uuidv4();

  await db
    .insertInto("DailyLog")
    .values({
      id: logId,
      driverId,
      date: day,
      driverName: driver.name ?? "",
      coDriverName: null,
      carrierName: driver.carrierName ?? "",
      mainOffice: driver.mainOffice,
      homeTerminal: driver.homeTerminal,
      truckNumber: driver.truckNumber,
      trailerNumber: driver.trailerNumber,
      shippingNumber: null,
      commodity: null,
      totalMiles: 0,
      cycle: driver.cycle,
      status: "DRAFT",
      certified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  await db
    .insertInto("DutyEntry")
    .values({
      id: entryId,
      logId,
      status: "OFF",
      startMin: 0,
      endMin: 1440,
      location: null,
      remark: null,
    })
    .execute();

  revalidatePath("/history");
  revalidatePath("/dashboard");
  return logId;
}

/** Replace a log's duty-status timeline. */
export async function saveSegmentsAction(
  logId: string,
  segments: z.infer<typeof segmentSchema>[],
) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  const parsed = z.array(segmentSchema).parse(segments);

  await db.deleteFrom("DutyEntry").where("logId", "=", logId).execute();

  if (parsed.length > 0) {
    await db
      .insertInto("DutyEntry")
      .values(
        parsed.map((s) => ({
          id: uuidv4(),
          logId,
          status: s.status as "OFF" | "SB" | "D" | "ON",
          startMin: s.startMin,
          endMin: s.endMin,
          location: s.location ?? null,
          remark: s.remark ?? null,
        })),
      )
      .execute();
  }

  await db
    .updateTable("DailyLog")
    .set({ updatedAt: new Date() })
    .where("id", "=", logId)
    .execute();

  revalidatePath(`/log`);
}

const fullSaveSchema = z.object({
  header: z
    .object({
      date: z.string().optional(),
      driverName: z.string().optional(),
      coDriverName: z.string().optional(),
      carrierName: z.string().optional(),
      mainOffice: z.string().optional(),
      homeTerminal: z.string().optional(),
      truckNumber: z.string().optional(),
      trailerNumber: z.string().optional(),
      shippingNumber: z.string().optional(),
      commodity: z.string().optional(),
      totalMiles: z.number().int().min(0).optional(),
      cycle: z.enum(["70/8", "60/7"]).optional(),
    })
    .optional(),
  segments: z.array(segmentSchema).optional(),
  remarks: z
    .array(
      z.object({
        timeMin: z.number().int().min(0).max(1440),
        location: z.string().min(1),
        note: z.string().optional(),
      }),
    )
    .optional(),
});

/**
 * Persist a full log in one round-trip: header fields, the duty timeline and
 * the remarks list. Used by the driver editor's debounced autosave.
 */
export async function saveLogAction(
  logId: string,
  payload: z.infer<typeof fullSaveSchema>,
) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  const { header, segments, remarks } = fullSaveSchema.parse(payload);

  if (header) {
    await db
      .updateTable("DailyLog")
      .set(header as Record<string, unknown>)
      .where("id", "=", logId)
      .execute();
  }

  if (segments) {
    await db.deleteFrom("DutyEntry").where("logId", "=", logId).execute();
    if (segments.length > 0) {
      await db
        .insertInto("DutyEntry")
        .values(
          segments.map((s) => ({
            id: uuidv4(),
            logId,
            status: s.status as "OFF" | "SB" | "D" | "ON",
            startMin: s.startMin,
            endMin: s.endMin,
            location: s.location ?? null,
            remark: s.remark ?? null,
          })),
        )
        .execute();
    }
  }

  if (remarks) {
    await db.deleteFrom("Remark").where("logId", "=", logId).execute();
    if (remarks.length > 0) {
      await db
        .insertInto("Remark")
        .values(
          remarks.map((r) => ({
            id: uuidv4(),
            logId,
            timeMin: r.timeMin,
            location: r.location,
            note: r.note ?? null,
          })),
        )
        .execute();
    }
  }

  await db
    .updateTable("DailyLog")
    .set({ updatedAt: new Date() })
    .where("id", "=", logId)
    .execute();

  revalidatePath("/history");
  revalidatePath("/dashboard");
}

const headerSchema = z.object({
  date: z.string().optional(),
  driverName: z.string().optional(),
  coDriverName: z.string().optional(),
  carrierName: z.string().optional(),
  mainOffice: z.string().optional(),
  homeTerminal: z.string().optional(),
  truckNumber: z.string().optional(),
  trailerNumber: z.string().optional(),
  shippingNumber: z.string().optional(),
  commodity: z.string().optional(),
  totalMiles: z.number().int().min(0).optional(),
});

/** Update a log's header fields. */
export async function updateHeaderAction(
  logId: string,
  patch: z.infer<typeof headerSchema>,
) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  const data = headerSchema.parse(patch);
  await db
    .updateTable("DailyLog")
    .set(data as Record<string, unknown>)
    .where("id", "=", logId)
    .execute();
  revalidatePath(`/log`);
}

const remarkSchema = z.object({
  timeMin: z.number().int().min(0).max(1440),
  location: z.string().min(1),
  note: z.string().optional(),
});

export async function addRemarkAction(
  logId: string,
  remark: z.infer<typeof remarkSchema>,
) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  const data = remarkSchema.parse(remark);
  await db
    .insertInto("Remark")
    .values({
      id: uuidv4(),
      logId,
      timeMin: data.timeMin,
      location: data.location,
      note: data.note ?? null,
    })
    .execute();
  revalidatePath(`/log`);
}

export async function removeRemarkAction(logId: string, remarkId: string) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  await db
    .deleteFrom("Remark")
    .where("id", "=", remarkId)
    .where("logId", "=", logId)
    .execute();
  revalidatePath(`/log`);
}

/** Certify (submit) a log to the carrier. */
export async function certifyLogAction(logId: string) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  await db
    .updateTable("DailyLog")
    .set({ certified: true, status: "CERTIFIED" })
    .where("id", "=", logId)
    .execute();
  revalidatePath("/history");
  revalidatePath("/dashboard");
  revalidatePath("/log");
}

export async function deleteLogAction(logId: string) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  await db.deleteFrom("DailyLog").where("id", "=", logId).execute();
  revalidatePath("/history");
  revalidatePath("/dashboard");
}

/** Duplicate a log's structure into a new draft (undated collision-safe). */
export async function duplicateLogAction(logId: string): Promise<string> {
  const driverId = await requireDriverId();
  const source = await db
    .selectFrom("DailyLog")
    .selectAll()
    .where("id", "=", logId)
    .where("driverId", "=", driverId)
    .executeTakeFirst();

  if (!source) throw new Error("Log not found");

  const [entries, remarks] = await Promise.all([
    db.selectFrom("DutyEntry").selectAll().where("logId", "=", logId).execute(),
    db.selectFrom("Remark").selectAll().where("logId", "=", logId).execute(),
  ]);

  // Find the next free date (source date + 1..N days) to satisfy the unique key.
  let day = source.date;
  for (let i = 1; i <= 400; i++) {
    const d = new Date(source.date);
    d.setDate(d.getDate() + i);
    const candidate = d.toISOString().slice(0, 10);
    const clash = await db
      .selectFrom("DailyLog")
      .select("id")
      .where("driverId", "=", driverId)
      .where("date", "=", candidate)
      .executeTakeFirst();
    if (!clash) {
      day = candidate;
      break;
    }
  }

  const copyId = uuidv4();
  await db
    .insertInto("DailyLog")
    .values({
      id: copyId,
      driverId,
      date: day,
      driverName: source.driverName,
      coDriverName: source.coDriverName,
      carrierName: source.carrierName,
      mainOffice: source.mainOffice,
      homeTerminal: source.homeTerminal,
      truckNumber: source.truckNumber,
      trailerNumber: source.trailerNumber,
      shippingNumber: source.shippingNumber,
      commodity: source.commodity,
      totalMiles: source.totalMiles,
      cycle: source.cycle,
      status: "DRAFT",
      certified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  if (entries.length > 0) {
    await db
      .insertInto("DutyEntry")
      .values(
        entries.map((e) => ({
          id: uuidv4(),
          logId: copyId,
          status: e.status,
          startMin: e.startMin,
          endMin: e.endMin,
          location: e.location,
          remark: e.remark,
        })),
      )
      .execute();
  }

  if (remarks.length > 0) {
    await db
      .insertInto("Remark")
      .values(
        remarks.map((r) => ({
          id: uuidv4(),
          logId: copyId,
          timeMin: r.timeMin,
          location: r.location,
          note: r.note,
        })),
      )
      .execute();
  }

  revalidatePath("/history");
  return copyId;
}

const profileSchema = z.object({
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  homeTerminal: z.string().optional(),
  mainOffice: z.string().optional(),
  timezone: z.string().optional(),
  cycle: z.enum(["70/8", "60/7"]).optional(),
  truckNumber: z.string().optional(),
  trailerNumber: z.string().optional(),
  signatureData: z.string().optional(),
});

/** Update the current driver's profile. */
export async function updateProfileAction(patch: z.infer<typeof profileSchema>) {
  const driverId = await requireDriverId();
  const data = profileSchema.parse(patch);
  await db
    .updateTable("Driver")
    .set(data as Record<string, unknown>)
    .where("id", "=", driverId)
    .execute();
  revalidatePath("/profile");
}
