"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Resolve the current user, assert they are a fleet manager with a carrier and
 * return that carrierId. Every action in this file is scoped to it — a manager
 * can never read or write a driver outside their own carrier.
 */
async function requireManagerCarrier(): Promise<string> {
  const user = await getCurrentUser();
  if (!user || user.role !== "FLEET_MANAGER" || !user.carrierId) {
    throw new Error("Unauthorized");
  }
  return user.carrierId;
}

/** Assert the driver belongs to the manager's carrier; returns the row. */
async function assertDriverInCarrier(driverId: string, carrierId: string) {
  const driver = await db
    .selectFrom("Driver")
    .select(["id", "userId", "carrierId"])
    .where("id", "=", driverId)
    .executeTakeFirst();

  if (!driver) throw new Error("Driver not found");
  if (driver.carrierId !== carrierId) {
    throw new Error("Driver belongs to another carrier");
  }
  return driver;
}

/** Revalidate every manager surface that renders driver or carrier data. */
function revalidateFleet(driverId?: string) {
  revalidatePath("/fleet");
  revalidatePath("/fleet/drivers");
  revalidatePath("/fleet/settings");
  revalidatePath("/fleet/analytics");
  revalidatePath("/fleet/reports");
  if (driverId) revalidatePath(`/fleet/drivers/${driverId}`);
}

/** Point both the Driver row and its User row at the same carrier. */
async function setDriverCarrier(driverIds: string[], carrierId: string | null) {
  if (driverIds.length === 0) return;

  const rows = await db
    .selectFrom("Driver")
    .select(["id", "userId"])
    .where("id", "in", driverIds)
    .execute();

  // An empty `in ()` list is invalid SQL — nothing matched, nothing to do.
  if (rows.length === 0) return;

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("Driver")
      .set({ carrierId })
      .where(
        "id",
        "in",
        rows.map((r) => r.id),
      )
      .execute();

    await trx
      .updateTable("User")
      .set({ carrierId, updatedAt: new Date() })
      .where(
        "id",
        "in",
        rows.map((r) => r.userId),
      )
      .execute();
  });
}

/* ------------------------------------------------------------------ */
/* Assignment                                                          */
/* ------------------------------------------------------------------ */

/** Assign one unassigned driver to the manager's carrier. */
export async function assignDriverAction({
  carrierId,
  driverId,
}: {
  carrierId: string;
  driverId: string;
}) {
  const managerCarrierId = await requireManagerCarrier();
  if (managerCarrierId !== carrierId) {
    throw new Error("Cannot assign drivers to other carriers");
  }

  const driver = await db
    .selectFrom("Driver")
    .select(["id", "carrierId"])
    .where("id", "=", driverId)
    .executeTakeFirst();

  if (!driver) throw new Error("Driver not found");
  if (driver.carrierId && driver.carrierId !== carrierId) {
    throw new Error("Driver is already assigned to another carrier");
  }

  await setDriverCarrier([driverId], carrierId);
  revalidateFleet(driverId);
}

/** Remove one driver from the manager's carrier. */
export async function unassignDriverAction({ driverId }: { driverId: string }) {
  const carrierId = await requireManagerCarrier();
  await assertDriverInCarrier(driverId, carrierId);
  await setDriverCarrier([driverId], null);
  revalidateFleet(driverId);
}

const idsSchema = z.array(z.string().min(1)).min(1).max(200);

/** Assign several unassigned drivers in one round-trip. */
export async function bulkAssignDriversAction({ driverIds }: { driverIds: string[] }) {
  const carrierId = await requireManagerCarrier();
  const ids = idsSchema.parse(driverIds);

  // Only drivers that are currently unassigned may be pulled in.
  const claimable = await db
    .selectFrom("Driver")
    .select("id")
    .where("id", "in", ids)
    .where("carrierId", "is", null)
    .execute();

  await setDriverCarrier(
    claimable.map((d) => d.id),
    carrierId,
  );
  revalidateFleet();
  return { assigned: claimable.length, skipped: ids.length - claimable.length };
}

/** Remove several drivers from the manager's carrier in one round-trip. */
export async function bulkUnassignDriversAction({ driverIds }: { driverIds: string[] }) {
  const carrierId = await requireManagerCarrier();
  const ids = idsSchema.parse(driverIds);

  const owned = await db
    .selectFrom("Driver")
    .select("id")
    .where("id", "in", ids)
    .where("carrierId", "=", carrierId)
    .execute();

  await setDriverCarrier(
    owned.map((d) => d.id),
    null,
  );
  revalidateFleet();
  return { unassigned: owned.length, skipped: ids.length - owned.length };
}

/* ------------------------------------------------------------------ */
/* Driver details                                                      */
/* ------------------------------------------------------------------ */

const driverPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  licenseNumber: z.string().trim().max(60).optional(),
  licenseState: z.string().trim().max(2).optional(),
  truckNumber: z.string().trim().max(40).optional(),
  trailerNumber: z.string().trim().max(40).optional(),
  homeTerminal: z.string().trim().max(200).optional(),
  mainOffice: z.string().trim().max(200).optional(),
  timezone: z.string().trim().max(60).optional(),
  cycle: z.enum(["70/8", "60/7"]).optional(),
});

