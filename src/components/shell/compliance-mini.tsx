"use client";

import Link from "next/link";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useActiveHos } from "@/hooks/use-hos";
import { cn } from "@/lib/utils";

export function ComplianceMini() {
  const { snapshot } = useActiveHos();
  const score = snapshot?.complianceScore ?? 100;
  const errors = snapshot?.violations.filter((v) => v.severity === "error").length ?? 0;
  const healthy = score >= 90 && errors === 0;

  return (
    <Link
      href="/dashboard"
      className="block rounded-xl border border-border/70 bg-gradient-to-b from-secondary/40 to-transparent p-3 transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
            healthy ? "bg-success/12 text-success" : "bg-warning/15 text-warning",
          )}
        >
          {healthy ? (
            <ShieldCheck className="h-[1.05rem] w-[1.05rem]" />
          ) : (
            <ShieldAlert className="h-[1.05rem] w-[1.05rem]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            Compliance Score
          </p>
          <p className="tabular text-lg font-semibold leading-tight">
            {score}
            <span className="text-xs font-normal text-muted-foreground">/100</span>
          </p>
        </div>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            healthy ? "bg-success" : score >= 70 ? "bg-warning" : "bg-destructive",
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </Link>
  );
}
