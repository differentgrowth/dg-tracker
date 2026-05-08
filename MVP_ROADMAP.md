# DG Tracker MVP Roadmap

This roadmap captures the path from the current scaffold to a usable internal MVP for Different Growth's SEO team. The goal of the MVP is a single workflow: **connect a client's Google Search Console property, track a list of keywords, and view ranking history in a dashboard.** Everything else is post-MVP.

Source of truth for architecture and conventions: [`README.md`](./README.md) and [`AGENTS.md`](./AGENTS.md).

## Definition of MVP

The MVP is shippable when an internal team member can:

1. Sign in with a provisioned account.
2. Create a client and attach a Google Search Console property.
3. Add tracked keywords for that client.
4. Trigger (or wait for the daily job to run) a GSC sync.
5. View a dashboard with average position, impressions, clicks, and CTR per keyword over time.
6. See historical ranking movement for any tracked keyword.

If a flow cannot be reduced to those steps, it is post-MVP scope.

## Status Snapshot

Already in place:

- Next.js 16 App Router scaffold with React 19, TypeScript strict, Tailwind v4, shadcn/ui.
- Prisma schema with `User`, `Session`, `Account`, `Verification`, `Client`, `Domain`, `Keyword`, `RankingSnapshot`, `Report`, `GscConnection`. Migrations committed under `prisma/migrations/`.
- Better Auth email/password login, manual user provisioning, session helpers (`getSession`, `requireSession`, `requireAdmin`).
- `/login`, `/dashboard`, client/domain/keyword dashboard routes, and `/` redirects based on session.
- Services in `lib/services/` for `client`, `domain`, `keyword`, `ranking`, `report`, and GSC sync.
- GSC OAuth, dedicated encrypted token storage, typed GSC client, OAuth callback, manual sync action, and client-page GSC controls.
- `.env.example` with database, Better Auth, app URL, Google OAuth, and token encryption variables.
- Local Postgres via `docker/docker-compose.yml`.

Not yet in place:

- Vercel Cron Job for daily sync (`CRON_SECRET` env var).
- Full ranking dashboards, charts, or reports UI.
- Deployment to Vercel and Neon production database.
- Admin tooling for user provisioning beyond manual DB inserts.

## Phase 1 — Authenticated app shell

Goal: a logged-in user lands on a real dashboard layout that the rest of the app will live inside.

- App layout for authenticated routes under `app/(dashboard)/` with sidebar/topbar shell.
- Sign-out action wired to Better Auth.
- Empty states for "no clients yet" on the dashboard home.
- Admin-only route group or guard for user/client provisioning surfaces.

Exit criteria: signed-in users see a persistent dashboard layout; admins can reach a provisioning page (even if it is just a list view to start).

## Phase 2 — Client and domain management

Goal: the team can model their book of business inside DG Tracker.

- Server Actions in `lib/actions/clients/` and `lib/actions/domains/` backed by `client.service.ts` / `domain.service.ts`.
- Zod (or equivalent) validators in `lib/validators/`.
- Pages: `/(dashboard)/clients` (list), `/(dashboard)/clients/new`, `/(dashboard)/clients/[clientId]` (overview), `/(dashboard)/clients/[clientId]/domains`.
- Forms for create/edit client (name, primary domain, GSC property string, status, assignee, notes).
- Domain CRUD nested under a client.
- Archive (status flip) instead of hard delete.

Exit criteria: a team member can add a client, set its GSC property string, attach domains, and edit/archive without touching the database.

## Phase 3 — Keyword tracking model

Goal: tracked keywords are first-class, scoped to a domain, ready to receive ranking snapshots.

- Keyword CRUD pages under `/(dashboard)/clients/[clientId]/keywords` (or nested under a domain — pick one and stay consistent).
- Bulk add via paste-list textarea (one keyword per line) for quick onboarding.
- Tagging, priority, target position, target URL, category fields editable inline.
- List view with filters (tag, priority, last checked).

Exit criteria: an SEO can paste 50 keywords for a client in under a minute and see them listed with their metadata.

## Phase 4 — Google Search Console integration

Goal: pull first-party ranking data into `RankingSnapshot` for tracked keywords.

