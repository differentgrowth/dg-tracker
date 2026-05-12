# Site-wide GSC Performance Snapshot Plan

## Goal

Implement a true site-wide Google Search Console (GSC) performance snapshot that queries Search Analytics at the connected property level and stores daily total clicks, impressions, CTR, average position, and a derived performance score.

This feature complements the existing keyword-level GSC sync. The current sync stores only rows that match tracked keywords in `RankingSnapshot`; this feature should preserve total property performance even when the query or page is not tracked as a keyword.

## Assumptions

- A site-wide snapshot belongs to a connected GSC property, represented today by `GscConnection.gscSiteUrl`.
- A snapshot should also be attributable to the internal `Client`, because dashboards and reports are client-first.
- The first implementation should use daily granularity. Weekly, monthly, or range summaries can be derived later from daily rows.
- The first implementation should query Search Analytics with `dimensions: ["date"]` rather than no dimensions, so one API call can return one row per day for a requested date range.
- The first implementation should use `type: "web"`, matching the current keyword GSC sync.
- The first implementation should use `dataState: "all"`, matching the current keyword GSC sync, but should make the row idempotently replaceable because recent GSC data can change while processing completes.
- CTR should be stored as a decimal fraction from 0 to 1, consistent with the existing `RankingSnapshot.ctr` field.
- Average position is GSC average position, not an exact rank. Do not mix it with SERP-provider exact rank fields.
- The derived score should be intentionally simple and documented. It should be recalculable from stored metrics so future formula changes can be backfilled.

## External API behavior to account for

Google's Search Analytics API returns rows with `clicks`, `impressions`, `ctr`, and `position`, and accepts dimensions such as `date`, `query`, and `page`. The API can return recent incomplete data when `dataState` is `all`, and Search Analytics results are subject to Search Console limits rather than guaranteed exhaustive row-level exports.

Official references:

- Search Analytics API overview: <https://developers.google.com/webmaster-tools/v1/searchanalytics>
- Search Analytics query endpoint: <https://developers.google.com/webmaster-tools/v1/searchanalytics/query>
- Search Console performance metrics definitions: <https://support.google.com/webmasters/answer/7576553>

## Non-goals for the first implementation

- Do not replace keyword-level `RankingSnapshot` sync.
- Do not add a new background job provider.
- Do not add device, country, page, or query segmentation yet.
- Do not add competitor or SERP-provider data.
- Do not build report PDFs as part of this feature.
- Do not create aggregate tables for weekly/monthly periods until daily snapshots exist and query patterns are known.

## Success criteria

1. The system can fetch property-level GSC performance for a client over a date range.
2. Each returned date is stored once per client/property/search type/data state and can be safely updated by reruns.
3. Stored metrics include total clicks, total impressions, CTR, average position, and a derived score.
4. The scheduled GSC sync records site-wide snapshots for every active client with a GSC connection, even if the client has no tracked keywords.
5. Manual GSC sync can refresh site-wide snapshots for the selected client/date range.
6. Dashboard/report services can read latest and historical site-wide snapshot metrics without calling GSC directly.
7. Tests cover date-range requests, GSC row normalization, score calculation, idempotent persistence, empty results, and scheduled sync behavior.
8. The implementation keeps provider payloads confined to `lib/integrations/gsc/` and business workflows in `lib/services/`.

## Proposed data model

Add a dedicated Prisma model instead of overloading `RankingSnapshot`. This avoids creating synthetic keywords and keeps site-wide GSC metrics distinct from tracked keyword rank snapshots.

```prisma
model GscPerformanceSnapshot {
  id             String   @id @default(cuid())
  clientId       String
  client         Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  gscConnectionId String
  gscConnection   GscConnection @relation(fields: [gscConnectionId], references: [id], onDelete: Cascade)
  siteUrl        String
  date           DateTime
  searchType     String   @default("web")
  dataState      String   @default("all")
  clicks         Int
  impressions    Int
  ctr            Float
  avgPosition    Float
  score          Float
  scoreVersion   Int      @default(1)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([clientId, siteUrl, date, searchType, dataState])
  @@index([clientId, date])
  @@index([gscConnectionId, date])
  @@index([siteUrl, date])
  @@map("gsc_performance_snapshots")
}
```

Also add relations:

```prisma
model Client {
  // existing fields
  gscPerformanceSnapshots GscPerformanceSnapshot[]
}

model GscConnection {
  // existing fields
  performanceSnapshots GscPerformanceSnapshot[]
}
```

Migration notes:

- Use `pnpm prisma migrate dev --name add_gsc_performance_snapshots`.
- Run `pnpm prisma generate` after the migration.
- No backfill is required in the migration. Backfill should be a service operation or one-off admin action using the same idempotent sync path.

## Score formula

Use a versioned score so formula changes do not silently reinterpret historical values.

### Version 1 formula

```ts
score = roundToTwoDecimals(
  trafficScore * 0.5 +
  ctrScore * 0.25 +
  positionScore * 0.25
)
```

Where:

