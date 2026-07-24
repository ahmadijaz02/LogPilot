"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  CornerDownLeft,
  Sun,
  Moon,
  Plus,
  FileDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ALL_NAV_ITEMS } from "@/config/nav";
import { useLogStore } from "@/stores/log-store";
import { cn } from "@/lib/utils";

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const rawLogs = useLogStore((s) => s.logs);
  const logs = React.useMemo(
    () => [...rawLogs].sort((a, b) => b.header.date.localeCompare(a.header.date)),
    [rawLogs],
  );
  const createLog = useLogStore((s) => s.createLog);

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0 gap-0">
        <Command
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
          loop
        >
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Search pages, logs, actions…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground sm:inline">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[360px] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation">
              {ALL_NAV_ITEMS.map((item) => (
                <Item
                  key={item.href}
                  onSelect={() => run(() => router.push(item.href))}
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.title}
                </Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions">
              <Item
                onSelect={() =>
                  run(async () => {
                    const id = await createLog(new Date().toISOString().slice(0, 10));
                    router.push(`/log?id=${id}`);
                  })
                }
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                Create new daily log
              </Item>
              <Item onSelect={() => run(() => router.push("/reports"))}>
                <FileDown className="h-4 w-4 text-muted-foreground" />
                Export / print log
              </Item>
              <Item
                onSelect={() =>
                  run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
                }
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                )}
                Toggle {resolvedTheme === "dark" ? "light" : "dark"} mode
              </Item>
            </Command.Group>

            <Command.Group heading="Recent Logs">
              {logs.slice(0, 6).map((log) => (
                <Item
                  key={log.id}
                  value={`log ${log.header.date} ${log.header.shippingNumber}`}
                  onSelect={() => run(() => router.push(`/log?id=${log.id}`))}
                >
                  <span className="tabular text-muted-foreground">
                    {log.header.date}
                  </span>
                  <span className="text-muted-foreground/60">·</span>
                  {log.header.commodity ?? "Daily log"}
                </Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Item({
  children,
  onSelect,
  value,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
        "data-[selected=true]:bg-secondary aria-selected:bg-secondary",
      )}
    >
      {children}
      <CornerDownLeft className="ml-auto hidden h-3.5 w-3.5 text-muted-foreground data-[selected=true]:block" />
    </Command.Item>
  );
}
