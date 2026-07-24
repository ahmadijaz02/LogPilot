"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-destructive/10 blur-2xl" />
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card shadow-soft">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        An unexpected error occurred while loading this view. You can retry, or head back to
        your dashboard.
      </p>
      <div className="mt-6 flex items-center gap-2">
        <Button variant="premium" onClick={reset}>
          <RotateCcw className="h-4 w-4" /> Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
