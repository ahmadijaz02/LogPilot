import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";
import { AppData } from "@/components/app-data";
import { getDriverLogs } from "@/lib/data/logs";
import { getDriverProfile } from "@/lib/data/driver";
import { toInitials, type ShellUser } from "@/lib/shell-user";

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

  if (user.role === "DRIVER" && user.driverId) {
    const [logs, profile] = await Promise.all([
      getDriverLogs(user.driverId),
      getDriverProfile(user.driverId),
    ]);
    return (
      <AppShell user={shellUser}>
        <AppData logs={logs} profile={profile}>
          {children}
        </AppData>
      </AppShell>
    );
  }

  return <AppShell user={shellUser}>{children}</AppShell>;
}
