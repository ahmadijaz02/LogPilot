"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, Bell, Gauge } from "lucide-react";
import { toast } from "sonner";
import { useLogStore } from "@/stores/log-store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CycleType } from "@/lib/fmcsa/constants";

const THEMES = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
];

const NOTIFICATIONS = [
  ["Violation warnings", "Alert me the moment a hard HOS violation is detected"],
  ["Break reminders", "Remind me before a 30-minute break becomes mandatory"],
  ["Rest reminders", "Nudge me when my 14-hour window is closing"],
  ["Daily completion", "Prompt me to certify my log at the end of each day"],
  ["Weekly summary", "Send a rolling 70-hour cycle recap every week"],
];

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const cycle = useLogStore((s) => s.profile.cycle);
  const setCycle = useLogStore((s) => s.setCycle);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Preferences" title="Settings" description="Personalize LogPilot's appearance, cycle rules and notifications." />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how LogPilot looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => {
              const active = mounted && theme === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                    active ? "border-primary bg-primary/5 shadow-soft" : "border-border/80 hover:border-border hover:bg-secondary/40",
                  )}
                >
                  <t.icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> Hours of Service Cycle</CardTitle>
          <CardDescription>Select the cycle your operation runs under.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <Label className="normal-case tracking-normal text-foreground">Duty cycle</Label>
            <p className="text-xs text-muted-foreground">Applies to all HOS calculations and validation.</p>
          </div>
          <Select value={cycle} onValueChange={(v) => { setCycle(v as CycleType); toast.success(`Switched to ${v} cycle`); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="70/8">70 hour / 8 day</SelectItem>
              <SelectItem value="60/7">60 hour / 7 day</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</CardTitle>
          <CardDescription>Control which alerts LogPilot sends you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {NOTIFICATIONS.map(([title, desc], i) => (
            <div key={title} className="flex items-center justify-between gap-4 rounded-lg px-2 py-3 hover:bg-secondary/40">
              <div>
                <Label className="normal-case tracking-normal text-foreground">{title}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch defaultChecked={i < 4} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
