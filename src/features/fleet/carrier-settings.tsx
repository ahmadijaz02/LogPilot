"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Loader2, Save, ShieldCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CYCLE_OPTIONS, TIMEZONE_OPTIONS } from "@/config/fleet";
import { initials } from "@/lib/utils";
import {
  addManagerAction,
  applyFleetDefaultsAction,
  removeManagerAction,
  updateCarrierAction,
} from "@/actions/fleet";

export interface CarrierRecord {
  id: string;
  name: string;
  dotNumber: string | null;
  mainOffice: string | null;
  homeTerminal: string | null;
}

export interface ManagerRecord {
  id: string;
  name: string;
  email: string;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function CarrierSettings({
  carrier,
  managers,
  currentUserId,
  driverCount,
}: {
  carrier: CarrierRecord;
  managers: ManagerRecord[];
  currentUserId: string;
  driverCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({
    name: carrier.name,
    dotNumber: carrier.dotNumber ?? "",
    mainOffice: carrier.mainOffice ?? "",
    homeTerminal: carrier.homeTerminal ?? "",
  });
  const [defaults, setDefaults] = React.useState({ timezone: "", cycle: "" });
  const [managerEmail, setManagerEmail] = React.useState("");

  const set = (key: keyof typeof draft) => (v: string) => setDraft((d) => ({ ...d, [key]: v }));

  /** Run an action, surface the outcome and refresh server data in place. */
  const run = async (key: string, fn: () => Promise<string>) => {
    setLoading(key);
    try {
      toast.success(await fn());
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  const saveCarrier = () =>
    run("carrier", async () => {
      if (!draft.name.trim()) throw new Error("Carrier name is required");
      await updateCarrierAction({ patch: draft });
      return "Carrier details saved";
    });

  const applyDefaults = () =>
    run("defaults", async () => {
      if (!defaults.timezone && !defaults.cycle) {
        throw new Error("Pick a timezone or cycle to apply");
      }
      const { updated } = await applyFleetDefaultsAction({
        timezone: defaults.timezone || undefined,
        cycle: (defaults.cycle || undefined) as "70/8" | "60/7" | undefined,
      });
      return `Applied to ${updated} driver${updated === 1 ? "" : "s"}`;
    });

  const addManager = () =>
    run("add-manager", async () => {
      await addManagerAction({ email: managerEmail });
      setManagerEmail("");
      return "Manager added to carrier";
    });

  const removeManager = (userId: string, name: string) =>
    run(`remove-${userId}`, async () => {
      await removeManagerAction({ userId });
      return `${name} removed from carrier`;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet Management"
        title="Carrier Settings"
        description="Company details that appear on every log, fleet-wide operating defaults, and who can manage this carrier."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Carrier Details
            </CardTitle>
            <CardDescription>
              Used as the default main office and home terminal on new driver logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Carrier name" value={draft.name} onChange={set("name")} />
            <Field
              label="DOT number"
              value={draft.dotNumber}
              onChange={set("dotNumber")}
              placeholder="1234567"
            />
            <div className="sm:col-span-2">
              <Field
                label="Main office address"
                value={draft.mainOffice}
                onChange={set("mainOffice")}
                placeholder="123 Commerce Ave, Atlanta, GA"
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Home terminal address"
                value={draft.homeTerminal}
                onChange={set("homeTerminal")}
                placeholder="456 Logistics Blvd, Dallas, TX"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={saveCarrier} disabled={loading === "carrier"}>
                {loading === "carrier" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save carrier
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Fleet Defaults
            </CardTitle>
            <CardDescription>
              Push a standard timezone and HOS cycle onto all {driverCount} driver
              {driverCount === 1 ? "" : "s"} in this carrier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select
                value={defaults.timezone}
                onValueChange={(v) => setDefaults((d) => ({ ...d, timezone: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Leave unchanged" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cycle</Label>
              <Select
                value={defaults.cycle}
                onValueChange={(v) => setDefaults((d) => ({ ...d, cycle: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Leave unchanged" />
                </SelectTrigger>
                <SelectContent>
                  {CYCLE_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              This overwrites the chosen field on every driver — individual drivers can be adjusted
              afterwards from Manage Drivers.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={applyDefaults}
              disabled={loading === "defaults" || driverCount === 0}
            >
              {loading === "defaults" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              Apply to all drivers
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Fleet Managers ({managers.length})
          </CardTitle>
          <CardDescription>
            Anyone listed here has full access to this carrier&apos;s drivers and logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="manager@example.com"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && managerEmail && addManager()}
            />
            <Button onClick={addManager} disabled={!managerEmail || loading === "add-manager"}>
              {loading === "add-manager" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Add manager
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The account must already exist as a fleet manager and not belong to another carrier.
          </p>

          <div className="space-y-2">
            {managers.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9 text-sm">
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    {/* Badge renders a <div>, so this row cannot be a <p>. */}
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{m.name}</span>
                      {m.id === currentUserId && (
                        <Badge variant="secondary" className="text-[0.6rem]">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${m.name}`}
                  disabled={m.id === currentUserId || loading === `remove-${m.id}`}
                  onClick={() => removeManager(m.id, m.name)}
                >
                  {loading === `remove-${m.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
