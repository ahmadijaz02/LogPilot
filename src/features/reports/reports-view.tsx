"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  FileText,
  FileJson,
  Sheet,
  Printer,
  Download,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useLogStore } from "@/stores/log-store";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PrintLog } from "@/features/log/print-log";
import { downloadFile, logsToCsv, logsToJson } from "@/lib/export";
import { formatHours } from "@/lib/utils";

const CARDS = [
  { key: "pdf", icon: FileText, title: "Official PDF Log", body: "Render the FMCSA Record of Duty Status and save as PDF.", accent: "text-destructive bg-destructive/10" },
  { key: "csv", icon: Sheet, title: "CSV Export", body: "Spreadsheet of every log with per-status totals.", accent: "text-success bg-success/12" },
  { key: "json", icon: FileJson, title: "JSON Export", body: "Full structured data for backups or integrations.", accent: "text-primary bg-primary/12" },
  { key: "monthly", icon: CalendarDays, title: "Monthly Report", body: "Aggregated driving, on-duty, miles and compliance.", accent: "text-duty-sleeper bg-duty-sleeper/12" },
] as const;

export function ReportsView({
  logs: logsProp,
  eyebrow = "Export & Print",
  title = "Reports",
  description = "Generate official logs, spreadsheets, structured data and summaries.",
}: {
  logs?: import("@/lib/fmcsa/types").DailyLog[];
  eyebrow?: string;
  title?: string;
  description?: string;
} = {}) {
  const storeLogs = useLogStore((s) => s.logs);
  const source = logsProp ?? storeLogs;
  const logs = React.useMemo(
    () => [...source].sort((a, b) => b.header.date.localeCompare(a.header.date)),
    [source],
  );
  const [selectedId, setSelectedId] = React.useState(logs[0]?.id ?? "");
  const selected = logs.find((l) => l.id === selectedId) ?? logs[0];

  const totals = logs.map((l) => computeStatusTotals(l.segments));
  const totalDrive = totals.reduce((a, t) => a + t.D, 0);
  const totalDuty = totals.reduce((a, t) => a + t.onDuty, 0);
  const totalMiles = logs.reduce((a, l) => a + (l.header.totalMiles ?? 0), 0);
  const certified = logs.filter((l) => l.certified).length;

  const today = new Date().toISOString().slice(0, 10);

  const run = (key: string) => {
    if (key === "pdf") {
      window.print();
      return;
    }
    if (key === "csv") {
      downloadFile(`logpilot-logs-${today}.csv`, logsToCsv(logs), "text/csv");
      toast.success("CSV exported", { description: `${logs.length} logs downloaded.` });
    }
    if (key === "json") {
      downloadFile(`logpilot-logs-${today}.json`, logsToJson(logs), "application/json");
      toast.success("JSON exported");
    }
    if (key === "monthly") {
      const report = {
        generatedAt: new Date().toISOString(),
        period: "Rolling window",
        logs: logs.length,
        totalDrivingHours: +(totalDrive / 60).toFixed(2),
        totalOnDutyHours: +(totalDuty / 60).toFixed(2),
        totalMiles,
        certified,
      };
      downloadFile(`logpilot-monthly-${today}.json`, JSON.stringify(report, null, 2), "application/json");
      toast.success("Monthly report generated");
    }
  };

  return (
    <>
      <div className="no-print space-y-6">
        <PageHeader eyebrow={eyebrow} title={title} description={description} />

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Logs", logs.length.toString()],
            ["Driving", formatHours(totalDrive / 60)],
            ["On-Duty", formatHours(totalDuty / 60)],
            ["Miles", totalMiles.toLocaleString()],
          ].map(([label, value]) => (
            <Card key={label} className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Export cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            {CARDS.map((c) => (
              <Card key={c.key} className="flex flex-col p-5 transition-shadow hover:shadow-elevated">
                <div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl ${c.accent}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{c.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{c.body}</p>
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => run(c.key)}>
                  {c.key === "pdf" ? <Printer className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  {c.key === "pdf" ? "Print / Save PDF" : "Download"}
                </Button>
              </Card>
            ))}
          </div>

          {/* Log picker + preview */}
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle>Official Log Preview</CardTitle>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a log" />
                </SelectTrigger>
                <SelectContent>
                  {logs.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {format(parseISO(l.header.date), "EEE, MMM d, yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Certified logs</span>
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" /> {certified}/{logs.length}
                </Badge>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/70 bg-white p-2">
                <div className="origin-top scale-[0.72]">
                  {selected && <PrintLog log={selected} />}
                </div>
              </div>
              <Button variant="premium" size="sm" className="w-full" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print this log
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print target */}
      <div className="print-only">{selected && <PrintLog log={selected} />}</div>
    </>
  );
}
