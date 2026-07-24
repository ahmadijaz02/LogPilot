"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Trash2, Undo2, Redo2, GripVertical, Info } from "lucide-react";
import {
  DUTY_META,
  DUTY_STATUSES,
  type DutyStatus,
} from "@/lib/fmcsa/constants";
import type { DailyLog, DutySegment } from "@/lib/fmcsa/types";
import { useLogStore } from "@/stores/log-store";
import {
  cn,
  clamp,
  snapMinutes,
  minutesToLabel,
  formatHours,
  genId,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusSelector } from "./duty-legend";

const LANE_H = 46;
const MIN_DUR = 15;

interface PaintState {
  status: DutyStatus;
  from: number;
  to: number;
  moved: boolean;
}

export function TimelineEditor({ log }: { log: DailyLog }) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const replaceSegments = useLogStore((s) => s.replaceSegments);
  const setStatusForRange = useLogStore((s) => s.setStatusForRange);
  const undo = useLogStore((s) => s.undo);
  const redo = useLogStore((s) => s.redo);
  const canUndo = useLogStore((s) => s.undoStack.length > 0);
  const canRedo = useLogStore((s) => s.redoStack.length > 0);

  const [paint, setPaint] = React.useState<PaintState | null>(null);
  const paintRef = React.useRef<PaintState | null>(null);
  const [dragBoundary, setDragBoundary] = React.useState<number | null>(null);
  const [hoverMin, setHoverMin] = React.useState<number | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const segments = React.useMemo(
    () => [...log.segments].sort((a, b) => a.startMin - b.startMin),
    [log.segments],
  );
  const selected = segments.find((s) => s.id === selectedId) ?? null;

  const minFromClientX = React.useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return snapMinutes(clamp(ratio * 1440, 0, 1440), MIN_DUR);
  }, []);

  // ── Painting a new block by dragging within a lane ──────────────────────
  const startPaint = (status: DutyStatus) => (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return;
    e.preventDefault();
    const from = minFromClientX(e.clientX);
    const next = { status, from, to: from, moved: false };
    paintRef.current = next;
    setSelectedId(null);
    setPaint(next);
  };

  React.useEffect(() => {
    if (!paint) return;
    const onMove = (e: PointerEvent) => {
      const prev = paintRef.current;
      if (!prev) return;
      const to = minFromClientX(e.clientX);
      const next = { ...prev, to, moved: Math.abs(to - prev.from) >= MIN_DUR };
      paintRef.current = next;
      setPaint(next);
    };
    const onUp = () => {
      const p = paintRef.current;
      paintRef.current = null;
      setPaint(null);
      if (p && p.moved) {
        setStatusForRange(log.id, p.from, p.to, p.status);
      } else if (p) {
        // treat as a click: select segment under cursor in that lane
        const seg = segments.find(
          (s) => s.status === p.status && p.from >= s.startMin && p.from < s.endMin,
        );
        setSelectedId(seg?.id ?? null);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [paint, minFromClientX, setStatusForRange, log.id, segments]);

  // ── Dragging a boundary (resize adjacent blocks) ────────────────────────
  React.useEffect(() => {
    if (dragBoundary == null) return;
    const onMove = (e: PointerEvent) => {
      const newMin = minFromClientX(e.clientX);
      const left = segments[dragBoundary];
      const right = segments[dragBoundary + 1];
      if (!left || !right) return;
      const clamped = clamp(newMin, left.startMin + MIN_DUR, right.endMin - MIN_DUR);
      const next = segments.map((s, i) => {
        if (i === dragBoundary) return { ...s, endMin: clamped };
        if (i === dragBoundary + 1) return { ...s, startMin: clamped };
        return s;
      });
      replaceSegments(log.id, next);
    };
    const onUp = () => setDragBoundary(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragBoundary, minFromClientX, segments, replaceSegments, log.id]);

  // ── Keyboard: delete selected ───────────────────────────────────────────
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        handleDelete();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, undo, redo]);

  const handleSplit = () => {
    if (!selected) return;
    const mid = snapMinutes((selected.startMin + selected.endMin) / 2, MIN_DUR);
    if (mid <= selected.startMin || mid >= selected.endMin) return;
    const next = segments.flatMap((s) =>
      s.id === selected.id
        ? [
            { ...s, endMin: mid },
            { ...s, id: genId("seg"), startMin: mid },
          ]
        : [s],
    );
    replaceSegments(log.id, next);
  };

  const handleDelete = () => {
    if (!selected) return;
    // Absorb into the previous segment (or next) to keep the day tiled.
    const idx = segments.findIndex((s) => s.id === selected.id);
    const donor = segments[idx - 1] ?? segments[idx + 1];
    if (!donor) return;
    setStatusForRange(log.id, selected.startMin, selected.endMin, donor.status);
    setSelectedId(null);
  };

  const handleChangeStatus = (status: DutyStatus) => {
    if (!selected) return;
    setStatusForRange(log.id, selected.startMin, selected.endMin, status);
    setSelectedId(null);
  };

  const boundaries = segments.slice(0, -1).map((s) => s.endMin);
  const pct = (min: number) => `${(min / 1440) * 100}%`;

  return (
    <div className="select-none">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            Drag across a lane to paint · drag a divider to resize · click a block to edit
          </span>
          <span className="sm:hidden">Drag to paint · tap a block to edit</span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={undo} disabled={!canUndo}>
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (⌘Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={redo} disabled={!canRedo}>
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Hour axis */}
      <div className="flex">
        <div className="w-12 shrink-0" />
        <div className="relative h-5 flex-1">
          {Array.from({ length: 25 }).map((_, h) => (
            <div
              key={h}
              className="absolute top-0 -translate-x-1/2 text-[0.6rem] tabular text-muted-foreground/70"
              style={{ left: pct(h * 60) }}
            >
              {h === 0 ? "M" : h === 12 ? "N" : h === 24 ? "M" : h % 12 || 12}
            </div>
          ))}
        </div>
      </div>

      {/* Lanes */}
      <div className="flex">
        {/* Row labels */}
        <div className="w-12 shrink-0">
          {DUTY_STATUSES.map((s) => (
            <div
              key={s}
              className="flex items-center justify-end pr-2"
              style={{ height: LANE_H }}
            >
              <span
                className="text-[0.7rem] font-bold tabular"
                style={{ color: `hsl(var(${DUTY_META[s].colorVar}))` }}
              >
                {DUTY_META[s].line}
              </span>
            </div>
          ))}
        </div>

        {/* Track */}
        <div
          ref={trackRef}
          className="relative flex-1 rounded-xl border border-border/80 bg-card/60"
          style={{ height: LANE_H * 4 }}
          onPointerMove={(e) => setHoverMin(minFromClientX(e.clientX))}
          onPointerLeave={() => setHoverMin(null)}
        >
          {/* Hour gridlines */}
          {Array.from({ length: 25 }).map((_, h) => (
            <div
              key={h}
              className={cn(
                "absolute inset-y-0 w-px",
                h % 6 === 0 ? "bg-border" : "bg-border/40",
              )}
              style={{ left: pct(h * 60) }}
            />
          ))}
          {/* Quarter-hour ticks + lane backgrounds */}
          {DUTY_STATUSES.map((status, i) => (
            <div
              key={status}
              data-lane={status}
              onPointerDown={startPaint(status)}
              className="absolute inset-x-0 cursor-crosshair border-b border-border/40 transition-colors hover:bg-secondary/30"
              style={{ top: i * LANE_H, height: LANE_H }}
            />
          ))}

          {/* Segments */}
          {segments.map((seg) => {
            const laneIdx = DUTY_STATUSES.indexOf(seg.status);
            const isSel = seg.id === selectedId;
            return (
              <motion.button
                key={seg.id}
                layout
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedId(seg.id);
                }}
                className={cn(
                  "absolute z-10 rounded-md ring-offset-1 transition-shadow",
                  isSel ? "ring-2 ring-offset-background shadow-elevated" : "hover:brightness-110",
                )}
                style={{
                  left: pct(seg.startMin),
                  width: pct(seg.endMin - seg.startMin),
                  top: laneIdx * LANE_H + 8,
                  height: LANE_H - 16,
                  background: `hsl(var(${DUTY_META[seg.status].colorVar}))`,
                  // @ts-expect-error CSS var for ring color
                  "--tw-ring-color": `hsl(var(${DUTY_META[seg.status].colorVar}))`,
                }}
                aria-label={`${DUTY_META[seg.status].label} from ${minutesToLabel(seg.startMin)} to ${minutesToLabel(seg.endMin)}`}
              />
            );
          })}

          {/* Boundary handles */}
          {boundaries.map((b, i) => (
            <div
              key={i}
              data-handle="1"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDragBoundary(i);
              }}
              className="group absolute inset-y-0 z-20 flex w-3 -translate-x-1/2 cursor-col-resize items-center justify-center"
              style={{ left: pct(b) }}
            >
              <div className="h-full w-px bg-foreground/20 transition-colors group-hover:bg-primary" />
              <div className="absolute grid h-5 w-3.5 place-items-center rounded bg-background opacity-0 shadow-soft ring-1 ring-border transition-opacity group-hover:opacity-100">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          ))}

          {/* Paint preview */}
          {paint && paint.moved && (
            <div
              className="pointer-events-none absolute z-30 rounded-md border-2 border-dashed"
              style={{
                left: pct(Math.min(paint.from, paint.to)),
                width: pct(Math.abs(paint.to - paint.from)),
                top: DUTY_STATUSES.indexOf(paint.status) * LANE_H + 4,
                height: LANE_H - 8,
                borderColor: `hsl(var(${DUTY_META[paint.status].colorVar}))`,
                background: `hsl(var(${DUTY_META[paint.status].colorVar}) / 0.18)`,
              }}
            />
          )}

          {/* Hover guide */}
          {hoverMin != null && !paint && dragBoundary == null && (
            <div
              className="pointer-events-none absolute inset-y-0 z-0 w-px bg-primary/40"
              style={{ left: pct(hoverMin) }}
            >
              <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[0.6rem] font-medium tabular text-primary-foreground">
                {minutesToLabel(hoverMin)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Selection editor */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {DUTY_META[selected.status].label}
                  </p>
                  <p className="tabular text-xs text-muted-foreground">
                    {minutesToLabel(selected.startMin)} – {minutesToLabel(selected.endMin)} ·{" "}
                    {formatHours((selected.endMin - selected.startMin) / 60)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={handleSplit}>
                    <Scissors className="h-3.5 w-3.5" /> Split
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              </div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Change status
              </p>
              <StatusSelector value={selected.status} onChange={handleChangeStatus} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
