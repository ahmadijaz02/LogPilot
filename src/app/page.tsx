import Link from "next/link";
import {
  ArrowRight,
  Activity,
  ShieldCheck,
  Printer,
  Gauge,
  Clock,
  Truck,
  BarChart3,
  Sparkles,
  Check,
} from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  { icon: Activity, title: "Interactive timeline", body: "Paint, drag, resize and split your duty status. Every edit recalculates Hours of Service instantly." },
  { icon: ShieldCheck, title: "Live FMCSA validation", body: "The 11-hour, 14-hour, 30-minute, and 60/70-hour rules checked in real time — with plain-language fixes." },
  { icon: Printer, title: "Pixel-perfect logs", body: "One click renders the official Record of Duty Status graph, print and PDF ready, exactly like the paper form." },
  { icon: Gauge, title: "Compliance score", body: "A single number that tells you — and your fleet manager — exactly how healthy your hours are." },
  { icon: BarChart3, title: "Trends & analytics", body: "Weekly driving, rolling 70-hour cycle, rest time and miles, visualized beautifully." },
  { icon: Truck, title: "Fleet oversight", body: "Managers see every driver, every violation, and every certification in one calm dashboard." },
];

const STATS = [
  { value: "8", label: "HOS rules enforced" },
  { value: "24h", label: "grid, to the minute" },
  { value: "100%", label: "paper-log fidelity" },
  { value: "0", label: "silent violations" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background bg-mesh">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="premium" size="sm" asChild>
              <Link href="/dashboard">
                Open app <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-20 text-center md:pt-28">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-subtle">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          FMCSA Hours of Service · 49 CFR Part 395
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
          The paper driver log,{" "}
          <span className="bg-gradient-to-r from-primary to-duty-sleeper bg-clip-text text-transparent">
            reimagined.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground">
          LogPilot turns the Driver&apos;s Daily Log into a live, beautiful, compliance-first
          workspace — with an interactive timeline and instant Hours of Service validation.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button variant="premium" size="lg" asChild>
            <Link href="/dashboard">
              Launch LogPilot <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/log">See the daily log</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="tabular text-3xl font-semibold tracking-tight">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Preview band */}
      <section className="mx-auto max-w-6xl px-5">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-elevated md:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Clock, k: "Drive left", v: "3h 45m", tone: "text-primary" },
              { icon: ShieldCheck, k: "Compliance", v: "98 / 100", tone: "text-success" },
              { icon: Gauge, k: "70h cycle", v: "22h 10m", tone: "text-duty-sleeper" },
            ].map((c) => (
              <div key={c.k} className="rounded-2xl border border-border/70 bg-background/60 p-5">
                <c.icon className={`mb-3 h-5 w-5 ${c.tone}`} />
                <div className="tabular text-2xl font-semibold">{c.v}</div>
                <div className="text-xs text-muted-foreground">{c.k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Everything a compliant driver needs
          </h2>
          <p className="mt-3 text-muted-foreground">
            Built to the letter of the regulation, designed to feel effortless.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border/70 bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/90 to-primary p-10 text-center text-primary-foreground md:p-16">
          <div className="pointer-events-none absolute inset-0 bg-mesh opacity-30" />
          <h2 className="relative text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Stop fighting the paper log.
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-primary-foreground/80">
            Every rule enforced. Every hour accounted for. Every log ready to print.
          </p>
          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/dashboard">
                Open the dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/80">
            {["No paper", "No math", "No surprises"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} LogPilot. A compliance-first HOS platform.</p>
        </div>
      </footer>
    </div>
  );
}
