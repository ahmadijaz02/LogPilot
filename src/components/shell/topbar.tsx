"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search, Menu, LogOut, UserRound, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandMenu } from "./command-menu";
import { NotificationsMenu } from "./notifications-menu";
import { ROLE_LABELS } from "@/config/nav";
import type { ShellUser } from "@/lib/shell-user";

export function Topbar({
  user,
  onOpenMobileNav,
}: {
  user: ShellUser;
  onOpenMobileNav: () => void;
}) {
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const router = useRouter();
  const isDriver = user.role === "DRIVER";

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 glass px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <button
        onClick={() => setCmdOpen(true)}
        className="group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-border/80 bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-background"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search anything…</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground sm:flex">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Badge variant="secondary" className="hidden md:inline-flex">
          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-primary" />
          {ROLE_LABELS[user.role]}
        </Badge>
        <ThemeToggle />
        {isDriver && <NotificationsMenu />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-full outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50">
              <Avatar className="h-8 w-8 border border-border/60">
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            {isDriver && (
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <UserRound /> Driver profile
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings /> Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} />
    </header>
  );
}
