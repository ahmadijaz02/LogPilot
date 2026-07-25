"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Loader2,
  Pencil,
  Search,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initials } from "@/lib/utils";
import {
  assignDriverAction,
  bulkAssignDriversAction,
  bulkUnassignDriversAction,
  unassignDriverAction,
} from "@/actions/fleet";
import { DriverEditDialog, type EditableDriver } from "./driver-edit-dialog";

export type AssignedDriver = EditableDriver & { carrierName: string };
export interface UnassignedDriver {
  driverId: string;
  userId: string;
  name: string;
  email: string;
}

type SortKey = "name" | "truck" | "cycle";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "name", label: "Name (A–Z)" },
  { value: "truck", label: "Truck #" },
  { value: "cycle", label: "Cycle" },
];

/** Case-insensitive match across the fields a manager would search by. */
function matches(query: string, fields: Array<string | null>) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

/** Small square checkbox — the design system has no checkbox primitive. */
function SelectBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={label}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
    />
  );
}

export function DriversManagement({
  carrierId,
  assignedDrivers,
  unassignedDrivers,
}: {
  carrierId: string;
  assignedDrivers: AssignedDriver[];
  unassignedDrivers: UnassignedDriver[];
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("name");
  const [editing, setEditing] = React.useState<AssignedDriver | null>(null);
  const [selectedAssigned, setSelectedAssigned] = React.useState<string[]>([]);
  const [selectedUnassigned, setSelectedUnassigned] = React.useState<string[]>([]);

  const visibleAssigned = React.useMemo(() => {
    const list = assignedDrivers.filter((d) =>
      matches(query, [d.name, d.email, d.truckNumber, d.trailerNumber, d.homeTerminal]),
    );
    const by: Record<SortKey, (a: AssignedDriver, b: AssignedDriver) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      truck: (a, b) => (a.truckNumber ?? "~").localeCompare(b.truckNumber ?? "~"),
      cycle: (a, b) => a.cycle.localeCompare(b.cycle) || a.name.localeCompare(b.name),
    };
    return [...list].sort(by[sort]);
  }, [assignedDrivers, query, sort]);

  const visibleUnassigned = React.useMemo(
    () =>
      unassignedDrivers
        .filter((d) => matches(query, [d.name, d.email]))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [unassignedDrivers, query],
  );

  /** Run an action, surface the outcome and refresh server data in place. */
  const run = async (key: string, fn: () => Promise<void>, success: string) => {
    setLoading(key);
    try {
      await fn();
      toast.success(success);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    id: string,
    checked: boolean,
  ) => setter((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  const handleAssign = (driverId: string) =>
    run(
      `assign-${driverId}`,
      () => assignDriverAction({ carrierId, driverId }),
      "Driver assigned to carrier",
    );

  const handleUnassign = (driverId: string) =>
    run(
      `unassign-${driverId}`,
      () => unassignDriverAction({ driverId }),
      "Driver unassigned from carrier",
    );

  const handleBulkAssign = () =>
    run(
      "bulk-assign",
      async () => {
        const { assigned } = await bulkAssignDriversAction({ driverIds: selectedUnassigned });
        setSelectedUnassigned([]);
        if (assigned === 0) throw new Error("No drivers were assigned");
      },
      `${selectedUnassigned.length} driver(s) assigned`,
    );

  const handleBulkUnassign = () =>
    run(
      "bulk-unassign",
      async () => {
        const { unassigned } = await bulkUnassignDriversAction({ driverIds: selectedAssigned });
        setSelectedAssigned([]);
        if (unassigned === 0) throw new Error("No drivers were unassigned");
      },
      `${selectedAssigned.length} driver(s) unassigned`,
    );

  const allAssignedSelected =
    visibleAssigned.length > 0 && selectedAssigned.length === visibleAssigned.length;
  const allUnassignedSelected =
    visibleUnassigned.length > 0 && selectedUnassigned.length === visibleUnassigned.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet Management"
        title="Manage Drivers"
        description="Assign drivers to your carrier and keep their equipment and cycle details current."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/fleet/settings">Carrier settings</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, truck…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  Sort: {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assigned drivers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              Assigned Drivers ({visibleAssigned.length}
              {visibleAssigned.length !== assignedDrivers.length && ` of ${assignedDrivers.length}`})
            </CardTitle>
            <CardDescription>Active drivers in your carrier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleAssigned.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <SelectBox
                    checked={allAssignedSelected}
                    onChange={(c) => setSelectedAssigned(c ? visibleAssigned.map((d) => d.id) : [])}
                    label="Select all assigned drivers"
                  />
                  {selectedAssigned.length > 0 ? `${selectedAssigned.length} selected` : "Select all"}
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedAssigned.length === 0 || loading === "bulk-unassign"}
                  onClick={handleBulkUnassign}
                >
                  {loading === "bulk-unassign" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Unassign
                </Button>
              </div>
            )}

            {visibleAssigned.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {assignedDrivers.length === 0
                  ? "No assigned drivers yet"
                  : "No drivers match your search"}
              </p>
            ) : (
              visibleAssigned.map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <SelectBox
                      checked={selectedAssigned.includes(driver.id)}
                      onChange={(c) => toggle(setSelectedAssigned, driver.id, c)}
                      label={`Select ${driver.name}`}
                    />
                    <Avatar className="h-9 w-9 text-sm">
                      <AvatarFallback>{initials(driver.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{driver.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{driver.email}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {driver.cycle}
                        </Badge>
                        {driver.truckNumber && (
                          <Badge variant="secondary" className="text-xs">
                            {driver.truckNumber}
                          </Badge>
                        )}
                        {driver.trailerNumber && (
                          <Badge variant="secondary" className="text-xs">
                            {driver.trailerNumber}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/fleet/drivers/${driver.id}`} aria-label={`Review ${driver.name}`}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${driver.name}`}
                      onClick={() => setEditing(driver)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Unassign ${driver.name}`}
                      onClick={() => handleUnassign(driver.id)}
                      disabled={loading === `unassign-${driver.id}`}
                    >
                      {loading === `unassign-${driver.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Unassigned drivers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-warning" />
              Unassigned Drivers ({visibleUnassigned.length}
              {visibleUnassigned.length !== unassignedDrivers.length &&
                ` of ${unassignedDrivers.length}`}
              )
            </CardTitle>
            <CardDescription>Available to assign to your carrier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleUnassigned.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <SelectBox
                    checked={allUnassignedSelected}
                    onChange={(c) =>
                      setSelectedUnassigned(c ? visibleUnassigned.map((d) => d.driverId) : [])
                    }
                    label="Select all unassigned drivers"
                  />
                  {selectedUnassigned.length > 0
                    ? `${selectedUnassigned.length} selected`
                    : "Select all"}
                </label>
                <Button
                  size="sm"
                  disabled={selectedUnassigned.length === 0 || loading === "bulk-assign"}
                  onClick={handleBulkAssign}
                >
                  {loading === "bulk-assign" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Assign
                </Button>
              </div>
            )}

            {unassignedDrivers.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-success opacity-50" />
                <p className="text-sm font-medium">All drivers assigned</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Every driver in the system is assigned to a carrier
                </p>
              </div>
            ) : visibleUnassigned.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No drivers match your search</p>
            ) : (
              visibleUnassigned.map((driver) => (
                <div
                  key={driver.driverId}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <SelectBox
                      checked={selectedUnassigned.includes(driver.driverId)}
                      onChange={(c) => toggle(setSelectedUnassigned, driver.driverId, c)}
                      label={`Select ${driver.name}`}
                    />
                    <Avatar className="h-9 w-9 text-sm">
                      <AvatarFallback>{initials(driver.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{driver.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{driver.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    aria-label={`Assign ${driver.name}`}
                    onClick={() => handleAssign(driver.driverId)}
                    disabled={loading === `assign-${driver.driverId}`}
                  >
                    {loading === `assign-${driver.driverId}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <DriverEditDialog
        driver={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
