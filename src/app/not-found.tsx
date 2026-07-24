import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shell/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background bg-mesh px-6 text-center">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="relative mb-6">
        <div className="absolute inset-0 -z-10 rounded-3xl bg-primary/10 blur-2xl" />
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card shadow-soft">
          <Compass className="h-7 w-7 text-primary" />
        </div>
      </div>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">404</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Off the route</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you
        back on the road.
      </p>
      <Button variant="premium" className="mt-6" asChild>
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </Button>
    </div>
  );
}
