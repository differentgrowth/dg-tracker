# DG Tracker

DG Tracker is Different Growth's internal SEO rank tracking application for managing client properties, monitoring Google visibility, and reporting keyword performance over time.

## Purpose

Different Growth needs a reliable internal source of truth for client SEO performance. DG Tracker will help the agency:

- Manage multiple SEO clients and owned web properties in one workspace.
- Pull trusted first-party ranking and query data from Google Search Console (GSC).
- Track selected keywords, landing pages, average positions, impressions, clicks, and CTR over time.
- Store historical ranking snapshots so the team can explain movement, spot opportunities, and prove progress.
- Build client-ready dashboards and recurring reports without manually assembling spreadsheets.

This is an internal agency tool, not a public SaaS product. Prefer pragmatic, maintainable solutions over over-engineered multi-tenant platform abstractions.

## Current State

The repository currently contains the MVP foundation through Phase 4:

- Next.js `16.2.x` with the App Router, React `19`, TypeScript strict mode, Tailwind CSS v4, and shadcn/ui.
- Better Auth email/password login with manual internal user provisioning.
- Prisma `7` with PostgreSQL models for users, clients, domains, keywords, ranking snapshots, reports, and Google Search Console connections.
- Authenticated dashboard routes for clients, domains, keywords, and initial ranking views.
- Google Search Console OAuth, encrypted token storage, property verification, typed API client, and manual sync into `RankingSnapshot.avgPosition`.
- Node test coverage for GSC token crypto, OAuth callback handling, API client retry/refresh behavior, and sync aggregation.

## Tech Stack

| Area | Decision |
| --- | --- |
| Framework | Next.js 16 App Router |
| Language | TypeScript, strict mode |
| UI | React Server Components first, shadcn/ui, Tailwind CSS v4 |
| Database | PostgreSQL, hosted on Neon |
| ORM | Prisma as the database schema and migration source of truth |
| Background jobs | Vercel Cron Jobs for the MVP daily sync; job runtime deferred until needed |
| Data sources | Google Search Console first; optional SERP APIs for non-owned or supplemental checks |
| Deployment | Vercel for the web app, Neon Postgres for persistence |

## Architectural Approach

DG Tracker should use a clean layered architecture:

1. **UI layer**: `app/` routes, pages, layouts, loading states, and route-level composition.
2. **Component layer**: reusable presentational components in `components/`, with generated shadcn/ui primitives under `components/ui/`.
3. **Action/API layer**: Server Actions for app-owned mutations and Route Handlers for webhooks, OAuth callbacks, cron/job endpoints, and third-party integrations.
4. **Service layer**: domain workflows in `lib/services/`, such as client onboarding, GSC imports, keyword tracking, and reporting.
5. **Data access layer**: Prisma queries isolated behind service/repository functions rather than scattered through components.
6. **Integration layer**: API clients for GSC, SERP providers, and job providers in `lib/integrations/` or similarly named folders.

Keep business rules out of React components. Components should render data and call small, typed server-side operations.

## Project Structure

Current structure:

```txt
app/                  Next.js App Router routes, layouts, Route Handlers, and global CSS
components/           Shared and feature-level React components
components/ui/        shadcn/ui primitives
lib/actions/          Server Actions grouped by domain
lib/auth/             Better Auth and session helpers
lib/integrations/     Google Search Console integration code
lib/services/         Business workflows and domain logic
lib/validators/       Shared validation schemas
prisma/               Prisma schema, migrations, and seed script
```

Expected structure as the product grows:

```txt
app/
  (dashboard)/        Authenticated internal dashboard routes
  api/                Route Handlers for webhooks, OAuth, job callbacks, and external integrations
components/
  ui/                 shadcn/ui primitives only
  dashboard/          Dashboard-specific composed UI
  reports/            Report-specific UI
lib/
  actions/            Server Actions grouped by domain
  auth/               Internal authentication/session helpers
  db/                 Prisma client setup and database utilities
  integrations/       GSC, SERP provider, email, and job-provider clients
  services/           Business workflows and domain logic
  validators/         Shared schemas for forms and API payloads
prisma/
  schema.prisma       Prisma data model
  migrations/         Committed database migrations
vercel.json           Scheduled sync cron configuration once Phase 5 starts
```

