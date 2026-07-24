"use client";

import * as React from "react";
import { MapPin, Plus, X, Clock3 } from "lucide-react";
import type { DailyLog } from "@/lib/fmcsa/types";
import { useLogStore } from "@/stores/log-store";
import { minutesToLabel, snapMinutes, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RemarksPanel({ log }: { log: DailyLog }) {
  const addRemark = useLogStore((s) => s.addRemark);
  const removeRemark = useLogStore((s) => s.removeRemark);
  const [time, setTime] = React.useState("08:00");
  const [location, setLocation] = React.useState("");
  const [note, setNote] = React.useState("");

  const remarks = [...log.remarks].sort((a, b) => a.timeMin - b.timeMin);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;
    const [h, m] = time.split(":").map(Number);
    const timeMin = snapMinutes((h ?? 0) * 60 + (m ?? 0), 1);
    addRemark(log.id, { timeMin, location: location.trim(), note: note.trim() });
    setLocation("");
    setNote("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {remarks.length === 0 && (
          <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
            No remarks recorded. Add location notes at each duty-status change.
          </p>
        )}
        {remarks.map((r) => (
          <div
            key={r.id}
            className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5"
          >
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="tabular inline-flex items-center gap-1 text-xs font-semibold">
                  <Clock3 className="h-3 w-3 text-muted-foreground" />
                  {minutesToLabel(r.timeMin)}
                </span>
                <span className="truncate text-sm font-medium">{r.location}</span>
              </div>
              {r.note && (
                <p className="truncate text-xs text-muted-foreground">{r.note}</p>
              )}
            </div>
            <button
              onClick={() => removeRemark(log.id, r.id)}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              aria-label="Remove remark"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <form
        onSubmit={submit}
        className="grid grid-cols-[auto_1fr] gap-2 rounded-xl border border-border/70 bg-secondary/30 p-3 sm:grid-cols-[7rem_1fr_1fr_auto]"
      >
        <Input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-9"
          aria-label="Remark time"
        />
        <Input
          placeholder="City, ST"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="h-9"
          aria-label="Location"
        />
        <Input
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-9"
          aria-label="Note"
        />
        <Button type="submit" size="sm" className="h-9">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </form>
    </div>
  );
}
