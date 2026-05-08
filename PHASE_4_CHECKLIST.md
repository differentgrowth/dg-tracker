# Phase 4 — Google Search Console Integration: Implementation Checklist

Temporary working file. Tracks the Phase 4 plan from `MVP_ROADMAP.md`. Delete on phase completion.

## Locked decisions

- [x] **Token storage:** dedicated `GscConnection` model (not Better Auth `Account`).
- [x] **Snapshot uniqueness:** `@@unique([keywordId, date, source])`.
- [x] **Position type:** add `avgPosition Float?` to `RankingSnapshot`; keep `position Int?` for SERP exact ranks.
- [x] **Keyword matching:** match GSC `query` to lowercased `keyword.term`; if `targetUrl` set, filter by page URL.
- [x] **Manual sync window:** default 28 days, max 90.

## 1. Schema & migration

- [x] Add `GscConnection` model (clientId unique, encrypted tokens, scopes, gscSiteUrl, lastSyncedAt, lastSyncError, googleAccountEmail/Subject, connectedByUserId).
- [x] Add `gscConnection GscConnection?` back-relation on `Client`.
- [x] Add `avgPosition Float?` to `RankingSnapshot`.
- [x] Add `@@unique([keywordId, date, source])` to `RankingSnapshot`.
- [x] Run `pnpm prisma migrate dev --name add_gsc_connection_and_snapshot_uniqueness`.
- [x] Confirm `lib/generated/prisma` regenerates.

## 2. Environment & config

- [x] Add to `.env.example`: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GSC_TOKEN_ENCRYPTION_KEY`, `APP_URL`.
- [x] Document Google Cloud OAuth client setup in `README.md` (scopes: `webmasters.readonly`).
- [x] Add lazy env validation (Zod schema in `lib/env.ts`, throws on first `getEnv()` call).

## 3. Token encryption helper

- [x] `lib/integrations/gsc/crypto.ts`: `encryptToken` / `decryptToken` (AES-256-GCM, base64 iv.tag.ct).
- [x] Throw on first encryption/decryption if `GSC_TOKEN_ENCRYPTION_KEY` is missing or wrong length.

## 4. OAuth flow

- [x] `lib/validators/gsc.ts`: connect, disconnect, sync, callback schemas.
- [x] `lib/actions/gsc/connect.ts` — Server Action returning the Google authorization URL; persists state in `Verification` table.
- [x] `app/api/google/callback/route.ts` — GET handler: validate state, exchange code, verify scopes, call `sites.list`, confirm `client.gscProperty` is authorized, encrypt + persist tokens.
- [x] `lib/actions/gsc/disconnect.ts` — best-effort revoke + delete row + revalidate.
- [x] `lib/integrations/gsc/google-id-token.ts` — verify Google id_token signature via JWKS; extract `sub`, `email`.

## 5. GSC integration client

- [x] `lib/integrations/gsc/types.ts` — `SiteEntry`, `SearchAnalyticsRequest`, `SearchAnalyticsRow`.
- [x] `lib/integrations/gsc/errors.ts` — `GscApiError`.
- [x] `lib/integrations/gsc/client.ts` — fetch-based client with refresh-on-expiry, paginated `searchAnalyticsQuery`, `listSites`. Capped retry/backoff on 429/503.

## 6. Sync service

- [x] `lib/services/gsc-sync.service.ts` — `syncGscPropertyForClient(opts)`:
  - Load client + gscConnection + active keywords.
  - Pull GSC `dimensions: [query, date, page]`, paginate, and query each tracked term with an exact query filter.
  - Match query → keyword (lowercase). Aggregate weighted avg across pages.
  - Upsert via `(keywordId, date, source)` unique key with `avgPosition`, impressions, clicks, ctr, url.
  - Chunked `prisma.$transaction` (~500/chunk).
  - Update `client.lastSyncedAt`, `keyword.lastCheckedAt`, `gscConnection.lastSyncError`.
  - Return `GscSyncResult` (counts only — never raw rows).

## 7. Server Action: Sync now + UI

- [x] `lib/actions/gsc/sync.ts` — calls service inline (Phase-5 will swap for job enqueue). 90-day max.
- [x] Client overview page: GSC panel (connected/disconnected variants) — Connect, Sync now, Disconnect buttons + `lastSyncedAt` and `lastSyncError` display.
- [x] Empty/error states (no `gscProperty`, no keywords, scope missing).

## 8. Error handling, logging, security

- [x] `redactError` helper at action/service boundaries.
- [x] No tokens, codes, ciphertexts, or raw GSC bodies in logs.
- [x] CSRF via OAuth `state` + Verification row consumption.
- [x] Connect/disconnect: admin only. Sync: any session.
- [x] 429 surfaced as `lastSyncError = "GSC quota exceeded — retry later"`.

## 9. Tests

- [x] `gsc-sync.service.test.ts`: idempotency, weighted aggregation, unmatched count, targetUrl filter.
- [x] `crypto.test.ts`: round-trip + tamper detection.
- [x] `client.test.ts` (integration): refresh on expiry, 401/429 handling.
- [x] OAuth callback handler tests: state mismatch, missing scope, success path.

## 10. Verification

- [x] `pnpm typecheck` clean.
- [x] `pnpm build` clean.
- [x] `npx ultracite check` clean.
- [x] `.env.example` updated.
- [x] README setup section updated (Google Cloud OAuth steps).
- [ ] Manual E2E against a real GSC property: connect → keywords → sync → snapshots match SC UI → re-sync produces no duplicates → disconnect leaves snapshots intact. Requires real Google Cloud OAuth credentials and a Search Console property.

## Commit sequence

1. [x] `feat(gsc): add GscConnection model and snapshot uniqueness migration`
2. [x] `feat(gsc): token encryption helpers and env wiring`
3. [x] `feat(gsc): typed integration client with refresh + pagination`
4. [x] `feat(gsc): OAuth connect/callback/disconnect flow`
5. [x] `feat(gsc): sync service with idempotent upserts`
6. [x] `feat(gsc): client overview UI for connect / sync now / disconnect`
7. [x] `test(gsc): sync idempotency and crypto round-trip`