## Getting Started

### Prerequisites

- Node.js compatible with Next.js 16.
- pnpm, because this repository includes `pnpm-lock.yaml` and `pnpm-workspace.yaml`.
- Docker and Docker Compose, for local PostgreSQL (or access to a Neon PostgreSQL database).
- Google Cloud project and Search Console access for GSC integration.

### Start local database with Docker

This repository includes a Docker Compose configuration for running a local PostgreSQL instance:

```bash
docker compose -f docker/docker-compose.yml up -d
```

This starts a PostgreSQL 16 container on port `5432` with default credentials. The database persists across restarts using a named Docker volume.

To stop the database:

```bash
docker compose -f docker/docker-compose.yml down
```

To reset the database (removes all data):

```bash
docker compose -f docker/docker-compose.yml down -v
```

When using the local database, set your `DATABASE_URL` in `.env.local` to:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yourapp_dev?sslmode=disable"
```

### Install dependencies

```bash
pnpm install
```

### Configure environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Required variables are documented in `.env.example`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dg-tracker_dev"
BETTER_AUTH_SECRET="replace-me"
BETTER_AUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
GOOGLE_OAUTH_CLIENT_ID=""
GOOGLE_OAUTH_CLIENT_SECRET=""
GOOGLE_OAUTH_REDIRECT_URI="http://localhost:3000/api/google/callback"
GSC_TOKEN_ENCRYPTION_KEY=""
```

Generate `BETTER_AUTH_SECRET` and `GSC_TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32`. Never commit real credentials.

### Prisma setup

Prisma is installed and configured. After editing `prisma/schema.prisma`, create a migration:

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

Use migrations for all schema changes. Do not manually edit the production database to drift away from Prisma.

### Google Search Console OAuth setup

Create a Google Cloud OAuth client before using the GSC connection UI:

1. In Google Cloud Console, create or select the project Different Growth will use for Search Console access.
2. Configure the OAuth consent screen and add the Search Console read-only scope: `https://www.googleapis.com/auth/webmasters.readonly`.
3. Create an OAuth Client ID with application type `Web application`.
4. Add `http://localhost:3000/api/google/callback` as an authorized redirect URI for local development. Add the production callback URL after deployment.
5. Copy the client ID and secret into `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`.
6. Set `GOOGLE_OAUTH_REDIRECT_URI` to the exact callback URI registered in Google Cloud.
7. Make sure the Google account used in the connect flow has owner, full user, or restricted user access to the client's Search Console property.

GSC connections are stored in the dedicated `GscConnection` table. Access and refresh tokens are encrypted at rest with `GSC_TOKEN_ENCRYPTION_KEY`; losing or rotating that key requires reconnecting GSC properties.

#### pnpm build script note

This project uses pnpm, which ignores dependency build scripts by default for security reasons. Prisma requires `@prisma/engines` to run its postinstall script to download binaries. If you see `ERR_PNPM_IGNORED_BUILDS`, use the installed `prisma` binary via `pnpm exec` or `pnpm prisma` instead of `pnpm dlx`:

```bash
# Works (uses locally installed prisma from devDependencies)
pnpm prisma migrate dev --name init
pnpm prisma studio

# Also works
pnpm exec prisma migrate dev --name init
pnpm exec prisma studio

# If you must use dlx, allow the build script explicitly
pnpm dlx --allow-build=@prisma/engines prisma migrate dev --name init
pnpm dlx --allow-build=@prisma/engines prisma studio
```

### Seed the database (development)

After migrations have run, populate the database with a known admin and two sample member users so you can sign in immediately:

```bash
pnpm db:seed
```

The script is idempotent — re-running it skips users that already exist.

