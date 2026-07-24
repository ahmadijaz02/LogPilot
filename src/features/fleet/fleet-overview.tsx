"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Truck,
  Users,
  ShieldAlert,
  ShieldCheck,
  Search,
  Download,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { initials, formatHours, cn } from "@/lib/utils";
import { downloadFile } from "@/lib/export";
import type { DriverSummary } from "@/lib/data/logs";

export function FleetOverview({
  carrierName,
  summaries,
}: {
  carrierName: string;
  summaries: DriverSummary[];
}) {
  const [query, setQuery] = React.useState("");
  const filtered = summaries.filter((d) =>
    [d.name, d.truckNumber ?? "", d.homeTerminal ?? ""].some((f) =>
      f.toLowerCase().includes(query.toLowerCase()),
    ),
  );

  const totalDrivers = summaries.length;
  const violations = summaries.reduce((a, d) => a + d.violations, 0);
  const avgCompliance = summaries.length
    ? Math.round(summaries.reduce((a, d) => a + d.complianceScore, 0) / summaries.length)
    : 100;
  const totalMiles = summaries.reduce((a, d) => a + d.weekMiles, 0);

  const exportFleet = () => {
    const header = "Driver,Email,Truck,Terminal,Cycle,Logs,Certified,Week Driving (min),Week On-Duty (min),Week Miles,Violations,Compliance";
    const rows = summaries.map((d) =>
      [d.name, d.email, d.truckNumber ?? "", d.homeTerminal ?? "", d.cycle, d.logCount, d.certifiedCount, d.weekDrivingMinutes, d.weekOnDutyMinutes, d.weekMiles, d.violations, d.complianceScore].join(","),
    );
    downloadFile("logpilot-fleet.csv", [header, ...rows].join("\n"), "text/csv");
    toast.success("Fleet report exported");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={carrierName}
        title="Fleet Overview"
        description="Hours of Service compliance and submitted logs across every driver in your carrier."
        actions={
          <Button variant="outline" size="sm" onClick={exportFleet} disabled={!summaries.length}>
            <Download className="h-4 w-4" /> Export report
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Drivers" value={totalDrivers} icon={Users} accent="primary" />
        <StatCard index={1} label="Week Miles" value={totalMiles.toLocaleString()} icon={Truck} accent="primary" />
        <StatCard index={2} label="Open Violations" value={violations} icon={ShieldAlert} accent={violations > 0 ? "warning" : "success"} />
        <StatCard index={3} label="Avg Compliance" value={`${avgCompliance}%`} icon={ShieldCheck} accent={avgCompliance >= 90 ? "success" : "warning"} progress={avgCompliance} progressTone={avgCompliance >= 90 ? "success" : "warning"} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Driver Roster</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search drivers…" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {summaries.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Users} title="No drivers yet" description="Drivers who register under your carrier will appear here." />
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[1.8fr_1fr_1.4fr_1fr_0.8fr_auto] gap-4 border-y border-border px-6 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
                <span>Driver</span>
                <span>Last Log</span>
                <span>70h Cycle (wk)</span>
                <span>Compliance</span>
                <span>Flags</span>
                <span />
              </div>
              {filtered.map((d, i) => {
                const cyclePct = Math.min(100, Math.round((d.weekOnDutyMinutes / (70 * 60)) * 100));
                return (
                  <motion.div
                    key={d.driverId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-2 items-center gap-4 border-b border-border/60 px-6 py-3.5 transition-colors last:border-0 hover:bg-secondary/40 lg:grid-cols-[1.8fr_1fr_1.4fr_1fr_0.8fr_auto]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials(d.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{d.name}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Truck className="h-3 w-3" /> {d.truckNumber ?? "—"}
                          <MapPin className="ml-1 h-3 w-3" /> {d.homeTerminal ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="hidden text-sm lg:block">
                      <span className="tabular text-muted-foreground">{d.lastLogDate ?? "—"}</span>
                    </div>
                    <div className="hidden items-center gap-2 lg:flex">
                      <Progress value={cyclePct} className="h-1.5 w-24" indicatorClassName={cyclePct > 85 ? "bg-destructive" : cyclePct > 70 ? "bg-warning" : "bg-primary"} />
                      <span className="tabular text-xs text-muted-foreground">{formatHours(d.weekOnDutyMinutes / 60)}</span>
                    </div>
                    <div className="hidden lg:block">
                      <span className={cn("tabular text-sm font-semibold", d.complianceScore >= 90 ? "text-success" : d.complianceScore >= 75 ? "text-warning" : "text-destructive")}>
                        {d.complianceScore}
                      </span>
                    </div>
                    <div>
                      {d.violations > 0 ? (
                        <Badge variant="destructive" className="text-[0.6rem]">{d.violations}</Badge>
                      ) : (
                        <Badge variant="success" className="text-[0.6rem]">Clear</Badge>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/fleet/drivers/${d.driverId}`} aria-label={`Review ${d.name}`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
