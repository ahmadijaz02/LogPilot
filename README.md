<div align="center">

# 🛡️ LogPilot

### The paper FMCSA Driver's Daily Log, reimagined.

A premium, compliance-first **Hours of Service (HOS)** platform that replaces the paper
Driver's Daily Log with a live, beautiful web application — an interactive duty-status
timeline, a pixel-faithful official log graph, and a real-time FMCSA validation engine.

`Next.js 15` · `React 19` · `TypeScript` · `Tailwind CSS` · `Framer Motion` · `Chart.js` · `Prisma`

</div>

---

## ✨ Overview

LogPilot turns the [FMCSA Record of Duty Status](https://www.fmcsa.dot.gov/regulations/hours-service)
into an interactive experience. Every edit to the duty timeline instantly recalculates the
driver's Hours of Service and re-checks all eight core rules of **49 CFR Part 395** — never
silently allowing a violation.

It's built to feel like a commercial SaaS product: lots of whitespace, rounded corners,
subtle gradients, glassmorphism, meaningful motion, dark mode, keyboard shortcuts and a
command palette.

## 🚀 Feature Highlights

### The Daily Log (core feature)
- **Interactive timeline** — drag to *paint* a duty status, drag dividers to *resize*, click
  a block to *split*, change status or *remove* it. Full undo / redo. Every action snaps to
  15-minute increments and recalculates instantly.
- **Official FMCSA graph** — an SVG replica of the paper log's 24-hour, 4-line grid with
  per-status totals, rendered black-on-white and **print / PDF ready**.
- **Live HOS clocks** — radial gauges for the 11-hour, 14-hour, 30-minute and 70-hour limits.
- **Header fields, remarks & totals** — all required log fields, location-anchored remarks,
  and automatic status totals that always tile a full 24 hours.
- **Certification** — electronic sign-off per § 395.8(a) with a signature pad.

### FMCSA HOS Engine (`src/lib/fmcsa/`)
A pure, fully-typed, framework-agnostic engine implementing:

| Rule | Regulation | Implemented |
|------|-----------|:-----------:|
| 11-Hour Driving Limit | § 395.3(a)(3)(i) | ✅ |
| 14-Hour Driving Window | § 395.3(a)(2) | ✅ |
| 30-Minute Break | § 395.3(a)(3)(ii) | ✅ |
| 10-Hour Reset | § 395.3(a)(1) | ✅ |
| 60/70-Hour Cycle | § 395.3(b) | ✅ |
| 34-Hour Restart | § 395.3(c) | ✅ |
| Sleeper-Berth pairing | § 395.1(g) | ✅ |
| Timeline gaps / overlaps | § 395.8(a) | ✅ |

Every detected issue becomes an **explainable violation** with a title, plain-language
explanation, the exact CFR citation, severity, and a concrete "how to fix" suggestion —
surfaced in the **Violation Center**.

### The rest of the product
- **Dashboard** — overview cards (today's hours, driving, remaining drive/window, 70-hour
  cycle, current status, compliance score), weekly summary, violations, recent activity.
- **Weekly View** — every day's mini-graph, rolling 70-hour cycle chart, weekly totals.
- **History** — searchable, filterable, sortable log archive with duplicate / archive / delete.
- **Analytics** — driving trends, hours worked, duty distribution and compliance (Chart.js).
- **Reports** — PDF / print, CSV, JSON and monthly-summary export.
- **Fleet Manager** — driver roster, live status, per-driver compliance and violations.
- **Admin** — users, role-based permissions matrix, audit logs, system settings.
- **Profile & Settings** — driver identity, signature pad, theme, cycle and notifications.
- **Auth** — sign in / up, forgot / reset password, remember me, role switching (Driver /
  Fleet Manager / Admin).

### Craft details
Command palette (`⌘K`), global search, notifications, theme toggle (light / dark / system),
skeleton loading states, beautiful empty & error states, 404, keyboard shortcuts, tooltips,
context menus, micro-interactions everywhere, and full responsive / mobile layouts.

## 🏗️ Architecture

```
src/
├── app/                      # Next.js App Router
│   ├── (app)/                # Authenticated shell (sidebar + topbar)
│   │   ├── dashboard/  log/  weekly/  history/
│   │   ├── analytics/ reports/ fleet/ admin/ profile/ settings/
│   │   ├── layout.tsx  loading.tsx  error.tsx
│   ├── (auth)/               # login / register / forgot / reset
│   ├── api/logs/             # Validated, paginated REST route handler
│   ├── page.tsx              # Marketing landing page
│   └── globals.css           # Design tokens (light + dark)
├── components/
│   ├── ui/                   # shadcn-style primitives (Radix + CVA)
│   ├── shell/                # Sidebar, Topbar, Command menu, Logo
│   ├── charts/               # Chart.js setup + weekly bars
│   └── shared/               # PageHeader, StatCard, EmptyState
├── features/                 # Feature modules (log, dashboard, fleet, …)
├── lib/
│   ├── fmcsa/                # ★ HOS engine: constants, calculations, validation
│   ├── export.ts             # CSV / JSON download helpers
│   └── utils.ts
├── hooks/  stores/  config/  # useHos, Zustand stores, nav config
prisma/                       # Prisma schema + seed (production data layer)
server/                       # Prisma client + NextAuth options (production)
```

**Design system** — Three-tier tokens (HSL CSS variables → Tailwind theme → components),
semantic duty-status colors, custom shadows/radii, tabular numerics, glassmorphism utilities.

**State** — The live demo persists to a typed **Zustand** store (localStorage) so the timeline,
graph and validation work instantly with zero setup. The production data layer (Prisma +
PostgreSQL) and auth (NextAuth credentials + RBAC) are fully specified in `prisma/` and
`server/` — see *Enabling the database* below.

## 🧑‍💻 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # sensible SQLite defaults already provided

# 3. Run the dev server
npm run dev                 # → http://localhost:3000
```

The app ships with a realistic week of demo logs for driver **Marcus Bennett**. On the login
screen, any email + password (6+ chars) signs you in (demo mode).

### Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` / `db:seed` / `db:studio` | Prisma (see below) |

## 🗄️ Enabling the Database (production path)

The demo runs entirely client-side. To switch to the real Prisma + NextAuth backend:

1. Set `DATABASE_URL` in `.env` (SQLite works out of the box; for production point it at a
   **Neon / Railway PostgreSQL** URL and set `provider = "postgresql"` in `prisma/schema.prisma`).
2. Move `server/prisma.ts` → `src/lib/prisma.ts` and `server/auth.ts` → `src/lib/auth.ts`,
   add the NextAuth route handler (snippet included in `server/auth.ts`).
3. Generate & migrate:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed        # demo accounts, password: logpilot
   ```

The Prisma schema models Users, Accounts/Sessions (NextAuth), Carriers, Drivers, Vehicles,
DailyLogs, DutyEntries, Remarks, ShippingDocs, Violations, Notifications and AuditLogs.

## 🔒 Security & Quality
- Strict TypeScript (`strict` + `noUncheckedIndexedAccess`), zero `any` in domain code.
- Zod validation on every form (React Hook Form) and the REST API (params + typed errors).
- Passwords hashed with bcrypt; NextAuth JWT sessions with role-aware callbacks (RBAC).
- Next.js pinned to a CVE-patched release; no `poweredBy` header; secrets via env vars.
- SOLID, reusable components — cards, tables, charts, forms and the HOS engine are all
  decoupled and independently testable.

## 🚢 Deployment
Deploy the app to **Vercel** and the database to **Neon** or **Railway**. Set `DATABASE_URL`,
`NEXTAUTH_SECRET` and `NEXTAUTH_URL` in the project's environment variables.

## 📋 REST API

```http
GET /api/logs?page=1&pageSize=10&sort=driving&order=desc&status=certified&q=denver
```
Returns paginated, filtered, sorted logs with per-log totals, compliance score and violation
count. Validates every parameter with Zod and returns typed `400` / `500` errors.

---

<div align="center">
<sub>Built to the letter of 49 CFR Part 395 — designed to feel effortless.</sub>
</div>
