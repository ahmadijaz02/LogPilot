"use client";

import * as React from "react";
import { toast } from "sonner";
import { UserRound, IdCard, Building2, Truck, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLogStore } from "@/stores/log-store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "./signature-pad";
import { ROLE_LABELS } from "@/config/nav";
import { initials } from "@/lib/utils";

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function ProfileView() {
  const profile = useLogStore((s) => s.profile);
  const updateProfile = useLogStore((s) => s.updateProfile);
  const { data: session } = useSession();
  const email = session?.user?.email ?? "";
  const role = session?.user?.role ?? "DRIVER";
  const [draft, setDraft] = React.useState(profile);

  // Keep the editable draft in sync once the store hydrates from the server.
  React.useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const set = (key: keyof typeof draft) => (v: string) => setDraft((d) => ({ ...d, [key]: v }));

  const save = () => {
    updateProfile(draft);
    toast.success("Profile saved", { description: "Your driver details are up to date." });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Driver Profile"
        description="The identity and equipment details that appear on every daily log."
        actions={
          <Button variant="premium" size="sm" onClick={save}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Identity card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6 text-center">
            <Avatar className="h-20 w-20 text-xl">
              <AvatarFallback>{initials(draft.driverName)}</AvatarFallback>
            </Avatar>
            <p className="mt-4 text-lg font-semibold">{draft.driverName}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
            <Badge variant="secondary" className="mt-2">{ROLE_LABELS[role]}</Badge>
            <div className="mt-6 w-full space-y-3 border-t border-border pt-5 text-left">
              {[
                [IdCard, "License", `${draft.licenseNumber} (${draft.licenseState})`],
                [Building2, "Carrier", draft.carrierName],
                [Truck, "Truck / Trailer", `${draft.truckNumber} / ${draft.trailerNumber}`],
                [UserRound, "Cycle", draft.cycle],
              ].map(([Icon, label, value], i) => {
                const IconC = Icon as React.ComponentType<{ className?: string }>;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                      <IconC className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{label as string}</p>
                      <p className="truncate text-sm font-medium">{value as string}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Details form */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal & Carrier Details</CardTitle>
              <CardDescription>These fields auto-fill new daily logs.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Driver Name" value={draft.driverName} onChange={set("driverName")} />
              <Field label="Co-Driver" value={draft.coDriverName} onChange={set("coDriverName")} placeholder="None" />
              <Field label="License Number" value={draft.licenseNumber} onChange={set("licenseNumber")} />
              <Field label="License State" value={draft.licenseState} onChange={set("licenseState")} />
              <Field label="Carrier" value={draft.carrierName} onChange={set("carrierName")} />
              <Field label="Timezone" value={draft.timezone} onChange={set("timezone")} />
              <Field label="Truck / Tractor #" value={draft.truckNumber} onChange={set("truckNumber")} />
              <Field label="Trailer #" value={draft.trailerNumber} onChange={set("trailerNumber")} />
              <div className="sm:col-span-2">
                <Field label="Home Terminal Address" value={draft.homeTerminalAddress} onChange={set("homeTerminalAddress")} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Main Office Address" value={draft.mainOfficeAddress} onChange={set("mainOfficeAddress")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signature</CardTitle>
              <CardDescription>Draw your signature to certify logs.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignaturePad />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
