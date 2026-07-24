"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/config/nav";
import type { ShellUser } from "@/lib/shell-user";
import { Logo } from "./logo";
import { ComplianceMini } from "./compliance-mini";

export function Sidebar({ user, className }: { user: ShellUser; className?: string }) {
  const pathname = usePathname();
  const role = user.role;

  return (
    <aside
      className={cn(
        "flex h-full w-[260px] flex-col border-r border-border/70 bg-card/40",
        className,
      )}
    >
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 no-scrollbar">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((i) => i.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-0 rounded-lg bg-secondary"
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                          />
                        )}
                        <item.icon
                          className={cn(
                            "relative z-10 h-[1.05rem] w-[1.05rem] transition-colors",
                            active ? "text-primary" : "",
                          )}
                        />
                        <span className="relative z-10">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {role === "DRIVER" && (
        <div className="p-3">
          <ComplianceMini />
        </div>
      )}
    </aside>
  );
}
