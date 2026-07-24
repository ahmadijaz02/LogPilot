import { requireManager } from "@/lib/session";
import { getCarrierLogs } from "@/lib/data/logs";
import { ReportsView } from "@/features/reports/reports-view";

export const metadata = { title: "Fleet Reports" };

export default async function FleetReportsPage() {
  const user = await requireManager();
  const logs = user.carrierId ? await getCarrierLogs(user.carrierId) : [];

  return (
    <ReportsView
      logs={logs}
      eyebrow="Carrier Export"
      title="Fleet Reports"
      description="Export submitted logs across your carrier as official PDFs, CSV or structured data."
    />
  );
}
