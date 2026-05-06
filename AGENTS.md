# AGENTS.md

Guidelines for AI coding agents and developers working on DG Tracker.

## Project Overview

DG Tracker is Different Growth's internal SEO rank tracking tool. It is being built with Next.js 16, TypeScript, Prisma, PostgreSQL on Neon, and a clean services layer. The product manages multiple agency clients, connects owned Google Search Console properties, tracks selected keywords, stores historical ranking data, and produces internal dashboards and client-ready reports.

This is an internal agency application, not a public SaaS platform. Prefer simple, reliable architecture that helps the team move quickly while protecting client data.

## Current Repository State

The repository is currently an initial Next.js App Router scaffold with:

- `app/` for routes, layout, and global styles.
- `components/` and `components/ui/` for shared UI and shadcn/ui primitives.
- `lib/utils.ts` with shared utility helpers.
- `components.json` configured for shadcn/ui with React Server Components enabled.
- `tsconfig.json` with TypeScript `strict` mode enabled.
- `biome.jsonc` present for Biome-based lint/format configuration.

Prisma, database schema, background jobs, authentication, and SEO-specific domains are planned but not implemented yet. When adding them, follow the conventions below.

## Core Architecture Principles

- Use a clean layered architecture.
- Keep React components focused on rendering and user interaction.
- Put business workflows in `lib/services/`.
- Put database access behind service or repository functions; do not scatter Prisma calls throughout UI code.
- Treat Prisma as the single source of truth for relational schema, relations, indexes, and migrations.
- Keep external integrations isolated from domain logic.
- Prefer boring, explicit code over clever abstractions.
- Design for multi-client internal agency usage from the start.
- Preserve clear distinctions between:
  - GSC average position data.
  - Exact SERP API rank checks.
  - Derived trend/reporting metrics.

## Folder Structure Guidelines

Use the current folders as the base and add domain folders intentionally.

```txt
app/                  App Router pages, layouts, loading states, errors, and Route Handlers
app/api/              OAuth callbacks, webhooks, job callbacks, and external API endpoints
components/           Shared and feature-level React components
components/ui/        shadcn/ui primitives; avoid domain logic here
lib/                  Shared server/client utilities
lib/actions/          Server Actions grouped by domain
lib/auth/             Authentication, authorization, and session helpers
lib/db/               Prisma client setup and database helpers
lib/integrations/     GSC, SERP providers, Inngest/Trigger.dev adapters, and external API clients
lib/services/         Business logic and application workflows
lib/validators/       Shared validation schemas for forms, actions, APIs, and job payloads
prisma/               Prisma schema and migrations
inngest/ or jobs/     Background and scheduled job definitions
```

### What Belongs Where

- `app/`: route composition, layouts, metadata, loading/error boundaries, and Route Handlers.
- `components/`: reusable UI composed from props; minimal data fetching.
- `components/ui/`: generated or lightly customized shadcn/ui primitives only.
- `lib/services/`: use cases such as creating clients, syncing GSC data, updating keyword snapshots, calculating ranking trends, and generating reports.
- `lib/integrations/`: low-level API clients and provider-specific request/response handling.
- `lib/db/`: Prisma singleton/client and database utility functions.
- `prisma/`: schema and migrations only.

## Coding Standards

- Use TypeScript strict mode. Do not weaken compiler settings without a clear reason.
- Prefer named exports for shared utilities, services, and components.
- Use descriptive domain names: `client`, `site`, `property`, `keyword`, `rankingSnapshot`, `gscQuery`, `report`.
- Keep functions small and purpose-specific.
- Prefer explicit return types for services, actions, and integration clients.
- Avoid `any`; use typed provider response models or `unknown` with validation.
- Never put try/catch blocks around imports.
- Handle errors at service/action boundaries with useful messages and safe logging.
- Do not log secrets, OAuth tokens, API keys, or sensitive client data.
- Use the `@/*` path alias for root-relative imports.
- Follow existing formatting. This codebase currently uses tabs in some scaffolded files and Biome configuration is present; do not reformat unrelated files.

## Next.js Conventions

- Use Server Components by default.
- Add Client Components only when browser state, effects, event handlers, or client-only libraries are required.
- Use Server Actions for app-owned form submissions and mutations from the UI.
- Use Route Handlers for:
  - Google OAuth callbacks.
  - GSC push/pull integration endpoints.
  - Inngest or Trigger.dev endpoints.
  - Third-party webhooks.
  - Public-ish API boundaries that are not directly tied to a form.
- Keep secrets and privileged API calls on the server.
- Prefer route groups for authenticated dashboard organization, for example `app/(dashboard)/clients/[clientId]/page.tsx`.

## Prisma and Database Rules

