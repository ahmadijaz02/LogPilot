import Link from "next/link";
import {
  ArrowRight,
  Activity,
  ShieldCheck,
  Printer,
  Gauge,
  Truck,
  BarChart3,
} from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    icon: Activity,
    title: "Interactive timeline",
    body: "Paint, drag, resize and split your duty status. Every edit recalculates Hours of Service the instant you release.",
  },
  {
    icon: ShieldCheck,
    title: "Live FMCSA validation",
    body: "The 11-hour, 14-hour, 30-minute and 60/70-hour rules checked continuously — each flagged with a plain-language remedy.",
  },
  {
    icon: Printer,
    title: "Pixel-perfect logs",
    body: "One click renders the official Record of Duty Status graph, print and PDF ready, faithful to the paper form.",
  },
  {
    icon: Gauge,
    title: "Compliance score",
    body: "A single number that tells you — and your fleet manager — exactly how healthy your hours are today.",
  },
  {
    icon: BarChart3,
    title: "Trends & analytics",
    body: "Weekly driving, the rolling 70-hour cycle, rest time and miles, rendered with restraint and clarity.",
  },
  {
    icon: Truck,
    title: "Fleet oversight",
    body: "Managers see every driver, every violation and every certification in one composed dashboard.",
  },
];

const STATS = [
  { value: "8", label: "HOS rules enforced" },
  { value: "24h", label: "Grid, to the minute" },
  { value: "100%", label: "Paper-log fidelity" },
  { value: "0", label: "Silent violations" },
];

