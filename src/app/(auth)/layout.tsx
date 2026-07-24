import Link from "next/link";
import { ShieldCheck, Activity, Gauge } from "lucide-react";
import { Logo } from "@/components/shell/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left — brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-primary to-primary/80 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-mesh opacity-40" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <Link href="/" className="inline-flex text-primary-foreground [&_span]:text-primary-foreground [&_.text-muted-foreground]:text-primary-foreground/70">
            <Logo />
          </Link>
        </div>
        <div className="relative space-y-6 text-primary-foreground">
          <h2 className="max-w-md text-balance text-3xl font-semibold tracking-tight">
            Compliance you can see, in a log you&apos;ll actually enjoy keeping.
          </h2>
          <div className="space-y-4">
            {[
              { icon: Activity, t: "Interactive duty timeline" },
              { icon: ShieldCheck, t: "Real-time FMCSA rule checks" },
              { icon: Gauge, t: "Live 70-hour cycle tracking" },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-primary-foreground/90">{f.t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-primary-foreground/60">
          49 CFR Part 395 · Hours of Service of Drivers
        </div>
      </div>

      {/* Right — form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
