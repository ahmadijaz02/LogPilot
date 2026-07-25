import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";
import { AppData } from "@/components/app-data";
import { getDriverLogs } from "@/lib/data/logs";
import { getDriverProfile } from "@/lib/data/driver";
import { toInitials, type ShellUser } from "@/lib/shell-user";

async function DriverDataProvider({
  driverId,
  children,
}: {
  driverId: string;
  children: React.ReactNode;
}) {
  const [logs, profile] = await Promise.all([
    getDriverLogs(driverId),
    getDriverProfile(driverId),
  ]);
  return <AppData logs={logs} profile={profile}>{children}</AppData>;
}

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const shellUser: ShellUser = {
    name: user.name ?? "User",
    email: user.email ?? "",
    role: user.role,
    initials: toInitials(user.name ?? "U"),
  };

  return (
    <AppShell user={shellUser}>
      {user.role === "DRIVER" && user.driverId ? (
        <Suspense fallback={null}>
          <DriverDataProvider driverId={user.driverId}>
            {children}
          </DriverDataProvider>
        </Suspense>
      ) : (
        children
      )}
    </AppShell>
  );
}
