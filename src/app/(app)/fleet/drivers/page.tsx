import { requireManager } from "@/lib/session";
import { db } from "@/lib/db";
import { DriversManagement } from "@/features/fleet/drivers-management";

export const metadata = { title: "Manage Drivers" };

export default async function DriversManagementPage() {
  const user = await requireManager();
  const carrierId = user.carrierId;

  if (!carrierId) {
    return <div className="p-6">You must be associated with a carrier</div>;
  }

  const [assigned, unassigned] = await Promise.all([
    db
      .selectFrom("Driver")
      .innerJoin("User", "Driver.userId", "User.id")
      .leftJoin("Carrier", "Driver.carrierId", "Carrier.id")
      .selectAll("Driver")
      .select(["User.name", "User.email", "Carrier.name as carrierName"])
      .where("Driver.carrierId", "=", carrierId)
      .execute(),
    db
      .selectFrom("Driver")
      .innerJoin("User", "Driver.userId", "User.id")
      .select(["Driver.id as driverId", "User.id as userId", "User.name", "User.email"])
      .where("Driver.carrierId", "is", null)
      .where("User.role", "=", "DRIVER")
      .execute(),
  ]);

  return (
    <DriversManagement
      carrierId={carrierId}
      assignedDrivers={assigned.map((d) => ({
        id: d.id,
        name: d.name ?? "",
        email: d.email ?? "",
        licenseNumber: d.licenseNumber,
        licenseState: d.licenseState,
        truckNumber: d.truckNumber,
        trailerNumber: d.trailerNumber,
        homeTerminal: d.homeTerminal,
        mainOffice: d.mainOffice,
        timezone: d.timezone,
        cycle: d.cycle,
        carrierName: d.carrierName ?? "",
      }))}
      unassignedDrivers={unassigned.map((d) => ({
        driverId: d.driverId,
        userId: d.userId,
        name: d.name ?? "",
        email: d.email ?? "",
      }))}
    />
  );
}
