# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start all apps (Turbopack)
npm run build            # Build all apps and packages
npm run lint             # ESLint across monorepo
npm run check-types      # TypeScript type checking
npm run format           # Prettier formatting

# Database (run from packages/db)
npm run generate         # Generate Prisma client
npm run db:push          # Push schema without migrations
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed initial data

**IMPORTANT : Never run the migrations, rather create the migrations file and let the user run the migrations on his end after the user has verified the contents of the migrations.**

# Web app tests (run from apps/web)
npm run test

# Data seeding (root)
npm run seed:networth
npm run seed:scheduled-payments
npm run seed:life-events
```

## Architecture

Turborepo monorepo with npm workspaces.

### Apps

- **`apps/web`** — Main Next.js 15 / React 19 application (port 3000). Personal finance dashboard with expense tracking, investments, budgets, goals, AI chat, and more. Uses Next.js App Router with the `app/(dashboard)/` group layout.
- **`apps/webhook`** — Minimal Express.js 5 webhook service.

### Packages

- **`packages/db`** — Prisma 6 + PostgreSQL. 60+ models covering accounts, expenses, investments, debts, budgets, goals, notes, AI chat history, life events, health tracking, and scheduled payments. Import via `@repo/db` or `@repo/db/client`.
- **`packages/store`** — Jotai atoms for global state (balance, currency). Import via `@repo/store`.
- **`packages/ui`** — Shared React component library with Tailwind CSS. Components use the `ui-` class prefix convention.
- **`packages/eslint-config`**, **`packages/tailwind-config`**, **`packages/typescript-config`** — Shared tooling configs.

### Web App Structure

```
apps/web/app/
├── (dashboard)/        # All authenticated routes (layout wraps everything)
│   ├── expenses/
│   ├── investments/
│   ├── budgets/
│   ├── goals/
│   ├── debts/
│   ├── notes/
│   ├── chat/           # AI assistant (Claude API streaming)
│   └── ...
├── actions/            # Next.js Server Actions
├── api/                # API routes
│   ├── auth/           # NextAuth ([...nextauth])
│   ├── chat/stream     # AI chat streaming endpoint
│   ├── cron/           # Scheduled jobs
│   └── ...
├── providers/          # React context providers
└── components/         # Shared UI components
```

### Key Patterns

- **Data fetching**: React Query (`@tanstack/react-query`) for client-side, Server Actions for mutations.
- **State**: Jotai atoms in `packages/store` for cross-component state (selected currency, account balances).
- **Charts**: Recharts for most charts; Chart.js used in a few places.
- **Auth**: NextAuth 4 with credentials provider (phone + password) and Google OAuth. Access is gated by an email whitelist in `apps/web/app/actions/whitelist.ts`.
- **Styling**: Tailwind CSS. The `packages/ui` package must be built (`npm run build`) before the web app can consume it.

## Environment Variables

Required in `apps/web/.env` and `packages/db/.env`:

```
DATABASE_URL            # PostgreSQL connection string
NEXTAUTH_SECRET         # Session encryption key
GOOGLE_CLIENT_ID        # Google OAuth
GOOGLE_CLIENT_SECRET
GMAIL_USER              # Email notifications
GMAIL_APP_PASSWORD
ADMIN_EMAIL
```

## Database

Prisma schema lives in `packages/db/prisma/schema.prisma`. After any schema change:
1. `npm run db:migrate` (or `db:push` for dev without migration history)
2. `npm run generate` to regenerate the Prisma client

Binary targets include `linux-musl` for Docker deployments.

## Deployment

GitHub Actions workflows build a Docker image on push to `main` and deploy to EC2 via SSH. The web Dockerfile is at `apps/web/Dockerfile`.
