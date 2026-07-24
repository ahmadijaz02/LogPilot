"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Printer, MapPin, ShieldCheck, ClipboardList, ListChecks, StickyNote } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FmcsaGraph } from "@/features/log/fmcsa-graph";
import { HosClocks } from "@/features/log/hos-clocks";
import { ViolationCenter } from "@/features/log/violation-center";
import { StatusTotalsGrid } from "@/features/log/status-totals";
import { PrintLog } from "@/features/log/print-log";
import { minutesToLabel } from "@/lib/utils";
import type { DailyLog, HosSnapshot } from "@/lib/fmcsa/types";

function InfoCell({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p className="text-[0.68rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export function LogReview({
  driverName,
  driverId,
  log,
  snapshot,
}: {
  driverName: string;
  driverId: string;
  log: DailyLog;
  snapshot: HosSnapshot;
}) {
  const h = log.header;
  const dateLabel = (() => {
    try {
      return format(parseISO(h.date), "EEEE, MMMM d, yyyy");
    } catch {
      return h.date;
    }
  })();

  return (
    <>
      <div className="no-print space-y-6">
        <PageHeader
          eyebrow={`${driverName} · Read-only review`}
          title={dateLabel}
          description="Submitted Record of Duty Status with Hours of Service evaluation."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/fleet/drivers/${driverId}`}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Download PDF
              </Button>
              <Badge variant={log.certified ? "success" : "muted"} className="h-9 px-3">
                {log.certified ? "Certified" : "Draft"}
              </Badge>
            </div>
          }
        />

        <HosClocks snapshot={snapshot} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" /> Official FMCSA Graph
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FmcsaGraph segments={log.segments} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" /> Log Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4">
                <InfoCell label="Carrier" value={h.carrierName} />
                <InfoCell label="Total Miles" value={h.totalMiles} />
                <InfoCell label="Truck / Tractor" value={h.truckNumber} />
                <InfoCell label="Trailer" value={h.trailerNumber} />
                <InfoCell label="Shipping / BOL" value={h.shippingNumber} />
                <InfoCell label="Commodity" value={h.commodity} />
                <InfoCell label="Co-Driver" value={h.coDriverName || "None"} />
                <InfoCell label="Cycle" value={log.cycle} />
                <div className="col-span-2">
                  <InfoCell label="Home Terminal" value={h.homeTerminalAddress} />
                </div>
                <div className="col-span-2">
                  <InfoCell label="Main Office" value={h.mainOfficeAddress} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Violation Center
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ViolationCenter violations={snapshot.violations} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" /> Status Totals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StatusTotalsGrid totals={snapshot.totals} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-primary" /> Remarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {log.remarks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No remarks recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {[...log.remarks].sort((a, b) => a.timeMin - b.timeMin).map((r) => (
                      <div key={r.id} className="flex items-start gap-2.5 rounded-lg border border-border/60 px-3 py-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            <span className="tabular text-muted-foreground">{minutesToLabel(r.timeMin)}</span> · {r.location}
                          </p>
                          {r.note && <p className="truncate text-xs text-muted-foreground">{r.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="print-only">
        <PrintLog log={log} />
      </div>
    </>
  );
}