```ts
trafficScore = min(100, log10(impressions + clicks * 10 + 1) * 20)
ctrScore = min(100, ctr * 100 * 4)
positionScore = avgPosition <= 0 ? 0 : clamp(0, 100, ((101 - min(avgPosition, 101)) / 100) * 100)
```

Rationale:

- Traffic gets the largest weight because the snapshot is meant to capture site-wide performance.
- CTR rewards efficient visibility without allowing small denominators to dominate the score.
- Average position contributes directional ranking quality while acknowledging it is not exact rank.
- Log scaling keeps very large sites from making smaller clients look permanently flat.
- Versioning allows future formulas to include month-over-month deltas or business-weighted conversions without corrupting old data.

Implementation location:

- Create `lib/services/gsc-performance-score.ts` or keep a small pure helper in `lib/services/gsc-performance-snapshot.service.ts` if it is only used there.
- Export `calculateGscPerformanceScore(input): number` and `gscPerformanceScoreVersion`.
- Unit-test the score function with fixed examples and boundary cases.

## Integration-layer changes

### Types

Extend `lib/integrations/gsc/types.ts` only if needed. Current types already support `date` dimensions and response rows with clicks, impressions, CTR, and position.

Optional improvement:

```ts
export type SearchAnalyticsSearchType =
  | "discover"
  | "googleNews"
  | "image"
  | "news"
  | "video"
  | "web";

export type SearchAnalyticsDataState = "all" | "final";
```

Then use those aliases in `SearchAnalyticsRequest` and service inputs to reduce duplicated string unions.

### Client call

Reuse `GscClient.searchAnalyticsQuery(siteUrl, request)`.

Request shape for daily site-wide snapshots:

```ts
{
  startDate: "YYYY-MM-DD",
  endDate: "YYYY-MM-DD",
  dimensions: ["date"],
  dataState: "all",
  type: "web",
  rowLimit: 25000,
}
```

Expected row shape:

```ts
{
  keys: ["YYYY-MM-DD"],
  clicks: number,
  impressions: number,
  ctr: number,
  position: number,
}
```

Validation rules:

- Ignore malformed rows with no date key only if the service records a safe warning count in its result. Prefer fail-loud behavior in tests.
- Clamp negative metric values to errors, not zero, because GSC should not return negative clicks/impressions.
- Accept zero impressions only if clicks are also zero. CTR should be `0` when impressions are zero.
- Store `avgPosition` from `position` unchanged except for numeric validation.

## Service-layer design

Create `lib/services/gsc-performance-snapshot.service.ts`.

### Public API

```ts
export interface SyncGscPerformanceSnapshotsOptions {
  clientId: string;
  startDate: Date;
  endDate: Date;
  searchType?: "web";
  dataState?: "all" | "final";
  triggeredBy?: "manual" | "scheduled" | "backfill";
}

export interface SyncGscPerformanceSnapshotsResult {
  clientId: string;
  siteUrl: string;
  searchType: string;
  dataState: string;
  rowsFetched: number;
  snapshotsUpserted: number;
  skippedRows: number;
  startedAt: Date;
  finishedAt: Date;
}
```

### Workflow

1. Load `GscConnection` by `clientId`.
2. Throw a clear error if no connection exists.
3. Create `GscClient` from the connection using the same dependency-injection pattern as `gsc-sync.service.ts`.
4. Convert `startDate` and `endDate` to UTC `YYYY-MM-DD`.
5. Query Search Analytics for `dimensions: ["date"]`.
6. Normalize each row into a `GscPerformanceSnapshot` upsert input.
7. Calculate `score` and set `scoreVersion`.
8. Upsert by `[clientId, siteUrl, date, searchType, dataState]`.
9. Update `Client.lastSyncedAt` and `GscConnection.lastSyncedAt` after success.
10. On API failure, update `GscConnection.lastSyncError` and rethrow.

### Idempotency

- Use `upsert` for every row.
- Update all metric fields and score on rerun.
- Do not increment counters or append duplicate rows.
- Keep recent `dataState: "all"` rows mutable because Google can revise incomplete data.

### Date handling

- Use inclusive date ranges, matching the current keyword GSC sync request style.
- Normalize stored dates to UTC midnight.
- Consider excluding the current UTC date from scheduled runs if incomplete same-day data is noisy. If excluded, document that scheduled runs sync through yesterday while manual backfills can include today.

## Scheduled sync changes

Current scheduled sync iterates active domains whose client has a GSC connection. Site-wide snapshots should run per connected client/property, not per domain, because GSC properties are client-level today.

Recommended incremental change:

1. Add `runScheduledGscPerformanceSnapshotSync` in a new service or extend `scheduled-gsc-sync.service.ts` carefully.
2. Query active clients where `gscConnection` is present.
3. Use a trailing lookback window. Start with `1` day to match the MVP default, or use the maximum scheduled lookback among the client's domains if that better aligns with current configuration.
4. Call `syncGscPerformanceSnapshots` once per client.
5. Return per-client results alongside keyword/domain results.

Safer orchestration option:

- Keep keyword/domain scheduled sync and site-wide scheduled sync as separate service functions.
- Update `app/api/cron/gsc-sync/route.ts` to run both and return a combined response.
- Use HTTP `207` when either sub-sync has failures.

