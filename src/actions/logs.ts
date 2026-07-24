"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
  const log = await prisma.dailyLog.findFirst({ where: { id: logId, driverId } });
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
  const driver = await prisma.driver.findUniqueOrThrow({
    where: { id: driverId },
    include: { user: { select: { name: true } }, carrier: true },
  });

  const day = date ?? new Date().toISOString().slice(0, 10);
  const existing = await prisma.dailyLog.findUnique({
    where: { driverId_date: { driverId, date: day } },
  });
  if (existing) return existing.id;

  const log = await prisma.dailyLog.create({
    data: {
      driverId,
      date: day,
      driverName: driver.user.name,
      carrierName: driver.carrier?.name ?? "",
      mainOffice: driver.mainOffice,
      homeTerminal: driver.homeTerminal,
      truckNumber: driver.truckNumber,
      trailerNumber: driver.trailerNumber,
      cycle: driver.cycle,
      totalMiles: 0,
      entries: {
        create: [{ status: "OFF", startMin: 0, endMin: 1440 }],
      },
    },
  });
  revalidatePath("/history");
  revalidatePath("/dashboard");
  return log.id;
}

/** Replace a log's duty-status timeline. */
export async function saveSegmentsAction(
  logId: string,
  segments: z.infer<typeof segmentSchema>[],
) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  const parsed = z.array(segmentSchema).parse(segments);

  await prisma.$transaction([
    prisma.dutyEntry.deleteMany({ where: { logId } }),
    prisma.dutyEntry.createMany({
      data: parsed.map((s) => ({
        logId,
        status: s.status,
        startMin: s.startMin,
        endMin: s.endMin,
        location: s.location,
        remark: s.remark,
      })),
    }),
    prisma.dailyLog.update({ where: { id: logId }, data: { updatedAt: new Date() } }),
  ]);
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

  const ops: Prisma.PrismaPromise<unknown>[] = [];

  if (header) {
    ops.push(prisma.dailyLog.update({ where: { id: logId }, data: header }));
  }
  if (segments) {
    ops.push(prisma.dutyEntry.deleteMany({ where: { logId } }));
    ops.push(
      prisma.dutyEntry.createMany({
        data: segments.map((s) => ({
          logId,
          status: s.status,
          startMin: s.startMin,
          endMin: s.endMin,
          location: s.location,
          remark: s.remark,
        })),
      }),
    );
  }
  if (remarks) {
    ops.push(prisma.remark.deleteMany({ where: { logId } }));
    if (remarks.length) {
      ops.push(prisma.remark.createMany({ data: remarks.map((r) => ({ logId, ...r })) }));
    }
  }
  ops.push(prisma.dailyLog.update({ where: { id: logId }, data: { updatedAt: new Date() } }));

  await prisma.$transaction(ops);
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
  await prisma.dailyLog.update({ where: { id: logId }, data });
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
  await prisma.remark.create({ data: { logId, ...data } });
  revalidatePath(`/log`);
}

export async function removeRemarkAction(logId: string, remarkId: string) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  await prisma.remark.deleteMany({ where: { id: remarkId, logId } });
  revalidatePath(`/log`);
}

/** Certify (submit) a log to the carrier. */
export async function certifyLogAction(logId: string) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  await prisma.dailyLog.update({
    where: { id: logId },
    data: { certified: true, status: "CERTIFIED" },
  });
  revalidatePath("/history");
  revalidatePath("/dashboard");
  revalidatePath("/log");
}

export async function deleteLogAction(logId: string) {
  const driverId = await requireDriverId();
  await assertOwnership(driverId, logId);
  await prisma.dailyLog.delete({ where: { id: logId } });
  revalidatePath("/history");
  revalidatePath("/dashboard");
}

/** Duplicate a log's structure into a new draft (undated collision-safe). */
export async function duplicateLogAction(logId: string): Promise<string> {
  const driverId = await requireDriverId();
  const source = await prisma.dailyLog.findFirst({
    where: { id: logId, driverId },
    include: { entries: true, remarks: true, shippingDocs: true },
  });
  if (!source) throw new Error("Log not found");

  // Find the next free date (source date + 1..N days) to satisfy the unique key.
  let day = source.date;
  for (let i = 1; i <= 400; i++) {
    const d = new Date(source.date);
    d.setDate(d.getDate() + i);
    const candidate = d.toISOString().slice(0, 10);
    const clash = await prisma.dailyLog.findUnique({
      where: { driverId_date: { driverId, date: candidate } },
    });
    if (!clash) {
      day = candidate;
      break;
    }
  }

  const copy = await prisma.dailyLog.create({
    data: {
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
      entries: {
        create: source.entries.map((e) => ({
          status: e.status,
          startMin: e.startMin,
          endMin: e.endMin,
          location: e.location,
          remark: e.remark,
        })),
      },
      remarks: {
        create: source.remarks.map((r) => ({
          timeMin: r.timeMin,
          location: r.location,
          note: r.note,
        })),
      },
    },
  });
  revalidatePath("/history");
  return copy.id;
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
  await prisma.driver.update({ where: { id: driverId }, data });
  revalidatePath("/profile");
}
