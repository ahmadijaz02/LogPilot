"use client";

import * as React from "react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { format, parseISO } from "date-fns";
import { TrendingUp, Truck, Clock, Moon } from "lucide-react";
import { ensureChartsRegistered, cssHsl } from "@/components/charts/chart-setup";
import { useLogStore } from "@/stores/log-store";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { evaluateHos } from "@/lib/fmcsa/validation";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHours } from "@/lib/utils";
import type { DailyLog } from "@/lib/fmcsa/types";

ensureChartsRegistered();

export function AnalyticsView({
  logs: logsProp,
  eyebrow = "Insights",
  title = "Analytics",
  description = "Driving trends, hours worked, rest time and compliance across your recorded logs.",
}: {
  logs?: DailyLog[];
  eyebrow?: string;
  title?: string;
  description?: string;
} = {}) {
  const storeLogs = useLogStore((s) => s.logs);
  const logs = logsProp ?? storeLogs;
  const { resolvedTheme } = useTheme();
  const [, force] = React.useReducer((x) => x + 1, 0);
  // Re-read theme colors after mount / theme switch.
  React.useEffect(() => {
    const id = requestAnimationFrame(force);
    return () => cancelAnimationFrame(id);
  }, [resolvedTheme]);

  const ordered = React.useMemo(
    () => [...logs].sort((a, b) => a.header.date.localeCompare(b.header.date)),
    [logs],
  );

  const perDay = ordered.map((l) => ({
    date: l.header.date,
    totals: computeStatusTotals(l.segments),
    miles: l.header.totalMiles ?? 0,
    score: evaluateHos(l, logs, l.cycle).complianceScore,
  }));

  const labels = perDay.map((d) => format(parseISO(d.date), "EEE"));
  const totalDrive = perDay.reduce((a, d) => a + d.totals.D, 0);
  const totalRest = perDay.reduce((a, d) => a + d.totals.OFF + d.totals.SB, 0);
  const avgScore = Math.round(perDay.reduce((a, d) => a + d.score, 0) / Math.max(1, perDay.length));
  const avgDrive = totalDrive / 60 / Math.max(1, perDay.length);

  const gridColor = cssHsl("--border", 0.6);
  const tickColor = cssHsl("--muted-foreground", 0.9);
  const primary = cssHsl("--primary");
  const driving = cssHsl("--duty-driving");
  const onduty = cssHsl("--duty-onduty");
  const off = cssHsl("--duty-off");
  const sleeper = cssHsl("--duty-sleeper");

  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor }, beginAtZero: true },
    },
  } as const;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Total Driving" value={formatHours(totalDrive / 60)} icon={Truck} accent="primary" />
        <StatCard index={1} label="Avg Daily Drive" value={formatHours(avgDrive)} icon={Clock} accent="primary" />
        <StatCard index={2} label="Rest Time" value={formatHours(totalRest / 60)} icon={Moon} accent="neutral" />
        <StatCard index={3} label="Avg Compliance" value={`${avgScore}%`} icon={TrendingUp} accent={avgScore >= 90 ? "success" : "warning"} progress={avgScore} progressTone={avgScore >= 90 ? "success" : "warning"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Driving Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Driving hours",
                      data: perDay.map((d) => +(d.totals.D / 60).toFixed(2)),
                      borderColor: primary,
                      backgroundColor: cssHsl("--primary", 0.12),
                      fill: true,
                      tension: 0.4,
                      pointRadius: 3,
                      pointBackgroundColor: primary,
                      borderWidth: 2,
                    },
                  ],
                }}
                options={baseOpts}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Duty Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto h-64 max-w-[240px]">
              <Doughnut
                data={{
                  labels: ["Off Duty", "Sleeper", "Driving", "On Duty"],
                  datasets: [
                    {
                      data: [
                        perDay.reduce((a, d) => a + d.totals.OFF, 0),
                        perDay.reduce((a, d) => a + d.totals.SB, 0),
                        perDay.reduce((a, d) => a + d.totals.D, 0),
                        perDay.reduce((a, d) => a + d.totals.ON, 0),
                      ],
                      backgroundColor: [off, sleeper, driving, onduty],
                      borderWidth: 0,
                      hoverOffset: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: "68%",
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: { color: tickColor, usePointStyle: true, padding: 14, boxWidth: 8 },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hours Worked (On-Duty)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <Bar
                data={{
                  labels,
                  datasets: [
                    {
                      label: "On-duty hours",
                      data: perDay.map((d) => +(d.totals.onDuty / 60).toFixed(2)),
                      backgroundColor: cssHsl("--primary", 0.85),
                      borderRadius: 6,
                      maxBarThickness: 32,
                    },
                  ],
                }}
                options={baseOpts}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: "Compliance",
                      data: perDay.map((d) => d.score),
                      borderColor: cssHsl("--success"),
                      backgroundColor: cssHsl("--success", 0.1),
                      fill: true,
                      tension: 0.4,
                      pointRadius: 3,
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  ...baseOpts,
                  scales: {
                    ...baseOpts.scales,
                    y: { ...baseOpts.scales.y, min: 0, max: 100 },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
