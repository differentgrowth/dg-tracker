import type { GscConnection, Prisma } from "@/lib/generated/prisma/client";
import type {
  SearchAnalyticsDimensionFilter,
  SearchAnalyticsDimensionFilterGroup,
  SearchAnalyticsRow,
} from "@/lib/integrations/gsc/types";

import { GscClient } from "@/lib/integrations/gsc/client";
import { getGscSyncErrorMessage } from "@/lib/integrations/gsc/errors";
import { prisma } from "@/lib/prisma";

export interface GscSyncOptions {
  clientId: string;
  endDate: Date;
  startDate: Date;
  triggeredBy: "manual" | "scheduled";
}

export interface GscSyncResult {
  finishedAt: Date;
  keywordsMatched: number;
  rowsFetched: number;
  snapshotsUpserted: number;
  startedAt: Date;
  unmatchedQueries: number;
}

type GscSyncDb = Pick<typeof prisma, "$transaction"> & {
  client: Pick<typeof prisma.client, "update">;
  gscConnection: Pick<typeof prisma.gscConnection, "findUnique" | "update">;
  keyword: Pick<typeof prisma.keyword, "findMany" | "updateMany">;
  rankingSnapshot: Pick<typeof prisma.rankingSnapshot, "upsert">;
};

interface GscSearchAnalyticsClient {
  searchAnalyticsQuery(
    siteUrl: string,
    body: Parameters<GscClient["searchAnalyticsQuery"]>[1]
  ): Promise<SearchAnalyticsRow[]>;
}

interface GscSyncDependencies {
  createGscClient?: (connection: GscConnection) => GscSearchAnalyticsClient;
  db?: GscSyncDb;
  now?: () => Date;
}

export interface GscKeywordRecord {
  domainId: string;
  id: string;
  targetUrl: string | null;
  term: string;
}

interface AggregateAccumulator {
  bestPage: string | null;
  bestPageImpressions: number;
  clicks: number;
  impressions: number;
  weightedPositionSum: number;
}

const UPSERT_CHUNK_SIZE = 500;
const SEARCH_QUERY_CONCURRENCY = 5;
const TRAILING_SLASH_PATTERN = /\/$/;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function normalizePath(p: string): string {
  return p.replace(TRAILING_SLASH_PATTERN, "");
}

