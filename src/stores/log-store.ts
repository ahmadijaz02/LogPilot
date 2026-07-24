"use client";

import { create } from "zustand";
import type { CycleType, DutyStatus } from "@/lib/fmcsa/constants";
import type { DailyLog, DutySegment, LogRemark } from "@/lib/fmcsa/types";
import { snapMinutes } from "@/lib/utils";
import {
  saveLogAction,
  createLogAction,
  certifyLogAction,
  deleteLogAction,
  duplicateLogAction,
  updateProfileAction,
} from "@/actions/logs";

let idc = 0;
const uid = (p = "id") => `${p}_${Date.now().toString(36)}_${(idc++).toString(36)}`;

export interface DriverProfile {
  driverName: string;
  coDriverName: string;
  carrierName: string;
  licenseNumber: string;
  licenseState: string;
  mainOfficeAddress: string;
  homeTerminalAddress: string;
  truckNumber: string;
  trailerNumber: string;
  timezone: string;
  cycle: CycleType;
}

const EMPTY_PROFILE: DriverProfile = {
  driverName: "",
  coDriverName: "",
  carrierName: "",
  licenseNumber: "",
  licenseState: "",
  mainOfficeAddress: "",
  homeTerminalAddress: "",
  truckNumber: "",
  trailerNumber: "",
  timezone: "America/New_York",
  cycle: "70/8",
};

interface UndoSnapshot {
  logId: string;
  segments: DutySegment[];
}

interface LogState {
  logs: DailyLog[];
  profile: DriverProfile;
  activeLogId: string | null;
  hydrated: boolean;
  saving: boolean;
  undoStack: UndoSnapshot[];
  redoStack: UndoSnapshot[];

  hydrate: (payload: { logs: DailyLog[]; profile: DriverProfile; activeLogId?: string | null }) => void;
  getHistory: () => DailyLog[];

  setActiveLog: (id: string) => void;
  setCycle: (cycle: CycleType) => void;
  updateHeader: (id: string, patch: Partial<DailyLog["header"]>) => void;
  replaceSegments: (id: string, segments: DutySegment[]) => void;
  setStatusForRange: (id: string, startMin: number, endMin: number, status: DutyStatus) => void;
  addRemark: (id: string, remark: Omit<LogRemark, "id">) => void;
  removeRemark: (id: string, remarkId: string) => void;
  certifyLog: (id: string) => void;
  duplicateLog: (id: string) => Promise<string>;
  deleteLog: (id: string) => void;
  createLog: (date: string) => Promise<string>;
  updateProfile: (patch: Partial<DriverProfile>) => void;
  undo: () => void;
  redo: () => void;
}

// ── Debounced write-through persistence ────────────────────────────────────
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function schedulePersist(getState: () => LogState) {
  return (logId: string) => {
    const existing = timers.get(logId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(async () => {
      timers.delete(logId);
      const log = getState().logs.find((l) => l.id === logId);
      if (!log) return;
      try {
        useLogStore.setState({ saving: true });
        await saveLogAction(logId, {
          header: {
            date: log.header.date,
            driverName: log.header.driverName,
            coDriverName: log.header.coDriverName,
            carrierName: log.header.carrierName,
            mainOffice: log.header.mainOfficeAddress,
            homeTerminal: log.header.homeTerminalAddress,
            truckNumber: log.header.truckNumber,
            trailerNumber: log.header.trailerNumber,
            shippingNumber: log.header.shippingNumber,
            commodity: log.header.commodity,
            totalMiles: log.header.totalMiles,
            cycle: log.cycle,
          },
          segments: log.segments.map((s) => ({
            status: s.status,
            startMin: s.startMin,
            endMin: s.endMin,
            location: s.location,
            remark: s.remark,
          })),
          remarks: log.remarks.map((r) => ({
            timeMin: r.timeMin,
            location: r.location,
            note: r.note,
          })),
        });
      } catch {
        /* best-effort autosave; local state remains authoritative */
      } finally {
        useLogStore.setState({ saving: false });
      }
    }, 700);
    timers.set(logId, t);
  };
}

/** Sort, clamp, tile 0→1440, merge adjacent same-status runs. */
function normalizeSegments(segments: DutySegment[]): DutySegment[] {
  const sorted = [...segments]
    .map((s) => ({
      ...s,
      startMin: Math.max(0, Math.min(1440, s.startMin)),
      endMin: Math.max(0, Math.min(1440, s.endMin)),
    }))
    .filter((s) => s.endMin > s.startMin)
    .sort((a, b) => a.startMin - b.startMin);

  const merged: DutySegment[] = [];
  for (const seg of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.status === seg.status && seg.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, seg.endMin);
    } else if (last && seg.startMin < last.endMin) {
      merged.push({ ...seg, startMin: last.endMin });
    } else {
      merged.push({ ...seg });
    }
  }
  if (merged.length === 0) {
    return [{ id: uid("seg"), status: "OFF", startMin: 0, endMin: 1440 }];
  }
  if (merged[0]!.startMin > 0) merged[0]!.startMin = 0;
  merged[merged.length - 1]!.endMin = 1440;
  return merged;
}

