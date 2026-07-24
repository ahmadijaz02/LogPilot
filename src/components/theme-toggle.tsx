"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative overflow-hidden text-muted-foreground hover:text-foreground"
    >
      {mounted && (
        <>
          <Sun
            className={`h-[1.1rem] w-[1.1rem] transition-all duration-300 ${isDark ? "rotate-90 scale-0" : "rotate-0 scale-100"}`}
          />
          <Moon
            className={`absolute h-[1.1rem] w-[1.1rem] transition-all duration-300 ${isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0"}`}
          />
        </>
      )}
    </Button>
  );
}
