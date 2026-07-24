"use client";

import * as React from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  Coffee,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveHos } from "@/hooks/use-hos";
import { formatHours, cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Notice {
  icon: LucideIcon;
  title: string;
  body: string;
  tone: "warning" | "info" | "success";
  time: string;
}

export function NotificationsMenu() {
  const { snapshot } = useActiveHos();

  const notices = React.useMemo<Notice[]>(() => {
    const list: Notice[] = [];
    if (!snapshot) return list;

    for (const v of snapshot.violations.slice(0, 3)) {
      list.push({
        icon: AlertTriangle,
        title: v.title,
        body: v.suggestion,
        tone: v.severity === "error" ? "warning" : "info",
        time: "now",
      });
    }
    if (snapshot.minutesUntilBreak > 0 && snapshot.minutesUntilBreak <= 90) {
      list.push({
        icon: Coffee,
        title: "Break reminder",
        body: `30-minute break due in ${formatHours(snapshot.minutesUntilBreak / 60)}.`,
        tone: "info",
        time: "10m",
      });
    }
    list.push({
      icon: CalendarClock,
      title: "Weekly summary ready",
      body: "Your rolling 70-hour cycle report is available to review.",
      tone: "info",
      time: "2h",
    });
    if (snapshot.violations.length === 0) {
      list.unshift({
        icon: CheckCircle2,
        title: "All clear",
        body: "No active Hours of Service violations detected.",
        tone: "success",
        time: "now",
      });
    }
    return list;
  }, [snapshot]);

  const unread = snapshot?.violations.filter((v) => v.severity === "error").length ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-[1.1rem] w-[1.1rem]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-[0.65rem] font-semibold text-destructive">
              {unread} urgent
            </span>
          )}
        </div>
        <div className="max-h-[340px] divide-y divide-border/70 overflow-y-auto">
          {notices.map((n, i) => (
            <div key={i} className="flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/50">
              <div
                className={cn(
                  "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                  n.tone === "warning" && "bg-destructive/12 text-destructive",
                  n.tone === "info" && "bg-primary/12 text-primary",
                  n.tone === "success" && "bg-success/12 text-success",
                )}
              >
                <n.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <span className="shrink-0 text-[0.68rem] text-muted-foreground">{n.time}</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Mark all as read
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