function paintRange(
  segments: DutySegment[],
  startMin: number,
  endMin: number,
  status: DutyStatus,
): DutySegment[] {
  const s = snapMinutes(Math.min(startMin, endMin));
  const e = snapMinutes(Math.max(startMin, endMin));
  if (e <= s) return segments;
  const next: DutySegment[] = [];
  for (const seg of segments) {
    if (seg.endMin <= s || seg.startMin >= e) {
      next.push(seg);
      continue;
    }
    if (seg.startMin < s) next.push({ ...seg, id: uid("seg"), endMin: s });
    if (seg.endMin > e) next.push({ ...seg, id: uid("seg"), startMin: e });
  }
  next.push({ id: uid("seg"), status, startMin: s, endMin: e });
  return normalizeSegments(next);
}

export const useLogStore = create<LogState>()((set, get) => {
  const persist = schedulePersist(get);

  return {
    logs: [],
    profile: EMPTY_PROFILE,
    activeLogId: null,
    hydrated: false,
    saving: false,
    undoStack: [],
    redoStack: [],

    hydrate: ({ logs, profile, activeLogId }) =>
      set((st) => ({
        logs,
        profile,
        hydrated: true,
        activeLogId:
          activeLogId ??
          logs.find((l) => l.header.date === new Date().toISOString().slice(0, 10))?.id ??
          logs[0]?.id ??
          st.activeLogId,
      })),

    getHistory: () =>
      [...get().logs].sort((a, b) => b.header.date.localeCompare(a.header.date)),

    setActiveLog: (id) => set({ activeLogId: id }),

    setCycle: (cycle) => {
      set((st) => ({
        profile: { ...st.profile, cycle },
        logs: st.logs.map((l) => ({ ...l, cycle })),
      }));
      updateProfileAction({ cycle }).catch(() => {});
      const active = get().activeLogId;
      if (active) persist(active);
    },

    updateHeader: (id, patch) => {
      set((st) => ({
        logs: st.logs.map((l) =>
          l.id === id ? { ...l, header: { ...l.header, ...patch } } : l,
        ),
      }));
      persist(id);
    },

    replaceSegments: (id, segments) => {
      set((st) => {
        const log = st.logs.find((l) => l.id === id);
        const undo = log
          ? [...st.undoStack, { logId: id, segments: log.segments }].slice(-50)
          : st.undoStack;
        return {
          undoStack: undo,
          redoStack: [],
          logs: st.logs.map((l) =>
            l.id === id ? { ...l, segments: normalizeSegments(segments) } : l,
          ),
        };
      });
      persist(id);
    },

    setStatusForRange: (id, startMin, endMin, status) => {
      set((st) => {
        const log = st.logs.find((l) => l.id === id);
        if (!log) return st;
        const undo = [...st.undoStack, { logId: id, segments: log.segments }].slice(-50);
        return {
          undoStack: undo,
          redoStack: [],
          logs: st.logs.map((l) =>
            l.id === id ? { ...l, segments: paintRange(l.segments, startMin, endMin, status) } : l,
          ),
        };
      });
      persist(id);
    },

    addRemark: (id, remark) => {
      set((st) => ({
        logs: st.logs.map((l) =>
          l.id === id
            ? { ...l, remarks: [...l.remarks, { ...remark, id: uid("rmk") }].sort((a, b) => a.timeMin - b.timeMin) }
            : l,
        ),
      }));
      persist(id);
    },

    removeRemark: (id, remarkId) => {
      set((st) => ({
        logs: st.logs.map((l) =>
          l.id === id ? { ...l, remarks: l.remarks.filter((r) => r.id !== remarkId) } : l,
        ),
      }));
      persist(id);
    },

    certifyLog: (id) => {
      set((st) => ({
        logs: st.logs.map((l) => (l.id === id ? { ...l, certified: true, status: "certified" } : l)),
      }));
      certifyLogAction(id).catch(() => {});
    },

    duplicateLog: async (id) => {
      const newId = await duplicateLogAction(id);
      const src = get().logs.find((l) => l.id === id);
      if (src) {
        const copy: DailyLog = {
          ...src,
          id: newId,
          certified: false,
          status: "draft",
          segments: src.segments.map((s) => ({ ...s, id: uid("seg") })),
          remarks: src.remarks.map((r) => ({ ...r, id: uid("rmk") })),
        };
        set((st) => ({ logs: [copy, ...st.logs] }));
      }
      return newId;
    },

    deleteLog: (id) => {
      set((st) => ({
        logs: st.logs.filter((l) => l.id !== id),
        activeLogId: st.activeLogId === id ? (st.logs.find((l) => l.id !== id)?.id ?? null) : st.activeLogId,
      }));
      deleteLogAction(id).catch(() => {});
    },

    createLog: async (date) => {
      const newId = await createLogAction(date);
      const { profile } = get();
      const existing = get().logs.find((l) => l.id === newId);
      if (!existing) {
        const log: DailyLog = {
          id: newId,
          header: {
            date,
            driverName: profile.driverName,
            coDriverName: profile.coDriverName,
            carrierName: profile.carrierName,
            mainOfficeAddress: profile.mainOfficeAddress,
            homeTerminalAddress: profile.homeTerminalAddress,
            truckNumber: profile.truckNumber,
            trailerNumber: profile.trailerNumber,
            timezone: profile.timezone,
            totalMiles: 0,
          },
          segments: [{ id: uid("seg"), status: "OFF", startMin: 0, endMin: 1440 }],
          remarks: [],
          shippingDocs: [],
          cycle: profile.cycle,
          certified: false,
          status: "draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((st) => ({ logs: [log, ...st.logs], activeLogId: newId }));
      } else {
        set({ activeLogId: newId });
      }
      return newId;
    },

    updateProfile: (patch) => {
      set((st) => ({ profile: { ...st.profile, ...patch } }));
      updateProfileAction({
        licenseNumber: patch.licenseNumber,
        licenseState: patch.licenseState,
        homeTerminal: patch.homeTerminalAddress,
        mainOffice: patch.mainOfficeAddress,
        timezone: patch.timezone,
        cycle: patch.cycle,
        truckNumber: patch.truckNumber,
        trailerNumber: patch.trailerNumber,
      }).catch(() => {});
    },

    undo: () => {
      let affected: string | null = null;
      set((st) => {
        const last = st.undoStack[st.undoStack.length - 1];
        if (!last) return st;
        affected = last.logId;
        const log = st.logs.find((l) => l.id === last.logId);
        const redo = log ? [...st.redoStack, { logId: last.logId, segments: log.segments }] : st.redoStack;
        return {
          undoStack: st.undoStack.slice(0, -1),
          redoStack: redo,
          logs: st.logs.map((l) => (l.id === last.logId ? { ...l, segments: last.segments } : l)),
        };
      });
      if (affected) persist(affected);
    },

    redo: () => {
      let affected: string | null = null;
      set((st) => {
        const last = st.redoStack[st.redoStack.length - 1];
        if (!last) return st;
        affected = last.logId;
        const log = st.logs.find((l) => l.id === last.logId);
        const undo = log ? [...st.undoStack, { logId: last.logId, segments: log.segments }] : st.undoStack;
        return {
          redoStack: st.redoStack.slice(0, -1),
          undoStack: undo,
          logs: st.logs.map((l) => (l.id === last.logId ? { ...l, segments: last.segments } : l)),
        };
      });
      if (affected) persist(affected);
    },
  };
});
