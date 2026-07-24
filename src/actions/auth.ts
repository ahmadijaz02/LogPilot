"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";

const registerSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
});

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Register a new DRIVER. New drivers join the default demo carrier so a fleet
 * manager can immediately review their logs. Passwords are bcrypt-hashed.
 */
export async function registerDriverAction(
  input: z.infer<typeof registerSchema>,
): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, password, licenseNumber, licenseState } = parsed.data;

  const existing = await db
    .selectFrom("User")
    .selectAll()
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();

  if (existing) return { ok: false, error: "An account with this email already exists" };

  const carrier = await db
    .selectFrom("Carrier")
    .selectAll()
    .orderBy("createdAt", "asc")
    .limit(1)
    .executeTakeFirst();

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  const driverId = uuidv4();

  await db
    .insertInto("User")
    .values({
      id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "DRIVER",
      carrierId: carrier?.id ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  await db
    .insertInto("Driver")
    .values({
      id: driverId,
      userId,
      licenseNumber: licenseNumber || "PENDING",
      licenseState: licenseState || "—",
      carrierId: carrier?.id ?? null,
      homeTerminal: carrier?.homeTerminal ?? null,
      mainOffice: carrier?.mainOffice ?? null,
      timezone: "UTC",
      cycle: "70_08",
    })
    .execute();

  return { ok: true };
}
