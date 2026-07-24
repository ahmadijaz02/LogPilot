"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) return { ok: false, error: "An account with this email already exists" };

  // Attach to the first carrier so managers can see the driver (demo default).
  const carrier = await prisma.carrier.findFirst({ orderBy: { createdAt: "asc" } });
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "DRIVER",
      carrierId: carrier?.id,
      driver: {
        create: {
          licenseNumber: licenseNumber || "PENDING",
          licenseState: licenseState || "—",
          carrierId: carrier?.id,
          homeTerminal: carrier?.homeTerminal,
          mainOffice: carrier?.mainOffice,
        },
      },
    },
  });

  return { ok: true };
}
