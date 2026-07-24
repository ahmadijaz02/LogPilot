"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Printer,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ListChecks,
  StickyNote,
  Activity,
  FileSignature,
} from "lucide-react";
import { toast } from "sonner";
import { useLogStore } from "@/stores/log-store";
import { useHosForLog } from "@/hooks/use-hos";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { CurrentStatusBanner } from "./current-status";
import { HosClocks } from "./hos-clocks";
import { TimelineEditor } from "./timeline-editor";
import { FmcsaGraph } from "./fmcsa-graph";
import { StatusTotalsGrid } from "./status-totals";
import { ViolationCenter } from "./violation-center";
import { RemarksPanel } from "./remarks-panel";
import { LogHeaderForm } from "./log-header-form";
import { PrintLog } from "./print-log";
import type { CycleType } from "@/lib/fmcsa/constants";

function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function LogWorkspace() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const rawLogs = useLogStore((s) => s.logs);
  const logs = React.useMemo(
    () => [...rawLogs].sort((a, b) => b.header.date.localeCompare(a.header.date)),
    [rawLogs],
  );
  const activeLogId = useLogStore((s) => s.activeLogId);
  const setActiveLog = useLogStore((s) => s.setActiveLog);
  const setCycle = useLogStore((s) => s.setCycle);
  const certifyLog = useLogStore((s) => s.certifyLog);

  React.useEffect(() => {
    if (idParam) setActiveLog(idParam);
  }, [idParam, setActiveLog]);

  const log = useLogStore((s) => s.logs.find((l) => l.id === (idParam ?? activeLogId)));
  const snapshot = useHosForLog(log);
  const [certifyOpen, setCertifyOpen] = React.useState(false);

  const currentStatus = React.useMemo(() => {
    if (!log) return "OFF" as const;
    const sorted = [...log.segments].sort((a, b) => a.startMin - b.startMin);
    return sorted[sorted.length - 1]?.status ?? "OFF";
  }, [log]);

  const sortedByDate = React.useMemo(
    () => [...logs].sort((a, b) => a.header.date.localeCompare(b.header.date)),
    [logs],
  );
  const idx = sortedByDate.findIndex((l) => l.id === log?.id);
  const prev = idx > 0 ? sortedByDate[idx - 1] : undefined;
  const next = idx < sortedByDate.length - 1 ? sortedByDate[idx + 1] : undefined;

  if (!log || !snapshot) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No log selected"
        description="Pick a log from your history or create a new daily log to get started."
      />
    );
  }

  const dateLabel = (() => {
    try {
      return format(parseISO(log.header.date), "EEEE, MMMM d, yyyy");
    } catch {
      return log.header.date;
    }
  })();

  return (
    <>
      {/* Screen workspace */}
      <div className="no-print space-y-6">
        <PageHeader
          eyebrow="Daily Driver Log"
          title={dateLabel}
          description="Interactive record of duty status with live FMCSA Hours of Service validation."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-border">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!prev}
                  onClick={() => prev && setActiveLog(prev.id)}
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="h-5 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!next}
                  onClick={() => next && setActiveLog(next.id)}
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Select value={log.cycle} onValueChange={(v) => setCycle(v as CycleType)}>
                <SelectTrigger className="h-9 w-[132px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="70/8">70 hr / 8 day</SelectItem>
                  <SelectItem value="60/7">60 hr / 7 day</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Export PDF
              </Button>

              {log.certified ? (
                <Badge variant="success" className="h-9 px-3">
                  <BadgeCheck className="h-3.5 w-3.5" /> Certified
                </Badge>
              ) : (
                <Button variant="premium" size="sm" onClick={() => setCertifyOpen(true)}>
                  <FileSignature className="h-4 w-4" /> Certify log
                </Button>
              )}
            </div>
          }
        />

        <CurrentStatusBanner status={currentStatus} snapshot={snapshot} />
        <HosClocks snapshot={snapshot} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <SectionCard
              title="Interactive Timeline"
              description="Paint, resize, split and edit your duty status."
              icon={Activity}
            >
              <TimelineEditor log={log} />
            </SectionCard>

            <SectionCard
              title="Official FMCSA Graph"
              description="Record of Duty Status — matches the paper log grid."
              icon={ClipboardList}
            >
              <FmcsaGraph segments={log.segments} />
            </SectionCard>

            <SectionCard
              title="Log Information"
              description="Header fields required on the daily log."
              icon={ListChecks}
            >
              <LogHeaderForm log={log} />
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard title="Violation Center" description="Live HOS rule checks." icon={BadgeCheck}>
              <ViolationCenter violations={snapshot.violations} />
            </SectionCard>

            <SectionCard title="Status Totals" description="Hours per duty status." icon={ListChecks}>
              <StatusTotalsGrid totals={snapshot.totals} />
            </SectionCard>

            <SectionCard title="Remarks" description="Location notes at status changes." icon={StickyNote}>
              <RemarksPanel log={log} />
            </SectionCard>
          </div>
        </div>
      </div>

      {/* Print document */}
      <div className="print-only">
        <PrintLog log={log} />
      </div>

      {/* Certify dialog */}
      <Dialog open={certifyOpen} onOpenChange={setCertifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Certify daily log</DialogTitle>
            <DialogDescription>
              By certifying, you confirm the entries for {dateLabel} are true and correct,
              per 49 CFR § 395.8(a). This applies your electronic signature.
            </DialogDescription>
          </DialogHeader>
          {snapshot.violations.some((v) => v.severity === "error") && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/[0.05] px-3 py-2.5 text-xs text-destructive">
              This log has unresolved violations. You may still certify, but the issues will
              remain flagged for review.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertifyOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="premium"
              onClick={() => {
                certifyLog(log.id);
                setCertifyOpen(false);
                toast.success("Log certified", {
                  description: `${dateLabel} signed by ${log.header.driverName}.`,
                });
              }}
            >
              <FileSignature className="h-4 w-4" /> Sign & certify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
