"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import {
  Search,
  Copy,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  FileText,
  Plus,
  History as HistoryIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useLogStore } from "@/stores/log-store";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { evaluateHos } from "@/lib/fmcsa/validation";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatHours, formatHoursClock, cn } from "@/lib/utils";

type SortKey = "date" | "drive" | "miles";
type Filter = "all" | "certified" | "draft" | "flagged";

export function HistoryView() {
  const router = useRouter();
  const logs = useLogStore((s) => s.logs);
  const allLogs = logs;
  const duplicateLog = useLogStore((s) => s.duplicateLog);
  const deleteLog = useLogStore((s) => s.deleteLog);
  const createLog = useLogStore((s) => s.createLog);

  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("date");
  const [asc, setAsc] = React.useState(false);
  const [filter, setFilter] = React.useState<Filter>("all");

  const rows = React.useMemo(() => {
    let list = logs.map((l) => {
      const t = computeStatusTotals(l.segments);
      const snap = evaluateHos(l, allLogs, l.cycle);
      return {
        log: l,
        drive: t.D,
        duty: t.onDuty,
        miles: l.header.totalMiles ?? 0,
        flagged: snap.violations.some((v) => v.severity === "error"),
        score: snap.complianceScore,
      };
    });

    if (filter === "certified") list = list.filter((r) => r.log.certified);
    if (filter === "draft") list = list.filter((r) => !r.log.certified);
    if (filter === "flagged") list = list.filter((r) => r.flagged);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [
          r.log.header.date,
          r.log.header.commodity,
          r.log.header.shippingNumber,
          r.log.header.truckNumber,
          r.log.header.driverName,
          ...r.log.remarks.map((x) => x.location),
        ]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(q)),
      );
    }

    list.sort((a, b) => {
      const dir = asc ? 1 : -1;
      if (sort === "date") return dir * a.log.header.date.localeCompare(b.log.header.date);
      if (sort === "drive") return dir * (a.drive - b.drive);
      return dir * (a.miles - b.miles);
    });
    return list;
  }, [logs, allLogs, query, sort, asc, filter]);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Log Archive"
        title="History"
        description="Search, filter, sort and manage every daily log you've recorded."
        actions={
          <Button
            variant="premium"
            size="sm"
            onClick={async () => {
              const id = await createLog(new Date().toISOString().slice(0, 10));
              router.push(`/log?id=${id}`);
            }}
          >
            <Plus className="h-4 w-4" /> New log
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search date, commodity, truck, location…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="certified">Certified</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="flagged">Flagged</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No logs found"
          description="Try adjusting your search or filters, or create a new daily log."
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Header row */}
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
            <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-foreground">
              Date <ArrowUpDown className="h-3 w-3" />
            </button>
            <button onClick={() => toggleSort("drive")} className="flex items-center gap-1 hover:text-foreground">
              Driving <ArrowUpDown className="h-3 w-3" />
            </button>
            <span>On-Duty</span>
            <button onClick={() => toggleSort("miles")} className="flex items-center gap-1 hover:text-foreground">
              Miles <ArrowUpDown className="h-3 w-3" />
            </button>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          <AnimatePresence initial={false}>
            {rows.map(({ log, drive, duty, miles, flagged, score }) => (
              <motion.div
                key={log.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 items-center gap-4 border-b border-border/60 px-5 py-3.5 transition-colors last:border-0 hover:bg-secondary/40 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]"
              >
                <Link href={`/log?id=${log.id}`} className="min-w-0 group">
                  <p className="truncate text-sm font-semibold group-hover:text-primary">
                    {format(parseISO(log.header.date), "EEE, MMM d, yyyy")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {log.header.commodity ?? "—"} · {log.header.shippingNumber ?? ""}
                  </p>
                </Link>
                <div className="tabular text-sm">{formatHoursClock(drive / 60)}</div>
                <div className="tabular hidden text-sm lg:block">{formatHoursClock(duty / 60)}</div>
                <div className="tabular hidden text-sm lg:block">{miles.toLocaleString()}</div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={log.certified ? "success" : "muted"} className="text-[0.6rem]">
                    {log.certified ? "Certified" : "Draft"}
                  </Badge>
                  {flagged && <Badge variant="destructive" className="text-[0.6rem]">!</Badge>}
                  <span className={cn("tabular hidden text-xs font-medium sm:inline", score >= 90 ? "text-success" : "text-warning")}>
                    {score}
                  </span>
                </div>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/log?id=${log.id}`)}>
                        <FileText /> Open
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const id = await duplicateLog(log.id);
                          toast.success("Log duplicated");
                          router.push(`/log?id=${id}`);
                        }}
                      >
                        <Copy /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => { deleteLog(log.id); toast("Log deleted"); }}
                      >
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </Card>
      )}
    </div>
  );
}
