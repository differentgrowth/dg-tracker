import type { GscConnection } from "@/lib/generated/prisma/client";
import type { SearchAnalyticsRow } from "@/lib/integrations/gsc/types";

import { GscClient } from "@/lib/integrations/gsc/client";
import { prisma } from "@/lib/prisma";

export interface GscQueryCandidate {
  alreadyTracked: boolean;
  avgPosition: number | null;
  clicks: number;
  impressions: number;
  query: string;
}

export interface FetchGscQueryCandidatesOptions {
  clientId: string;
  days: number;
  limit: number;
}

interface GscQueryCandidateDb {
  gscConnection: Pick<typeof prisma.gscConnection, "findUnique">;
  keyword: Pick<typeof prisma.keyword, "findMany">;
}

interface GscQueryCandidateClient {
  searchAnalyticsQuery(
    siteUrl: string,
    body: Parameters<GscClient["searchAnalyticsQuery"]>[1]
  ): Promise<SearchAnalyticsRow[]>;
}

interface FetchGscQueryCandidatesDependencies {
  createGscClient?: (connection: GscConnection) => GscQueryCandidateClient;
  db?: GscQueryCandidateDb;
  now?: () => Date;
}

const DEFAULT_DAYS = 28;
const DEFAULT_LIMIT = 50;
const MAX_DAYS = 90;
const MAX_LIMIT = 250;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizeQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Fetches top Search Console query rows for a connected client so the team can
 * create tracked keywords from real GSC queries instead of manually copying
 * them. This reads only aggregate query metrics and never persists raw rows.
 */
export async function fetchGscQueryCandidates(
  opts: FetchGscQueryCandidatesOptions,
  deps: FetchGscQueryCandidatesDependencies = {}
): Promise<GscQueryCandidate[]> {
  const db = deps.db ?? prisma;
  const now = deps.now ?? (() => new Date());
  const createGscClient =
    deps.createGscClient ??
    ((connection: GscConnection) => new GscClient(connection));
  const days = clampInt(opts.days || DEFAULT_DAYS, 1, MAX_DAYS);
  const limit = clampInt(opts.limit || DEFAULT_LIMIT, 1, MAX_LIMIT);

  const connection = await db.gscConnection.findUnique({
    where: { clientId: opts.clientId },
  });
  if (!connection) {
    throw new Error(`No GSC connection for client ${opts.clientId}`);
  }

  const endDate = now();
  const startDate = new Date(endDate);
  startDate.setUTCDate(endDate.getUTCDate() - days);

  const client = createGscClient(connection);
  const rows = await client.searchAnalyticsQuery(connection.gscSiteUrl, {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
    dimensions: ["query"],
    dataState: "all",
    type: "web",
  });

  const existingKeywords = await db.keyword.findMany({
    where: {
      domain: { clientId: opts.clientId },
    },
    select: { term: true },
  });
  const existingTerms = new Set(
    existingKeywords.map((keyword) => normalizeQuery(keyword.term))
  );

  const candidates: GscQueryCandidate[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const query = normalizeQuery(row.keys[0] ?? "");
    if (!query || seen.has(query)) {
      continue;
    }
    seen.add(query);
    candidates.push({
      query,
      clicks: row.clicks,
      impressions: row.impressions,
      avgPosition: row.position,
      alreadyTracked: existingTerms.has(query),
    });
    if (candidates.length >= limit) {
      break;
    }
  }

  return candidates;
}
