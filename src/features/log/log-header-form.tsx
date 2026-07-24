"use client";

import * as React from "react";
import type { DailyLog } from "@/lib/fmcsa/types";
import { useLogStore } from "@/stores/log-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type HeaderKey = keyof DailyLog["header"];

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </div>
  );
}

export function LogHeaderForm({ log }: { log: DailyLog }) {
  const updateHeader = useLogStore((s) => s.updateHeader);
  const set = (key: HeaderKey) => (v: string) =>
    updateHeader(log.id, {
      [key]: key === "totalMiles" ? Number(v) || 0 : v,
    } as Partial<DailyLog["header"]>);

  const h = log.header;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4">
      <Field label="Date" value={h.date} onChange={set("date")} type="date" />
      <Field label="Total Miles" value={h.totalMiles} onChange={set("totalMiles")} type="number" placeholder="0" />
      <Field label="Truck / Tractor #" value={h.truckNumber} onChange={set("truckNumber")} placeholder="TR-0000" />
      <Field label="Trailer #" value={h.trailerNumber} onChange={set("trailerNumber")} placeholder="TL-0000" />

      <Field label="Driver" value={h.driverName} onChange={set("driverName")} className="col-span-2" />
      <Field label="Co-Driver" value={h.coDriverName} onChange={set("coDriverName")} placeholder="None" className="col-span-2" />

      <Field label="Carrier" value={h.carrierName} onChange={set("carrierName")} className="col-span-2 md:col-span-2" />
      <Field label="Shipping / BOL #" value={h.shippingNumber} onChange={set("shippingNumber")} placeholder="BOL-00000" />
      <Field label="Commodity" value={h.commodity} onChange={set("commodity")} placeholder="Description" />

      <Field label="Home Terminal" value={h.homeTerminalAddress} onChange={set("homeTerminalAddress")} className="col-span-2" />
      <Field label="Main Office" value={h.mainOfficeAddress} onChange={set("mainOfficeAddress")} className="col-span-2" />
    </div>
  );
}
