import { notFound } from "next/navigation";
import { requireManager } from "@/lib/session";
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

  const data = await getCarrierDriverLogs(user.carrierId, driverId);
  if (!data) notFound();

  return <DriverReview driverName={data.driverName} logs={data.logs} />;
}
