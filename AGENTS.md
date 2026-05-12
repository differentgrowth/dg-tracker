# AGENTS.md

Guidelines for AI coding agents and developers working on DG Tracker.

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rule 1 — Think Before Coding
State assumptions explicitly. If uncertain, ask rather than guess.
Present multiple interpretations when ambiguity exists.
Push back when a simpler approach exists.
Stop when confused. Name what's unclear.

## Rule 2 — Simplicity First
Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.
Test: would a senior engineer say this is overcomplicated? If yes, simplify.

## Rule 3 — Surgical Changes
Touch only what you must. Clean up only your own mess.
Don't "improve" adjacent code, comments, or formatting.
Don't refactor what isn't broken. Match existing style.

## Rule 4 — Goal-Driven Execution
Define success criteria. Loop until verified.
Don't follow steps. Define success and iterate.
Strong success criteria let you loop independently.

## Rule 5 — Use the model only for judgment calls
Use me for: classification, drafting, summarization, extraction.
Do NOT use me for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Rule 6 — Token budgets are not advisory
Per-task: 4,000 tokens. Per-session: 30,000 tokens.
If approaching budget, summarize and start fresh.
Surface the breach. Do not silently overrun.

## Rule 7 — Surface conflicts, don't average them
If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

## Rule 8 — Read before you write
Before adding code, read exports, immediate callers, shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.

## Rule 9 — Tests verify intent, not just behavior
Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Rule 10 — Checkpoint after every significant step
Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

## Rule 11 — Match the codebase's conventions, even if you disagree
Conformance > taste inside the codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

## Rule 12 — Fail loud
"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

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

## Ultracite Code Standards

This repository uses Ultracite for automated formatting and linting. This guidance applies to Codex, OpenCode, Claude Code, and other agents that read repository instruction files.

Quick commands:

- `npx ultracite check` checks for issues without modifying files.
- `npx ultracite fix` formats and auto-fixes safe issues.
- `npx ultracite doctor` diagnoses the Ultracite setup.

Write code that is accessible, performant, type-safe, and maintainable. Prefer clear names, explicit intent, semantic HTML, Server Components by default in Next.js, and `unknown` over `any` for genuinely unknown values. Do not add formatter-specific style preferences here; the configured linter owns formatting decisions.

## Conventional Commits

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

```
<type>[optional scope][optional breaking change]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or correcting tests
- `chore`: Build process, tooling, or dependencies
- `ci`: CI configuration changes

### Rules

- Use lowercase for type and description.
- Description: max 50 characters, no period at end.
- Body: wrap at 72 characters.
- Footer: use `BREAKING CHANGE:` prefix for breaking changes.
- Scope: optional, use kebab-case if present.
- Examples:
  - `feat(clients): add client delete confirmation dialog`
  - `fix: resolve GSC sync job timeout on large properties`
  - `docs: update README with environment variable setup`

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md|01-app:{04-glossary.mdx}|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-fetching-data.mdx,07-mutating-data.mdx,08-caching.mdx,09-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers.mdx,16-proxy.mdx,17-deploying.mdx,18-upgrading.mdx}|01-app/02-guides:{ai-agents.mdx,analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching-without-cache-components.mdx,cdn-caching.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,deploying-to-platforms.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,how-revalidation-works.mdx,incremental-static-regeneration.mdx,instant-navigation.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mcp.mdx,mdx.mdx,memory-usage.mdx,migrating-to-cache-components.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,ppr-platform-guide.mdx,prefetching.mdx,preserving-ui-state.mdx,production-checklist.mdx,progressive-web-apps.mdx,public-static-pages.mdx,redirecting.mdx,rendering-philosophy.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,streaming.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx,view-transitions.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx,version-16.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache-private.mdx,use-cache-remote.mdx,use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions/02-route-segment-config:{dynamicParams.mdx,instant.mdx,maxDuration.mdx,preferredRegion.mdx,runtime.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,proxy.mdx,public-folder.mdx,route-groups.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,catchError.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,refresh.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,updateTag.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,cacheComponents.mdx,cacheHandlers.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,deploymentId.mdx,devIndicators.mdx,distDir.mdx,env.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackFileSystemCache.mdx,turbopackIgnoreIssue.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|01-app/03-api-reference/07-adapters:{01-configuration.mdx,02-creating-an-adapter.mdx,03-api-reference.mdx,04-testing-adapters.mdx,05-routing-with-next-routing.mdx,06-implementing-ppr-in-an-adapter.mdx,07-runtime-integration.mdx,08-invoking-entrypoints.mdx,09-output-types.mdx,10-routing-information.mdx,11-use-cases.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-forms-and-mutations.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,proxy.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-params.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,deploymentId.mdx,devIndicators.mdx,distDir.mdx,env.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,logging.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|02-pages/04-api-reference/06-adapters:{01-configuration.mdx,02-creating-an-adapter.mdx,03-api-reference.mdx,04-testing-adapters.mdx,05-routing-with-next-routing.mdx,06-implementing-ppr-in-an-adapter.mdx,07-runtime-integration.mdx,08-invoking-entrypoints.mdx,09-output-types.mdx,10-routing-information.mdx,11-use-cases.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->
