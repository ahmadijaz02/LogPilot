import { prisma } from "@/lib/prisma";
import type { DriverProfile } from "@/stores/log-store";
import type { CycleType } from "@/lib/fmcsa/constants";

/** Load the current driver's profile in the shape the client store expects. */
export async function getDriverProfile(driverId: string): Promise<DriverProfile> {
  const driver = await prisma.driver.findUniqueOrThrow({
    where: { id: driverId },
    include: { user: { select: { name: true } }, carrier: true },
  });

  return {
    driverName: driver.user.name,
    coDriverName: "",
    carrierName: driver.carrier?.name ?? "",
    licenseNumber: driver.licenseNumber,
    licenseState: driver.licenseState,
    mainOfficeAddress: driver.mainOffice ?? driver.carrier?.mainOffice ?? "",
    homeTerminalAddress: driver.homeTerminal ?? driver.carrier?.homeTerminal ?? "",
    truckNumber: driver.truckNumber ?? "",
    trailerNumber: driver.trailerNumber ?? "",
    timezone: driver.timezone,
    cycle: (driver.cycle as CycleType) ?? "70/8",
  };
}