export type DriverPatch = z.infer<typeof driverPatchSchema>;

/**
 * Update a driver in the manager's carrier. `name` lives on User, everything
 * else on Driver; blank strings clear the nullable Driver columns.
 */
export async function updateDriverAction({
  driverId,
  patch,
}: {
  driverId: string;
  patch: DriverPatch;
}) {
  const carrierId = await requireManagerCarrier();
  const driver = await assertDriverInCarrier(driverId, carrierId);
  const { name, ...driverFields } = driverPatchSchema.parse(patch);

  // Nullable columns accept "" from the form as "clear this value".
  const nullable = new Set(["truckNumber", "trailerNumber", "homeTerminal", "mainOffice"]);
  const set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(driverFields)) {
    if (value === undefined) continue;
    if (value === "" && !nullable.has(key)) continue;
    set[key] = value === "" ? null : value;
  }

  await db.transaction().execute(async (trx) => {
    if (Object.keys(set).length > 0) {
      await trx.updateTable("Driver").set(set).where("id", "=", driverId).execute();
    }
    if (name) {
      await trx
        .updateTable("User")
        .set({ name, updatedAt: new Date() })
        .where("id", "=", driver.userId)
        .execute();
    }
  });

  revalidateFleet(driverId);
}

/* ------------------------------------------------------------------ */
/* Carrier settings                                                    */
/* ------------------------------------------------------------------ */

const carrierPatchSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  dotNumber: z.string().trim().max(20).optional(),
  mainOffice: z.string().trim().max(200).optional(),
  homeTerminal: z.string().trim().max(200).optional(),
});

export type CarrierPatch = z.infer<typeof carrierPatchSchema>;

/** Update the manager's own carrier record. */
export async function updateCarrierAction({ patch }: { patch: CarrierPatch }) {
  const carrierId = await requireManagerCarrier();
  const fields = carrierPatchSchema.parse(patch);

  const set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    // `name` is NOT NULL; the others clear to null when blanked.
    if (key === "name") {
      if (value !== "") set[key] = value;
      continue;
    }
    set[key] = value === "" ? null : value;
  }

  if (Object.keys(set).length > 0) {
    await db.updateTable("Carrier").set(set).where("id", "=", carrierId).execute();
  }

  revalidateFleet();
}

const fleetDefaultsSchema = z.object({
  timezone: z.string().trim().max(60).optional(),
  cycle: z.enum(["70/8", "60/7"]).optional(),
});

/**
 * Apply fleet-wide operating defaults to every driver in the carrier. There is
 * no carrier-level default column in the schema, so this writes the value onto
 * each driver directly.
 */
export async function applyFleetDefaultsAction(
  patch: z.infer<typeof fleetDefaultsSchema>,
) {
  const carrierId = await requireManagerCarrier();
  const { timezone, cycle } = fleetDefaultsSchema.parse(patch);

  const set: Record<string, unknown> = {};
  if (timezone) set.timezone = timezone;
  if (cycle) set.cycle = cycle;
  if (Object.keys(set).length === 0) return { updated: 0 };

  const result = await db
    .updateTable("Driver")
    .set(set)
    .where("carrierId", "=", carrierId)
    .executeTakeFirst();

  revalidateFleet();
  return { updated: Number(result.numUpdatedRows ?? 0) };
}

/* ------------------------------------------------------------------ */
/* Fleet managers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Attach an existing fleet-manager account to this carrier by email. The
 * account must already exist and not belong to another carrier — this does not
 * create users.
 */
export async function addManagerAction({ email }: { email: string }) {
  const carrierId = await requireManagerCarrier();
  const address = z.string().trim().email().parse(email).toLowerCase();

  const target = await db
    .selectFrom("User")
    .select(["id", "role", "carrierId"])
    .where("email", "=", address)
    .executeTakeFirst();

  if (!target) throw new Error("No account found for that email");
  if (target.role !== "FLEET_MANAGER") {
    throw new Error("That account is not a fleet manager");
  }
  if (target.carrierId === carrierId) {
    throw new Error("That manager is already on this carrier");
  }
  if (target.carrierId) {
    throw new Error("That manager belongs to another carrier");
  }

  await db
    .updateTable("User")
    .set({ carrierId, updatedAt: new Date() })
    .where("id", "=", target.id)
    .execute();

  revalidateFleet();
}

/** Detach another fleet manager from this carrier. Managers cannot remove themselves. */
export async function removeManagerAction({ userId }: { userId: string }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "FLEET_MANAGER" || !user.carrierId) {
    throw new Error("Unauthorized");
  }
  if (user.id === userId) {
    throw new Error("You cannot remove yourself from the carrier");
  }

  const target = await db
    .selectFrom("User")
    .select(["id", "role", "carrierId"])
    .where("id", "=", userId)
    .executeTakeFirst();

  if (!target || target.carrierId !== user.carrierId || target.role !== "FLEET_MANAGER") {
    throw new Error("Manager not found on this carrier");
  }

  await db
    .updateTable("User")
    .set({ carrierId: null, updatedAt: new Date() })
    .where("id", "=", userId)
    .execute();

  revalidateFleet();
}
