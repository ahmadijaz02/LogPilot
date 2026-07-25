"use client";

import * as React from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Download,
  FileText,
  IdCard,
  MapPin,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FmcsaGraph } from "@/features/log/fmcsa-graph";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { evaluateHos } from "@/lib/fmcsa/validation";
import { formatHoursClock, cn } from "@/lib/utils";
import { downloadFile } from "@/lib/export";
import type { DailyLog } from "@/lib/fmcsa/types";
import { DriverEditDialog, type EditableDriver } from "./driver-edit-dialog";

type Filter = "all" | "certified" | "draft" | "violations";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "certified", label: "Certified" },
  { value: "draft", label: "Drafts" },
  { value: "violations", label: "With violations" },
];

export function DriverReview({
  driver,
  logs,
}: {
  driver: EditableDriver;
  logs: DailyLog[];
}) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [editing, setEditing] = React.useState(false);

  /** Per-log totals and HOS evaluation, computed once for the whole page. */
  const evaluated = React.useMemo(
    () =>
      logs.map((log) => {
        const totals = computeStatusTotals(log.segments);
        const snapshot = evaluateHos(log, logs, log.cycle);
        const hardViolations = snapshot.violations.filter((v) => v.severity === "error").length;
        return { log, totals, snapshot, hardViolations };
      }),
    [logs],
  );

  const certified = evaluated.filter((e) => e.log.certified).length;
  const totalViolations = evaluated.reduce((a, e) => a + e.hardViolations, 0);
  const recent = evaluated.slice(0, 7);
  const weekDriving = recent.reduce((a, e) => a + e.totals.D, 0);
  const compliance = recent.length
    ? Math.round(recent.reduce((a, e) => a + e.snapshot.complianceScore, 0) / recent.length)
    : 100;

  const visible = evaluated.filter((e) => {
    if (filter === "certified") return e.log.certified;
    if (filter === "draft") return !e.log.certified;
    if (filter === "violations") return e.hardViolations > 0;
    return true;
  });

  const exportDriver = () => {
    const header = "Date,Status,Driving,On-Duty,Off,Sleeper,Miles,Violations,Compliance";
    const rows = evaluated.map((e) =>
      [
        e.log.header.date,
        e.log.certified ? "Certified" : "Draft",
        e.totals.D,
        e.totals.onDuty,
        e.totals.OFF,
        e.totals.SB,
        e.log.header.totalMiles ?? 0,
        e.hardViolations,
        e.snapshot.complianceScore,
      ].join(","),
    );
    const slug = driver.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "driver";
    downloadFile(`logpilot-${slug}.csv`, [header, ...rows].join("\n"), "text/csv");
    toast.success("Driver log history exported");
  };

  const details: Array<[React.ComponentType<{ className?: string }>, string, string]> = [
    [IdCard, "License", `${driver.licenseNumber} (${driver.licenseState})`],
    [Truck, "Truck / Trailer", `${driver.truckNumber ?? "—"} / ${driver.trailerNumber ?? "—"}`],
    [MapPin, "Home terminal", driver.homeTerminal ?? "—"],
    [Clock, "Timezone / Cycle", `${driver.timezone} · ${driver.cycle}`],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Driver Review"
        title={driver.name}
        description={`${driver.email} — ${logs.length} logs · ${certified} certified`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/fleet/drivers">
                <ArrowLeft className="h-4 w-4" /> Back to drivers
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={exportDriver} disabled={!logs.length}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="premium" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit driver
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Logs" value={logs.length} icon={FileText} accent="primary" />
        <StatCard
          index={1}
          label="Certified"
          value={`${certified}/${logs.length}`}
          icon={ShieldCheck}
          accent={logs.length && certified === logs.length ? "success" : "warning"}
        />
        <StatCard
          index={2}
          label="Violations"
          value={totalViolations}
          icon={ShieldAlert}
          accent={totalViolations > 0 ? "destructive" : "success"}
        />
        <StatCard
          index={3}
          label="Compliance (7d)"
          value={`${compliance}%`}
          icon={ShieldCheck}
          sublabel={`${formatHoursClock(weekDriving / 60)} driving`}
          accent={compliance >= 90 ? "success" : "warning"}
          progress={compliance}
          progressTone={compliance >= 90 ? "success" : "warning"}
        />
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {details.map(([Icon, label, value]) => (
            <div key={label} className="flex items-start gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="truncate text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No logs submitted"
          description="This driver has not recorded any daily logs yet."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const count =
                f.value === "all"
                  ? evaluated.length
                  : f.value === "certified"
                    ? certified
                    : f.value === "draft"
                      ? evaluated.length - certified
                      : evaluated.filter((e) => e.hardViolations > 0).length;
              return (
                <Button
                  key={f.value}
                  variant={filter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                >
                  {f.label} ({count})
                </Button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nothing in this view"
              description="No logs match the selected filter."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {visible.map(({ log, totals, snapshot, hardViolations }) => (
                <Link key={log.id} href={`/fleet/logs/${log.id}`}>
                  <Card className="group transition-all hover:border-primary/40 hover:shadow-elevated">
                    <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                      <div className="flex w-full items-center justify-between lg:w-48 lg:flex-col lg:items-start lg:justify-center">
                        <div>
                          <p className="text-sm font-semibold">
                            {format(parseISO(log.header.date), "EEEE")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(log.header.date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={log.certified ? "success" : "muted"} className="text-[0.6rem]">
                            {log.certified ? "Certified" : "Draft"}
                          </Badge>
                          {hardViolations > 0 && (
                            <Badge variant="destructive" className="text-[0.6rem]">
                              {hardViolations} violation{hardViolations > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <FmcsaGraph segments={log.segments} className="opacity-90" />
                      </div>
                      <div className="grid w-full grid-cols-4 gap-3 lg:w-52 lg:grid-cols-2">
                        {(
                          [
                            ["Drive", totals.D],
                            ["On-Duty", totals.onDuty],
                            ["Off", totals.OFF],
                            ["Sleeper", totals.SB],
                          ] as Array<[string, number]>
                        ).map(([label, mins]) => (
                          <div key={label}>
                            <p className="text-[0.62rem] uppercase text-muted-foreground">{label}</p>
                            <p className="tabular text-sm font-semibold">
                              {formatHoursClock(mins / 60)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="hidden w-16 shrink-0 text-right lg:block">
                        <p className="text-[0.62rem] uppercase text-muted-foreground">Score</p>
                        <p
                          className={cn(
                            "tabular text-sm font-semibold",
                            snapshot.complianceScore >= 90
                              ? "text-success"
                              : snapshot.complianceScore >= 75
                                ? "text-warning"
                                : "text-destructive",
                          )}
                        >
                          {snapshot.complianceScore}
                        </p>
                      </div>
                      <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary lg:block" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      <DriverEditDialog driver={driver} open={editing} onOpenChange={setEditing} />
    </div>
  );
}
