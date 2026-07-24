import { notFound } from "next/navigation";
import { requireManager } from "@/lib/session";
import { getManagerLogContext } from "@/lib/data/logs";
import { evaluateHos } from "@/lib/fmcsa/validation";
import { LogReview } from "@/features/fleet/log-review";

export const metadata = { title: "Log Review" };

export default async function LogReviewPage({
  params,
}: {
  params: Promise<{ logId: string }>;
}) {
  const { logId } = await params;
  const user = await requireManager();
  if (!user.carrierId) notFound();

  const ctx = await getManagerLogContext(user.carrierId, logId);
  if (!ctx) notFound();

  const snapshot = evaluateHos(ctx.log, ctx.history, ctx.log.cycle);

  return (
    <LogReview
      driverName={ctx.driverName}
      driverId={ctx.driverId}
      log={ctx.log}
      snapshot={snapshot}
    />
  );
}
