import { db } from "@/lib/db";
import type { DriverProfile } from "@/stores/log-store";
import type { CycleType } from "@/lib/fmcsa/constants";

/** Load the current driver's profile in the shape the client store expects. */
export async function getDriverProfile(driverId: string): Promise<DriverProfile> {
  const driver = await db
    .selectFrom("Driver")
    .leftJoin("User", "Driver.userId", "User.id")
    .leftJoin("Carrier", "Driver.carrierId", "Carrier.id")
    .selectAll("Driver")
    .select(["User.name", "Carrier.name as carrierName", "Carrier.mainOffice as carrierMainOffice", "Carrier.homeTerminal as carrierHomeTerminal"])
    .where("Driver.id", "=", driverId)
    .executeTakeFirstOrThrow();

  return {
    driverName: driver.name ?? "",
    coDriverName: "",
    carrierName: driver.carrierName ?? "",
    licenseNumber: driver.licenseNumber,
    licenseState: driver.licenseState,
    mainOfficeAddress: driver.mainOffice ?? driver.carrierMainOffice ?? "",
    homeTerminalAddress: driver.homeTerminal ?? driver.carrierHomeTerminal ?? "",
    truckNumber: driver.truckNumber ?? "",
    trailerNumber: driver.trailerNumber ?? "",
    timezone: driver.timezone,
    cycle: (driver.cycle as CycleType) ?? "70/8",
  };
}
