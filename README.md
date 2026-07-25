<div align="center">

# LogPilot

Digital FMCSA Driver Daily Log

A clean, fast web app for drivers and fleet managers to track Hours of Service compliance.

**[Live Demo](https://logpilot-teal.vercel.app/)** · `Next.js 15` · `React 19` · `Tailwind CSS` · `PostgreSQL`

</div>

---

## What it does

LogPilot replaces the paper driver daily log with a web interface. Drivers can view their daily logs, create new ones, and track their hours. Fleet managers get a dashboard to monitor their drivers' compliance and hours across the fleet.

The app calculates Hours of Service (HOS) in real time and checks for violations against federal regulations. It's built on Next.js with PostgreSQL and NextAuth for credentials-based sign in.

## Features for Drivers

- **Daily Log** — see a day's activities laid out in a timeline. Track your hours across different duty statuses (off duty, sleeper berth, driving, on duty not driving).
- **Dashboard** — quick overview of today's hours, violations, and compliance status.
- **Weekly View** — see your entire week at a glance with rolling 70-hour cycle tracking.
- **History** — browse your past logs, with search and filtering.
- **Analytics** — charts showing driving trends, hours worked, and compliance over time.
- **Reports** — export your logs as PDF or CSV.
- **Profile & Settings** — manage your driver info, license number, timezone, and cycle preference.

## Features for Fleet Managers

- **Driver Roster** — see all your drivers in one place. Quick view of who's active, idle, or in violation.
- **Driver Details** — drill into a specific driver to see their logs, hours, and compliance history.
- **Logs** — review any driver's logs with the same detail a driver sees.
- **Fleet Analytics** — company-wide compliance and hours trends (Chart.js charts).
- **Fleet Reports** — export all driver logs and data.
- **Carrier Settings** — manage your fleet's configuration and driver roster.

## Tech Stack

- **Frontend** — React 19, TypeScript, Tailwind CSS, Shadcn UI (Radix + CVA)
- **Backend** — Next.js 15 App Router, API routes with Zod validation
- **Database** — PostgreSQL, Kysely ORM
- **Auth** — NextAuth credentials provider with role-based access control
- **State** — Zustand (client-side), server components for data fetching
- **UI Extras** — Framer Motion (animations), Chart.js (charts), Sonner (toasts)

## Project structure

```
src/
├── app/                    # Next.js routes
│   ├── (app)/              # Authenticated pages (drivers & managers)
│   │   ├── dashboard/      # Driver dashboard
│   │   ├── log/            # Daily log view
│   │   ├── weekly/         # Weekly summary
│   │   ├── history/        # Past logs archive
│   │   ├── analytics/      # Charts and trends
│   │   ├── reports/        # Export & download
│   │   ├── profile/        # Driver profile
│   │   ├── settings/       # Preferences
│   │   ├── fleet/          # Fleet manager dashboard
│   │   └── layout.tsx      # App shell (sidebar + topbar)
│   ├── (auth)/             # Login, register, password reset
│   ├── api/                # API routes for data fetching
│   └── page.tsx            # Landing page
├── components/
│   ├── ui/                 # Radix + Tailwind components (button, card, etc)
│   ├── shell/              # Sidebar, topbar, command menu
│   └── features/           # Domain-specific components
├── lib/
│   ├── db.ts               # Kysely database setup
│   ├── auth.ts             # NextAuth configuration
│   ├── session.ts          # Session helpers
│   └── data/               # Data fetching (drivers, logs, etc)
├── stores/                 # Zustand (client state)
├── hooks/                  # Custom React hooks
└── config/                 # Constants and config
```

Uses PostgreSQL for data, Kysely for queries, and NextAuth for auth. Client state lives in Zustand stores, server fetches via Server Components.

## Getting started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run the dev server
npm run dev
```

Open `http://localhost:3000` and log in with demo credentials from the login page.

### Database setup

You'll need a PostgreSQL database. Create a `.env` file with:

```
DATABASE_URL="postgresql://user:password@localhost:5432/logpilot"
NEXTAUTH_SECRET="your-secret-key-here"
```

Then set up the database:

```bash
npx kysely migrate latest
npm run db:seed  # creates demo accounts (password: logpilot)
```

Demo accounts:
- `driver@ridgeline.co` (driver)
- `manager@ridgeline.co` (fleet manager)

### Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run start        # Serve prod build
npm run typecheck    # TypeScript check
```

## Development notes

- **TypeScript** — strict mode, no `any` in the app
- **Validation** — Zod on forms (React Hook Form) and API routes
- **Auth** — NextAuth with credentials provider, JWT sessions, role-based middleware
- **Styling** — Tailwind CSS with custom design tokens for duty statuses
- **State** — Zustand for client state (logs, active log, profile), Server Components for server state
- **Database** — Kysely ORM with PostgreSQL
- **Errors** — custom error handling and 404 pages throughout

## Deployment

Deployed on Vercel with PostgreSQL on Neon or Railway. Set these env vars:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — random secret for JWT signing
- `NEXTAUTH_URL` — your domain (https://yourdomain.com)

## Contributing

The main areas are:

- Driver pages live in `src/app/(app)/dashboard/`, `src/app/(app)/log/`, etc
- Fleet manager pages are under `src/app/(app)/fleet/`
- Data queries are in `src/lib/data/`
- Components are in `src/components/`
- Styling tokens are in `src/app/globals.css`
