import * as React from "react";
import { LogWorkspace } from "@/features/log/log-workspace";

export const metadata = { title: "Daily Log" };

export default function LogPage() {
  return (
    <React.Suspense>
      <LogWorkspace />
    </React.Suspense>
  );
}
