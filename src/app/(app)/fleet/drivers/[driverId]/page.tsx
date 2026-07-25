import { notFound } from "next/navigation";
import { requireManager } from "@/lib/session";
import { db } from "@/lib/db";
import { getCarrierDriverLogs } from "@/lib/data/logs";
import { DriverReview } from "@/features/fleet/driver-review";

export const metadata = { title: "Driver Review" };

export default async function DriverReviewPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;
  const user = await requireManager();
  if (!user.carrierId) notFound();

  const [driver, data] = await Promise.all([
    db
      .selectFrom("Driver")
      .innerJoin("User", "Driver.userId", "User.id")
      .selectAll("Driver")
      .select(["User.name", "User.email"])
      .where("Driver.id", "=", driverId)
      .where("Driver.carrierId", "=", user.carrierId)
      .executeTakeFirst(),
    getCarrierDriverLogs(user.carrierId, driverId),
  ]);

  if (!driver || !data) notFound();

  return (
    <DriverReview
      driver={{
        id: driver.id,
        name: driver.name ?? "",
        email: driver.email ?? "",
        licenseNumber: driver.licenseNumber,
        licenseState: driver.licenseState,
        truckNumber: driver.truckNumber,
        trailerNumber: driver.trailerNumber,
        homeTerminal: driver.homeTerminal,
        mainOffice: driver.mainOffice,
        timezone: driver.timezone,
        cycle: driver.cycle,
      }}
      logs={data.logs}
    />
  );
}
