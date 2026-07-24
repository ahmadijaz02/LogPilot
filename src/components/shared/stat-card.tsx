"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  icon?: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive" | "neutral";
  trend?: { value: string; direction: "up" | "down"; positive?: boolean };
  /** Optional 0–100 progress ring / bar. */
  progress?: number;
  progressTone?: "primary" | "success" | "warning" | "destructive";
  className?: string;
  index?: number;
}

const accentMap = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/12",
  warning: "text-warning bg-warning/15",
  destructive: "text-destructive bg-destructive/12",
  neutral: "text-muted-foreground bg-muted",
};

const progressMap = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = "neutral",
  trend,
  progress,
  progressTone = "primary",
  className,
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className={cn("group relative overflow-hidden p-5 transition-shadow hover:shadow-elevated", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <div className="tabular text-2xl font-semibold tracking-tight">
              {value}
            </div>
          </div>
          {Icon && (
            <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", accentMap[accent])}>
              <Icon className="h-[1.1rem] w-[1.1rem]" />
            </div>
          )}
        </div>

        {(sublabel || trend) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                  trend.positive ?? trend.direction === "up"
                    ? "bg-success/12 text-success"
                    : "bg-destructive/12 text-destructive",
                )}
              >
                {trend.direction === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {trend.value}
              </span>
            )}
            {sublabel && <span className="text-muted-foreground">{sublabel}</span>}
          </div>
        )}

        {progress != null && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className={cn("h-full rounded-full", progressMap[progressTone])}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 0.8, delay: index * 0.05 + 0.2, ease: "easeOut" }}
            />
          </div>
        )}
      </Card>
    </motion.div>
  );
}