/** A day's duty status, as it appears on the log grid. */
const DUTY_BANDS = [
  { label: "Off Duty", pct: 29, className: "bg-duty-off" },
  { label: "Sleeper", pct: 17, className: "bg-duty-sleeper" },
  { label: "Driving", pct: 38, className: "bg-duty-driving" },
  { label: "On Duty", pct: 16, className: "bg-duty-onduty" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background bg-mesh">
      {/* ——— Nav ——— */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="hidden items-center gap-9 text-[0.8125rem] tracking-[0.06em] text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#craft">
              The craft
            </a>
            <a className="transition-colors hover:text-foreground" href="#capabilities">
              Capabilities
            </a>
            <Link className="transition-colors hover:text-foreground" href="/log">
              The log
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="premium" size="sm" asChild>
              <Link href="/dashboard">
                Enter <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ——— Hero ——— */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-aurora" />
        <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,black,transparent)]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[50rem] -translate-x-1/2 animate-drift rounded-full bg-primary/[0.12] blur-[130px]" />
        <div className="pointer-events-none absolute -top-20 right-0 h-96 w-96 rounded-full bg-duty-sleeper/[0.12] blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 vignette" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-24 text-center md:pt-36">
          <p className="eyebrow animate-rise">
            FMCSA Hours of Service · 49 CFR Part 395
          </p>

          <h1 className="animate-rise mx-auto mt-7 max-w-4xl text-balance font-display text-[2.75rem] leading-[1.05] md:text-7xl md:leading-[1.03]">
            The driver&apos;s daily log,
            <br className="hidden sm:block" />{" "}
            <em className="text-foil not-italic">exquisitely</em> reimagined.
          </h1>

          <p className="animate-rise mx-auto mt-7 max-w-xl text-balance text-[1.0625rem] leading-relaxed text-muted-foreground">
            An interactive timeline, continuous Hours of Service validation and a
            printable Record of Duty Status — composed with the precision the
            regulation demands and the calm it never had.
          </p>

          <div className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button variant="premium" size="xl" asChild>
              <Link href="/dashboard">
                Enter the platform <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="luxe" size="xl" asChild>
              <Link href="/log">View a daily log</Link>
            </Button>
          </div>

          {/* Signature panel — a day, at a glance */}
          <div className="animate-rise surface-lux mx-auto mt-20 max-w-4xl overflow-hidden p-1.5 text-left">
            <div className="rounded-xl border border-border/50 bg-background/60 p-7 md:p-9">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Record of Duty Status</p>
                  <p className="mt-2 font-display text-2xl">Tuesday, 24 hours</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Compliant
                </span>
              </div>

              {/* Duty-status band */}
              <div className="mt-7 flex h-3 overflow-hidden rounded-full">
                {DUTY_BANDS.map((b) => (
                  <div
                    key={b.label}
                    className={b.className}
                    style={{ width: `${b.pct}%` }}
                    title={`${b.label} — ${b.pct}% of day`}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {DUTY_BANDS.map((b) => (
                  <span
                    key={b.label}
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className={`h-2 w-2 rounded-full ${b.className}`} />
                    {b.label}
                  </span>
                ))}
              </div>

              <div className="my-7 rule-fade" />

              <div className="grid grid-cols-3 gap-6">
                {[
                  { k: "Drive remaining", v: "3:45" },
                  { k: "Compliance", v: "98" },
                  { k: "70-hour cycle", v: "22:10" },
                ].map((c) => (
                  <div key={c.k}>
                    <div className="tabular font-display text-2xl md:text-3xl">
                      {c.v}
                    </div>
                    <div className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground">
                      {c.k}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ——— Stats ——— */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="rule-fade" />
        <div className="grid grid-cols-2 gap-y-10 py-14 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="tabular font-display text-4xl md:text-5xl">
                {s.value}
              </div>
              <div className="mt-2.5 text-[0.6875rem] uppercase tracking-[0.18em] text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div className="rule-fade" />
      </section>

      {/* ——— Craft / pull quote ——— */}
      <section id="craft" className="mx-auto max-w-4xl px-6 py-24 text-center md:py-32">
        <p className="eyebrow">The craft</p>
        <blockquote className="mt-8 text-balance font-display text-3xl leading-[1.3] md:text-[2.75rem] md:leading-[1.25]">
          &ldquo;A log sheet is a legal document. It deserves to be treated like
          one — and to look like{" "}
          <span className="text-foil">something worth signing.</span>&rdquo;
        </blockquote>
        <div className="mx-auto mt-10 h-px w-16 bg-primary/50" />
      </section>

      {/* ——— Capabilities ——— */}
      <section id="capabilities" className="relative mx-auto max-w-6xl px-6 pb-28">
        <div className="pointer-events-none absolute left-1/2 top-1/4 h-[30rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/[0.05] blur-[120px]" />
        <div className="relative max-w-2xl">
          <p className="eyebrow">Capabilities</p>
          <h2 className="mt-5 text-balance font-display text-4xl leading-tight md:text-5xl">
            Everything a compliant driver needs
          </h2>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-muted-foreground">
            Built to the letter of the regulation, finished to feel effortless.
          </p>
        </div>

        <div className="relative mt-16 grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group relative bg-card p-8 transition-colors duration-300 hover:bg-accent/30"
            >
              <span className="tabular absolute right-7 top-7 font-display text-sm text-muted-foreground/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <f.icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:-translate-y-0.5" />
              <h3 className="mt-6 font-display text-xl">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ——— Closing ——— */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="bg-grain relative overflow-hidden rounded-3xl bg-[hsl(224_32%_7%)] px-8 py-20 text-center md:px-16 md:py-28">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35]" />
          <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 animate-drift rounded-full bg-duty-sleeper/30 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-primary/30 blur-[100px]" />

          <p className="relative text-[0.6875rem] uppercase tracking-[0.22em] text-white/45">
            Ready when you are
          </p>
          <h2 className="relative mx-auto mt-7 max-w-2xl text-balance font-display text-4xl leading-tight text-white md:text-6xl">
            Stop fighting the{" "}
            <span className="bg-gradient-to-r from-[hsl(231_80%_78%)] via-[hsl(262_70%_80%)] to-[hsl(231_80%_78%)] bg-clip-text text-transparent">
              paper log.
            </span>
          </h2>
          <p className="relative mx-auto mt-6 max-w-md text-white/60">
            Every rule enforced. Every hour accounted for. Every log ready to
            print.
          </p>

          <div className="relative mt-10 flex justify-center">
            <Button variant="premium" size="xl" asChild>
              <Link href="/dashboard">
                Open the dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="relative mx-auto mt-14 flex max-w-lg flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[0.6875rem] uppercase tracking-[0.18em] text-white/40">
            {["No paper", "No math", "No surprises"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ——— Footer ——— */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-12 sm:flex-row">
          <Logo />
          <p className="text-center text-xs tracking-[0.06em] text-muted-foreground sm:text-right">
            © {new Date().getFullYear()} LogPilot — a compliance-first Hours of
            Service platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
