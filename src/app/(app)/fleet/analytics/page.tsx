import { requireManager } from "@/lib/session";
import { getCarrierLogs } from "@/lib/data/logs";
import { AnalyticsView } from "@/features/analytics/analytics-view";

export const metadata = { title: "Fleet Analytics" };

export default async function FleetAnalyticsPage() {
  const user = await requireManager();
  const logs = user.carrierId ? await getCarrierLogs(user.carrierId) : [];

  return (
    <AnalyticsView
      logs={logs}
      eyebrow="Fleet Insights"
      title="Fleet Analytics"
      description="Driving trends, hours worked and compliance aggregated across your carrier's drivers."
    />
  );
}