Why separate functions:

- Keyword sync is domain/keyword dependent.
- Site-wide sync is property/client dependent.
- A client with no keywords should still get site-wide performance snapshots.

## Manual sync changes

Current manual GSC sync action should be inspected before implementation. The preferred behavior is:

- Manual client-level sync triggers both site-wide snapshot sync and keyword snapshot sync.
- If the UI currently syncs a domain-specific date range, include site-wide sync once for the same client/range, not once per domain.
- Return a result summary that separates `performanceSnapshotsUpserted` from `keywordSnapshotsUpserted`.
- Do not show site-wide snapshot counts as keyword counts.

## Dashboard/reporting read APIs

Add read functions after the write path is stable:

```ts
getLatestGscPerformanceSnapshot(clientId: string)
getGscPerformanceSnapshotsForRange(clientId: string, startDate: Date, endDate: Date)
getGscPerformanceSnapshotDelta(clientId: string, currentRange, comparisonRange)
```

Use cases:

- Client detail page: latest clicks, impressions, CTR, average position, score.
- Dashboard: latest site-wide score per active client.
- Reports: period totals for clicks/impressions and weighted average CTR/position.

Aggregation rules:

- Total clicks: sum daily clicks.
- Total impressions: sum daily impressions.
- CTR over a range: total clicks / total impressions.
- Average position over a range: impressions-weighted average of daily average position.
- Score over a range: either average daily score or recalculate from aggregated metrics. Prefer recalculation for reports and label it as period score.

## UI plan

Implement UI only after persistence and read services are tested.

1. Add a site-wide performance card group to the client detail page:
   - Clicks
   - Impressions
   - CTR
   - Average position
   - Score
2. Add an empty state when no snapshots exist:
   - Client has GSC connected: prompt to run sync.
   - Client has no GSC connected: prompt to connect GSC.
3. Add a small trend table or chart only if daily data exists for at least two dates.
4. Keep charts as isolated Client Components only if interactivity is needed. Static summary cards should stay Server Components.

## Testing plan

### Unit tests

Add tests for:

- `calculateGscPerformanceScore`:
  - zero impressions/clicks
  - high impressions with low CTR
  - high CTR with low impressions
  - strong average position
  - poor average position
  - rounding and clamping
- Row normalization:
  - valid date row
  - missing date key
  - invalid date key
  - negative clicks/impressions
  - zero impressions

### Service tests

Add `lib/services/gsc-performance-snapshot.service.test.ts` covering:

- Throws clear error when the client has no GSC connection.
- Calls Search Analytics with property-level `siteUrl`, `dimensions: ["date"]`, `type: "web"`, and `dataState: "all"`.
- Upserts one snapshot per returned date.
- Reruns update the existing snapshot rather than creating duplicates.
- Updates `Client.lastSyncedAt` and clears `GscConnection.lastSyncError` on success.
- Stores `GscConnection.lastSyncError` on API failure and rethrows.
- Handles empty GSC response as a successful zero-row sync.

### Scheduled sync tests

Extend scheduled sync tests to cover:

- Active client with GSC connection and no keywords still receives site-wide sync.
- Archived clients are skipped.
- Failures in site-wide sync do not prevent other clients from syncing.
- Combined cron result returns failure counts for both keyword and site-wide sync paths.

### Integration/client tests

Existing `GscClient.searchAnalyticsQuery` tests likely cover POST behavior, retries, and token refresh. Add only the minimal test needed if the site-wide service depends on new request options or type aliases.

### Checks before commit

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
npx ultracite check
```

If `pnpm build` cannot run because required production environment variables are unavailable, report it clearly and include the lower-level checks that did run.

## Implementation sequence

1. Add Prisma model and migration for `GscPerformanceSnapshot`.
2. Generate Prisma client.
3. Add pure score helper and tests.
4. Add site-wide snapshot service with dependency injection and tests.
5. Wire scheduled sync to run site-wide snapshots per connected active client.
6. Wire manual GSC sync action to run site-wide snapshots once per client/range.
7. Add read service functions for latest/range metrics.
8. Add client detail UI summary cards and empty states.
9. Update README with the new snapshot concept and any changed sync behavior.
10. Run full checks and manually verify a local sync with a test GSC property if credentials are available.

## Rollout and backfill

1. Deploy schema migration.
2. Deploy write path with scheduled sync enabled.
3. Let daily snapshots accumulate for active clients.
4. Run manual backfills per client for the last 30, 90, or 180 days only after confirming API quota headroom.
5. Add dashboard/report UI once initial backfill or enough daily data exists.
6. If the score formula changes later, add a new `scoreVersion` and a controlled recalculation script.

## Open decisions before coding

- Should scheduled site-wide snapshots sync through yesterday only, or include today with `dataState: "all"`?
- Should `siteUrl` uniqueness include `gscConnectionId` instead of `clientId` to preserve history if a client reconnects the same property?
- Should score be displayed as a 0-100 integer, one decimal, or two decimals?
- Should the first dashboard use current day, trailing 7 days, trailing 28 days, or latest complete day?
- Should manual sync expose `dataState: "final"` for backfills where freshness is less important than stability?