function isPageMatch(rowPage: string, targetUrl: string): boolean {
  if (rowPage === targetUrl) {
    return true;
  }
  try {
    const a = new URL(rowPage);
    const b = new URL(targetUrl);
    return (
      a.host === b.host &&
      normalizePath(a.pathname) === normalizePath(b.pathname)
    );
  } catch {
    return false;
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

interface AggregateResult {
  aggregates: Map<string, AggregateAccumulator>;
  matchedKeywords: Set<string>;
  unmatchedQueryCount: number;
}

export interface GscSnapshotUpsertInput {
  avgPosition: number | null;
  clicks: number;
  ctr: number | null;
  date: Date;
  impressions: number;
  keywordId: string;
  source: "gsc";
  url: string | null;
}

export function aggregateRows(
  rows: SearchAnalyticsRow[],
  keywordsByTerm: Map<string, GscKeywordRecord[]>
): AggregateResult {
  const aggregates = new Map<string, AggregateAccumulator>();
  const matchedKeywords = new Set<string>();
  const unmatchedQueries = new Set<string>();
  let unmatchedQueryCount = 0;

  for (const row of rows) {
    const [query, date, page] = row.keys;
    const matches = keywordsByTerm.get(query.toLowerCase());
    if (!matches) {
      if (!unmatchedQueries.has(query)) {
        unmatchedQueries.add(query);
        unmatchedQueryCount += 1;
      }
      continue;
    }
    for (const keyword of matches) {
      if (keyword.targetUrl && !isPageMatch(page, keyword.targetUrl)) {
        continue;
      }
      mergeAggregate(aggregates, keyword.id, date, page, row);
      matchedKeywords.add(keyword.id);
    }
  }

  return { aggregates, matchedKeywords, unmatchedQueryCount };
}

function mergeAggregate(
  aggregates: Map<string, AggregateAccumulator>,
  keywordId: string,
  date: string,
  page: string,
  row: SearchAnalyticsRow
): void {
  const aggKey = `${keywordId}|${date}`;
  const existing = aggregates.get(aggKey);
  const acc: AggregateAccumulator = existing ?? {
    weightedPositionSum: 0,
    impressions: 0,
    clicks: 0,
    bestPageImpressions: -1,
    bestPage: null,
  };
  acc.weightedPositionSum += row.position * row.impressions;
  acc.impressions += row.impressions;
  acc.clicks += row.clicks;
  if (row.impressions > acc.bestPageImpressions) {
    acc.bestPageImpressions = row.impressions;
    acc.bestPage = page;
  }
  aggregates.set(aggKey, acc);
}

export function buildFilterGroups(
  termList: string[]
): SearchAnalyticsDimensionFilterGroup[] {
  return termList.map((term) => {
    const filters: SearchAnalyticsDimensionFilter[] = [
      {
        dimension: "query",
        operator: "equals",
        expression: term,
      },
    ];
    return { groupType: "and", filters };
  });
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (const batch of chunk(values, concurrency)) {
    results.push(...(await Promise.all(batch.map(mapper))));
  }
  return results;
}

export function buildSnapshotUpsertInputs(
  aggregates: Map<string, AggregateAccumulator>
): GscSnapshotUpsertInput[] {
  const inputs: GscSnapshotUpsertInput[] = [];
  for (const [aggKey, acc] of aggregates) {
    const [keywordId, dateIso] = aggKey.split("|");
    const date = new Date(`${dateIso}T00:00:00.000Z`);
    const avgPosition =
      acc.impressions > 0 ? acc.weightedPositionSum / acc.impressions : null;
    const ctr = acc.impressions > 0 ? acc.clicks / acc.impressions : null;
    inputs.push({
      keywordId,
      date,
      source: "gsc",
      avgPosition,
      impressions: acc.impressions,
      clicks: acc.clicks,
      ctr,
      url: acc.bestPage,
    });
  }
  return inputs;
}

function buildUpsertOps(
  db: GscSyncDb,
  inputs: GscSnapshotUpsertInput[]
): Prisma.PrismaPromise<unknown>[] {
  return inputs.map((input) =>
    db.rankingSnapshot.upsert({
      where: {
        keywordId_date_source: {
          keywordId: input.keywordId,
          date: input.date,
          source: input.source,
        },
      },
      update: {
        avgPosition: input.avgPosition,
        impressions: input.impressions,
        clicks: input.clicks,
        ctr: input.ctr,
        url: input.url,
      },
      create: input,
    })
  );
}

/**
 * Pulls GSC rows for the given client over [startDate, endDate], matches
 * each row to a tracked keyword, aggregates per (keyword, date), and upserts
 * RankingSnapshots with source = "gsc". Idempotent: re-running over the same
 * range produces identical state thanks to the (keywordId, date, source)
 * unique constraint.
 */
export async function syncGscPropertyForClient(
  opts: GscSyncOptions,
  deps: GscSyncDependencies = {}
): Promise<GscSyncResult> {
  const db = deps.db ?? prisma;
  const now = deps.now ?? (() => new Date());
  const createGscClient =
    deps.createGscClient ??
    ((connection: GscConnection) => new GscClient(connection));
  const startedAt = now();

  const connection = await db.gscConnection.findUnique({
    where: { clientId: opts.clientId },
  });
  if (!connection) {
    throw new Error(`No GSC connection for client ${opts.clientId}`);
  }

  const keywords = await db.keyword.findMany({
    where: {
      status: "active",
      domain: { clientId: opts.clientId },
    },
    select: { id: true, term: true, targetUrl: true, domainId: true },
  });

  if (keywords.length === 0) {
    const finishedAt = now();
    await db.client.update({
      where: { id: opts.clientId },
      data: { lastSyncedAt: finishedAt },
    });
    await db.gscConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: finishedAt, lastSyncError: null },
    });
    return {
      rowsFetched: 0,
      snapshotsUpserted: 0,
      keywordsMatched: 0,
      unmatchedQueries: 0,
      startedAt,
      finishedAt,
    };
  }

  const keywordsByTerm = new Map<string, GscKeywordRecord[]>();
  for (const k of keywords) {
    const key = k.term.toLowerCase();
    const list = keywordsByTerm.get(key) ?? [];
    list.push(k);
    keywordsByTerm.set(key, list);
  }

  const client = createGscClient(connection);
  const startDate = toIsoDate(opts.startDate);
  const endDate = toIsoDate(opts.endDate);
  const filterGroups = buildFilterGroups(Array.from(keywordsByTerm.keys()));

  let rows: SearchAnalyticsRow[] = [];
  try {
    const groupedRowsArrays = await mapWithConcurrency(
      filterGroups,
      SEARCH_QUERY_CONCURRENCY,
      (group) =>
        client.searchAnalyticsQuery(connection.gscSiteUrl, {
          startDate,
          endDate,
          dimensions: ["query", "date", "page"],
          dimensionFilterGroups: [group],
          dataState: "all",
          type: "web",
        })
    );
    rows = groupedRowsArrays.flat();
  } catch (error) {
    await db.gscConnection.update({
      where: { id: connection.id },
      data: { lastSyncError: getGscSyncErrorMessage(error) },
    });
    throw error;
  }

  const { aggregates, matchedKeywords, unmatchedQueryCount } = aggregateRows(
    rows,
    keywordsByTerm
  );

  const snapshotInputs = buildSnapshotUpsertInputs(aggregates);
  const upsertOps = buildUpsertOps(db, snapshotInputs);
  let snapshotsUpserted = 0;
  for (const batch of chunk(upsertOps, UPSERT_CHUNK_SIZE)) {
    const results = await db.$transaction(batch);
    snapshotsUpserted += results.length;
  }

  const finishedAt = now();
  if (matchedKeywords.size > 0) {
    await db.keyword.updateMany({
      where: { id: { in: Array.from(matchedKeywords) } },
      data: { lastCheckedAt: finishedAt },
    });
  }
  await db.client.update({
    where: { id: opts.clientId },
    data: { lastSyncedAt: finishedAt },
  });
  await db.gscConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: finishedAt, lastSyncError: null },
  });

  return {
    rowsFetched: rows.length,
    snapshotsUpserted,
    keywordsMatched: matchedKeywords.size,
    unmatchedQueries: unmatchedQueryCount,
    startedAt,
    finishedAt,
  };
}
