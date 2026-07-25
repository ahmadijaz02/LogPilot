import { requireManager } from "@/lib/session";
import { db } from "@/lib/db";
import { CarrierSettings } from "@/features/fleet/carrier-settings";

export const metadata = { title: "Carrier Settings" };

export default async function CarrierSettingsPage() {
  const user = await requireManager();
  const carrierId = user.carrierId;

  if (!carrierId) {
    return <div className="p-6">You must be associated with a carrier</div>;
  }

  const [carrier, managers, drivers] = await Promise.all([
    db.selectFrom("Carrier").selectAll().where("id", "=", carrierId).executeTakeFirst(),
    db
      .selectFrom("User")
      .select(["id", "name", "email"])
      .where("carrierId", "=", carrierId)
      .where("role", "=", "FLEET_MANAGER")
      .orderBy("name")
      .execute(),
    db
      .selectFrom("Driver")
      .select("id")
      .where("carrierId", "=", carrierId)
      .execute(),
  ]);

  if (!carrier) {
    return <div className="p-6">Carrier not found</div>;
  }

  return (
    <CarrierSettings
      carrier={{
        id: carrier.id,
        name: carrier.name,
        dotNumber: carrier.dotNumber,
        mainOffice: carrier.mainOffice,
        homeTerminal: carrier.homeTerminal,
      }}
      managers={managers}
      currentUserId={user.id}
      driverCount={drivers.length}
    />
  );
}
