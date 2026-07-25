"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CYCLE_OPTIONS, TIMEZONE_OPTIONS } from "@/config/fleet";
import { updateDriverAction } from "@/actions/fleet";

/** The editable slice of a driver, as the manager sees it. */
export interface EditableDriver {
  id: string;
  name: string;
  email: string;
  licenseNumber: string;
  licenseState: string;
  truckNumber: string | null;
  trailerNumber: string | null;
  homeTerminal: string | null;
  mainOffice: string | null;
  timezone: string;
  cycle: string;
}

function toDraft(d: EditableDriver) {
  return {
    name: d.name,
    licenseNumber: d.licenseNumber,
    licenseState: d.licenseState,
    truckNumber: d.truckNumber ?? "",
    trailerNumber: d.trailerNumber ?? "",
    homeTerminal: d.homeTerminal ?? "",
    mainOffice: d.mainOffice ?? "",
    timezone: d.timezone,
    cycle: d.cycle,
  };
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

/**
 * Manager-side editor for a single driver. Shared by the roster and the driver
 * detail page so both write through the same validated action.
 */
export function DriverEditDialog({
  driver,
  open,
  onOpenChange,
}: {
  driver: EditableDriver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState(() => (driver ? toDraft(driver) : null));
  const [saving, setSaving] = React.useState(false);

  // Re-seed the form whenever a different driver is opened.
  React.useEffect(() => {
    setDraft(driver ? toDraft(driver) : null);
  }, [driver]);

  if (!driver || !draft) return null;

  const set = (key: keyof typeof draft) => (v: string) =>
    setDraft((d) => (d ? { ...d, [key]: v } : d));

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Driver name is required");
      return;
    }
    setSaving(true);
    try {
      await updateDriverAction({
        driverId: driver.id,
        patch: {
          ...draft,
          licenseState: draft.licenseState.toUpperCase().slice(0, 2),
          cycle: draft.cycle as "70/8" | "60/7",
        },
      });
      toast.success("Driver updated", { description: draft.name });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update driver");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit driver</DialogTitle>
          <DialogDescription>
            {driver.email} — these details auto-fill the driver&apos;s new daily logs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Driver name" value={draft.name} onChange={set("name")} />
          </div>
          <Field label="License number" value={draft.licenseNumber} onChange={set("licenseNumber")} />
          <Field
            label="License state"
            value={draft.licenseState}
            onChange={set("licenseState")}
            placeholder="TX"
          />
          <Field
            label="Truck / tractor #"
            value={draft.truckNumber}
            onChange={set("truckNumber")}
            placeholder="TR-001"
          />
          <Field
            label="Trailer #"
            value={draft.trailerNumber}
            onChange={set("trailerNumber")}
            placeholder="TRL-001"
          />

          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select value={draft.timezone} onValueChange={set("timezone")}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
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
            <Select value={draft.cycle} onValueChange={set("cycle")}>
              <SelectTrigger>
                <SelectValue placeholder="Select cycle" />
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

          <div className="sm:col-span-2">
            <Field
              label="Home terminal address"
              value={draft.homeTerminal}
              onChange={set("homeTerminal")}
              placeholder="456 Logistics Blvd, Dallas, TX"
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Main office address"
              value={draft.mainOffice}
              onChange={set("mainOffice")}
              placeholder="123 Commerce Ave, Atlanta, GA"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
