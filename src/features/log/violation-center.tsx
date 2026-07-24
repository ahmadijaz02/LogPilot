"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  ChevronDown,
  ShieldCheck,
  BookOpen,
  Wrench,
} from "lucide-react";
import type { Violation } from "@/lib/fmcsa/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const severityConfig = {
  error: {
    icon: AlertOctagon,
    label: "Violation",
    badge: "destructive" as const,
    ring: "border-destructive/30 bg-destructive/[0.04]",
    iconWrap: "bg-destructive/12 text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    badge: "warning" as const,
    ring: "border-warning/30 bg-warning/[0.04]",
    iconWrap: "bg-warning/15 text-warning",
  },
  info: {
    icon: Info,
    label: "Notice",
    badge: "secondary" as const,
    ring: "border-border bg-secondary/30",
    iconWrap: "bg-primary/12 text-primary",
  },
};

export function ViolationCenter({ violations }: { violations: Violation[] }) {
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  if (violations.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/[0.05] px-4 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/12 text-success">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Fully compliant</p>
          <p className="text-xs text-muted-foreground">
            No Hours of Service violations detected for this log.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs">
        {errors.length > 0 && (
          <Badge variant="destructive">
            {errors.length} {errors.length === 1 ? "violation" : "violations"}
          </Badge>
        )}
        {warnings.length > 0 && (
          <Badge variant="warning">{warnings.length} warnings</Badge>
        )}
      </div>
      <AnimatePresence initial={false}>
        {violations.map((v) => (
          <ViolationRow key={v.id} v={v} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ViolationRow({ v }: { v: Violation }) {
  const [open, setOpen] = React.useState(v.severity === "error");
  const cfg = severityConfig[v.severity];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={cn("overflow-hidden rounded-xl border", cfg.ring)}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", cfg.iconWrap)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{v.title}</p>
          <p className="truncate text-xs text-muted-foreground">{v.regulation}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4 pl-[3.75rem]">
              <p className="text-sm leading-relaxed text-foreground/90">
                {v.explanation}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    <BookOpen className="h-3 w-3" /> Regulation
                  </div>
                  <p className="text-xs">{v.regulation}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Wrench className="h-3 w-3" /> How to fix
                  </div>
                  <p className="text-xs">{v.suggestion}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