- Add Prisma with `@prisma/client` and `prisma` when the first database feature is implemented.
- Define all models, relations, unique constraints, indexes, and enum-like fields in `prisma/schema.prisma`.
- Always create and commit migrations with `prisma migrate dev` for schema changes.
- Do not use `prisma db push` for committed application schema changes unless explicitly chosen for a temporary prototype.
- Run `prisma generate` after schema changes.
- Keep seed/demo data separate from schema and migrations.
- Use transactions for workflows that write related client, keyword, and ranking records together.
- Model timestamps consistently with `createdAt` and `updatedAt` where appropriate.
- Consider data volume early for ranking history: index by client/site, keyword, date, and provider where query patterns require it.

## Background and Scheduled Jobs

Use Inngest or Trigger.dev for background work. Jobs should orchestrate services rather than contain business logic directly.

Recommended pattern:

1. Job receives a small typed payload such as `clientId`, `siteId`, date range, or sync mode.
2. Job validates payload and loads required records.
3. Job calls a service such as `syncGscProperty`, `refreshKeywordRankings`, or `generateClientReport`.
4. Service handles domain rules, persistence, and idempotency.
5. Job records success/failure metadata and relies on provider retries for transient failures.

Jobs must be idempotent where possible. Daily syncs should safely rerun for the same client/date without duplicating snapshots.

## External API Integration Rules

### Google Search Console

- GSC is the primary ranking/query data source for owned client properties.
- Keep OAuth/token logic isolated in integration/auth helpers.
- Store tokens securely and never log them.
- Normalize GSC responses before persistence.
- Preserve enough import metadata to debug sync issues.
- Treat GSC `position` as average position, not exact rank.
- Respect quotas and use batched/backfilled jobs for historical imports.

### SERP Providers

- SERP APIs are optional supplements for exact keyword checks or non-owned properties.
- Hide provider-specific payloads behind `lib/integrations/<provider>`.
- Normalize provider results into domain types before services consume them.
- Track provider, locale, device, search engine, and checked-at timestamp for each result.
- Build rate-limit handling and retry behavior into jobs/services.

## UI and Component Guidelines

- Use shadcn/ui primitives for consistent UI foundations.
- Keep `components/ui/` generic and domain-free.
- Build feature components in domain folders such as `components/dashboard/`, `components/clients/`, or `components/reports/`.
- Prefer accessible semantic HTML and keyboard-friendly interactions.
- Use Server Components for data-heavy dashboard pages.
- Keep charts and interactive tables isolated as Client Components only where necessary.
- Use clear empty states for clients with no connected GSC property, no tracked keywords, or no ranking history.

## Testing Approach

Add tests as functionality appears. Prioritize:

- Service-level unit tests for ranking calculations, trend detection, report summaries, and sync decisions.
- Integration-adapter tests with mocked GSC/SERP responses.
- Database tests for important Prisma queries and constraints when practical.
- Component tests for complex interactive UI.
- End-to-end smoke tests for critical flows when the dashboard stabilizes.

Before committing code, run the most relevant checks available, usually:

```bash
pnpm typecheck
pnpm build
```

If lint/test scripts are added later, run those too.

## Git Workflow and Commit Messages

- Work on the current branch unless instructed otherwise.
- Keep commits focused and easy to review.
- Use clear imperative commit messages, for example:
  - `Add client management service`
  - `Document DG Tracker architecture`
  - `Create GSC sync job skeleton`
- Do not commit generated secrets, `.env.local`, database dumps, or client data exports.
- Include migrations in the same commit as schema-dependent code.

## Rules for AI Agents

- Always inspect the current codebase before making changes.
- Read this file and any more deeply nested `AGENTS.md` files before editing files in their scope.
- Follow existing patterns and naming conventions unless there is a clear reason to improve them.
- Ask clarifying questions when requirements are ambiguous, especially around data model, billing/client boundaries, reporting expectations, and external API behavior.
- Prefer the simplest solution that supports an internal agency workflow.
- Document important architectural decisions in README, code comments, or follow-up docs when they affect future contributors.
- Do not introduce new frameworks, job providers, databases, or state-management libraries without a strong reason.
- Avoid broad refactors while implementing small feature requests.
- If you add environment variables, document them in README and `.env.example`.
- If you add dependencies, explain why they are needed.
- Run relevant checks before finalizing work and report any failures clearly.

## Anti-Patterns to Avoid

- Calling Prisma directly from many pages/components instead of a service layer.
- Embedding GSC or SERP provider response shapes throughout the app.
- Treating GSC average position as exact daily rank.
- Running long imports inside page requests or Server Actions.
- Duplicating ranking snapshots when jobs retry.
- Over-building public SaaS concerns that are unnecessary for an internal tool.
- Storing or logging OAuth tokens in plaintext logs.
- Creating database schema changes without migrations.
- Mixing domain logic into `components/ui/`.
- Adding Client Components by default when a Server Component would work.
