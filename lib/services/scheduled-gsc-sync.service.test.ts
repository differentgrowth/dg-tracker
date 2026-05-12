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
  clampScheduledGscSyncDays,
  runScheduledGscPerformanceSnapshotSync,
  runScheduledGscSync,
  scheduledGscSyncDefaultDays,
  scheduledGscSyncMaxDays,
  scheduledGscSyncMinDays,
} = await import("@/lib/services/scheduled-gsc-sync.service");

test("scheduled GSC sync defaults to a one-day lookback for invalid domain settings", () => {
  assert.equal(
    clampScheduledGscSyncDays(Number.NaN),
    scheduledGscSyncDefaultDays
  );
  assert.equal(scheduledGscSyncDefaultDays, 1);
});

test("scheduled GSC sync caps per-domain lookback days to prevent accidental backfills", () => {
  assert.equal(clampScheduledGscSyncDays(0), scheduledGscSyncMinDays);
  assert.equal(clampScheduledGscSyncDays(3), 3);
  assert.equal(clampScheduledGscSyncDays(99), scheduledGscSyncMaxDays);
  assert.equal(scheduledGscSyncMaxDays, 7);
});

test("runScheduledGscSync syncs each eligible domain and reports partial failures", async () => {
  const now = new Date("2026-05-12T05:00:00.000Z");
  let findManyArgs: unknown;
  const syncCalls: unknown[] = [];
  const db = {
    domain: {
      findMany: (args: unknown) => {
        findManyArgs = args;
        return Promise.resolve([
          { clientId: "client-1", id: "domain-1", scheduledSyncDays: 3 },
          { clientId: "client-2", id: "domain-2", scheduledSyncDays: 99 },
        ]);
      },
    },
  };

  const result = await runScheduledGscSync(
    { now: () => now },
    {
      db: db as never,
      syncGscPropertyForClient: (input) => {
        syncCalls.push(input);
        if (input.domainId === "domain-2") {
          throw new Error("GSC quota exhausted");
        }
        return Promise.resolve({
          rowsFetched: 8,
          snapshotsUpserted: 4,
          keywordsMatched: 2,
          unmatchedQueries: 0,
          startedAt: now,
          finishedAt: now,
        });
      },
    }
  );

  assert.deepEqual(findManyArgs, {
    where: {
      client: {
        status: "active",
        gscConnection: { isNot: null },
      },
    },
    select: {
      clientId: true,
      id: true,
      scheduledSyncDays: true,
    },
    orderBy: [{ client: { name: "asc" } }, { url: "asc" }],
  });
  assert.deepEqual(syncCalls, [
    {
      clientId: "client-1",
      domainId: "domain-1",
      startDate: new Date("2026-05-09T05:00:00.000Z"),
      endDate: now,
      triggeredBy: "scheduled",
    },
    {
      clientId: "client-2",
      domainId: "domain-2",
      startDate: new Date("2026-05-05T05:00:00.000Z"),
      endDate: now,
      triggeredBy: "scheduled",
    },
  ]);
  assert.equal(result.domainCount, 2);
  assert.equal(result.succeededDomainCount, 1);
  assert.equal(result.failedDomainCount, 1);
  assert.equal(result.totalSnapshotsUpserted, 4);
  assert.deepEqual(result.results, [
    {
      clientId: "client-1",
      domainId: "domain-1",
      scheduledSyncDays: 3,
      snapshotsUpserted: 4,
      status: "success",
    },
    {
      clientId: "client-2",
      domainId: "domain-2",
      error: "GSC quota exhausted",
      scheduledSyncDays: 7,
      snapshotsUpserted: 0,
      status: "error",
    },
  ]);
});

test("runScheduledGscPerformanceSnapshotSync syncs active connected clients without keywords", async () => {
  const now = new Date("2026-05-12T05:00:00.000Z");
  let findManyArgs: unknown;
  const syncCalls: unknown[] = [];
  const db = {
    client: {
      findMany: (args: unknown) => {
        findManyArgs = args;
        return Promise.resolve([{ id: "client-1" }, { id: "client-2" }]);
      },
    },
  };

  const result = await runScheduledGscPerformanceSnapshotSync(
    { now: () => now },
    {
      db: db as never,
      syncGscPerformanceSnapshots: (input) => {
        syncCalls.push(input);
        if (input.clientId === "client-2") {
          throw new Error("GSC quota exhausted");
        }
        return Promise.resolve({
          clientId: input.clientId,
          dataState: "all",
          finishedAt: now,
          rowsFetched: 1,
          searchType: "web",
          siteUrl: "sc-domain:example.com",
          snapshotsUpserted: 1,
          startedAt: now,
        });
      },
    }
  );

  assert.deepEqual(findManyArgs, {
    where: {
      status: "active",
      gscConnection: { isNot: null },
    },
    select: { id: true },
    orderBy: { name: "asc" },
  });
  assert.deepEqual(syncCalls, [
    {
      clientId: "client-1",
      startDate: new Date("2026-05-11T05:00:00.000Z"),
      endDate: now,
      triggeredBy: "scheduled",
    },
    {
      clientId: "client-2",
      startDate: new Date("2026-05-11T05:00:00.000Z"),
      endDate: now,
      triggeredBy: "scheduled",
    },
  ]);
  assert.equal(result.clientCount, 2);
  assert.equal(result.succeededClientCount, 1);
  assert.equal(result.failedClientCount, 1);
  assert.equal(result.totalSnapshotsUpserted, 1);
  assert.deepEqual(result.results, [
    {
      clientId: "client-1",
      snapshotsUpserted: 1,
      status: "success",
    },
    {
      clientId: "client-2",
      error: "GSC quota exhausted",
      snapshotsUpserted: 0,
      status: "error",
    },
  ]);
});
