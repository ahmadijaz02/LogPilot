"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FmcsaGraph } from "@/features/log/fmcsa-graph";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { evaluateHos } from "@/lib/fmcsa/validation";
import { formatHoursClock } from "@/lib/utils";
import type { DailyLog } from "@/lib/fmcsa/types";

export function DriverReview({
  driverName,
  logs,
}: {
  driverName: string;
  logs: DailyLog[];
}) {
  const certified = logs.filter((l) => l.certified).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Driver Review"
        title={driverName}
        description={`${logs.length} logs · ${certified} certified · read-only carrier review`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/fleet">
              <ArrowLeft className="h-4 w-4" /> Back to fleet
            </Link>
          </Button>
        }
      />

      {logs.length === 0 ? (
        <EmptyState icon={FileText} title="No logs submitted" description="This driver has not recorded any daily logs yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {logs.map((l) => {
            const t = computeStatusTotals(l.segments);
            const snap = evaluateHos(l, logs, l.cycle);
            const hardViolations = snap.violations.filter((v) => v.severity === "error").length;
            return (
              <Link key={l.id} href={`/fleet/logs/${l.id}`}>
                <Card className="group transition-all hover:border-primary/40 hover:shadow-elevated">
                  <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                    <div className="flex w-full items-center justify-between lg:w-48 lg:flex-col lg:items-start lg:justify-center">
                      <div>
                        <p className="text-sm font-semibold">{format(parseISO(l.header.date), "EEEE")}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(l.header.date), "MMM d, yyyy")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={l.certified ? "success" : "muted"} className="text-[0.6rem]">
                          {l.certified ? "Certified" : "Draft"}
                        </Badge>
                        {hardViolations > 0 && <Badge variant="destructive" className="text-[0.6rem]">{hardViolations} violation{hardViolations > 1 ? "s" : ""}</Badge>}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <FmcsaGraph segments={l.segments} className="opacity-90" />
                    </div>
                    <div className="grid w-full grid-cols-4 gap-3 lg:w-52 lg:grid-cols-2">
                      {[["Drive", t.D], ["On-Duty", t.onDuty], ["Off", t.OFF], ["Sleeper", t.SB]].map(([label, mins]) => (
                        <div key={label as string}>
                          <p className="text-[0.62rem] uppercase text-muted-foreground">{label}</p>
                          <p className="tabular text-sm font-semibold">{formatHoursClock((mins as number) / 60)}</p>
                        </div>
                      ))}
                    </div>
                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary lg:block" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