| Email | Password | Role |
| --- | --- | --- |
| `admin@local.com` | `password1234` | admin |
| `member1@local.com` | `password1234` | member |
| `member2@local.com` | `password1234` | member |

The seed goes through Better Auth's server-side sign-up so password hashing and account records match a normal sign-up. The shared password meets the configured 12-character minimum.

These are development-only credentials. Do not use them in staging or production. To provision a real user instead, use `pnpm user:create` (see `scripts/create-user.ts`).

### Run the development server

```bash
pnpm dev
```

The app runs at `http://localhost:3000` by default.

### Useful checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

`npx ultracite check` runs the configured Ultracite/Biome checks without modifying files.

## Background Jobs

Daily rank refreshes and import workflows should run outside normal page requests. The MVP plan uses Vercel Cron Jobs for:

- Daily GSC syncs per client property.
- Keyword ranking snapshots and trend calculations.
- Backfills for newly connected client sites.
- Report generation and scheduled delivery after MVP.
- Retryable external API calls with rate-limit handling.

Cron handlers should be small orchestration layers that call `lib/services/*` functions. Keep provider-specific code isolated so a dedicated job runtime can be introduced later if needed.

### Scheduled GSC sync

Phase 5 starts with a Vercel Cron endpoint at `/api/cron/gsc-sync`. The cron runs daily at 05:00 UTC and syncs every active client with a connected GSC property. Set `CRON_SECRET` in Vercel to authorize the cron request; Vercel sends it as a bearer token in the `Authorization` header.

The scheduled sync lookback is controlled by `GSC_SCHEDULED_SYNC_DAYS`. It defaults to `1` day and is capped at `7` days so routine jobs can catch short GSC delays without accidentally launching broad backfills. For one-off authorized requests, `/api/cron/gsc-sync?days=3` can temporarily choose a value in the same 1-7 day range.

## Planned Features

- **Client management**: agencies, clients, sites/properties, contacts, and status.
- **GSC integration**: OAuth, property verification, query/page imports, and historical sync.
- **Keyword tracking**: tracked keyword groups, target URLs, tags, and priority levels.
- **Ranking history**: daily position snapshots, movement calculations, and trend storage.
- **Dashboards**: client overview, ranking movement, winners/losers, opportunity keywords, and health checks.
- **Reporting**: internal views first, then client-ready recurring report exports.
- **Optional SERP APIs**: supplemental rank checks for keywords or competitors that GSC cannot cover.

## Adding New Features

1. Explore existing code and folder conventions first.
2. Model database changes in `prisma/schema.prisma` and create a migration.
3. Put business workflows in `lib/services/<domain>`.
4. Put external API code in `lib/integrations/<provider>`.
5. Use Server Components by default for reads.
6. Use Server Actions for app-owned mutations from the UI.
7. Use Route Handlers for webhooks, OAuth callbacks, third-party callbacks, and job endpoints.
8. Keep UI components reusable and presentation-focused.
9. Add validation at trust boundaries with shared schemas when form/API payloads are introduced.
10. Add tests for service logic, data transformations, and integration adapters.

## Deployment Notes

- Deploy the Next.js app on Vercel.
- Use Neon Postgres for production and preview databases.
- Run Prisma migrations during deployment or via a controlled release step before traffic depends on new columns/tables.
- Store all secrets in Vercel environment variables.
- Keep preview environments isolated from production GSC credentials and production client data when possible.
- Schedule background work through Vercel Cron Jobs for the MVP rather than relying on long-running Node processes.

## Conventions and Gotchas

- This is an internal tool: optimize for clarity, correctness, and team velocity.
- Prisma should be the single source of truth for relational data modeling.
- GSC is the primary data source for owned client properties; SERP APIs are optional supplements.
- External API responses should be normalized before being persisted.
- Store raw import metadata where useful for debugging, but keep product queries against normalized tables.
- Avoid calling Prisma directly from React components when logic belongs in a service.
- Be careful with ranking semantics: distinguish GSC average position from third-party exact SERP positions.
- Treat client SEO data as confidential. Do not log tokens, credentials, or sensitive client data.
