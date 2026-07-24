"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ArrowRight, TrendingUp, CalendarRange } from "lucide-react";
import { useLogStore } from "@/stores/log-store";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { evaluateHos } from "@/lib/fmcsa/validation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FmcsaGraph } from "@/features/log/fmcsa-graph";
import { DutyLegend } from "@/features/log/duty-legend";
import { formatHours, formatHoursClock, cn } from "@/lib/utils";
import { CYCLE_70_HOUR_MINUTES } from "@/lib/fmcsa/constants";

export function WeeklyView() {
  const logs = useLogStore((s) => s.logs);
  const week = React.useMemo(
    () =>
      [...logs].sort((a, b) => a.header.date.localeCompare(b.header.date)).slice(-7),
    [logs],
  );

  const rolling = React.useMemo(() => {
    let acc = 0;
    return week.map((l) => {
      const t = computeStatusTotals(l.segments);
      acc += t.onDuty;
      return { date: l.header.date, cumulative: acc, day: t.onDuty };
    });
  }, [week]);

  const totalDrive = week.reduce((a, l) => a + computeStatusTotals(l.segments).D, 0);
  const totalDuty = week.reduce((a, l) => a + computeStatusTotals(l.segments).onDuty, 0);
  const totalMiles = week.reduce((a, l) => a + (l.header.totalMiles ?? 0), 0);
  const maxCum = Math.max(CYCLE_70_HOUR_MINUTES, ...rolling.map((r) => r.cumulative));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rolling 7-day window"
        title="Weekly View"
        description="Every day's Record of Duty Status, your rolling 70-hour cycle, and weekly totals at a glance."
        actions={<DutyLegend />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Driving", value: formatHours(totalDrive / 60), sub: "this week" },
          { label: "Total On-Duty", value: formatHours(totalDuty / 60), sub: "of 70h cycle" },
          { label: "Total Miles", value: totalMiles.toLocaleString(), sub: "driven" },
          { label: "Avg / Day", value: formatHours(totalDrive / 60 / Math.max(1, week.length)), sub: "driving" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="tabular mt-1 text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Rolling 70h */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle>Rolling 70-Hour Cycle</CardTitle>
          </div>
          <Badge variant={rolling.at(-1)!.cumulative > CYCLE_70_HOUR_MINUTES ? "destructive" : "success"}>
            {formatHours((rolling.at(-1)?.cumulative ?? 0) / 60)} used
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="relative h-44">
            {/* limit line */}
            <div
              className="absolute inset-x-0 border-t border-dashed border-destructive/50"
              style={{ bottom: `${(CYCLE_70_HOUR_MINUTES / maxCum) * 100}%` }}
            >
              <span className="absolute -top-4 right-0 text-[0.65rem] font-medium text-destructive">
                70h limit
              </span>
            </div>
            <div className="flex h-full items-end gap-2 sm:gap-4">
              {rolling.map((r, i) => {
                const h = (r.cumulative / maxCum) * 100;
                const over = r.cumulative > CYCLE_70_HOUR_MINUTES;
                return (
                  <div key={r.date} className="flex flex-1 flex-col items-center gap-2">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        "w-full max-w-[40px] rounded-t-lg",
                        over ? "bg-destructive" : "bg-gradient-to-t from-primary/70 to-primary",
                      )}
                    />
                    <span className="text-[0.65rem] text-muted-foreground">
                      {format(parseISO(r.date), "EEE")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-day cards */}
      <div className="grid grid-cols-1 gap-4">
        {week.map((l) => {
          const t = computeStatusTotals(l.segments);
          const snap = evaluateHos(l, logs, l.cycle);
          return (
            <Link key={l.id} href={`/log?id=${l.id}`}>
              <Card className="group transition-all hover:border-primary/40 hover:shadow-elevated">
                <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                  <div className="flex w-full items-center justify-between lg:w-48 lg:flex-col lg:items-start lg:justify-center">
                    <div>
                      <p className="text-sm font-semibold">
                        {format(parseISO(l.header.date), "EEEE")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(l.header.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={l.certified ? "success" : "muted"} className="text-[0.6rem]">
                        {l.certified ? "Certified" : "Draft"}
                      </Badge>
                      {snap.violations.some((v) => v.severity === "error") && (
                        <Badge variant="destructive" className="text-[0.6rem]">Violation</Badge>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <FmcsaGraph segments={l.segments} className="opacity-90" />
                  </div>
                  <div className="grid w-full grid-cols-4 gap-3 lg:w-52 lg:grid-cols-2">
                    {[
                      ["Drive", t.D],
                      ["On-Duty", t.onDuty],
                      ["Off", t.OFF],
                      ["Sleeper", t.SB],
                    ].map(([label, mins]) => (
                      <div key={label as string}>
                        <p className="text-[0.62rem] uppercase text-muted-foreground">{label}</p>
                        <p className="tabular text-sm font-semibold">
                          {formatHoursClock((mins as number) / 60)}
                        </p>
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
    </div>
  );
}
