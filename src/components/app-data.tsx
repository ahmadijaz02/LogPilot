"use client";

import * as React from "react";
import { useLogStore, type DriverProfile } from "@/stores/log-store";
import type { DailyLog } from "@/lib/fmcsa/types";

/**
 * Hydrates the client log store from server-fetched data for the signed-in
 * driver. Runs once on mount and whenever the server payload changes (e.g.
 * after a router refresh following a mutation).
 */
export function AppData({
  logs,
  profile,
  children,
}: {
  logs: DailyLog[];
  profile: DriverProfile;
  children: React.ReactNode;
}) {
  const hydrate = useLogStore((s) => s.hydrate);
  const signature = React.useMemo(
    () => logs.map((l) => `${l.id}:${l.updatedAt}`).join("|"),
    [logs],
  );

  React.useEffect(() => {
    hydrate({ logs, profile });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, hydrate]);

  return <>{children}</>;
}
