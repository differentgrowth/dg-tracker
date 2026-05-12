import type { GscConnection } from "@/lib/generated/prisma/client";
import type { SearchAnalyticsRow } from "@/lib/integrations/gsc/types";
import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-with-at-least-32-characters";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.APP_URL ??= "http://localhost:3000";
process.env.GOOGLE_OAUTH_CLIENT_ID ??= "google-client-id";
process.env.GOOGLE_OAUTH_CLIENT_SECRET ??= "google-client-secret";
process.env.GOOGLE_OAUTH_REDIRECT_URI ??=
  "http://localhost:3000/api/google/callback";
process.env.GSC_TOKEN_ENCRYPTION_KEY ??= Buffer.alloc(32, 9).toString("base64");

const {
  aggregateRows,
  buildFilterGroups,
  buildSnapshotUpsertInputs,
  syncGscPropertyForClient,
} = await import("@/lib/services/gsc-sync.service");

function row(
  query: string,
  date: string,
  page: string,
  position: number,
  impressions: number,
  clicks: number
): SearchAnalyticsRow {
  return {
    keys: [query, date, page],
    position,
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
  };
}

test("buildFilterGroups creates one exact-query filter per term", () => {
  const groups = buildFilterGroups(["alpha", "beta"]);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], {
    groupType: "and",
    filters: [{ dimension: "query", operator: "equals", expression: "alpha" }],
  });
  assert.deepEqual(groups[1], {
    groupType: "and",
    filters: [{ dimension: "query", operator: "equals", expression: "beta" }],
  });
});

test("aggregateRows weights GSC average position and keeps one keyword-date snapshot", () => {
  const keywordsByTerm = new Map([
    [
      "seo agency",
      [
        {
          id: "keyword-1",
          term: "SEO Agency",
          domainId: "domain-1",
          targetUrl: null,
        },
      ],
    ],
  ]);
  const result = aggregateRows(
    [
      row("seo agency", "2026-05-01", "https://example.com/a", 2, 10, 1),
      row("seo agency", "2026-05-01", "https://example.com/b", 8, 30, 3),
    ],
    keywordsByTerm
  );
  const inputs = buildSnapshotUpsertInputs(result.aggregates);

  assert.equal(result.matchedKeywords.size, 1);
  assert.equal(result.unmatchedQueryCount, 0);
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].keywordId, "keyword-1");
  assert.equal(inputs[0].date.toISOString(), "2026-05-01T00:00:00.000Z");
  assert.equal(inputs[0].avgPosition, 6.5);
  assert.equal(inputs[0].impressions, 40);
  assert.equal(inputs[0].clicks, 4);
  assert.equal(inputs[0].ctr, 0.1);
  assert.equal(inputs[0].url, "https://example.com/b");
});

test("aggregateRows filters by targetUrl and counts unmatched queries once", () => {
  const keywordsByTerm = new Map([
    [
      "analytics",
      [
        {
          id: "keyword-2",
          term: "analytics",
          domainId: "domain-1",
          targetUrl: "https://example.com/services",
        },
      ],
    ],
  ]);
  const result = aggregateRows(
    [
      row("analytics", "2026-05-01", "https://example.com/blog", 4, 10, 1),
      row("analytics", "2026-05-01", "https://example.com/services/", 3, 20, 2),
      row("unknown", "2026-05-01", "https://example.com/one", 1, 5, 1),
      row("unknown", "2026-05-02", "https://example.com/two", 1, 6, 1),
    ],
    keywordsByTerm
  );
  const inputs = buildSnapshotUpsertInputs(result.aggregates);

  assert.equal(result.matchedKeywords.size, 1);
  assert.equal(result.unmatchedQueryCount, 1);
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].avgPosition, 3);
  assert.equal(inputs[0].url, "https://example.com/services/");
});

test("syncGscPropertyForClient filters scheduled syncs to one domain and uses idempotent upserts", async () => {
  const now = new Date("2026-05-08T12:00:00.000Z");
  const connection = {
    id: "connection-1",
    clientId: "client-1",
    gscSiteUrl: "sc-domain:example.com",
  } as GscConnection;
  const upsertCalls: unknown[] = [];
  let keywordFindManyArgs: unknown;
  const db = {
    gscConnection: {
      findUnique: () => Promise.resolve(connection),
      update: () => Promise.resolve(connection),
    },
    keyword: {
      findMany: (args: unknown) => {
        keywordFindManyArgs = args;
        return Promise.resolve([
          {
            id: "keyword-1",
            term: "seo agency",
            targetUrl: null,
            domainId: "domain-1",
          },
        ]);
      },
      updateMany: () => Promise.resolve({ count: 1 }),
    },
    client: {
      update: () => Promise.resolve({ id: "client-1" }),
    },
    rankingSnapshot: {
      upsert: (args: unknown) => {
        upsertCalls.push(args);
        return Promise.resolve(args);
      },
    },
    $transaction: (batch: Promise<unknown>[]) => Promise.all(batch),
  };
  const createGscClient = () => ({
    searchAnalyticsQuery: () =>
      Promise.resolve([
        row("seo agency", "2026-05-01", "https://example.com/a", 2, 10, 1),
        row("seo agency", "2026-05-01", "https://example.com/b", 8, 30, 3),
      ]),
  });

  const result = await syncGscPropertyForClient(
    {
      clientId: "client-1",
      domainId: "domain-1",
      startDate: new Date("2026-05-01T00:00:00.000Z"),
      endDate: new Date("2026-05-08T00:00:00.000Z"),
      triggeredBy: "manual",
    },
    { createGscClient, db: db as never, now: () => now }
  );

  assert.deepEqual(keywordFindManyArgs, {
    where: {
      status: "active",
      domain: { clientId: "client-1", id: "domain-1" },
    },
    select: { id: true, term: true, targetUrl: true, domainId: true },
  });
  assert.equal(result.rowsFetched, 2);
  assert.equal(result.snapshotsUpserted, 1);
  assert.equal(upsertCalls.length, 1);
  assert.deepEqual((upsertCalls[0] as { where: unknown }).where, {
    keywordId_date_source: {
      keywordId: "keyword-1",
      date: new Date("2026-05-01T00:00:00.000Z"),
      source: "gsc",
    },
  });
});
