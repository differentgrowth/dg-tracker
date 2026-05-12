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

const { normalizeGscPerformanceRows, syncGscPerformanceSnapshots } =
  await import("@/lib/services/gsc-performance-snapshot.service");

function row(
  date: string,
  position: number,
  impressions: number,
  clicks: number
): SearchAnalyticsRow {
  return {
    keys: [date],
    position,
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
  };
}

const validDateKeyErrorPattern = /valid date key/;
const negativeMetricsErrorPattern = /negative metrics/;
const quotaErrorPattern = /quota failed/;

function connection(): GscConnection {
  return {
    id: "connection-1",
    clientId: "client-1",
    gscSiteUrl: "sc-domain:example.com",
  } as GscConnection;
}

test("normalizeGscPerformanceRows creates daily snapshot inputs with scores", () => {
  const inputs = normalizeGscPerformanceRows(
    [row("2026-05-10", 4.5, 1000, 120)],
    {
      clientId: "client-1",
      dataState: "all",
      gscConnectionId: "connection-1",
      searchType: "web",
      siteUrl: "sc-domain:example.com",
    }
  );

  assert.equal(inputs.length, 1);
  assert.deepEqual(inputs[0], {
    clientId: "client-1",
    dataState: "all",
    gscConnectionId: "connection-1",
    searchType: "web",
    siteUrl: "sc-domain:example.com",
    avgPosition: 4.5,
    clicks: 120,
    ctr: 0.12,
    date: new Date("2026-05-10T00:00:00.000Z"),
    impressions: 1000,
    score: 69.55,
    scoreVersion: 1,
  });
});

test("normalizeGscPerformanceRows fails loud for malformed GSC rows", () => {
  assert.throws(
    () =>
      normalizeGscPerformanceRows(
        [{ ...row("not-a-date", 1, 1, 0), keys: ["not-a-date"] }],
        {
          clientId: "client-1",
          dataState: "all",
          gscConnectionId: "connection-1",
          searchType: "web",
          siteUrl: "sc-domain:example.com",
        }
      ),
    validDateKeyErrorPattern
  );

  assert.throws(
    () =>
      normalizeGscPerformanceRows([row("2026-05-10", 1, -1, 0)], {
        clientId: "client-1",
        dataState: "all",
        gscConnectionId: "connection-1",
        searchType: "web",
        siteUrl: "sc-domain:example.com",
      }),
    negativeMetricsErrorPattern
  );
});

test("syncGscPerformanceSnapshots queries property-level dates and upserts idempotently", async () => {
  const now = new Date("2026-05-12T12:00:00.000Z");
  const upsertCalls: unknown[] = [];
  const transactionBatches: unknown[][] = [];
  const clientUpdates: unknown[] = [];
  const connectionUpdates: unknown[] = [];
  let searchCall: unknown;
  const db = {
    gscConnection: {
      findUnique: () => Promise.resolve(connection()),
      update: (args: unknown) => {
        connectionUpdates.push(args);
        return Promise.resolve(connection());
      },
    },
    client: {
      update: (args: unknown) => {
        clientUpdates.push(args);
        return Promise.resolve({ id: "client-1" });
      },
    },
    gscPerformanceSnapshot: {
      upsert: (args: unknown) => {
        upsertCalls.push(args);
        return Promise.resolve(args);
      },
    },
    $transaction: (batch: Promise<unknown>[]) => {
      transactionBatches.push(batch);
      return Promise.all(batch);
    },
  };

  const result = await syncGscPerformanceSnapshots(
    {
      clientId: "client-1",
      startDate: new Date("2026-05-10T00:00:00.000Z"),
      endDate: new Date("2026-05-11T00:00:00.000Z"),
      triggeredBy: "manual",
    },
    {
      db: db as never,
      now: () => now,
      createGscClient: () => ({
        searchAnalyticsQuery: (siteUrl, body) => {
          searchCall = { siteUrl, body };
          return Promise.resolve([
            row("2026-05-10", 4, 100, 10),
            row("2026-05-11", 8, 200, 20),
          ]);
        },
      }),
    }
  );

  assert.deepEqual(searchCall, {
    siteUrl: "sc-domain:example.com",
    body: {
      startDate: "2026-05-10",
      endDate: "2026-05-11",
      dimensions: ["date"],
      dataState: "all",
      type: "web",
    },
  });
  assert.equal(result.rowsFetched, 2);
  assert.equal(result.snapshotsUpserted, 2);
  assert.equal(upsertCalls.length, 2);
  assert.deepEqual((upsertCalls[0] as { where: unknown }).where, {
    clientId_siteUrl_date_searchType_dataState: {
      clientId: "client-1",
      siteUrl: "sc-domain:example.com",
      date: new Date("2026-05-10T00:00:00.000Z"),
      searchType: "web",
      dataState: "all",
    },
  });
  assert.equal(transactionBatches.length, 1);
  assert.deepEqual(clientUpdates, [
    { where: { id: "client-1" }, data: { lastSyncedAt: now } },
  ]);
  assert.deepEqual(connectionUpdates, [
    {
      where: { id: "connection-1" },
      data: { lastSyncedAt: now, lastSyncError: null },
    },
  ]);
});

test("syncGscPerformanceSnapshots records API errors on the connection", async () => {
  const updates: unknown[] = [];
  const db = {
    gscConnection: {
      findUnique: () => Promise.resolve(connection()),
      update: (args: unknown) => {
        updates.push(args);
        return Promise.resolve(connection());
      },
    },
    client: { update: () => Promise.resolve({ id: "client-1" }) },
    gscPerformanceSnapshot: { upsert: () => Promise.resolve({}) },
    $transaction: (batch: Promise<unknown>[]) => Promise.all(batch),
  };

  await assert.rejects(
    syncGscPerformanceSnapshots(
      {
        clientId: "client-1",
        startDate: new Date("2026-05-10T00:00:00.000Z"),
        endDate: new Date("2026-05-11T00:00:00.000Z"),
        triggeredBy: "manual",
      },
      {
        db: db as never,
        createGscClient: () => ({
          searchAnalyticsQuery: () => Promise.reject(new Error("quota failed")),
        }),
      }
    ),
    quotaErrorPattern
  );

  assert.deepEqual(updates, [
    {
      where: { id: "connection-1" },
      data: {
        lastSyncError: "GSC sync failed — check the connection and retry.",
      },
    },
  ]);
});
