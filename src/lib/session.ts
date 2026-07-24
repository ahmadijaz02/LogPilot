import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** Require any authenticated user; redirect to /login otherwise. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a DRIVER with a linked driver profile. */
export async function requireDriver() {
  const user = await requireUser();
  if (user.role !== "DRIVER" || !user.driverId) redirect("/fleet");
  return user as typeof user & { driverId: string };
}

/** Require a FLEET_MANAGER. */
export async function requireManager() {
  const user = await requireUser();
  if (user.role !== "FLEET_MANAGER") redirect("/dashboard");
  return user;
}
