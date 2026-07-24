"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Button } from "@/components/ui/button";
import type { ShellUser } from "@/lib/shell-user";

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const [mobileNav, setMobileNav] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background bg-mesh">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar user={user} />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNav && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNav(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="relative h-full bg-card">
                <div className="absolute right-3 top-4">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMobileNav(false)}
                    aria-label="Close navigation"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div onClick={() => setMobileNav(false)}>
                  <Sidebar user={user} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onOpenMobileNav={() => setMobileNav(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
