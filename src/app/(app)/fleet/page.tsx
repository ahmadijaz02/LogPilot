import { requireManager } from "@/lib/session";
import { db } from "@/lib/db";
import { getCarrierDriverSummaries } from "@/lib/data/logs";
import { FleetOverview } from "@/features/fleet/fleet-overview";

export const metadata = { title: "Fleet Overview" };

export default async function FleetPage() {
  const user = await requireManager();
  const carrier = user.carrierId
    ? await db
        .selectFrom("Carrier")
        .selectAll()
        .where("id", "=", user.carrierId)
        .executeTakeFirst()
    : null;
  const summaries = user.carrierId ? await getCarrierDriverSummaries(user.carrierId) : [];

  return <FleetOverview carrierName={carrier?.name ?? "Your Carrier"} summaries={summaries} />;
}
