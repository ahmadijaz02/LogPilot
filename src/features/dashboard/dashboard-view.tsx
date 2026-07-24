"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Truck,
  Clock,
  Timer,
  CalendarClock,
  Gauge,
  Plus,
  Printer,
  ArrowRight,
  Activity,
  MapPin,
  ShieldCheck,
  CircleDot,
  ClipboardList,
} from "lucide-react";
import { useActiveHos } from "@/hooks/use-hos";
import { useLogStore } from "@/stores/log-store";
import { EmptyState } from "@/components/shared/empty-state";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { DUTY_META } from "@/lib/fmcsa/constants";
import { formatHours, formatHoursClock } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WeeklyBars, type WeeklyDatum } from "@/components/charts/weekly-bars";
import { ViolationCenter } from "@/features/log/violation-center";
import { format, parseISO } from "date-fns";

export function DashboardView() {
  const { log, snapshot, status } = useActiveHos();
  const rawLogs = useLogStore((s) => s.logs);
  const logs = React.useMemo(
    () => [...rawLogs].sort((a, b) => b.header.date.localeCompare(a.header.date)),
    [rawLogs],
  );
  const router = useRouter();
  const createLog = useLogStore((s) => s.createLog);
  const hydrated = useLogStore((s) => s.hydrated);
  const driverName = useLogStore((s) => s.profile.driverName);
  const userName = driverName.split(" ")[0] || "Driver";

  const weekly: WeeklyDatum[] = React.useMemo(
    () =>
      [...logs]
        .sort((a, b) => a.header.date.localeCompare(b.header.date))
        .slice(-7)
        .map((l) => ({
          date: l.header.date,
          totals: computeStatusTotals(l.segments),
          miles: l.header.totalMiles ?? 0,
        })),
    [logs],
  );

  const weekMiles = weekly.reduce((a, d) => a + d.miles, 0);
  const avgDrive =
    weekly.length > 0
      ? weekly.reduce((a, d) => a + d.totals.D, 0) / weekly.length / 60
      : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  })();

  if (hydrated && logs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={greeting + ", " + userName}
          title="Compliance Dashboard"
          description="Create your first daily log to begin tracking Hours of Service."
        />
        <EmptyState
          icon={ClipboardList}
          title="No logs yet"
          description="Start your first Driver's Daily Log — paint your duty timeline and LogPilot handles the compliance math."
          action={
            <Button
              variant="premium"
              onClick={async () => {
                const id = await createLog(new Date().toISOString().slice(0, 10));
                router.push(`/log?id=${id}`);
              }}
            >
              <Plus className="h-4 w-4" /> Create first log
            </Button>
          }
        />
      </div>
    );
  }

  if (!log || !snapshot) return null;
  const m = DUTY_META[status];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={greeting + ", " + userName}
        title="Compliance Dashboard"
        description="Your live Hours of Service status, weekly trends, and everything that needs attention today."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports">
                <Printer className="h-4 w-4" /> Reports
              </Link>
            </Button>
            <Button
              variant="premium"
              size="sm"
              onClick={() => {
                void createLog(new Date().toISOString().slice(0, 10));
              }}
              asChild
            >
              <Link href="/log">
                <Plus className="h-4 w-4" /> New log
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          index={0}
          label="Today's Duty"
          value={formatHoursClock(snapshot.totals.onDuty / 60)}
          sublabel="on-duty hours"
          icon={Clock}
          accent="primary"
          progress={(snapshot.totals.onDuty / (14 * 60)) * 100}
        />
        <StatCard
          index={1}
          label="Driving"
          value={formatHoursClock(snapshot.drivingMinutes / 60)}
          sublabel="of 11h limit"
          icon={Truck}
          accent="primary"
          progress={(snapshot.drivingMinutes / (11 * 60)) * 100}
          progressTone={snapshot.drivingMinutes > 10 * 60 ? "warning" : "primary"}
        />
        <StatCard
          index={2}
          label="Drive Left"
          value={formatHours(snapshot.drivingRemaining / 60)}
          sublabel="until 11h cap"
          icon={Timer}
          accent={snapshot.drivingRemaining < 60 ? "warning" : "success"}
        />
        <StatCard
          index={3}
          label="Window Left"
          value={formatHours(snapshot.windowRemaining / 60)}
          sublabel="of 14h window"
          icon={CalendarClock}
          accent={snapshot.windowRemaining < 60 ? "warning" : "success"}
        />
        <StatCard
          index={4}
          label="70h Cycle"
          value={formatHours(snapshot.cycleRemaining / 60)}
          sublabel="remaining"
          icon={Gauge}
          accent={snapshot.cycleRemaining < 300 ? "warning" : "neutral"}
          progress={(snapshot.cycleUsedMinutes / snapshot.cycleLimit) * 100}
          progressTone={snapshot.cycleUsedMinutes / snapshot.cycleLimit > 0.85 ? "warning" : "primary"}
        />
        <StatCard
          index={5}
          label="Compliance"
          value={snapshot.complianceScore}
          sublabel="score / 100"
          icon={ShieldCheck}
          accent={snapshot.complianceScore >= 90 ? "success" : "warning"}
          progress={snapshot.complianceScore}
          progressTone={snapshot.complianceScore >= 90 ? "success" : "warning"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Weekly Summary</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Duty hours across your rolling 7-day window
              </p>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="tabular text-lg font-semibold">{weekMiles.toLocaleString()}</p>
                <p className="text-[0.68rem] text-muted-foreground">miles</p>
              </div>
              <div>
                <p className="tabular text-lg font-semibold">{formatHours(avgDrive)}</p>
                <p className="text-[0.68rem] text-muted-foreground">avg drive</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WeeklyBars data={weekly} />
          </CardContent>
        </Card>

        {/* Current status */}
        <Card className="relative overflow-hidden">
          <div
            className="absolute inset-x-0 top-0 h-24 opacity-[0.12]"
            style={{ background: `hsl(var(${m.colorVar}))` }}
          />
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className="grid h-11 w-11 place-items-center rounded-xl text-white shadow-soft"
                style={{ background: `hsl(var(${m.colorVar}))` }}
              >
                <CircleDot className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/30 p-3">
              {[
                ["Off Duty", snapshot.totals.OFF],
                ["Sleeper", snapshot.totals.SB],
                ["Driving", snapshot.totals.D],
                ["On Duty", snapshot.totals.ON],
              ].map(([label, mins]) => (
                <div key={label as string} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular font-medium">
                    {formatHoursClock((mins as number) / 60)}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/log">
                Open daily log <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Violations / compliance */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Compliance & Violations</CardTitle>
            {snapshot.violations.length > 0 && (
              <Badge variant={snapshot.violations.some((v) => v.severity === "error") ? "destructive" : "warning"}>
                {snapshot.violations.length} active
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <ViolationCenter violations={snapshot.violations} />
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-4 pl-2">
              <div className="absolute bottom-2 left-[0.6rem] top-2 w-px bg-border" />
              {logs.slice(0, 6).map((l, i) => {
                const t = computeStatusTotals(l.segments);
                return (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative flex gap-3"
                  >
                    <span className="relative z-10 mt-1 grid h-3 w-3 shrink-0 place-items-center rounded-full border-2 border-background bg-primary" />
                    <Link href={`/log?id=${l.id}`} className="min-w-0 flex-1 group">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium group-hover:text-primary">
                          {format(parseISO(l.header.date), "EEE, MMM d")}
                        </p>
                        <Badge variant={l.certified ? "success" : "muted"} className="shrink-0 text-[0.6rem]">
                          {l.certified ? "Certified" : "Draft"}
                        </Badge>
                      </div>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {l.header.commodity ?? "—"} · {formatHours(t.D / 60)} driving
                      </p>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
