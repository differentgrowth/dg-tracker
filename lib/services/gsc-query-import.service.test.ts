import type { GscConnection } from "@/lib/generated/prisma/client";
import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchGscQueryCandidates } from "@/lib/services/gsc-query-import.service";

const connection = {
  id: "connection-1",
  clientId: "client-1",
  googleAccountEmail: "seo@example.com",
  googleAccountSubject: "google-subject",
  gscSiteUrl: "sc-domain:example.com",
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  accessTokenCipher: "access",
  refreshTokenCipher: "refresh",
  accessTokenExpiresAt: new Date("2026-05-12T12:00:00.000Z"),
  lastSyncedAt: null,
  lastSyncError: null,
  connectedByUserId: "user-1",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
} satisfies GscConnection;

test("fetchGscQueryCandidates returns normalized GSC queries and flags tracked terms", async () => {
  const requests: unknown[] = [];
  const db = {
    gscConnection: {
      findUnique: () => Promise.resolve(connection),
    },
    keyword: {
      findMany: () => Promise.resolve([{ term: "Existing Query" }]),
    },
  };
  const createGscClient = () => ({
    searchAnalyticsQuery: (_siteUrl: string, body: unknown) => {
      requests.push(body);
      return Promise.resolve([
        {
          keys: ["  Existing   Query  "],
          clicks: 10,
          impressions: 100,
          ctr: 0.1,
          position: 3.25,
        },
        {
          keys: ["New Query"],
          clicks: 5,
          impressions: 50,
          ctr: 0.1,
          position: 8,
        },
      ]);
    },
  });

  const candidates = await fetchGscQueryCandidates(
    { clientId: "client-1", days: 28, limit: 50 },
    {
      createGscClient,
      db: db as never,
      now: () => new Date("2026-05-12T00:00:00.000Z"),
    }
  );

  assert.deepEqual(requests, [
    {
      startDate: "2026-04-14",
      endDate: "2026-05-12",
      dimensions: ["query"],
      dataState: "all",
      type: "web",
    },
  ]);
  assert.deepEqual(candidates, [
    {
      query: "existing query",
      clicks: 10,
      impressions: 100,
      avgPosition: 3.25,
      alreadyTracked: true,
    },
    {
      query: "new query",
      clicks: 5,
      impressions: 50,
      avgPosition: 8,
      alreadyTracked: false,
    },
  ]);
});