- Google OAuth: client ID/secret env vars, consent screen, scopes for `webmasters.readonly`.
- Route Handler at `app/api/google/callback/route.ts` to complete OAuth and store tokens on `Account` (or a dedicated table if Better Auth's `Account` is reserved for app login).
- Integration client in `lib/integrations/gsc/` with typed wrappers around `searchanalytics.query` and `sites.list`.
- Service `lib/services/gsc-sync.service.ts` that, given a client + date range, fetches rows for tracked keywords and upserts `RankingSnapshot` records (`source = "gsc"`).
- Idempotency: unique constraint or upsert key on `(keywordId, date, source)` — add a migration if missing.
- Manual "Sync now" button on a client page that calls a Server Action inline for Phase 4. Phase 5 replaces this with scheduled cron orchestration.

Exit criteria: clicking "Sync now" on a real client property writes ranking snapshots to the database that match what Search Console shows.

## Phase 5 — Scheduled sync via Vercel Cron Jobs

Goal: scheduled syncs run without anyone clicking a button.

- Define a `cron` entry in `vercel.json` pointing a Route Handler at `app/api/cron/daily-sync/route.ts`. Schedule: daily.
- The Route Handler receives the cron trigger, verifies the `CRON_SECRET` header, iterates active clients with a connected GSC property, and calls `gsc-sync.service.ts` for each.
- Per-client backfill: a separate on-demand Server Action that calls the same service for a configurable lookback window (triggered once when a property is first connected).
- No separate job runtime (Inngest / Trigger.dev). Rate-limiting and retries are handled by the service layer (idempotent upsert + simple retry loop for transient GSC errors).
- Status surfaced on the client page: `lastSyncedAt`, last error if any.

**Why Vercel Cron Jobs:** avoids adding a background job dependency for a single daily task. The sync is idempotent and short-lived per client (< 5 s for typical keyword volumes), so Vercel's 60 s timeout on cron invocations is sufficient. If complexity grows, a job runtime can be introduced post-MVP without changing the service layer.

Exit criteria: a daily cron runs unattended for at least 3 days against a real client and produces fresh snapshots without duplicates.

## Phase 6 — Ranking dashboard

Goal: the team can see what is happening for each client.

- Client overview page: KPI tiles (total keywords, avg position, top movers, CTR), keyword table with sparkline per row.
- Keyword detail page: position-over-time chart, impressions/clicks/CTR chart, raw snapshot table.
- Movement view: winners/losers in the last 7/30 days.
- Charts as Client Components, isolated; data loaded by Server Components.

Exit criteria: an SEO can answer "is this keyword trending up or down?" in one click from the client overview.

## Phase 7 — Internal report v1

Goal: a shareable monthly summary, internal-only first.

- Service `lib/services/report.service.ts` that generates a period summary (top wins, top losses, traffic deltas) for a client.
- Read-only report page under `/(dashboard)/clients/[clientId]/reports/[reportId]`.
- Defer PDF/email delivery until after MVP — just persist the `Report` row and render the page.

Exit criteria: an internal user can generate a report for last month and read it inside the app.

## Cross-cutting MVP work

- `.env.example` kept in sync as variables are introduced.
- Production deploy to Vercel + Neon Postgres with a separate preview database.
- Audit log or at minimum `createdBy`/`updatedBy` fields on mutations that need accountability.
- Error handling at action/service boundaries with safe logging — never log GSC tokens or raw client data.
- Service-level tests for sync idempotency and trend calculations before Phase 6 ships.

## Out of scope for MVP

These are explicitly deferred so MVP scope stays tight:

- SERP API integration for non-owned properties or exact-rank checks.
- Client-facing portal or shared external links.
- Recurring email/PDF report delivery.
- Multi-agency or multi-tenant separation beyond a single Different Growth workspace.
- Competitor tracking, content briefs, AI-generated insights.
- Billing, usage limits, or any SaaS plumbing.

## Open Decisions

These need a call before or during the relevant phase:

- ~~Inngest vs Trigger.dev for jobs.~~ **Decided: Vercel Cron Jobs** (see Phase 5).
- ~~Where to store GSC OAuth tokens — extend Better Auth's `Account` table or add a dedicated table.~~ **Decided: dedicated `GscConnection` model.**
- ~~Keyword scoping: per-domain vs per-client with optional domain.~~ **Decided: per-domain.**
- ~~Snapshot uniqueness key: `(keywordId, date, source)` is the assumed shape.~~ **Decided and implemented.**
